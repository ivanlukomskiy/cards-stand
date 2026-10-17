import { hingeOutline } from './hinge-top-sketch.ts'
import type { fillet } from './hinge-top-sketch.ts'
import { validateBaseParameters } from './model.ts'
import type { BaseParameters } from './model.ts'

// Sample a fillet arc from its start to its end tangent point, at 64 segments per turn.
function filletPoints(corner: ReturnType<typeof fillet>): number[][] {
  const from = Math.atan2(corner.start.y - corner.centre.y, corner.start.x - corner.centre.x)
  const to = Math.atan2(corner.end.y - corner.centre.y, corner.end.x - corner.centre.x)
  // The arc bends the same way the outline turns, and is always shorter than half a turn.
  let sweep = to - from
  if (corner.turn > 0 && sweep < 0) sweep += 2 * Math.PI
  if (corner.turn < 0 && sweep > 0) sweep -= 2 * Math.PI
  const radius = Math.hypot(corner.start.x - corner.centre.x, corner.start.y - corner.centre.y)
  const segments = Math.max(1, Math.ceil(64 * Math.abs(sweep) / (2 * Math.PI)))
  return Array.from({ length: segments + 1 }, (_, i) => {
    const angle = from + sweep * i / segments
    return [corner.centre.x + radius * Math.cos(angle), corner.centre.y + radius * Math.sin(angle)]
  })
}

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
  const definitions = {
    wall_thickness: params.wallThickness,
    hinge_outline_points: hingeOutlinePoints(params),
  }
  return Object.entries(definitions).flatMap(([name, value]) => ['-D', `${name}=${JSON.stringify(value)}`])
}
