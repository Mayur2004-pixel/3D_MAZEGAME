// HTML5 Canvas 3D & Isometric Visualizer Engine
// Features: True 3D Isometric Projection, 2.5D Extruded Relief, 3D Dynamic Tilt,
// 3D Spherical Players with Gyro Orbiters, Spinning Octahedron Gems,
// Multi-ring Cosmic Portals, Floating Island Citadel Bedrock, and 60 FPS Animation Loop.

class MazeVisualizer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.maze = null;

        // View Mode: 'iso3d' (default 3D isometric), 'tilt3d' (dynamic 3D tilt arena), 'depth25d' (2.5D relief), 'flat2d' (classic 2D)
        this.viewMode = 'iso3d';
        this.wallHeightFactor = 0.65; // 0.1 to 1.5
        this.fxEnabled = true;
        this.activeAlgorithm = 'default';

        // Orthogonal 2D/2.5D sizing
        this.cellSize = 20;
        this.offsetX = 0;
        this.offsetY = 0;

        // Isometric 3D sizing
        this.isoCellW = 24;  // half-width of isometric tile diamond
        this.isoCellH = 12;  // half-height of isometric tile diamond
        this.isoCenterX = 0;
        this.isoCenterY = 0;

        // Visual state
        this.visitedCells = new Set();
        this.frontierCells = new Set();
        this.pathCells = [];
        this.players = []; // [{ r, c, color, trail: [], name }]
        this.fogOfWar = false;
        this.fogRadius = 4.5;

        // Animation & time
        this.animFrame = null;
        this.time = 0;

        // Style theme colors
        this.theme = {
            bg: '#060911',
            wallTop: '#2e3d54',
            wallTopBorder: 'rgba(56, 189, 248, 0.45)',
            wallLeft: '#1c283c',
            wallRight: '#101826',
            passage: '#0c1220',
            passageBorder: 'rgba(255, 255, 255, 0.03)',
            mud: '#2c1a0c',
            mudBorder: '#5c3616',
            water: '#092540',
            waterBorder: '#144c7a',
            start: '#10b981',
            end: '#f59e0b',
            coin: '#fbbf24',
            visited: 'rgba(56, 189, 248, 0.32)',
            frontier: 'rgba(251, 191, 36, 0.45)',
            path: '#38bdf8',
            pathGlow: 'rgba(56, 189, 248, 0.6)'
        };

        this.setupResize();
        this.startAnimationLoop();
    }

    setMaze(maze) {
        this.maze = maze;
        this.clearOverlay();
        this.resize();
        this.render();
    }

    clearOverlay() {
        this.visitedCells.clear();
        this.frontierCells.clear();
        this.pathCells = [];
    }

    setViewMode(mode) {
        this.viewMode = mode;
        this.resize();
        this.render();
    }

    setWallHeight(val) {
        this.wallHeightFactor = Math.max(0.1, Math.min(1.5, val));
        this.resize();
        this.render();
    }

    toggleFX() {
        this.fxEnabled = !this.fxEnabled;
        this.render();
        return this.fxEnabled;
    }

    setupResize() {
        window.addEventListener('resize', () => {
            this.resize();
            this.render();
        });
    }

    startAnimationLoop() {
        if (this.animFrame) return;
        const tick = () => {
            this.time += 0.035;
            this.render(this.activeAlgorithm);
            this.animFrame = requestAnimationFrame(tick);
        };
        this.animFrame = requestAnimationFrame(tick);
    }

    stopAnimationLoop() {
        if (this.animFrame) {
            cancelAnimationFrame(this.animFrame);
            this.animFrame = null;
        }
    }

    resize() {
        if (!this.canvas || !this.maze) return;
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        // Set high-DPI internal buffer dimensions
        this.canvas.width = Math.floor(rect.width * dpr);
        this.canvas.height = Math.floor(rect.height * dpr);

        const margin = 24 * dpr;
        const availW = Math.max(100, this.canvas.width - margin * 2);
        const availH = Math.max(100, this.canvas.height - margin * 2);

        const rows = this.maze.rows;
        const cols = this.maze.cols;

        // 1. Orthogonal cell sizing (for 'tilt3d', 'depth25d', 'flat2d')
        const cellW = availW / cols;
        const cellH = availH / rows;
        this.cellSize = Math.max(6 * dpr, Math.min(cellW, cellH));
        const totalOrthW = this.cellSize * cols;
        const totalOrthH = this.cellSize * rows;
        this.offsetX = Math.floor((this.canvas.width - totalOrthW) / 2);
        this.offsetY = Math.floor((this.canvas.height - totalOrthH) / 2);

        // 2. Isometric cell sizing (for 'iso3d')
        // Total grid span in isometric diamond is (rows + cols)
        const N = rows + cols;
        // Half-width of an isometric diamond tile
        let csW = availW / N;
        let csH = csW * 0.5;
        // Total 3D vertical extent includes isometric diamond height plus wall extrusion height
        const wallH = csH * (this.wallHeightFactor * 1.5);
        const totalIsoH = N * csH + wallH + 30 * dpr;

        if (totalIsoH > availH) {
            csH = (availH - 30 * dpr) / (N + this.wallHeightFactor * 1.5);
            csW = csH * 2.0;
        }

        this.isoCellW = Math.max(4 * dpr, csW);
        this.isoCellH = Math.max(2 * dpr, csH);

        // Center isometric grid symmetrically on canvas
        // x reaches from cx - (rows-1)*csW to cx + (cols-1)*csW
        this.isoCenterX = Math.floor(this.canvas.width / 2 + ((rows - cols) / 2) * this.isoCellW);
        // y reaches from (cy - wallH) to (cy + N * csH)
        this.isoCenterY = Math.floor((this.canvas.height - N * this.isoCellH + wallH) / 2);
    }

    // Convert grid coordinates to canvas pixel coordinates
    cellToPixel(r, c) {
        if (this.viewMode === 'iso3d') {
            return {
                x: this.isoCenterX + (c - r) * this.isoCellW,
                y: this.isoCenterY + (c + r) * this.isoCellH
            };
        } else {
            return {
                x: this.offsetX + c * this.cellSize,
                y: this.offsetY + r * this.cellSize
            };
        }
    }

    // Convert mouse/touch pixel coordinates to grid cell
    pixelToCell(px, py) {
        if (!this.maze) return null;
        const dpr = window.devicePixelRatio || 1;
        const canvasX = px * dpr;
        const canvasY = py * dpr;

        if (this.viewMode === 'iso3d') {
            const dx = (canvasX - this.isoCenterX) / this.isoCellW;
            const dy = (canvasY - this.isoCenterY) / this.isoCellH - 1.0;

            const c = Math.floor((dx + dy) / 2 + 0.5);
            const r = Math.floor((dy - dx) / 2 + 0.5);

            if (this.maze.isValid(r, c)) {
                return { r, c };
            }
            return null;
        } else {
            const c = Math.floor((canvasX - this.offsetX) / this.cellSize);
            const r = Math.floor((canvasY - this.offsetY) / this.cellSize);

            if (this.maze.isValid(r, c)) {
                return { r, c };
            }
            return null;
        }
    }

    // Main render frame entrypoint
    render(activeAlgorithm = 'default') {
        if (!this.maze || !this.ctx) return;
        this.activeAlgorithm = activeAlgorithm;

        if (this.viewMode === 'iso3d') {
            this.renderIsometric();
        } else if (this.viewMode === 'flat2d') {
            this.renderOrthogonal(false);
        } else {
            // 'tilt3d' or 'depth25d'
            this.renderOrthogonal(true);
        }
    }

    // =========================================================================
    // 1. TRUE 3D ISOMETRIC ENGINE (Extruded Blocks, Floating Island, Dynamic 3D)
    // =========================================================================
    renderIsometric() {
        const ctx = this.ctx;
        const { rows, cols } = this.maze;
        const csW = this.isoCellW;
        const csH = this.isoCellH;
        const wallH = csH * (this.wallHeightFactor * 1.5);

        // 1. Deep Celestial Cyber Background
        const bgGrad = ctx.createRadialGradient(
            this.canvas.width / 2, this.canvas.height / 2, 20,
            this.canvas.width / 2, this.canvas.height / 2, Math.max(this.canvas.width, this.canvas.height) * 0.7
        );
        bgGrad.addColorStop(0, '#0c1424');
        bgGrad.addColorStop(0.5, '#070b14');
        bgGrad.addColorStop(1, '#030509');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 2. Draw 3D Floating Citadel Bedrock Island Base
        this.drawIsoFloatingIslandBase(rows, cols, csW, csH, wallH);

        // 3. PASS 1: Ground Floor Corridors, Terrain, Visited Overlay & Solution Path
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = this.maze.grid[r][c];
                const pt = this.cellToPixel(r, c);

                if (!cell.isWall) {
                    this.drawIsoFloorTile(pt.x, pt.y, csW, csH, cell);
                }
            }
        }

        // Visited Nodes Overlay (Isometric)
        if (this.visitedCells.size > 0) {
            const visitedColor = this.getAlgoColor(this.activeAlgorithm, 0.4);
            for (const key of this.visitedCells) {
                const [r, c] = key.split(',').map(Number);
                const pt = this.cellToPixel(r, c);
                this.drawIsoDiamond(pt.x, pt.y, csW, csH, visitedColor, 'rgba(56, 189, 248, 0.3)', 1);
            }
        }

        // Frontier Nodes Overlay
        if (this.frontierCells.size > 0) {
            for (const key of this.frontierCells) {
                const [r, c] = key.split(',').map(Number);
                const pt = this.cellToPixel(r, c);
                this.drawIsoDiamond(pt.x, pt.y, csW, csH, 'rgba(251, 191, 36, 0.5)', '#fbbf24', 1.5);
            }
        }

        // Optimal Solution Path (3D Glowing Neon Conduit)
        if (this.pathCells.length > 1) {
            this.drawIsoSolutionPath(csW, csH, wallH);
        }

        // 4. PASS 2: 3D Extruded Walls, Gems, Markers & Players in Painter's Order (Back-to-Front)
        // Group entities by coordinate
        const playerMap = new Map();
        for (const p of this.players) {
            const k = `${p.r},${p.c}`;
            if (!playerMap.has(k)) playerMap.set(k, []);
            playerMap.get(k).push(p);
        }

        // Diagonal slices from s = 0 to (rows + cols - 2)
        const totalSlices = rows + cols - 1;
        for (let s = 0; s < totalSlices; s++) {
            const minR = Math.max(0, s - cols + 1);
            const maxR = Math.min(rows - 1, s);

            for (let r = minR; r <= maxR; r++) {
                const c = s - r;
                const cell = this.maze.grid[r][c];
                const pt = this.cellToPixel(r, c);

                if (cell.isWall) {
                    this.drawIsoWallBlock(r, c, pt.x, pt.y, csW, csH, wallH);
                } else {
                    // Check Start Marker
                    if (r === this.maze.start.r && c === this.maze.start.c) {
                        this.drawIsoStartPad(pt.x, pt.y, csW, csH, wallH);
                    }

                    // Check Exit Portal
                    if (r === this.maze.end.r && c === this.maze.end.c) {
                        this.drawIsoExitPortal(pt.x, pt.y, csW, csH, wallH);
                    }

                    // Check Collectible Gem
                    const coinKey = `${r},${c}`;
                    if (this.maze.coins && this.maze.coins.has(coinKey)) {
                        this.drawIsoGem(r, c, pt.x, pt.y, csW, csH, wallH);
                    }

                    // Check Players / Bots
                    if (playerMap.has(coinKey)) {
                        const plist = playerMap.get(coinKey);
                        for (const p of plist) {
                            this.drawIsoPlayer(p, pt.x, pt.y, csW, csH, wallH);
                        }
                    }
                }
            }
        }

        // 5. Fog of War in 3D
        if (this.fogOfWar && this.players.length > 0) {
            this.renderIsoFogOfWar(csW, csH);
        }
    }

    // Draw the 3D bedrock island pedestal beneath the maze
    drawIsoFloatingIslandBase(rows, cols, csW, csH, wallH) {
        const ctx = this.ctx;
        const depth = Math.max(16, csH * 2.5);

        // Bottom perimeter vertices: (rows-1, 0) -> (rows-1, cols-1) -> (0, cols-1)
        const pLeft = this.cellToPixel(rows - 1, 0);
        const pBottom = this.cellToPixel(rows - 1, cols - 1);
        const pRight = this.cellToPixel(0, cols - 1);
        const pTop = this.cellToPixel(0, 0);

        // Floor outer diamond perimeter
        const vLeft = { x: pLeft.x - csW, y: pLeft.y + csH };
        const vBottom = { x: pBottom.x, y: pBottom.y + 2 * csH };
        const vRight = { x: pRight.x + csW, y: pRight.y + csH };
        const vTop = { x: pTop.x, y: pTop.y };

        // Soft Void Drop Shadow beneath floating island
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(vBottom.x, vBottom.y + depth * 0.9, (vRight.x - vLeft.x) * 0.45, csH * (rows + cols) * 0.35, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.filter = 'blur(16px)';
        ctx.fill();
        ctx.restore();

        // 1. South-West Island Cliff Face
        ctx.beginPath();
        ctx.moveTo(vLeft.x, vLeft.y);
        ctx.lineTo(vBottom.x, vBottom.y);
        ctx.lineTo(vBottom.x, vBottom.y + depth);
        ctx.lineTo(vLeft.x, vLeft.y + depth);
        ctx.closePath();
        const cliffGradLeft = ctx.createLinearGradient(vLeft.x, vLeft.y, vBottom.x, vBottom.y + depth);
        cliffGradLeft.addColorStop(0, '#131e33');
        cliffGradLeft.addColorStop(0.5, '#0a101d');
        cliffGradLeft.addColorStop(1, '#04060b');
        ctx.fillStyle = cliffGradLeft;
        ctx.fill();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 2. South-East Island Cliff Face
        ctx.beginPath();
        ctx.moveTo(vBottom.x, vBottom.y);
        ctx.lineTo(vRight.x, vRight.y);
        ctx.lineTo(vRight.x, vRight.y + depth);
        ctx.lineTo(vBottom.x, vBottom.y + depth);
        ctx.closePath();
        const cliffGradRight = ctx.createLinearGradient(vBottom.x, vBottom.y, vRight.x, vRight.y + depth);
        cliffGradRight.addColorStop(0, '#0d1524');
        cliffGradRight.addColorStop(0.5, '#060a12');
        cliffGradRight.addColorStop(1, '#020306');
        ctx.fillStyle = cliffGradRight;
        ctx.fill();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
        ctx.stroke();

        // Glowing cyan energy runner along the bottom rim of the citadel
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(vLeft.x, vLeft.y + depth);
        ctx.lineTo(vBottom.x, vBottom.y + depth);
        ctx.lineTo(vRight.x, vRight.y + depth);
        ctx.strokeStyle = 'rgba(0, 242, 254, 0.55)';
        ctx.shadowColor = '#00f2fe';
        ctx.shadowBlur = 10;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    }

    // Draw an isometric diamond polygon
    drawIsoDiamond(x, y, csW, csH, fillStyle, strokeStyle = null, lineWidth = 1) {
        const ctx = this.ctx;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + csW, y + csH);
        ctx.lineTo(x, y + 2 * csH);
        ctx.lineTo(x - csW, y + csH);
        ctx.closePath();

        if (fillStyle) {
            ctx.fillStyle = fillStyle;
            ctx.fill();
        }
        if (strokeStyle) {
            ctx.strokeStyle = strokeStyle;
            ctx.lineWidth = lineWidth;
            ctx.stroke();
        }
    }

    // Draw an isometric passage floor tile (plain, mud, water)
    drawIsoFloorTile(x, y, csW, csH, cell) {
        const ctx = this.ctx;

        if (cell.type === 'mud') {
            // Sunken Mud Trench
            this.drawIsoDiamond(x, y, csW, csH, this.theme.mud, this.theme.mudBorder, 1);
            // Mud bubbles texture
            if (this.fxEnabled && csW >= 10) {
                const bubblePulse = Math.sin(this.time * 3 + x) * 1.5;
                ctx.fillStyle = '#653a15';
                ctx.beginPath();
                ctx.arc(x, y + csH, Math.max(1, csH * 0.2 + bubblePulse), 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (cell.type === 'water') {
            // Sunken Water Trench with wave shimmer
            const wave = Math.sin(this.time * 2.5 + (x + y) * 0.05) * 0.15 + 0.85;
            const waterGrad = ctx.createLinearGradient(x - csW, y, x + csW, y + 2 * csH);
            waterGrad.addColorStop(0, '#0c2e50');
            waterGrad.addColorStop(0.5, '#084070');
            waterGrad.addColorStop(1, '#05223a');
            this.drawIsoDiamond(x, y, csW, csH, waterGrad, this.theme.waterBorder, 1);

            if (this.fxEnabled && csW >= 10) {
                ctx.strokeStyle = `rgba(56, 189, 248, ${0.4 * wave})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x - csW * 0.4, y + csH);
                ctx.lineTo(x + csW * 0.4, y + csH);
                ctx.stroke();
            }
        } else {
            // Tech Corridor Tile
            this.drawIsoDiamond(x, y, csW, csH, this.theme.passage, this.theme.passageBorder, 0.75);
            // Subtle cyber center pip
            if (csW >= 14) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
                ctx.fillRect(x - 1, y + csH - 1, 2, 2);
            }
        }
    }

    // Draw an extruded 3D Isometric Wall Block with directional lighting
    drawIsoWallBlock(r, c, x, y, csW, csH, wallH) {
        const ctx = this.ctx;

        // Cast drop shadow into adjacent floor corridors (South / East neighbors)
        if (r < this.maze.rows - 1 && !this.maze.grid[r + 1][c].isWall) {
            // Shadow onto South-West passage
            ctx.beginPath();
            ctx.moveTo(x - csW, y + csH);
            ctx.lineTo(x, y + 2 * csH);
            ctx.lineTo(x - csW * 0.6, y + 2 * csH + csH * 0.6);
            ctx.lineTo(x - csW * 1.4, y + csH + csH * 0.6);
            ctx.closePath();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
            ctx.fill();
        }

        // 1. Front-Left Face (facing partially toward top-left light)
        ctx.beginPath();
        ctx.moveTo(x - csW, y + csH);
        ctx.lineTo(x, y + 2 * csH);
        ctx.lineTo(x, y + 2 * csH - wallH);
        ctx.lineTo(x - csW, y + csH - wallH);
        ctx.closePath();

        const gradLeft = ctx.createLinearGradient(x - csW, y + csH - wallH, x, y + 2 * csH);
        gradLeft.addColorStop(0, '#24344c');
        gradLeft.addColorStop(0.5, '#172233');
        gradLeft.addColorStop(1, '#0c1320');
        ctx.fillStyle = gradLeft;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 0.75;
        ctx.stroke();

        // 2. Front-Right Face (in shadow, facing away from light)
        ctx.beginPath();
        ctx.moveTo(x, y + 2 * csH);
        ctx.lineTo(x + csW, y + csH);
        ctx.lineTo(x + csW, y + csH - wallH);
        ctx.lineTo(x, y + 2 * csH - wallH);
        ctx.closePath();

        const gradRight = ctx.createLinearGradient(x, y + 2 * csH - wallH, x + csW, y + csH);
        gradRight.addColorStop(0, '#152030');
        gradRight.addColorStop(0.5, '#0e1622');
        gradRight.addColorStop(1, '#070b12');
        ctx.fillStyle = gradRight;
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 0.75;
        ctx.stroke();

        // 3. Top Elevated Cap (illuminated directly from above)
        ctx.beginPath();
        ctx.moveTo(x, y - wallH);
        ctx.lineTo(x + csW, y + csH - wallH);
        ctx.lineTo(x, y + 2 * csH - wallH);
        ctx.lineTo(x - csW, y + csH - wallH);
        ctx.closePath();

        const gradTop = ctx.createLinearGradient(x - csW, y - wallH, x + csW, y + 2 * csH - wallH);
        gradTop.addColorStop(0, '#3d4f6c');
        gradTop.addColorStop(0.6, '#2a384e');
        gradTop.addColorStop(1, '#1b2434');
        ctx.fillStyle = gradTop;
        ctx.fill();

        // Glowing neon bevel rim
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Subtle micro-circuit core on wall top
        if (csW >= 14 && this.fxEnabled) {
            ctx.fillStyle = 'rgba(0, 242, 254, 0.3)';
            ctx.beginPath();
            ctx.arc(x, y + csH - wallH, Math.max(1, csW * 0.12), 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Draw 3D Isometric Start Platform
    drawIsoStartPad(x, y, csW, csH, wallH) {
        const ctx = this.ctx;
        const cx = x;
        const cy = y + csH;

        // Base green glow diamond
        this.drawIsoDiamond(x, y, csW * 0.85, csH * 0.85, 'rgba(16, 185, 129, 0.35)', '#10b981', 1.5);

        // Raised teleportation platform
        const lift = csH * 0.4;
        ctx.save();
        this.drawIsoDiamond(x, y - lift, csW * 0.7, csH * 0.7, '#059669', '#34d399', 1.5);

        // Holographic 'S' glyph
        if (csW >= 12) {
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.floor(csW * 0.65)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = '#10b981';
            ctx.shadowBlur = 8;
            ctx.fillText('S', cx, cy - lift);
        }
        ctx.restore();
    }

    // Draw 3D Cosmic Exit Portal (Multi-ring spinning gyro with central light pillar)
    drawIsoExitPortal(x, y, csW, csH, wallH) {
        const ctx = this.ctx;
        const cx = x;
        const cy = y + csH;
        const radius = csW * 0.65;

        ctx.save();

        // Vertical glowing light pillar rising upwards into the cosmos
        const beamH = wallH * 2.2 + csH * 2;
        const beamGrad = ctx.createLinearGradient(cx, cy, cx, cy - beamH);
        beamGrad.addColorStop(0, 'rgba(245, 158, 11, 0.6)');
        beamGrad.addColorStop(0.5, 'rgba(251, 191, 36, 0.3)');
        beamGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
        ctx.fillStyle = beamGrad;
        ctx.fillRect(cx - radius * 0.4, cy - beamH, radius * 0.8, beamH);

        // Ground runic energy ring
        ctx.beginPath();
        ctx.ellipse(cx, cy, radius, radius * 0.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(245, 158, 11, 0.35)';
        ctx.fill();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 12;
        ctx.stroke();

        // 3D Spinning Cosmic Rings
        if (this.fxEnabled) {
            const rot1 = this.time * 2.0;
            const rot2 = -this.time * 2.5;

            // Ring 1
            ctx.beginPath();
            ctx.ellipse(cx, cy - csH * 0.6, radius * 0.75, radius * 0.3, rot1, 0, Math.PI * 2);
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Ring 2
            ctx.beginPath();
            ctx.ellipse(cx, cy - csH * 0.6, radius * 0.55, radius * 0.22, rot2, 0, Math.PI * 2);
            ctx.strokeStyle = '#fef08a';
            ctx.lineWidth = 1.2;
            ctx.stroke();
        }

        // Floating luminous golden core
        ctx.beginPath();
        ctx.arc(cx, cy - csH * 0.6, Math.max(3, radius * 0.3), 0, Math.PI * 2);
        ctx.fillStyle = '#fef08a';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 14;
        ctx.fill();

        if (csW >= 12) {
            ctx.fillStyle = '#78350f';
            ctx.font = `bold ${Math.floor(csW * 0.5)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowBlur = 0;
            ctx.fillText('E', cx, cy - csH * 0.6);
        }

        ctx.restore();
    }

    // Draw 3D Rotating Octahedron Gem / Crystal (Floating with sine bounce and ground shadow)
    drawIsoGem(r, c, x, y, csW, csH, wallH) {
        const ctx = this.ctx;
        const cx = x;
        const cy = y + csH;
        const gemR = Math.max(3, csW * 0.32);

        // Sine wave floating height
        const bounce = Math.sin(this.time * 3 + r * 0.8 + c * 0.5) * (csH * 0.25);
        const floatH = csH * 0.8 + bounce;

        // Ground shadow (scales with bounce)
        ctx.save();
        const shadowScale = 1.0 - (bounce / (csH * 0.5)) * 0.3;
        ctx.beginPath();
        ctx.ellipse(cx, cy, gemR * shadowScale, gemR * 0.5 * shadowScale, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fill();

        // 3D Rotating Gem Facets
        const rot = this.time * 2.2 + r + c;
        const gemCenterY = cy - floatH;

        // Vertices of rotating octahedron:
        // Top vertex, Bottom vertex, 4 equatorial vertices
        const vTop = { x: cx, y: gemCenterY - gemR * 1.3 };
        const vBottom = { x: cx, y: gemCenterY + gemR * 1.3 };

        const eq = [];
        for (let i = 0; i < 4; i++) {
            const angle = rot + i * (Math.PI / 2);
            eq.push({
                x: cx + Math.cos(angle) * gemR,
                y: gemCenterY + Math.sin(angle) * (gemR * 0.45),
                z: Math.sin(angle) // depth indicator for lighting
            });
        }

        // Draw facets facing camera (front 2 top facets, front 2 bottom facets)
        for (let i = 0; i < 4; i++) {
            const next = (i + 1) % 4;
            // Cross product normal Z test
            const normZ = (eq[next].x - cx) * (eq[i].y - vTop.y) - (eq[next].y - vTop.y) * (eq[i].x - cx);
            if (normZ > 0) {
                // Top pyramid facet
                ctx.beginPath();
                ctx.moveTo(vTop.x, vTop.y);
                ctx.lineTo(eq[i].x, eq[i].y);
                ctx.lineTo(eq[next].x, eq[next].y);
                ctx.closePath();

                // Directional specular facet color
                const brightness = Math.max(0.3, Math.min(1.0, 0.6 + eq[i].z * 0.4));
                ctx.fillStyle = `rgba(251, 191, 36, ${brightness})`;
                ctx.fill();
                ctx.strokeStyle = '#fef08a';
                ctx.lineWidth = 0.5;
                ctx.stroke();

                // Bottom pyramid facet
                ctx.beginPath();
                ctx.moveTo(vBottom.x, vBottom.y);
                ctx.lineTo(eq[next].x, eq[next].y);
                ctx.lineTo(eq[i].x, eq[i].y);
                ctx.closePath();
                ctx.fillStyle = `rgba(217, 119, 6, ${brightness * 0.8})`;
                ctx.fill();
                ctx.stroke();
            }
        }

        // Specular glint
        if (this.fxEnabled) {
            ctx.beginPath();
            ctx.arc(cx - gemR * 0.25, gemCenterY - gemR * 0.35, Math.max(1, gemR * 0.2), 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 8;
            ctx.fill();
        }

        ctx.restore();
    }

    // Draw 3D Spherical Player with Gyro Orbiting Ring and Ground Shadow
    drawIsoPlayer(p, x, y, csW, csH, wallH) {
        const ctx = this.ctx;
        const cx = x;
        const cy = y + csH;
        const radius = Math.max(4, csW * 0.4);

        // Hover bobbing
        const hover = Math.sin(this.time * 4 + (p.id === 'ai' ? 2 : p.id)) * (csH * 0.2);
        const playerY = cy - csH * 0.5 - hover;

        ctx.save();

        // 1. Realistic ground shadow
        ctx.beginPath();
        ctx.ellipse(cx, cy, radius * 1.0, radius * 0.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fill();

        // 2. Trailing Light Ribbon
        if (p.trail && p.trail.length > 1) {
            ctx.beginPath();
            for (let i = 0; i < p.trail.length; i++) {
                const tpt = this.cellToPixel(p.trail[i].r, p.trail[i].c);
                const tx = tpt.x;
                const ty = tpt.y + csH;
                if (i === 0) ctx.moveTo(tx, ty);
                else ctx.lineTo(tx, ty);
            }
            ctx.strokeStyle = p.color;
            ctx.lineWidth = Math.max(2, csW * 0.25);
            ctx.globalAlpha = 0.35;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 8;
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }

        // 3. Tilted 3D Orbiting Gyro Ring
        if (this.fxEnabled) {
            ctx.beginPath();
            const ringTilt = Math.PI * 0.3 + Math.sin(this.time * 2.5) * 0.2;
            ctx.ellipse(cx, playerY, radius * 1.45, radius * 0.45, ringTilt, 0, Math.PI * 2);
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 1.5;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 10;
            ctx.stroke();
        }

        // 4. Shaded 3D Sphere Body
        const sphereGrad = ctx.createRadialGradient(
            cx - radius * 0.35, playerY - radius * 0.35, radius * 0.1,
            cx, playerY, radius
        );
        sphereGrad.addColorStop(0, '#ffffff');
        sphereGrad.addColorStop(0.3, p.color);
        sphereGrad.addColorStop(0.75, p.color);
        sphereGrad.addColorStop(1, '#05121e');

        ctx.beginPath();
        ctx.arc(cx, playerY, radius, 0, Math.PI * 2);
        ctx.fillStyle = sphereGrad;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 14;
        ctx.fill();

        // 5. Player Tag
        if (p.name && csW >= 12) {
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.floor(csW * 0.45)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = '#000000';
            ctx.shadowBlur = 4;
            ctx.fillText(p.name, cx, playerY);
        }

        ctx.restore();
    }

    // Draw 3D Isometric Solution Path
    drawIsoSolutionPath(csW, csH, wallH) {
        const ctx = this.ctx;
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Ground shadow for laser beam
        ctx.beginPath();
        for (let i = 0; i < this.pathCells.length; i++) {
            const pt = this.cellToPixel(this.pathCells[i].r, this.pathCells[i].c);
            const px = pt.x;
            const py = pt.y + csH;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.lineWidth = Math.max(3, csW * 0.45);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.stroke();

        // Elevated Glowing 3D Laser Conduit
        const lift = csH * 0.4;
        ctx.beginPath();
        for (let i = 0; i < this.pathCells.length; i++) {
            const pt = this.cellToPixel(this.pathCells[i].r, this.pathCells[i].c);
            const px = pt.x;
            const py = pt.y + csH - lift;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.lineWidth = Math.max(3, csW * 0.35);
        ctx.strokeStyle = '#38bdf8';
        ctx.shadowColor = '#00f2fe';
        ctx.shadowBlur = 14;
        ctx.stroke();

        // Laser core white beam
        ctx.lineWidth = Math.max(1, csW * 0.12);
        ctx.strokeStyle = '#ffffff';
        ctx.shadowBlur = 4;
        ctx.stroke();

        ctx.restore();
    }

    // Torchlight Fog of War in Isometric 3D
    renderIsoFogOfWar(csW, csH) {
        const ctx = this.ctx;
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';

        for (const p of this.players) {
            const pt = this.cellToPixel(p.r, p.c);
            const cx = pt.x;
            const cy = pt.y + csH;
            const rPx = this.fogRadius * csW * 1.5;

            const grad = ctx.createRadialGradient(cx, cy, rPx * 0.2, cx, cy, rPx);
            grad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
            grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.8)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(cx, cy, rPx, 0, Math.PI * 2);
            ctx.fill();
        }

        // Illuminate Exit Portal
        const endPt = this.cellToPixel(this.maze.end.r, this.maze.end.c);
        const endX = endPt.x;
        const endY = endPt.y + csH;
        const endGrad = ctx.createRadialGradient(endX, endY, csW * 0.3, endX, endY, csW * 3.5);
        endGrad.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
        endGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = endGrad;
        ctx.beginPath();
        ctx.arc(endX, endY, csW * 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // =========================================================================
    // 2. ORTHOGONAL & 2.5D RELIEF ENGINE ('tilt3d', 'depth25d', 'flat2d')
    // =========================================================================
    renderOrthogonal(is3D = true) {
        const ctx = this.ctx;
        const { rows, cols } = this.maze;
        const cs = this.cellSize;
        const wallExtrude = is3D ? Math.max(3, cs * (this.wallHeightFactor * 0.38)) : 0;

        // Background
        ctx.fillStyle = this.theme.bg;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 1. Draw Passages & Floor Terrain
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = this.maze.grid[r][c];
                const { x, y } = this.cellToPixel(r, c);

                if (cell.isWall) {
                    if (!is3D) {
                        ctx.fillStyle = this.theme.wallTop;
                        ctx.fillRect(x, y, cs, cs);
                        ctx.strokeStyle = this.theme.wallTopBorder;
                        ctx.lineWidth = 1;
                        ctx.strokeRect(x, y, cs, cs);
                    }
                } else {
                    if (cell.type === 'mud') {
                        ctx.fillStyle = this.theme.mud;
                        ctx.fillRect(x, y, cs, cs);
                        ctx.strokeStyle = this.theme.mudBorder;
                        ctx.strokeRect(x, y, cs, cs);
                    } else if (cell.type === 'water') {
                        ctx.fillStyle = this.theme.water;
                        ctx.fillRect(x, y, cs, cs);
                        ctx.strokeStyle = this.theme.waterBorder;
                        ctx.strokeRect(x, y, cs, cs);
                    } else {
                        ctx.fillStyle = this.theme.passage;
                        ctx.fillRect(x, y, cs, cs);
                    }
                }
            }
        }

        // 2. Visited Nodes Overlay
        if (this.visitedCells.size > 0) {
            ctx.fillStyle = this.getAlgoColor(this.activeAlgorithm, 0.35);
            for (const key of this.visitedCells) {
                const [r, c] = key.split(',').map(Number);
                const { x, y } = this.cellToPixel(r, c);
                ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2);
            }
        }

        // 3. Frontier Nodes Overlay
        if (this.frontierCells.size > 0) {
            ctx.fillStyle = this.theme.frontier;
            for (const key of this.frontierCells) {
                const [r, c] = key.split(',').map(Number);
                const { x, y } = this.cellToPixel(r, c);
                ctx.fillRect(x + 2, y + 2, cs - 4, cs - 4);
            }
        }

        // 4. In 2.5D mode, render extruded 3D Wall Blocks with drop shadows
        if (is3D) {
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const cell = this.maze.grid[r][c];
                    if (cell.isWall) {
                        const { x, y } = this.cellToPixel(r, c);
                        this.drawTopDown3DWall(x, y, cs, wallExtrude, r, c);
                    }
                }
            }
        }

        // 5. Solution Path
        if (this.pathCells.length > 1) {
            ctx.save();
            ctx.lineWidth = Math.max(3, cs * 0.35);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = '#38bdf8';
            ctx.shadowColor = '#00f2fe';
            ctx.shadowBlur = is3D ? 14 : 6;

            ctx.beginPath();
            const first = this.cellToPixel(this.pathCells[0].r, this.pathCells[0].c);
            ctx.moveTo(first.x + cs / 2, first.y + cs / 2);

            for (let i = 1; i < this.pathCells.length; i++) {
                const pt = this.cellToPixel(this.pathCells[i].r, this.pathCells[i].c);
                ctx.lineTo(pt.x + cs / 2, pt.y + cs / 2);
            }
            ctx.stroke();
            ctx.restore();
        }

        // 6. Collectible Gems
        if (this.maze.coins && this.maze.coins.size > 0) {
            for (const coord of this.maze.coins) {
                const [r, c] = coord.split(',').map(Number);
                const { x, y } = this.cellToPixel(r, c);
                this.drawTopDownGem(x, y, cs, is3D);
            }
        }

        // 7. Start & End Markers
        this.drawTopDownMarker(this.maze.start.r, this.maze.start.c, this.theme.start, 'S', is3D);
        this.drawTopDownExit(this.maze.end.r, this.maze.end.c, cs, is3D);

        // 8. Players
        for (const p of this.players) {
            this.drawTopDownPlayer(p, cs, is3D);
        }

        // 9. Fog of War
        if (this.fogOfWar && this.players.length > 0) {
            this.renderOrthogonalFogOfWar();
        }
    }

    // 2.5D Extruded Wall Block with bevel and directional drop shadow
    drawTopDown3DWall(x, y, cs, h, r, c) {
        const ctx = this.ctx;

        // Soft drop shadow cast to south-east
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(x + h * 0.5, y + h * 0.5, cs, cs);

        // South extruded face
        ctx.fillStyle = '#172233';
        ctx.fillRect(x, y + cs - h * 0.5, cs, h * 0.5);

        // East extruded face
        ctx.fillStyle = '#0f1622';
        ctx.fillRect(x + cs - h * 0.4, y, h * 0.4, cs);

        // Top elevated cap (raised by -h)
        const topY = y - h * 0.5;
        const gradTop = ctx.createLinearGradient(x, topY, x + cs, topY + cs);
        gradTop.addColorStop(0, '#3d4f6c');
        gradTop.addColorStop(0.5, '#2b394f');
        gradTop.addColorStop(1, '#1b2434');
        ctx.fillStyle = gradTop;
        ctx.fillRect(x, topY, cs, cs);

        // Neon bevel border
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, topY, cs, cs);

        // Inner metallic bevel
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.strokeRect(x + 1, topY + 1, cs - 2, cs - 2);
    }

    // Top-down Gem with rotation and shadow
    drawTopDownGem(x, y, cs, is3D) {
        const ctx = this.ctx;
        const cx = x + cs / 2;
        const cy = y + cs / 2;
        const radius = Math.max(3, cs * 0.24);

        ctx.save();
        if (is3D) {
            // Ground shadow
            ctx.beginPath();
            ctx.ellipse(cx, cy + radius * 0.6, radius, radius * 0.4, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
            ctx.fill();

            // Diamond crystal
            const rot = this.time * 2.5;
            ctx.translate(cx, cy - Math.sin(this.time * 3) * 2);
            ctx.rotate(rot);

            ctx.fillStyle = '#fbbf24';
            ctx.shadowColor = '#f59e0b';
            ctx.shadowBlur = 10;
            ctx.fillRect(-radius * 0.7, -radius * 0.7, radius * 1.4, radius * 1.4);

            ctx.strokeStyle = '#fef08a';
            ctx.lineWidth = 1;
            ctx.strokeRect(-radius * 0.7, -radius * 0.7, radius * 1.4, radius * 1.4);
        } else {
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fillStyle = this.theme.coin;
            ctx.shadowColor = '#f59e0b';
            ctx.shadowBlur = 8;
            ctx.fill();
        }
        ctx.restore();
    }

    // Top-down Start Marker
    drawTopDownMarker(r, c, color, label, is3D) {
        const { x, y } = this.cellToPixel(r, c);
        const cs = this.cellSize;
        const cx = x + cs / 2;
        const cy = y + cs / 2;
        const radius = cs * 0.38;

        this.ctx.save();
        if (is3D) {
            // 3D Shaded Sphere / Launchpad
            const grad = this.ctx.createRadialGradient(cx - radius * 0.3, cy - radius * 0.3, radius * 0.1, cx, cy, radius);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.4, color);
            grad.addColorStop(1, '#064e3b');
            this.ctx.fillStyle = grad;
        } else {
            this.ctx.fillStyle = color;
        }

        this.ctx.beginPath();
        this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = is3D ? 12 : 6;
        this.ctx.fill();

        if (cs >= 16) {
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = `bold ${Math.floor(cs * 0.45)}px sans-serif`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(label, cx, cy);
        }
        this.ctx.restore();
    }

    // Top-down Exit Portal
    drawTopDownExit(r, c, cs, is3D) {
        const { x, y } = this.cellToPixel(r, c);
        const cx = x + cs / 2;
        const cy = y + cs / 2;
        const radius = cs * 0.4;

        this.ctx.save();
        if (is3D && this.fxEnabled) {
            // Spinning outer rings
            this.ctx.beginPath();
            this.ctx.ellipse(cx, cy, radius, radius * 0.55, this.time * 2, 0, Math.PI * 2);
            this.ctx.strokeStyle = '#f59e0b';
            this.ctx.lineWidth = 2;
            this.ctx.shadowColor = '#fbbf24';
            this.ctx.shadowBlur = 14;
            this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.ellipse(cx, cy, radius * 0.7, radius * 0.35, -this.time * 2.5, 0, Math.PI * 2);
            this.ctx.strokeStyle = '#fef08a';
            this.ctx.lineWidth = 1.5;
            this.ctx.stroke();
        } else {
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            this.ctx.strokeStyle = '#f59e0b';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }

        // Inner glowing core
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, radius * 0.45, 0, Math.PI * 2);
        this.ctx.fillStyle = '#fef08a';
        this.ctx.fill();

        if (cs >= 16) {
            this.ctx.fillStyle = '#78350f';
            this.ctx.font = `bold ${Math.floor(cs * 0.42)}px sans-serif`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('E', cx, cy);
        }
        this.ctx.restore();
    }

    // Top-down Player Avatar (3D Shaded Orb with Gyro)
    drawTopDownPlayer(p, cs, is3D) {
        const { x, y } = this.cellToPixel(p.r, p.c);
        const cx = x + cs / 2;
        const cy = y + cs / 2;
        const radius = cs * 0.36;

        this.ctx.save();

        // Trail
        if (p.trail && p.trail.length > 1) {
            this.ctx.strokeStyle = p.color;
            this.ctx.lineWidth = Math.max(2, cs * 0.18);
            this.ctx.beginPath();
            for (let i = 0; i < p.trail.length; i++) {
                const pt = this.cellToPixel(p.trail[i].r, p.trail[i].c);
                if (i === 0) this.ctx.moveTo(pt.x + cs / 2, pt.y + cs / 2);
                else this.ctx.lineTo(pt.x + cs / 2, pt.y + cs / 2);
            }
            this.ctx.globalAlpha = 0.35;
            this.ctx.stroke();
            this.ctx.globalAlpha = 1.0;
        }

        if (is3D) {
            // Ground shadow
            this.ctx.beginPath();
            this.ctx.ellipse(cx, cy + radius * 0.4, radius * 0.9, radius * 0.4, 0, 0, Math.PI * 2);
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
            this.ctx.fill();

            // Orbiting Gyro Ring
            if (this.fxEnabled) {
                this.ctx.beginPath();
                this.ctx.ellipse(cx, cy, radius * 1.4, radius * 0.5, this.time * 2.5, 0, Math.PI * 2);
                this.ctx.strokeStyle = p.color;
                this.ctx.lineWidth = 1.5;
                this.ctx.shadowColor = p.color;
                this.ctx.shadowBlur = 10;
                this.ctx.stroke();
            }

            // 3D Sphere Radial Gradient
            const sphereGrad = this.ctx.createRadialGradient(
                cx - radius * 0.3, cy - radius * 0.3, radius * 0.1,
                cx, cy, radius
            );
            sphereGrad.addColorStop(0, '#ffffff');
            sphereGrad.addColorStop(0.35, p.color);
            sphereGrad.addColorStop(1, '#05121e');

            this.ctx.beginPath();
            this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            this.ctx.fillStyle = sphereGrad;
            this.ctx.shadowColor = p.color;
            this.ctx.shadowBlur = 14;
            this.ctx.fill();
        } else {
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            this.ctx.fillStyle = p.color;
            this.ctx.shadowColor = p.color;
            this.ctx.shadowBlur = 12;
            this.ctx.fill();
        }

        if (p.name && cs >= 14) {
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = `bold ${Math.floor(cs * 0.38)}px sans-serif`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(p.name, cx, cy);
        }

        this.ctx.restore();
    }

    renderOrthogonalFogOfWar() {
        const ctx = this.ctx;
        const cs = this.cellSize;

        ctx.save();
        ctx.fillStyle = 'rgba(7, 10, 19, 0.96)';
        ctx.globalCompositeOperation = 'destination-out';

        for (const p of this.players) {
            const { x, y } = this.cellToPixel(p.r, p.c);
            const cx = x + cs / 2;
            const cy = y + cs / 2;
            const rPx = this.fogRadius * cs;

            const grad = ctx.createRadialGradient(cx, cy, rPx * 0.2, cx, cy, rPx);
            grad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
            grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.8)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(cx, cy, rPx, 0, Math.PI * 2);
            ctx.fill();
        }

        const endPix = this.cellToPixel(this.maze.end.r, this.maze.end.c);
        const endGrad = ctx.createRadialGradient(
            endPix.x + cs / 2, endPix.y + cs / 2, cs * 0.2,
            endPix.x + cs / 2, endPix.y + cs / 2, cs * 2.5
        );
        endGrad.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
        endGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = endGrad;
        ctx.beginPath();
        ctx.arc(endPix.x + cs / 2, endPix.y + cs / 2, cs * 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    getAlgoColor(algo, alpha = 0.35) {
        if (algo.includes('DFS')) return `rgba(236, 72, 153, ${alpha})`;
        if (algo.includes('A*')) return `rgba(16, 185, 129, ${alpha})`;
        if (algo.includes('Dijkstra')) return `rgba(168, 85, 247, ${alpha})`;
        return `rgba(56, 189, 248, ${alpha})`; // BFS / default
    }
}

window.MazeVisualizer = MazeVisualizer;
