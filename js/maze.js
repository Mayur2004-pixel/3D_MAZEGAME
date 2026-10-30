// Maze Data Structure and Procedural Generation Algorithms
// Includes: Recursive Backtracking (DFS), Randomized Prim's, Kruskal's (DSU), Weighted Terrain

class DisjointSet {
    constructor(size) {
        this.parent = new Int32Array(size);
        for (let i = 0; i < size; i++) this.parent[i] = i;
    }

    find(i) {
        let root = i;
        while (root !== this.parent[root]) {
            root = this.parent[root];
        }
        // Path compression
        let curr = i;
        while (curr !== root) {
            let next = this.parent[curr];
            this.parent[curr] = root;
            curr = next;
        }
        return root;
    }

    union(i, j) {
        const rootI = this.find(i);
        const rootJ = this.find(j);
        if (rootI !== rootJ) {
            this.parent[rootI] = rootJ;
            return true;
        }
        return false;
    }
}

class Maze {
    constructor(rows = 25, cols = 25) {
        // Ensure odd dimensions for proper wall/passage grid
        this.rows = rows % 2 === 0 ? rows + 1 : rows;
        this.cols = cols % 2 === 0 ? cols + 1 : cols;
        this.start = { r: 1, c: 1 };
        this.end = { r: this.rows - 2, c: this.cols - 2 };
        this.grid = [];
        this.coins = new Set(); // set of "r,c"
        this.initGrid();
    }

    initGrid(fillAsWall = true) {
        this.grid = [];
        this.coins.clear();
        for (let r = 0; r < this.rows; r++) {
            const row = [];
            for (let c = 0; c < this.cols; c++) {
                row.push({
                    r,
                    c,
                    isWall: fillAsWall,
                    weight: 1, // 1 = normal, 5 = mud, 10 = water
                    type: fillAsWall ? 'wall' : 'path'
                });
            }
            this.grid.push(row);
        }
    }

    setStart(r, c) {
        if (this.isValid(r, c)) {
            this.grid[r][c].isWall = false;
            this.grid[r][c].weight = 1;
            this.start = { r, c };
        }
    }

    setEnd(r, c) {
        if (this.isValid(r, c)) {
            this.grid[r][c].isWall = false;
            this.grid[r][c].weight = 1;
            this.end = { r, c };
        }
    }

    isValid(r, c) {
        return r >= 0 && r < this.rows && c >= 0 && c < this.cols;
    }

    isPassable(r, c) {
        return this.isValid(r, c) && !this.grid[r][c].isWall;
    }

    // Neighbors (Orthogonal 4 directions)
    getNeighbors(r, c) {
        const deltas = [
            [-1, 0], // Up
            [1, 0],  // Down
            [0, -1], // Left
            [0, 1]   // Right
        ];
        const res = [];
        for (const [dr, dc] of deltas) {
            const nr = r + dr;
            const nc = c + dc;
            if (this.isPassable(nr, nc)) {
                res.push({
                    r: nr,
                    c: nc,
                    weight: this.grid[nr][nc].weight
                });
            }
        }
        return res;
    }

    // Scatter collectible coins in passage cells
    scatterCoins(count = 12) {
        this.coins.clear();
        const candidates = [];
        for (let r = 1; r < this.rows - 1; r++) {
            for (let c = 1; c < this.cols - 1; c++) {
                if (!this.grid[r][c].isWall) {
                    if ((r !== this.start.r || c !== this.start.c) &&
                        (r !== this.end.r || c !== this.end.c)) {
                        candidates.push(`${r},${c}`);
                    }
                }
            }
        }
        // Shuffle candidates
        for (let i = candidates.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
        }
        const toAdd = candidates.slice(0, Math.min(count, candidates.length));
        toAdd.forEach(coord => this.coins.add(coord));
    }

