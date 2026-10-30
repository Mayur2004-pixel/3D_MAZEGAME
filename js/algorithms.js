// Graph Search & Pathfinding Algorithms: BFS, DFS, Dijkstra, and A*
// Provides both instant execution (for benchmarking/races) and generator steps (for smooth visualization)

class MinPriorityQueue {
    constructor() {
        this.heap = [];
    }

    push(item, priority) {
        this.heap.push({ item, priority });
        this._bubbleUp(this.heap.length - 1);
    }

    pop() {
        if (this.isEmpty()) return null;
        const top = this.heap[0];
        const bottom = this.heap.pop();
        if (this.heap.length > 0) {
            this.heap[0] = bottom;
            this._bubbleDown(0);
        }
        return top.item;
    }

    isEmpty() {
        return this.heap.length === 0;
    }

    size() {
        return this.heap.length;
    }

    _bubbleUp(idx) {
        while (idx > 0) {
            const parentIdx = Math.floor((idx - 1) / 2);
            if (this.heap[idx].priority < this.heap[parentIdx].priority) {
                [this.heap[idx], this.heap[parentIdx]] = [this.heap[parentIdx], this.heap[idx]];
                idx = parentIdx;
            } else {
                break;
            }
        }
    }

    _bubbleDown(idx) {
        const length = this.heap.length;
        while (true) {
            let leftChildIdx = 2 * idx + 1;
            let rightChildIdx = 2 * idx + 2;
            let smallest = idx;

            if (leftChildIdx < length && this.heap[leftChildIdx].priority < this.heap[smallest].priority) {
                smallest = leftChildIdx;
            }
            if (rightChildIdx < length && this.heap[rightChildIdx].priority < this.heap[smallest].priority) {
                smallest = rightChildIdx;
            }

            if (smallest !== idx) {
                [this.heap[idx], this.heap[smallest]] = [this.heap[smallest], this.heap[idx]];
                idx = smallest;
            } else {
                break;
            }
        }
    }
}

class PathfindingAlgorithms {
    // Reconstruct path from parent map
    static reconstructPath(parentMap, endKey, startKey) {
        const path = [];
        let curr = endKey;
        while (curr) {
            const [r, c] = curr.split(',').map(Number);
            path.push({ r, c });
            if (curr === startKey) break;
            curr = parentMap.get(curr);
        }
        path.reverse();
        return path;
    }

    // Heuristics for A*
    static manhattanDistance(r1, c1, r2, c2) {
        return Math.abs(r1 - r2) + Math.abs(c1 - c2);
    }

    static euclideanDistance(r1, c1, r2, c2) {
        return Math.hypot(r1 - r2, c1 - c2);
    }

    /* =========================================================================
       1. BREADTH-FIRST SEARCH (BFS)
       - Data Structure: FIFO Queue
       - Optimality: Optimal for unweighted graphs
       - Time Complexity: O(V + E)
       - Space Complexity: O(V)
       ========================================================================= */
    static bfs(maze, start = maze.start, end = maze.end) {
        const t0 = performance.now();
        const startKey = `${start.r},${start.c}`;
        const endKey = `${end.r},${end.c}`;

        const queue = [start];
        const visited = new Set([startKey]);
        const parentMap = new Map();
        const visitedOrder = [];
        let maxFrontier = 1;
        let found = false;

        while (queue.length > 0) {
            maxFrontier = Math.max(maxFrontier, queue.length);
            const curr = queue.shift();
            const currKey = `${curr.r},${curr.c}`;
            visitedOrder.push(curr);

            if (curr.r === end.r && curr.c === end.c) {
                found = true;
                break;
            }

            const neighbors = maze.getNeighbors(curr.r, curr.c);
            for (const neighbor of neighbors) {
                const nKey = `${neighbor.r},${neighbor.c}`;
                if (!visited.has(nKey)) {
                    visited.add(nKey);
                    parentMap.set(nKey, currKey);
                    queue.push({ r: neighbor.r, c: neighbor.c });
                }
            }
        }

        const t1 = performance.now();
        const path = found ? this.reconstructPath(parentMap, endKey, startKey) : [];
        const pathCost = path.reduce((sum, cell) => sum + (maze.grid[cell.r][cell.c].weight || 1), 0);

        return {
            name: 'BFS (Breadth-First Search)',
            path,
            visitedOrder,
            nodesVisited: visitedOrder.length,
            pathLength: path.length,
            pathCost,
            executionTime: +(t1 - t0).toFixed(2),
            maxFrontierSize: maxFrontier,
            found,
            isOptimal: true // optimal on unweighted
        };
    }

