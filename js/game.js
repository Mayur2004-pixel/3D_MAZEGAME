// Game Manager: Single Player Explorer, AI Opponent Race, and 2-Player Local Duel

class GameManager {
    constructor(maze, visualizer) {
        this.maze = maze;
        this.visualizer = visualizer;

        this.mode = 'play'; // 'play', 'ai-race', 'pvp', 'visualize', 'showdown'
        this.active = false;
        this.paused = false;

        // Players
        this.player1 = {
            id: 1,
            name: 'P1',
            r: 1,
            c: 1,
            color: '#00f2fe',
            trail: [],
            moves: 0,
            score: 0,
            coinsCollected: 0
        };

        this.player2 = {
            id: 2,
            name: 'P2',
            r: 1,
            c: 1,
            color: '#ec4899',
            trail: [],
            moves: 0,
            score: 0,
            coinsCollected: 0
        };

        this.aiBot = {
            id: 'ai',
            name: 'AI',
            r: 1,
            c: 1,
            color: '#f59e0b',
            trail: [],
            path: [],
            pathIndex: 0,
            moves: 0
        };

        // Timing & loops
        this.startTime = 0;
        this.elapsedMs = 0;
        this.timerInterval = null;
        this.aiInterval = null;
        this.aiSpeedMs = 150; // default speed for AI moves
        this.aiAlgorithm = 'aStar'; // 'aStar', 'dijkstra', 'bfs', 'dfs'

        this.setupKeyListeners();
    }

    setMode(mode) {
        this.stop();
        this.mode = mode;
        this.resetGame();
    }

    resetGame() {
        this.stop();
        this.player1.r = this.maze.start.r;
        this.player1.c = this.maze.start.c;
        this.player1.trail = [{ r: this.player1.r, c: this.player1.c }];
        this.player1.moves = 0;
        this.player1.score = 0;
        this.player1.coinsCollected = 0;

        this.player2.r = this.maze.start.r;
        this.player2.c = this.maze.start.c;
        this.player2.trail = [{ r: this.player2.r, c: this.player2.c }];
        this.player2.moves = 0;
        this.player2.score = 0;
        this.player2.coinsCollected = 0;

        this.aiBot.r = this.maze.start.r;
        this.aiBot.c = this.maze.start.c;
        this.aiBot.trail = [{ r: this.aiBot.r, c: this.aiBot.c }];
        this.aiBot.moves = 0;
        this.aiBot.path = [];
        this.aiBot.pathIndex = 0;

        this.elapsedMs = 0;
        this.updateHUD();

        // Update visualizer players list based on mode
        if (this.mode === 'play') {
            this.visualizer.players = [this.player1];
        } else if (this.mode === 'pvp') {
            this.visualizer.players = [this.player1, this.player2];
        } else if (this.mode === 'ai-race') {
            this.visualizer.players = [this.player1, this.aiBot];
        } else {
            this.visualizer.players = [];
        }

        this.visualizer.render();
    }