    /* -------------------------------------------------------------
       1. GENERATOR: Recursive Backtracking (DFS)
       - High winding corridors, low branching factor
       ------------------------------------------------------------- */
    generateRecursiveBacktracker() {
        this.initGrid(true); // All walls
        const stack = [];
        const startR = 1;
        const startC = 1;

        this.grid[startR][startC].isWall = false;
        stack.push([startR, startC]);

        const directions = [
            [-2, 0, -1, 0], // Up
            [2, 0, 1, 0],   // Down
            [0, -2, 0, -1], // Left
            [0, 2, 0, 1]    // Right
        ];

        while (stack.length > 0) {
            const [cr, cc] = stack[stack.length - 1];
            // Find unvisited neighbors 2 steps away
            const unvisited = [];
            for (const [dr, dc, wr, wc] of directions) {
                const nr = cr + dr;
                const nc = cc + dc;
                if (nr > 0 && nr < this.rows - 1 && nc > 0 && nc < this.cols - 1) {
                    if (this.grid[nr][nc].isWall) {
                        unvisited.push({ nr, nc, wr: cr + wr, wc: cc + wc });
                    }
                }
            }

            if (unvisited.length > 0) {
                // Pick random neighbor
                const chosen = unvisited[Math.floor(Math.random() * unvisited.length)];
                this.grid[chosen.wr][chosen.wc].isWall = false;
                this.grid[chosen.nr][chosen.nc].isWall = false;
                stack.push([chosen.nr, chosen.nc]);
            } else {
                stack.pop();
            }
        }

        // Ensure start and exit are open
        this.setStart(1, 1);
        this.setEnd(this.rows - 2, this.cols - 2);
        this.scatterCoins();
    }

    /* -------------------------------------------------------------
       2. GENERATOR: Randomized Prim's Algorithm
       - Tree-like structure, many short branches
       ------------------------------------------------------------- */
    generatePrims() {
        this.initGrid(true);
        const walls = [];

        // Start cell
        const startR = 1;
        const startC = 1;
        this.grid[startR][startC].isWall = false;

        const addWalls = (r, c) => {
            const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
            for (const [dr, dc] of dirs) {
                const wr = r + dr;
                const wc = c + dc;
                if (wr > 0 && wr < this.rows - 1 && wc > 0 && wc < this.cols - 1) {
                    if (this.grid[wr][wc].isWall) {
                        walls.push({ r: wr, c: wc, fromR: r, fromC: c });
                    }
                }
            }
        };

        addWalls(startR, startC);

        while (walls.length > 0) {
            // Pick random wall
            const randIdx = Math.floor(Math.random() * walls.length);
            const { r, c, fromR, fromC } = walls.splice(randIdx, 1)[0];

            // Direction vector
            const dr = r - fromR;
            const dc = c - fromC;
            const opR = r + dr;
            const opC = c + dc;

            if (opR > 0 && opR < this.rows - 1 && opC > 0 && opC < this.cols - 1) {
                if (this.grid[opR][opC].isWall) {
                    // Carve through wall and destination cell
                    this.grid[r][c].isWall = false;
                    this.grid[opR][opC].isWall = false;
                    addWalls(opR, opC);
                }
            }
        }

        this.setStart(1, 1);
        this.setEnd(this.rows - 2, this.cols - 2);
        this.scatterCoins();
    }

    /* -------------------------------------------------------------
       3. GENERATOR: Kruskal's Algorithm (Disjoint Set Union)
       - Uniform spans, minimal spanning tree over grid graph
       ------------------------------------------------------------- */
    generateKruskals() {
        this.initGrid(true);

        const cellIndex = (r, c) => Math.floor(r / 2) * Math.floor(this.cols / 2) + Math.floor(c / 2);
        const totalRooms = Math.floor(this.rows / 2) * Math.floor(this.cols / 2);
        const dsu = new DisjointSet(totalRooms);

        // Open all room cells
        const wallsList = [];
        for (let r = 1; r < this.rows - 1; r += 2) {
            for (let c = 1; c < this.cols - 1; c += 2) {
                this.grid[r][c].isWall = false;
                // Add potential horizontal wall to right
                if (c + 2 < this.cols - 1) {
                    wallsList.push({ r, c: c + 1, r1: r, c1: c, r2: r, c2: c + 2 });
                }
                // Add potential vertical wall below
                if (r + 2 < this.rows - 1) {
                    wallsList.push({ r: r + 1, c, r1: r, c1: c, r2: r + 2, c2: c });
                }
            }
        }

        // Shuffle candidate walls
        for (let i = wallsList.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [wallsList[i], wallsList[j]] = [wallsList[j], wallsList[i]];
        }

        // Carve wall if it connects disjoint components
        for (const wall of wallsList) {
            const idx1 = cellIndex(wall.r1, wall.c1);
            const idx2 = cellIndex(wall.r2, wall.c2);
            if (dsu.union(idx1, idx2)) {
                this.grid[wall.r][wall.c].isWall = false;
            }
        }

        this.setStart(1, 1);
        this.setEnd(this.rows - 2, this.cols - 2);
        this.scatterCoins();
    }

