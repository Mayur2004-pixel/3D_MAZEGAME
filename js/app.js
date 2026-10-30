// Application Controller: UI Wiring, Event Handlers, Mode Management, and 4-Way Arena

document.addEventListener('DOMContentLoaded', () => {
    // Canvas & Main Visualizer
    const mainCanvas = document.getElementById('mazeCanvas');
    let maze = new Maze(25, 25);
    maze.generateRecursiveBacktracker();

    const visualizer = new MazeVisualizer(mainCanvas);
    visualizer.setMaze(maze);

    const game = new GameManager(maze, visualizer);

    // Visualizer Algorithm State
    let currentGenerator = null;
    let isVisualizing = false;
    let isPaused = false;
    let animTimer = null;
    let activeBrush = 'wall';
    let isMouseDown = false;

    // Showdown 4 Canvases
    const showdownCanvases = {
        bfs: document.getElementById('canvas-bfs'),
        dfs: document.getElementById('canvas-dfs'),
        dijkstra: document.getElementById('canvas-dijkstra'),
        aStar: document.getElementById('canvas-aStar')
    };

    const showdownVisualizers = {
        bfs: new MazeVisualizer(showdownCanvases.bfs),
        dfs: new MazeVisualizer(showdownCanvases.dfs),
        dijkstra: new MazeVisualizer(showdownCanvases.dijkstra),
        aStar: new MazeVisualizer(showdownCanvases.aStar)
    };

    // 3D Perspective Controls & Viewport Modes
    const viewButtons = document.querySelectorAll('.view-btn');
    const singleContainer = document.getElementById('single-canvas-container');
    const stageViewport = document.getElementById('stage-viewport-3d');
    const slider3DHeight = document.getElementById('slider-3d-height');
    const btnToggle3DAnim = document.getElementById('btn-toggle-3d-anim');
    const btnReset3DCamera = document.getElementById('btn-reset-3d-camera');

    // Initialize 3D Isometric View
    visualizer.setViewMode('iso3d');

    viewButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            viewButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const viewMode = btn.dataset.view;

            // Update container 3D styling classes
            if (singleContainer) {
                singleContainer.classList.remove('iso-3d', 'tilt-3d', 'depth-25d', 'flat-2d');
                if (viewMode === 'iso3d') {
                    singleContainer.classList.add('iso-3d');
                    singleContainer.style.removeProperty('--tilt-x');
                    singleContainer.style.removeProperty('--tilt-y');
                } else if (viewMode === 'tilt3d') {
                    singleContainer.classList.add('tilt-3d');
                } else if (viewMode === 'depth25d') {
                    singleContainer.classList.add('depth-25d');
                    singleContainer.style.removeProperty('--tilt-x');
                    singleContainer.style.removeProperty('--tilt-y');
                } else {
                    singleContainer.classList.add('flat-2d');
                    singleContainer.style.removeProperty('--tilt-x');
                    singleContainer.style.removeProperty('--tilt-y');
                }
            }

            visualizer.setViewMode(viewMode);

            // Synchronize showdown visualizers
            ['bfs', 'dfs', 'dijkstra', 'aStar'].forEach(k => {
                showdownVisualizers[k].setViewMode(viewMode === 'flat2d' ? 'flat2d' : 'depth25d');
            });
        });
    });

    if (slider3DHeight) {
        slider3DHeight.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10);
            const factor = 0.2 + (val / 10) * 0.95;
            visualizer.setWallHeight(factor);
            ['bfs', 'dfs', 'dijkstra', 'aStar'].forEach(k => {
                showdownVisualizers[k].setWallHeight(factor);
            });
        });
    }

    if (btnToggle3DAnim) {
        btnToggle3DAnim.addEventListener('click', () => {
            const on = visualizer.toggleFX();
            btnToggle3DAnim.textContent = on ? '✨ FX On' : '✨ FX Off';
            btnToggle3DAnim.style.opacity = on ? '1.0' : '0.6';
        });
    }

    if (btnReset3DCamera) {
        btnReset3DCamera.addEventListener('click', () => {
            if (slider3DHeight) {
                slider3DHeight.value = 6;
                visualizer.setWallHeight(0.65);
            }
            if (singleContainer) {
                singleContainer.style.setProperty('--tilt-x', '22deg');
                singleContainer.style.setProperty('--tilt-y', '0deg');
            }
            visualizer.resize();
            visualizer.render();
        });
    }

    // Dynamic 3D Mouse Parallax Tilt (active in 'tilt3d' mode)
    if (stageViewport && singleContainer) {
        stageViewport.addEventListener('mousemove', (e) => {
            if (visualizer.viewMode !== 'tilt3d') return;
            const rect = stageViewport.getBoundingClientRect();
            const normX = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to +0.5
            const normY = (e.clientY - rect.top) / rect.height - 0.5; // -0.5 to +0.5

            const tiltX = (22 - normY * 16).toFixed(1);
            const tiltY = (normX * 20).toFixed(1);

            singleContainer.style.setProperty('--tilt-x', `${tiltX}deg`);
            singleContainer.style.setProperty('--tilt-y', `${tiltY}deg`);
        });

        stageViewport.addEventListener('mouseleave', () => {
            if (visualizer.viewMode === 'tilt3d') {
                singleContainer.style.setProperty('--tilt-x', '22deg');
                singleContainer.style.setProperty('--tilt-y', '0deg');
            }
        });
    }

    // Mode Selector Buttons
    const modeButtons = document.querySelectorAll('.mode-tab');
    modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            modeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const targetMode = btn.dataset.mode;
            setAppMode(targetMode);
        });
    });

    function setAppMode(mode) {
        // Stop any running visualization or game
        stopVisualization();
        game.stop();

        const singleContainer = document.getElementById('single-canvas-container');
        const showdownContainer = document.getElementById('showdown-container');
        const visualizerControls = document.getElementById('visualizer-controls');
        const gameControls = document.getElementById('game-controls');
        const aiSelectGroup = document.getElementById('ai-select-group');
        const p2Legend = document.getElementById('p2-legend');
        const fogToggleGroup = document.getElementById('fog-toggle-group');

        // Reset display
        singleContainer.classList.remove('hidden');
        showdownContainer.classList.add('hidden');
        visualizerControls.classList.add('hidden');
        gameControls.classList.remove('hidden');
        aiSelectGroup.classList.add('hidden');
        p2Legend.classList.add('hidden');
        fogToggleGroup.classList.add('hidden');

        if (mode === 'play') {
            game.setMode('play');
            fogToggleGroup.classList.remove('hidden');
        } else if (mode === 'ai-race') {
            game.setMode('ai-race');
            aiSelectGroup.classList.remove('hidden');
        } else if (mode === 'pvp') {
            game.setMode('pvp');
            p2Legend.classList.remove('hidden');
        } else if (mode === 'visualize') {
            game.setMode('visualize');
            gameControls.classList.add('hidden');
            visualizerControls.classList.remove('hidden');
        } else if (mode === 'showdown') {
            game.setMode('showdown');
            singleContainer.classList.add('hidden');
            showdownContainer.classList.remove('hidden');
            gameControls.classList.add('hidden');
            visualizerControls.classList.remove('hidden');
            prepareShowdownGrid();
        }

        visualizer.resize();
        visualizer.render();
    }

    // Maze Generation Event Handlers
    const btnGenerate = document.getElementById('btn-generate-maze');
    const selectMazeAlgo = document.getElementById('select-maze-algo');
    const selectMazeSize = document.getElementById('select-maze-size');

    btnGenerate.addEventListener('click', () => {
        generateNewMaze();
    });

    function generateNewMaze() {
        stopVisualization();
        const size = parseInt(selectMazeSize.value, 10) || 25;
        const algo = selectMazeAlgo.value;

        maze = new Maze(size, size);

        if (algo === 'backtracking') {
            maze.generateRecursiveBacktracker();
        } else if (algo === 'prims') {
            maze.generatePrims();
        } else if (algo === 'kruskals') {
            maze.generateKruskals();
        } else if (algo === 'weighted') {
            maze.generateWeightedTerrain();
        } else if (algo === 'empty') {
            maze.generateEmpty();
        }

        visualizer.setMaze(maze);
        game.maze = maze;
        game.resetGame();

        window.soundFX?.playCarve();

        // If showdown active, sync clones
        if (game.mode === 'showdown') {
            prepareShowdownGrid();
        }
    }

    // Prepare showdown 4-grid copies
    function prepareShowdownGrid() {
        requestAnimationFrame(() => {
            ['bfs', 'dfs', 'dijkstra', 'aStar'].forEach(key => {
                const viz = showdownVisualizers[key];
                viz.setViewMode('depth25d');
                viz.setWallHeight(0.5);
                viz.setMaze(maze);
                viz.resize();
                viz.render();
            });
        });
    }

    window.addEventListener('resize', () => {
        if (game.mode === 'showdown') {
            prepareShowdownGrid();
        }
    });

    // Interactive Canvas Mouse Drawing
    mainCanvas.addEventListener('mousedown', (e) => {
        if (game.mode !== 'visualize') return;
        isMouseDown = true;
        handleCanvasPaint(e);
    });

    window.addEventListener('mouseup', () => {
        isMouseDown = false;
    });

    mainCanvas.addEventListener('mousemove', (e) => {
        if (!isMouseDown || game.mode !== 'visualize') return;
        handleCanvasPaint(e);
    });

    function handleCanvasPaint(e) {
        const rect = mainCanvas.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        const cell = visualizer.pixelToCell(px, py);
        if (cell) {
            maze.setCellType(cell.r, cell.c, activeBrush);
            visualizer.render();
        }
    }

    // Brush Selection
    const brushButtons = document.querySelectorAll('.brush-btn');
    brushButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            brushButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeBrush = btn.dataset.brush;
        });
    });

    // Pathfinding Visualizer Controls
    const btnStartSolve = document.getElementById('btn-start-solve');
    const btnStepSolve = document.getElementById('btn-step-solve');
    const btnResetVisualizer = document.getElementById('btn-reset-visualizer');
    const selectPathAlgo = document.getElementById('select-path-algo');
    const speedSlider = document.getElementById('slider-speed');

    btnStartSolve.addEventListener('click', () => {
        if (game.mode === 'showdown') {
            runShowdownRace();
            return;
        }

        if (isVisualizing && !isPaused) {
            // Pause
            isPaused = true;
            btnStartSolve.innerHTML = `<span class="icon">▶</span> Resume`;
        } else if (isVisualizing && isPaused) {
            // Resume
            isPaused = false;
            btnStartSolve.innerHTML = `<span class="icon">⏸</span> Pause`;
            stepLoop();
        } else {
            // Start fresh
            startVisualizing();
        }
    });

    btnStepSolve.addEventListener('click', () => {
        if (!isVisualizing) {
            startVisualizing(true); // paused initially for step
        } else {
            executeNextStep();
        }
    });

    btnResetVisualizer.addEventListener('click', () => {
        stopVisualization();
        visualizer.clearOverlay();
        visualizer.render();
        resetStats();
    });

    function startVisualizing(startPaused = false) {
        stopVisualization();
        visualizer.clearOverlay();
        resetStats();

        const algo = selectPathAlgo.value;
        if (algo === 'bfs') {
            currentGenerator = PathfindingAlgorithms.bfsGenerator(maze);
        } else if (algo === 'dfs') {
            currentGenerator = PathfindingAlgorithms.dfsGenerator(maze);
        } else if (algo === 'dijkstra') {
            currentGenerator = PathfindingAlgorithms.dijkstraGenerator(maze);
        } else if (algo === 'aStar') {
            currentGenerator = PathfindingAlgorithms.aStarGenerator(maze, maze.start, maze.end, 'manhattan');
        }

        isVisualizing = true;
        isPaused = startPaused;

        btnStartSolve.innerHTML = isPaused ? `<span class="icon">▶</span> Resume` : `<span class="icon">⏸</span> Pause`;
        btnStepSolve.disabled = false;

        if (!isPaused) {
            stepLoop();
        }
    }

    function executeNextStep() {
        if (!currentGenerator) return false;
        const res = currentGenerator.next();
        if (res.done) {
            finishVisualization();
            return false;
        }

        const step = res.value;
        const algo = selectPathAlgo.value;

        if (step.type === 'visit') {
            const key = `${step.cell.r},${step.cell.c}`;
            visualizer.visitedCells.add(key);
            visualizer.frontierCells.delete(key);

            // Subtle sound tick
            if (visualizer.visitedCells.size % 4 === 0) {
                const pitch = 0.5 + (visualizer.visitedCells.size / (maze.rows * maze.cols)) * 1.5;
                window.soundFX?.playVisitTick(pitch);
            }

            // Update live metrics
            const visitedEl = document.getElementById('stat-visited');
            if (visitedEl) visitedEl.textContent = `${visualizer.visitedCells.size}`;
        } else if (step.type === 'frontier') {
            const key = `${step.cell.r},${step.cell.c}`;
            visualizer.frontierCells.add(key);
        } else if (step.type === 'path') {
            visualizer.pathCells = step.path;
            visualizer.frontierCells.clear();
            finishVisualization(true, step.path);
            return false;
        } else if (step.type === 'not_found') {
            finishVisualization(false);
            return false;
        }

        visualizer.render(algo);
        return true;
    }

    function stepLoop() {
        if (!isVisualizing || isPaused) return;

        // Number of steps per frame depends on slider
        const speedVal = parseInt(speedSlider.value, 10);
        let stepsPerBatch = 1;
        let delay = 30;

        if (speedVal >= 90) {
            stepsPerBatch = 8;
            delay = 0;
        } else if (speedVal >= 70) {
            stepsPerBatch = 4;
            delay = 10;
        } else if (speedVal >= 50) {
            stepsPerBatch = 2;
            delay = 25;
        } else if (speedVal >= 30) {
            stepsPerBatch = 1;
            delay = 60;
        } else {
            stepsPerBatch = 1;
            delay = 140;
        }

        let keepGoing = true;
        for (let i = 0; i < stepsPerBatch; i++) {
            keepGoing = executeNextStep();
            if (!keepGoing) break;
        }

        if (keepGoing) {
            animTimer = setTimeout(() => {
                requestAnimationFrame(stepLoop);
            }, delay);
        }
    }

    function finishVisualization(found = true, path = []) {
        stopVisualization();
        if (found) {
            window.soundFX?.playPathFound();
            const lenEl = document.getElementById('stat-path-len');
            if (lenEl) lenEl.textContent = `${path.length}`;
        } else {
            alert('No path exists between Start and End!');
        }
        visualizer.render();
    }

    function stopVisualization() {
        isVisualizing = false;
        isPaused = false;
        if (animTimer) clearTimeout(animTimer);
        animTimer = null;
        currentGenerator = null;

        if (btnStartSolve) {
            btnStartSolve.innerHTML = `<span class="icon">▶</span> Solve / Visualize`;
        }
    }

    function resetStats() {
        const visitedEl = document.getElementById('stat-visited');
        const lenEl = document.getElementById('stat-path-len');
        if (visitedEl) visitedEl.textContent = '0';
        if (lenEl) lenEl.textContent = '0';
    }

    // Showdown 4-Way Arena Simultaneous Race
    function runShowdownRace() {
        prepareShowdownGrid();

        const results = PathfindingAlgorithms.compareAll(maze);
        const algos = ['bfs', 'dfs', 'dijkstra', 'aStar'];

        // Animated runners for each canvas
        algos.forEach(key => {
            const viz = showdownVisualizers[key];
            const res = results[key];
            viz.clearOverlay();

            // Populate table metrics
            document.getElementById(`showdown-nodes-${key}`).textContent = res.nodesVisited;
            document.getElementById(`showdown-len-${key}`).textContent = res.pathLength;
            document.getElementById(`showdown-cost-${key}`).textContent = res.pathCost;
            document.getElementById(`showdown-time-${key}`).textContent = `${res.executionTime} ms`;

            // Animate visited order
            let idx = 0;
            const batchSize = Math.max(1, Math.floor(res.visitedOrder.length / 45));

            function animateViz() {
                for (let b = 0; b < batchSize && idx < res.visitedOrder.length; b++, idx++) {
                    const cell = res.visitedOrder[idx];
                    viz.visitedCells.add(`${cell.r},${cell.c}`);
                }
                viz.render(key);

                if (idx < res.visitedOrder.length) {
                    requestAnimationFrame(animateViz);
                } else {
                    viz.pathCells = res.path;
                    viz.render(key);
                }
            }
            animateViz();
        });

        window.soundFX?.playPathFound();
    }

    // Play & AI Race UI Buttons
    const btnHint = document.getElementById('btn-hint');
    const btnRestartGame = document.getElementById('btn-restart-game');
    const selectAiAlgo = document.getElementById('select-ai-algo');
    const selectAiSpeed = document.getElementById('select-ai-speed');
    const toggleFog = document.getElementById('toggle-fog');
    const btnToggleMute = document.getElementById('btn-toggle-mute');

    if (btnHint) {
        btnHint.addEventListener('click', () => {
            game.showHint();
        });
    }

    if (btnRestartGame) {
        btnRestartGame.addEventListener('click', () => {
            game.resetGame();
        });
    }

    if (selectAiAlgo) {
        selectAiAlgo.addEventListener('change', (e) => {
            game.aiAlgorithm = e.target.value;
            game.resetGame();
        });
    }

    if (selectAiSpeed) {
        selectAiSpeed.addEventListener('change', (e) => {
            game.aiSpeedMs = parseInt(e.target.value, 10);
        });
    }

    if (toggleFog) {
        toggleFog.addEventListener('change', (e) => {
            visualizer.fogOfWar = e.target.checked;
            visualizer.render();
        });
    }

    if (btnToggleMute) {
        btnToggleMute.addEventListener('click', () => {
            const isMuted = window.soundFX?.toggleMute();
            btnToggleMute.innerHTML = isMuted ? '🔇 Unmute' : '🔊 Sound FX';
        });
    }

    // Game Over Celebration Modal
    const gameOverModal = document.getElementById('game-over-modal');
    const modalWinner = document.getElementById('modal-winner');
    const modalDetails = document.getElementById('modal-details');
    const modalStats = document.getElementById('modal-stats');
    const btnModalPlayAgain = document.getElementById('btn-modal-play-again');
    const btnModalClose = document.getElementById('btn-modal-close');

    window.addEventListener('maze-game-over', (e) => {
        const { winner, details, time, p1Moves, p1Coins, p2Moves, p2Coins } = e.detail;
        modalWinner.textContent = `🎉 ${winner} Wins!`;
        modalDetails.textContent = details;

        let statsHtml = `<div><strong>Time:</strong> ${time}s</div>`;
        statsHtml += `<div><strong>P1 Moves:</strong> ${p1Moves} | <strong>Coins:</strong> ${p1Coins}</div>`;
        if (game.mode === 'pvp') {
            statsHtml += `<div><strong>P2 Moves:</strong> ${p2Moves} | <strong>Coins:</strong> ${p2Coins}</div>`;
        }
        modalStats.innerHTML = statsHtml;
        gameOverModal.classList.remove('hidden');
    });

    btnModalPlayAgain.addEventListener('click', () => {
        gameOverModal.classList.add('hidden');
        generateNewMaze();
    });

    btnModalClose.addEventListener('click', () => {
        gameOverModal.classList.add('hidden');
    });

    // Algorithm Theory & Viva Guide Modal
    const theoryModal = document.getElementById('theory-modal');
    const btnOpenTheory = document.getElementById('btn-open-theory');
    const btnCloseTheory = document.getElementById('btn-close-theory');

    btnOpenTheory.addEventListener('click', () => {
        theoryModal.classList.remove('hidden');
    });

    btnCloseTheory.addEventListener('click', () => {
        theoryModal.classList.add('hidden');
    });

    theoryModal.addEventListener('click', (e) => {
        if (e.target === theoryModal) theoryModal.classList.add('hidden');
    });

    // Quick start initial render
    setAppMode('play');
});
