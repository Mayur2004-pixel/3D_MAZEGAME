# ⚡ MazeCraft AI: Algorithmic Maze Runner & Visualizer
> **Design and Analysis of Algorithms (DAA) Interactive Project**  
> *Featuring Breadth-First Search (BFS), Depth-First Search (DFS), Dijkstra's Algorithm, A\* Search, Procedural Maze Generation, AI Race, and 2-Player Local Duel.*

---

## 🌟 Overview

**MazeCraft AI** is a web-based educational platform and playable game designed to demonstrate, visualize, and benchmark classic graph traversal and shortest-path algorithms. Built purely with modern JavaScript, HTML5 Canvas, and Vanilla CSS, it delivers a 60fps experience with synthetic retro audio effects, glassmorphism design, and interactive modes for academic defense, viva presentations, and gaming.

---

## 🎮 Features & Modes

### 1. 🕹️ Solo Explorer
- Navigate the maze using **WASD** or **Arrow Keys**.
- Collect golden gems scattered throughout the corridors for bonus points.
- Reach the golden exit portal to win.
- **Torchlight Fog-of-War**: Experience a dungeon-crawler perspective with dynamic radial vision cone.
- **Dynamic Hint System**: Press "Show Hint" to compute and flash the optimal A\* path for 3 seconds.

### 2. ⚡ Race Against AI (Man vs Machine)
- Race in real-time against an AI opponent powered by your choice of algorithm:
  - **A\* Search** (*The Smart Seeker*)
  - **Dijkstra's Algorithm** (*The Cost Minimizer*)
  - **BFS** (*The Radial Flooder*)
  - **DFS** (*The Deep Diver*)
- Adjustable AI speed and difficulty tiers (Easy, Normal, Hard, Grandmaster).

### 3. ⚔️ 2-Player Local Duel (PvP)
- **Player 1 (Cyan)**: Controlled via `W`, `A`, `S`, `D`.
- **Player 2 (Magenta)**: Controlled via `↑`, `←`, `↓`, `→` arrow keys.
- Real-time move tracking and coin competition to reach the exit portal first.

### 4. 🔍 Algorithm Visualizer & Step-by-Step Lab
- Watch algorithms explore nodes in real time with color-coded states:
  - **Frontier / Open Set**: Vivid amber glow
  - **Visited / Closed Set**: Algorithm-specific glow (Cyan for BFS, Pink for DFS, Purple for Dijkstra, Emerald for A\*)
  - **Optimal Path**: Flowing neon blue beam
- Step button (`⏭ Step`) to execute step-by-step node transitions (ideal for viva demonstrations).
- Interactive brush tools: Draw walls, clear walls, place **Mud (Cost +5)**, **Water (Cost +10)**, or reposition Start/End markers.

### 5. 🏆 4-Way Arena Showdown
- Runs **BFS, DFS, Dijkstra, and A\*** simultaneously on four synchronized clones of the current maze.
- Real-time comparison metrics:
  - **Nodes Visited**
  - **Path Length (Steps)**
  - **Path Cost**
  - **Execution Time (ms)**

---

## 🏗️ Procedural Maze Generation Algorithms

| Generator | Method | Corridor Characteristic |
| :--- | :--- | :--- |
| **Recursive Backtracking** | Randomized Depth-First Search with Stack | Long, winding corridors with few junctions. High challenge. |
| **Randomized Prim's** | Minimum Spanning Tree spanning outward | Balanced branching factor with many short dead ends. |
| **Kruskal's Algorithm** | Disjoint Set Union (DSU / Union-Find) | Uniform span across the entire grid graph. |
| **Weighted Terrain** | Mixed cost distribution with guaranteed spine | Open field with mud (+5) and water (+10) hazards to showcase Dijkstra & A\* cost awareness. |
| **Empty Canvas** | Open grid with border walls | Allows custom obstacle placement and manual maze drawing. |

---

## 📊 Algorithm Theoretical Comparison (DAA Reference)