    /* -------------------------------------------------------------
       4. GENERATOR: Weighted Terrain (Mud & Water Hazards)
       - Ideal for demonstrating Dijkstra and A* cost awareness
       ------------------------------------------------------------- */
    generateWeightedTerrain() {
        this.initGrid(false); // Open field initially

        // Add border walls
        for (let r = 0; r < this.rows; r++) {
            this.grid[r][0].isWall = true;
            this.grid[r][this.cols - 1].isWall = true;
        }
        for (let c = 0; c < this.cols; c++) {
            this.grid[0][c].isWall = true;
            this.grid[this.rows - 1][c].isWall = true;
        }

        // Guarantee a protected backbone path from start to end so maze is always solvable
        const spine = new Set();
        let currR = 1;
        let currC = 1;
        spine.add(`${currR},${currC}`);

        while (currR !== this.rows - 2 || currC !== this.cols - 2) {
            if (currR < this.rows - 2 && (currC === this.cols - 2 || Math.random() < 0.5)) {
                currR++;
            } else if (currC < this.cols - 2) {
                currC++;
            }
            spine.add(`${currR},${currC}`);
        }

        // Add some barrier walls (avoiding spine and start/end)
        const wallCount = Math.floor(this.rows * this.cols * 0.18);
        for (let i = 0; i < wallCount; i++) {
            const r = Math.floor(Math.random() * (this.rows - 2)) + 1;
            const c = Math.floor(Math.random() * (this.cols - 2)) + 1;
            if (!spine.has(`${r},${c}`)) {
                this.grid[r][c].isWall = true;
            }
        }

        // Add Mud clusters (weight 5) - high movement cost
        const mudPatches = Math.max(3, Math.floor(this.rows / 4));
        for (let p = 0; p < mudPatches; p++) {
            const cr = Math.floor(Math.random() * (this.rows - 4)) + 2;
            const cc = Math.floor(Math.random() * (this.cols - 4)) + 2;
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = cr + dr;
                    const nc = cc + dc;
                    if (this.isValid(nr, nc) && !this.grid[nr][nc].isWall) {
                        this.grid[nr][nc].weight = 5;
                        this.grid[nr][nc].type = 'mud';
                    }
                }
            }
        }

        // Add Water hazards (weight 10) - very high movement cost
        const waterPatches = Math.max(2, Math.floor(this.rows / 6));
        for (let p = 0; p < waterPatches; p++) {
            const cr = Math.floor(Math.random() * (this.rows - 4)) + 2;
            const cc = Math.floor(Math.random() * (this.cols - 4)) + 2;
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = cr + dr;
                    const nc = cc + dc;
                    if (this.isValid(nr, nc) && !this.grid[nr][nc].isWall) {
                        this.grid[nr][nc].weight = 10;
                        this.grid[nr][nc].type = 'water';
                    }
                }
            }
        }

        this.setStart(1, 1);
        this.setEnd(this.rows - 2, this.cols - 2);
        this.scatterCoins(8);
    }

    /* -------------------------------------------------------------
       5. GENERATOR: Open Canvas (User Can Draw)
       ------------------------------------------------------------- */
    generateEmpty() {
        this.initGrid(false);
        // Border walls
        for (let r = 0; r < this.rows; r++) {
            this.grid[r][0].isWall = true;
            this.grid[r][this.cols - 1].isWall = true;
        }
        for (let c = 0; c < this.cols; c++) {
            this.grid[0][c].isWall = true;
            this.grid[this.rows - 1][c].isWall = true;
        }
        this.setStart(1, 1);
        this.setEnd(this.rows - 2, this.cols - 2);
    }

    // Toggle wall or weight at coordinate
    setCellType(r, c, brushType) {
        if (!this.isValid(r, c)) return;
        // Don't modify start or end markers directly
        if ((r === this.start.r && c === this.start.c) || (r === this.end.r && c === this.end.c)) return;

        const cell = this.grid[r][c];
        if (brushType === 'wall') {
            cell.isWall = true;
            cell.weight = 1;
            cell.type = 'wall';
        } else if (brushType === 'clear') {
            cell.isWall = false;
            cell.weight = 1;
            cell.type = 'path';
        } else if (brushType === 'mud') {
            cell.isWall = false;
            cell.weight = 5;
            cell.type = 'mud';
        } else if (brushType === 'water') {
            cell.isWall = false;
            cell.weight = 10;
            cell.type = 'water';
        } else if (brushType === 'start') {
            this.setStart(r, c);
        } else if (brushType === 'end') {
            this.setEnd(r, c);
        }
    }
}

window.Maze = Maze;