    static *bfsGenerator(maze, start = maze.start, end = maze.end) {
        const startKey = `${start.r},${start.c}`;
        const endKey = `${end.r},${end.c}`;
        const queue = [start];
        const visited = new Set([startKey]);
        const parentMap = new Map();
        let found = false;

        yield { type: 'start', start, end };

        while (queue.length > 0) {
            const curr = queue.shift();
            const currKey = `${curr.r},${curr.c}`;

            yield {
                type: 'visit',
                cell: curr,
                frontierSize: queue.length
            };

            if (curr.r === end.r && curr.c === end.c) {
                found = true;
                break;
            }

            const neighbors = maze.getNeighbors(curr.r, curr.c);
            for (const neighbor of neighbors) {
                const nKey = `${neighbor.r},${neighbor.c}`;
                if (!visited.has(nKey)) {
                    visited.add(nKey);
                    parentMap.set(nKey, currKey);
                    queue.push({ r: neighbor.r, c: neighbor.c });
                    yield { type: 'frontier', cell: neighbor };
                }
            }
        }

        if (found) {
            const path = this.reconstructPath(parentMap, endKey, startKey);
            yield { type: 'path', path };
        } else {
            yield { type: 'not_found' };
        }
    }

    /* =========================================================================
       2. DEPTH-FIRST SEARCH (DFS)
       - Data Structure: LIFO Stack
       - Optimality: Non-optimal
       - Time Complexity: O(V + E)
       - Space Complexity: O(V)
       ========================================================================= */
    static dfs(maze, start = maze.start, end = maze.end) {
        const t0 = performance.now();
        const startKey = `${start.r},${start.c}`;
        const endKey = `${end.r},${end.c}`;

        const stack = [start];
        const visited = new Set();
        const parentMap = new Map();
        const visitedOrder = [];
        let maxFrontier = 1;
        let found = false;

        while (stack.length > 0) {
            maxFrontier = Math.max(maxFrontier, stack.length);
            const curr = stack.pop();
            const currKey = `${curr.r},${curr.c}`;

            if (visited.has(currKey)) continue;
            visited.add(currKey);
            visitedOrder.push(curr);

            if (curr.r === end.r && curr.c === end.c) {
                found = true;
                break;
            }

            const neighbors = maze.getNeighbors(curr.r, curr.c);
            // Reverse so canonical order visits up/right/down/left naturally
            for (let i = neighbors.length - 1; i >= 0; i--) {
                const neighbor = neighbors[i];
                const nKey = `${neighbor.r},${neighbor.c}`;
                if (!visited.has(nKey)) {
                    if (!parentMap.has(nKey)) {
                        parentMap.set(nKey, currKey);
                    }
                    stack.push({ r: neighbor.r, c: neighbor.c });
                }
            }
        }

        const t1 = performance.now();
        const path = found ? this.reconstructPath(parentMap, endKey, startKey) : [];
        const pathCost = path.reduce((sum, cell) => sum + (maze.grid[cell.r][cell.c].weight || 1), 0);

        return {
            name: 'DFS (Depth-First Search)',
            path,
            visitedOrder,
            nodesVisited: visitedOrder.length,
            pathLength: path.length,
            pathCost,
            executionTime: +(t1 - t0).toFixed(2),
            maxFrontierSize: maxFrontier,
            found,
            isOptimal: false
        };
    }

    static *dfsGenerator(maze, start = maze.start, end = maze.end) {
        const startKey = `${start.r},${start.c}`;
        const endKey = `${end.r},${end.c}`;
        const stack = [start];
        const visited = new Set();
        const parentMap = new Map();
        let found = false;

        yield { type: 'start', start, end };

        while (stack.length > 0) {
            const curr = stack.pop();
            const currKey = `${curr.r},${curr.c}`;

            if (visited.has(currKey)) continue;
            visited.add(currKey);

            yield {
                type: 'visit',
                cell: curr,
                frontierSize: stack.length
            };

            if (curr.r === end.r && curr.c === end.c) {
                found = true;
                break;
            }

            const neighbors = maze.getNeighbors(curr.r, curr.c);
            for (let i = neighbors.length - 1; i >= 0; i--) {
                const neighbor = neighbors[i];
                const nKey = `${neighbor.r},${neighbor.c}`;
                if (!visited.has(nKey)) {
                    if (!parentMap.has(nKey)) {
                        parentMap.set(nKey, currKey);
                    }
                    stack.push({ r: neighbor.r, c: neighbor.c });
                    yield { type: 'frontier', cell: neighbor };
                }
            }
        }

        if (found) {
            const path = this.reconstructPath(parentMap, endKey, startKey);
            yield { type: 'path', path };
        } else {
            yield { type: 'not_found' };
        }
    }

