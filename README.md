<p align="center">
  <img src="public/favicon.svg" width="96" alt="cards stand logo" />
</p>

<h1 align="center">cards stand</h1>

<p align="center">Parametric foldable cards stand generation for board games</p>

<p align="center"><a href="https://ivanlukomskiy.github.io/cards-stand/">Open the generator</a></p>

## How it works

The stand is a grid of cells that hold cards, with a hinged divider in each row and a folding stand at the back. You set the dimensions in the sidebar (rows, columns, cell size, wall thickness, angles, tolerances and the stand's Voronoi pattern), and every part is rebuilt from them:

- **Base**: the cells, with grooves the hinges rotate in, and the end that holds the stand.
- **Hinge**: one per row, holding the cards up. The hinges lock in place when opened, which makes the stand sturdier.
- **Stand**: the folding back support, with a rounded Voronoi pattern cut through its plate.
- **Bolt**: two pins that hold the stand in the base.

Each part is described by 2D sketches computed in TypeScript (shown in the Sketches view, with every point's formula on hover). The sketches are extruded and combined by OpenSCAD, running in the browser as WebAssembly, and the resulting meshes are shown with Three.js. The Assembly view puts the parts together, with the stand and hinges folded or extended. Export downloads every part as STL or as 3MF, ready to slice and print.

![The assembly preview with default parameters](docs/screenshot.png)

## Running locally

Use Node.js 24.

```sh
npm install
npm run dev
```

## Why

The stand was first designed for playing Food Chain Magnate, which has you arrange lots of small stacks of cards.

This project is an experiment in designing a printable model by writing code with AI tools instead of using CAD software.

## License

[MIT](LICENSE). The bundled OpenSCAD runtime in `public/vendor/openscad` is GPL-licensed (see its `COPYING`).