    start() {
        if (this.active) return;
        this.active = true;
        this.paused = false;
        this.startTime = performance.now() - this.elapsedMs;

        // Timer interval
        clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            if (!this.paused) {
                this.elapsedMs = performance.now() - this.startTime;
                this.updateTimerDisplay();
            }
        }, 50);

        // In AI race mode, precalculate and start AI path execution
        if (this.mode === 'ai-race') {
            this.startAiRunner();
        }
    }

    pause() {
        this.paused = true;
        if (this.aiInterval) clearInterval(this.aiInterval);
    }

    resume() {
        if (!this.paused) return;
        this.paused = false;
        this.startTime = performance.now() - this.elapsedMs;
        if (this.mode === 'ai-race') {
            this.startAiRunner();
        }
    }

    stop() {
        this.active = false;
        this.paused = false;
        clearInterval(this.timerInterval);
        clearInterval(this.aiInterval);
        this.timerInterval = null;
        this.aiInterval = null;
    }

    startAiRunner() {
        // Calculate AI solution path using selected algorithm
        let result;
        if (this.aiAlgorithm === 'bfs') {
            result = PathfindingAlgorithms.bfs(this.maze);
        } else if (this.aiAlgorithm === 'dfs') {
            result = PathfindingAlgorithms.dfs(this.maze);
        } else if (this.aiAlgorithm === 'dijkstra') {
            result = PathfindingAlgorithms.dijkstra(this.maze);
        } else {
            result = PathfindingAlgorithms.aStar(this.maze);
        }

        this.aiBot.path = result.path || [];
        this.aiBot.pathIndex = 0;

        clearInterval(this.aiInterval);
        this.aiInterval = setInterval(() => {
            if (this.paused || !this.active) return;
            if (this.aiBot.pathIndex < this.aiBot.path.length - 1) {
                this.aiBot.pathIndex++;
                const nextCell = this.aiBot.path[this.aiBot.pathIndex];
                this.aiBot.r = nextCell.r;
                this.aiBot.c = nextCell.c;
                this.aiBot.trail.push({ r: nextCell.r, c: nextCell.c });
                this.aiBot.moves++;

                this.visualizer.render();

                // Check if AI reached goal
                if (this.aiBot.r === this.maze.end.r && this.aiBot.c === this.maze.end.c) {
                    this.onGameOver('AI Bot', 'AI won the race using ' + this.aiAlgorithm.toUpperCase() + '!');
                }
            }
        }, this.aiSpeedMs);
    }

    setupKeyListeners() {
        window.addEventListener('keydown', (e) => {
            // Ignore keystrokes if typing inside inputs or modals
            if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

            // In visualize or showdown mode, ignore player controls
            if (this.mode === 'visualize' || this.mode === 'showdown') return;

            // Start timer on first move if not already active
            if (!this.active && !this.paused) {
                if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
                    this.start();
                }
            }

            if (!this.active || this.paused) return;

            let handled = false;

            // Player 1: WASD controls (or Arrow Keys in single-player/AI-race)
            if (e.code === 'KeyW' || ((this.mode === 'play' || this.mode === 'ai-race') && e.code === 'ArrowUp')) {
                this.movePlayer(this.player1, -1, 0);
                handled = true;
            } else if (e.code === 'KeyS' || ((this.mode === 'play' || this.mode === 'ai-race') && e.code === 'ArrowDown')) {
                this.movePlayer(this.player1, 1, 0);
                handled = true;
            } else if (e.code === 'KeyA' || ((this.mode === 'play' || this.mode === 'ai-race') && e.code === 'ArrowLeft')) {
                this.movePlayer(this.player1, 0, -1);
                handled = true;
            } else if (e.code === 'KeyD' || ((this.mode === 'play' || this.mode === 'ai-race') && e.code === 'ArrowRight')) {
                this.movePlayer(this.player1, 0, 1);
                handled = true;
            }

            // Player 2: Arrow keys in 2-Player local PVP
            if (this.mode === 'pvp') {
                if (e.code === 'ArrowUp') {
                    this.movePlayer(this.player2, -1, 0);
                    handled = true;
                } else if (e.code === 'ArrowDown') {
                    this.movePlayer(this.player2, 1, 0);
                    handled = true;
                } else if (e.code === 'ArrowLeft') {
                    this.movePlayer(this.player2, 0, -1);
                    handled = true;
                } else if (e.code === 'ArrowRight') {
                    this.movePlayer(this.player2, 0, 1);
                    handled = true;
                }
            }

            if (handled) {
                e.preventDefault();
            }
        });
    }

    movePlayer(player, dr, dc) {
        const nr = player.r + dr;
        const nc = player.c + dc;

        if (this.maze.isPassable(nr, nc)) {
            player.r = nr;
            player.c = nc;
            player.trail.push({ r: nr, c: nc });
            player.moves++;

            // Audio step
            window.soundFX?.playStep(player.id);

            // Check coin pickup
            const key = `${nr},${nc}`;
            if (this.maze.coins.has(key)) {
                this.maze.coins.delete(key);
                player.coinsCollected++;
                player.score += 150;
                window.soundFX?.playCoin();
            }

            this.updateHUD();
            this.visualizer.render();

            // Check goal
            if (player.r === this.maze.end.r && player.c === this.maze.end.c) {
                const winnerName = player.id === 1 ? 'Player 1 (Cyan)' : 'Player 2 (Magenta)';
                this.onGameOver(winnerName, `Reached the exit portal in ${player.moves} moves!`);
            }
        } else {
            // Bumped into a wall
            window.soundFX?.playBump();
        }
    }

    // Give hint: show optimal A* path from current position for 2.5 seconds
    showHint() {
        const p = this.player1;
        const hintRes = PathfindingAlgorithms.aStar(this.maze, { r: p.r, c: p.c }, this.maze.end);
        if (hintRes.found) {
            this.visualizer.pathCells = hintRes.path;
            this.visualizer.render();
            window.soundFX?.playPathFound();

            setTimeout(() => {
                if (this.mode === 'play' || this.mode === 'ai-race' || this.mode === 'pvp') {
                    this.visualizer.pathCells = [];
                    this.visualizer.render();
                }
            }, 3000);
        }
    }

    onGameOver(winner, details) {
        this.stop();
        window.soundFX?.playWin();

        // Trigger confetti celebration
        if (typeof confetti === 'function') {
            confetti({
                particleCount: 120,
                spread: 70,
                origin: { y: 0.6 }
            });
        }

        // Dispatch game-over event for UI modal
        const event = new CustomEvent('maze-game-over', {
            detail: {
                winner,
                details,
                time: (this.elapsedMs / 1000).toFixed(2),
                p1Moves: this.player1.moves,
                p1Coins: this.player1.coinsCollected,
                p2Moves: this.player2.moves,
                p2Coins: this.player2.coinsCollected
            }
        });
        window.dispatchEvent(event);
    }

    updateTimerDisplay() {
        const timerEl = document.getElementById('stat-timer');
        if (timerEl) {
            const sec = (this.elapsedMs / 1000).toFixed(1);
            timerEl.textContent = `${sec}s`;
        }
    }

    updateHUD() {
        const movesEl = document.getElementById('stat-moves');
        if (movesEl) {
            movesEl.textContent = this.mode === 'pvp'
                ? `P1: ${this.player1.moves} | P2: ${this.player2.moves}`
                : `${this.player1.moves}`;
        }

        const coinsEl = document.getElementById('stat-coins');
        if (coinsEl) {
            const totalCoins = (this.player1.coinsCollected + (this.mode === 'pvp' ? this.player2.coinsCollected : 0));
            coinsEl.textContent = `${totalCoins}`;
        }
    }
}

window.GameManager = GameManager;
