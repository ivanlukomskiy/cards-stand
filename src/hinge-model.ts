import { hingeBridgePoints, hingeInnerPoints, hingeOuterPoints, hingeOutline } from './hinge-top-sketch.ts'
import { hingeSideGeometry } from './hinge-side-sketch.ts'
import { filletPoints } from './fillet.ts'
import { validateBaseParameters } from './model.ts'
import type { BaseParameters } from './model.ts'

// The blue outline as a closed polygon in (X, Y): outer 1 → outer 2 (rounded) → outer 3 → outer 4 → inner 3 → inner 2 (rounded) → inner 1.
export function hingeOutlinePoints(params: BaseParameters): number[][] {
  const outline = hingeOutline(params)
  return [
    [outline.outer1.x, outline.outer1.y],
    ...filletPoints(outline.outer2),
    [outline.outer3.x, outline.outer3.y],
    [outline.outer4.x, outline.outer4.y],
    [outline.inner3.x, outline.inner3.y],
    ...filletPoints(outline.inner2),
    [outline.inner1.x, outline.inner1.y],
  ]
}

export function hingeDefinitions(params: BaseParameters): string[] {
  validateBaseParameters(params)
  const { radius, centre } = hingeSideGeometry(params)
  const inner3 = hingeInnerPoints(params)[2]!
  const [, , outer3, outer4] = hingeOuterPoints(params)
  const [bridge1, bridge2] = hingeBridgePoints(params)
  const definitions = {
    wall_thickness: params.wallThickness,
    hinge_outline_points: hingeOutlinePoints(params),
    circle_centre: [centre.y, centre.z],
    circle_radius: radius,
    circle_x: inner3.x,
    circle_length: params.hingeProfileWidth + params.wallThickness,
    // Outer 3 → outer 4 → bridge 2 → bridge 1.
    bridge_points: [outer3!, outer4!, bridge2!, bridge1!].map(({ x, y }) => [x, y]),
    columns: params.columns,
    column_pitch: params.cellWidth + params.wallThickness,
  }
  return Object.entries(definitions).flatMap(([name, value]) => ['-D', `${name}=${JSON.stringify(value)}`])
}
