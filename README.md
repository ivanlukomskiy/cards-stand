# Cards stand

A parametric cards stand constructor with a named 2D sketch and an OpenSCAD-generated Three.js preview.

Use Node.js 24, then run `npm install` and `npm run dev`. Run `npm run build` for production and `npm test` to verify the actual OpenSCAD mesh geometry.

The sidebar and viewport styles follow the sibling dome-builder project. Sketch shows one cell, with named points, hover formulas, and dash-dot axes. 3D shows the repeated cell layout. Drag to orbit, scroll/pinch to zoom, and right-drag to pan. Fit model frames the generated mesh; Redraw rebuilds it.

The first cell keeps its sketch coordinates. Columns advance in +X by `cell width + wall thickness`; rows advance in -Y by `cell length + 2 * wall thickness + (hinge thickness + hinge tolerance) / sin(base angle)`.

Each cell unions the inner rectangle extruded by wall thickness with two right-side profiles and their Y-axis mirrors extruded by `base height - hinge thickness - hinge tolerance`. The side profiles (hinge cut R1 → cell outer 1 → cell outer 2 → rim R3 → rim R2 → cell inner 2 and its mirror) extrude by the full base height. The shorter front profiles follow cell outer mid 1 → hinge cut R4 → R3 → R2 → cell inner 1 → cell inner mid 1, with mirrored left profiles. All start at Z=0, with extrusion distances measured along Z. Extrusions rise toward +Y and +Z, at the base angle measured from +Y in the YOZ plane. The Y shift is `Z / tan(base angle)`. Angles must be greater than 0° and at most 90°; base height must exceed hinge thickness plus tolerance. The raised profiles use the same named points as the sketch, including the hinge and rim points.

`src/sketch.ts` defines the points, including outer/inner midpoint markers. `src/model.ts` passes the same inner rectangle coordinates to OpenSCAD along with layout and extrusion parameters. `src/models/base.scad` defines the angled extrusion and repeated cell union. The official OpenSCAD WebAssembly runtime is installed in `public/vendor/openscad` with source, version, checksum, and license details.

OpenSCAD runs in an isolated background worker and exports a binary STL in millimeters. Three.js loads that mesh, converts Z-up to Y-up, and fits the actual mesh bounds. Superseded builds are terminated; the last successful mesh remains visible during rebuilding or invalid edits. Export/download UI is a future step.

In the cell sketch and row layout, the hinge span along Y is `(hinge thickness + hinge tolerance) / sin(base angle)`, with top points at `wall thickness + (hinge thickness + hinge tolerance) / sin(base angle)`. X coordinates retain the original hinge tolerance; extrusion distances along Z are unchanged.

The base end polygon (rest 1 → outer 2 → outer 1 → rest 2) is extruded along X across the full model width and fused to row 0 along its outer 1–outer 2 face. The yellow outline (rest 2 → outer 5 → arc → outer 4 → outer 3 → rest 1, closed back to rest 2) is extruded the same way but inset by `2 * wall thickness` from each side. The pink circle (diameter `base height - 2 * wall thickness - stand hinge tolerance`, concentric with the helper circle) is drilled through the yellow extrusion along X, with 45° chamfers of `wall thickness / 2` at both ends. Neither extrusion is subtracted by the hinge cuts.

The purple outline from the Base end sketch (outer 2 → mid cut 1 → mid cut 2 → arc → mid cut 3 → hinge circle 2 bottom → arc → its tangent point on outer 1–outer 2) is cut along X through every row, between the inner faces of the two outer side walls, so only those walls remain in that region.

The hinge capsule from the Base end sketch is subtracted along X through only the left wall of column 0 and the right wall of the last column, in every row. A single-column layout receives both outside cuts. Interior walls are preserved. The capsule sketch and cuts share their geometry through `src/base-end-geometry.ts`.