| Algorithm | Data Structure | Time Complexity | Space Complexity | Optimality | Completeness |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **BFS** (Breadth-First) | FIFO Queue | $\mathcal{O}(V + E)$ | $\mathcal{O}(V)$ | ✅ Optimal for unweighted graphs | ✅ Yes |
| **DFS** (Depth-First) | LIFO Stack / Recursion | $\mathcal{O}(V + E)$ | $\mathcal{O}(V)$ | ❌ Non-optimal (wanders into deep dead ends) | ✅ Yes (finite graphs) |
| **Dijkstra's** | Min-Priority Queue (Binary Min-Heap) | $\mathcal{O}((V + E) \log V)$ | $\mathcal{O}(V)$ | ✅ Guaranteed optimal for non-negative weights | ✅ Yes |
| **A\* Search** | Min-Priority Queue with $f(n) = g(n) + h(n)$ | $\mathcal{O}((V + E) \log V)$ worst-case | $\mathcal{O}(V)$ | ✅ Optimal if $h(n)$ is admissible | ✅ Yes |

### 📐 Heuristic Function in A*
This implementation uses **Manhattan Distance**:
$$h(n) = |x_n - x_{\text{end}}| + |y_n - y_{\text{end}}|$$
Because movement in this 4-connected grid is orthogonal, Manhattan distance is **admissible** ($h(n) \le h^*(n)$) and **consistent**, guaranteeing that A\* discovers the optimal shortest path while expanding fewer states than Dijkstra or BFS.

---

## 🚀 How to Run

### Method 1: Local HTTP Server (Recommended)
From this project directory, run:
```bash
python3 -m http.server 8005
```
Then open [http://localhost:8005](http://localhost:8005) in any modern web browser (Chrome, Safari, Firefox, Edge).

### Method 2: Direct File Open
Double-click `index.html` or open it directly in your web browser. Everything is self-contained with zero build steps or npm installations required!

---

## 🧊 3D Perspective & Graphics Engine

The game features an authentic multi-perspective 3D graphics engine:
- **🧊 3D Isometric View**: Full isometric voxel projection rendering the maze as a floating 3D celestial citadel with extruded bedrock cliffs, directional shading (lit top cap, illuminated front-left face, shadowed front-right face), and floor drop shadows.
- **🎮 3D Tilt Arena**: Interactive 3D perspective viewport (`perspective: 1200px`) with real-time mouse-tracking parallax tilt that smoothly follows your cursor with spring physics.
- **📐 2.5D Relief View**: High-angle top-down view with extruded 3D bevels, depth shadows, and metallic chamfers.
- **⬜ 2D Classic View**: Instant toggle back to flat 2D for comparison.
- **Dynamic 3D Entities**:
  - **Player & AI Orbs**: Shaded 3D spheres with specular highlights, floating hover bob, ground shadow, and orbiting 3D gyro rings.
  - **3D Crystals / Gems**: Rotating 3D octahedron crystals with facet-based specular lighting and floor shadows.
  - **Cosmic Exit Portal**: Multi-ring spinning gyro with central energy core and vertical particle light pillar.
- **3D Wall Height Extrusion Slider**: Custom slider to dial in subtle 3D depth or dramatic towering walls.
- **60 FPS Animation Loop**: Silky smooth continuous rendering loop using `requestAnimationFrame`.

---

## 🎧 Audio & Visual Polish
- **Web Audio API Synthesizer**: Pure procedural audio (footstep pops, wall bumps, coin chimes, node scan ticks, victory fanfare) with no external MP3 dependencies.
- **Canvas Confetti**: Celebratory particle explosion upon reaching the exit.
- **Responsive High-DPI Rendering**: Automatically adapts to Retina and high-resolution displays.

---

## 📂 Project Architecture
```
anamika_daa/
├── index.html          # Semantic HTML layout, navigation, and modal dialogues
├── css/
│   └── style.css       # Dark glassmorphism theme, neon glows, responsive grid
├── js/
│   ├── audio.js        # Web Audio API sound synthesizer
│   ├── maze.js         # Maze representation, DSU, and procedural generation
│   ├── algorithms.js   # Pure implementations of BFS, DFS, Dijkstra, A* & generators
│   ├── visualizer.js   # HTML5 Canvas renderer, trails, fog-of-war, multi-grid
│   ├── game.js         # Game state manager, AI runner, PvP, hint generator
│   └── app.js          # Event wiring, mode transitions, and UI coordination
└── README.md           # Documentation and academic viva reference
```