    /* =========================================================================
       3. DIJKSTRA'S ALGORITHM
       - Data Structure: Min-Priority Queue
       - Optimality: Guaranteed optimal for non-negative weights
       - Time Complexity: O((V + E) log V)
       - Space Complexity: O(V)
       ========================================================================= */
    static dijkstra(maze, start = maze.start, end = maze.end) {
        const t0 = performance.now();
        const startKey = `${start.r},${start.c}`;
        const endKey = `${end.r},${end.c}`;

        const pq = new MinPriorityQueue();
        const dist = new Map();
        const parentMap = new Map();
        const visitedOrder = [];
        const visited = new Set();
        let maxFrontier = 1;
        let found = false;

        dist.set(startKey, 0);
        pq.push(start, 0);

        while (!pq.isEmpty()) {
            maxFrontier = Math.max(maxFrontier, pq.size());
            const curr = pq.pop();
            const currKey = `${curr.r},${curr.c}`;

            if (visited.has(currKey)) continue;
            visited.add(currKey);
            visitedOrder.push(curr);

            if (curr.r === end.r && curr.c === end.c) {
                found = true;
                break;
            }

            const currentDist = dist.get(currKey);
            const neighbors = maze.getNeighbors(curr.r, curr.c);

            for (const neighbor of neighbors) {
                const nKey = `${neighbor.r},${neighbor.c}`;
                if (visited.has(nKey)) continue;

                const edgeCost = neighbor.weight || 1;
                const newDist = currentDist + edgeCost;

                if (!dist.has(nKey) || newDist < dist.get(nKey)) {
                    dist.set(nKey, newDist);
                    parentMap.set(nKey, currKey);
                    pq.push({ r: neighbor.r, c: neighbor.c }, newDist);
                }
            }
        }

        const t1 = performance.now();
        const path = found ? this.reconstructPath(parentMap, endKey, startKey) : [];
        const pathCost = dist.get(endKey) || 0;

        return {
            name: "Dijkstra's Algorithm",
            path,
            visitedOrder,
            nodesVisited: visitedOrder.length,
            pathLength: path.length,
            pathCost,
            executionTime: +(t1 - t0).toFixed(2),
            maxFrontierSize: maxFrontier,
            found,
            isOptimal: true
        };
    }

    static *dijkstraGenerator(maze, start = maze.start, end = maze.end) {
        const startKey = `${start.r},${start.c}`;
        const endKey = `${end.r},${end.c}`;

        const pq = new MinPriorityQueue();
        const dist = new Map();
        const parentMap = new Map();
        const visited = new Set();
        let found = false;

        dist.set(startKey, 0);
        pq.push(start, 0);

        yield { type: 'start', start, end };

        while (!pq.isEmpty()) {
            const curr = pq.pop();
            const currKey = `${curr.r},${curr.c}`;

            if (visited.has(currKey)) continue;
            visited.add(currKey);

            yield {
                type: 'visit',
                cell: curr,
                frontierSize: pq.size(),
                dist: dist.get(currKey)
            };

            if (curr.r === end.r && curr.c === end.c) {
                found = true;
                break;
            }

            const currentDist = dist.get(currKey);
            const neighbors = maze.getNeighbors(curr.r, curr.c);

            for (const neighbor of neighbors) {
                const nKey = `${neighbor.r},${neighbor.c}`;
                if (visited.has(nKey)) continue;

                const edgeCost = neighbor.weight || 1;
                const newDist = currentDist + edgeCost;

                if (!dist.has(nKey) || newDist < dist.get(nKey)) {
                    dist.set(nKey, newDist);
                    parentMap.set(nKey, currKey);
                    pq.push({ r: neighbor.r, c: neighbor.c }, newDist);
                    yield { type: 'frontier', cell: neighbor };
                }
            }
        }

        if (found) {
            const path = this.reconstructPath(parentMap, endKey, startKey);
            yield { type: 'path', path };
        } else {
            yield { type: 'not_found' };
        }
    }

