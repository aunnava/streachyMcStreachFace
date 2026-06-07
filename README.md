# streachyMcStreachFace

A browser-based 3D model editor built with [Three.js](https://threejs.org/) and [Vite](https://vite.dev/) + TypeScript. Import a `.glb`/`.gltf` model, move it with a gizmo, stretch it, apply an image texture, and measure distances across its surfaces.

## Prerequisites

- **Node.js 20.19+** (or 22.12+) — required by Vite 8. Check with `node -v`. Get it from [nodejs.org](https://nodejs.org/).
- **npm** (ships with Node).

## Setup & run

```bash
npm install      # install dependencies
npm run dev      # start the dev server
```

Then open the URL it prints (default **http://localhost:5173**) in your browser.

## Using the app

Use the buttons in the top-left panel plus the keyboard/mouse:

| Action | How |
| --- | --- |
| **Import a model** | Click **Import 3D Model** and pick a `.glb` or `.gltf` file |
| **Orbit the camera** | Middle-mouse drag |
| **Pan** | Right-mouse drag |
| **Select a model** | Left-click it (a move gizmo appears) |
| **Move** | Drag the gizmo arrows |
| **Stretch** | Select a model, press **E**, move the mouse horizontally; **E**/**Esc** to exit |
| **Apply a texture** | Select a model, click **Apply Texture**, pick an image |
| **Measure a surface** | Select a model, click **Measure** (or press **M**), then click a flat face — dimension lines and distances (in cm) to each edge appear; **Esc** to exit |
| **Delete** | Select a model, click **Delete Model** |

Measurements and textures update live as you stretch a model.

> Note: measurements assume **1 world unit = 1 meter** and are shown in cm. This is configurable in [`src/core/config.ts`](src/core/config.ts).

## Project structure

```
src/
  main.ts                  app entry: wires controllers + UI together
  core/                    scene, camera/renderer context, config constants
  loader/ModelLoader.ts    GLTF import / disposal
  features/                SelectionController, ExtrudeController,
                           TextureController, MeasurementController
  geometry/ModelDeformer.ts  vertex-stretch math
  ui/                      control panel + file picker
```
