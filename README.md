# Cards stand

A parametric cards stand constructor with an OpenSCAD-generated Base and a Three.js preview.

Use Node.js 24, then run `npm install` and `npm run dev`. Run `npm run build` for a production build and `npm test` to verify OpenSCAD mesh generation at several sizes.

The sidebar and viewport styling follow the sibling dome-builder project. Enter a Base side length from 0.1 to 10,000 mm to regenerate its mesh after a short debounce. Drag to orbit, scroll/pinch to zoom, and right-drag/two-finger drag to pan. Fit model frames the Base; Redraw rebuilds it using OpenSCAD.

`src/models/base.scad` defines the actual geometry. The official OpenSCAD WebAssembly runtime is installed in `public/vendor/openscad` (version, source, checksum and license are included there). It runs entirely in the browser, in a background worker, so no desktop OpenSCAD installation or backend is required. Each build creates an isolated runtime; superseded workers are terminated to prevent stale models replacing newer edits.

The worker exports a binary STL in millimeters. Three.js loads this mesh and converts OpenSCAD's Z-up coordinates to the viewport's Y-up coordinates. It does not construct the Base geometry itself. The previous mesh remains visible during rebuilds and failures. Model download/export UI is a future step.