    /* =========================================================================
       4. A* SEARCH ALGORITHM
       - Data Structure: Min-Priority Queue with f(n) = g(n) + h(n)
       - Optimality: Guaranteed optimal with admissible heuristic
       - Time Complexity: O((V + E) log V) worst-case; often much faster in practice
       - Space Complexity: O(V)
       ========================================================================= */
    static aStar(maze, start = maze.start, end = maze.end, heuristicType = 'manhattan') {
        const t0 = performance.now();
        const startKey = `${start.r},${start.c}`;
        const endKey = `${end.r},${end.c}`;

        const heuristic = heuristicType === 'euclidean'
            ? this.euclideanDistance
            : this.manhattanDistance;

        const pq = new MinPriorityQueue();
        const gScore = new Map();
        const fScore = new Map();
        const parentMap = new Map();
        const visitedOrder = [];
        const visited = new Set();
        let maxFrontier = 1;
        let found = false;

        gScore.set(startKey, 0);
        const initialH = heuristic(start.r, start.c, end.r, end.c);
        fScore.set(startKey, initialH);
        pq.push(start, initialH);

        while (!pq.isEmpty()) {
            maxFrontier = Math.max(maxFrontier, pq.size());
            const curr = pq.pop();
            const currKey = `${curr.r},${curr.c}`;

            if (visited.has(currKey)) continue;
            visited.add(currKey);
            visitedOrder.push(curr);

            if (curr.r === end.r && curr.c === end.c) {
                found = true;
                break;
            }

            const currentG = gScore.get(currKey);
            const neighbors = maze.getNeighbors(curr.r, curr.c);

            for (const neighbor of neighbors) {
                const nKey = `${neighbor.r},${neighbor.c}`;
                if (visited.has(nKey)) continue;

                const edgeCost = neighbor.weight || 1;
                const tentativeG = currentG + edgeCost;

                if (!gScore.has(nKey) || tentativeG < gScore.get(nKey)) {
                    gScore.set(nKey, tentativeG);
                    parentMap.set(nKey, currKey);

                    const h = heuristic(neighbor.r, neighbor.c, end.r, end.c);
                    const f = tentativeG + h;
                    fScore.set(nKey, f);
                    pq.push({ r: neighbor.r, c: neighbor.c }, f);
                }
            }
        }

        const t1 = performance.now();
        const path = found ? this.reconstructPath(parentMap, endKey, startKey) : [];
        const pathCost = gScore.get(endKey) || 0;

        return {
            name: `A* Search (${heuristicType})`,
            path,
            visitedOrder,
            nodesVisited: visitedOrder.length,
            pathLength: path.length,
            pathCost,
            executionTime: +(t1 - t0).toFixed(2),
            maxFrontierSize: maxFrontier,
            found,
            isOptimal: true
        };
    }

    static *aStarGenerator(maze, start = maze.start, end = maze.end, heuristicType = 'manhattan') {
        const startKey = `${start.r},${start.c}`;
        const endKey = `${end.r},${end.c}`;

        const heuristic = heuristicType === 'euclidean'
            ? this.euclideanDistance
            : this.manhattanDistance;

        const pq = new MinPriorityQueue();
        const gScore = new Map();
        const fScore = new Map();
        const parentMap = new Map();
        const visited = new Set();
        let found = false;

        gScore.set(startKey, 0);
        const initialH = heuristic(start.r, start.c, end.r, end.c);
        fScore.set(startKey, initialH);
        pq.push(start, initialH);

        yield { type: 'start', start, end };

        while (!pq.isEmpty()) {
            const curr = pq.pop();
            const currKey = `${curr.r},${curr.c}`;

            if (visited.has(currKey)) continue;
            visited.add(currKey);

            yield {
                type: 'visit',
                cell: curr,
                frontierSize: pq.size(),
                f: fScore.get(currKey),
                g: gScore.get(currKey)
            };

            if (curr.r === end.r && curr.c === end.c) {
                found = true;
                break;
            }

            const currentG = gScore.get(currKey);
            const neighbors = maze.getNeighbors(curr.r, curr.c);

            for (const neighbor of neighbors) {
                const nKey = `${neighbor.r},${neighbor.c}`;
                if (visited.has(nKey)) continue;

                const edgeCost = neighbor.weight || 1;
                const tentativeG = currentG + edgeCost;

                if (!gScore.has(nKey) || tentativeG < gScore.get(nKey)) {
                    gScore.set(nKey, tentativeG);
                    parentMap.set(nKey, currKey);

                    const h = heuristic(neighbor.r, neighbor.c, end.r, end.c);
                    const f = tentativeG + h;
                    fScore.set(nKey, f);
                    pq.push({ r: neighbor.r, c: neighbor.c }, f);
                    yield { type: 'frontier', cell: neighbor };
                }
            }
        }

        if (found) {
            const path = this.reconstructPath(parentMap, endKey, startKey);
            yield { type: 'path', path };
        } else {
            yield { type: 'not_found' };
        }
    }

    // Run all 4 algorithms on identical maze clone for comparison
    static compareAll(maze, start = maze.start, end = maze.end) {
        return {
            bfs: this.bfs(maze, start, end),
            dfs: this.dfs(maze, start, end),
            dijkstra: this.dijkstra(maze, start, end),
            aStar: this.aStar(maze, start, end, 'manhattan')
        };
    }
}

window.PathfindingAlgorithms = PathfindingAlgorithms;
