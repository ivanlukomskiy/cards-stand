import { validateBaseParameters } from './model.ts'
import type { BaseParameters } from './model.ts'
import { standSideGeometry, standTopFillets, standTopGeometry } from './stand-sketch.ts'
import { filletPoints } from './fillet.ts'

// The Stand top blue outline: outer 1 → outer 2 → outer 3 → inner 4 → inner 3 (rounded) → inner 2 (rounded) → inner 1 → outer 4.
export function standTopPoints(params: BaseParameters): number[][] {
  const top = standTopGeometry(params)
  const fillets = standTopFillets(params)
  return [
    ...[top.outer1, top.outer2, top.outer3, top.inner4].map(({ x, y }) => [x, y]),
    ...filletPoints(fillets.inner3),
    ...filletPoints(fillets.inner2),
    ...[top.inner1, top.outer4].map(({ x, y }) => [x, y]),
  ]
}

// The Stand side green outline in (Y,Z): the top half circle from outer 1 to outer 2 (64 segments per turn), then outer 3 and outer 4.
export function standSidePoints(params: BaseParameters): number[][] {
  const { outerRadius, outer3, outer4 } = standSideGeometry(params)
  const arc = Array.from({ length: 33 }, (_, i) => {
    const angle = Math.PI * i / 32
    return [outerRadius * Math.cos(angle), outerRadius * Math.sin(angle)]
  })
  return [...arc, [outer3.y, outer3.z], [outer4.y, outer4.z]]
}

export function standDefinitions(params: BaseParameters): string[] {
  validateBaseParameters(params)
  const definitions = {
    wall_thickness: params.wallThickness,
    top_points: standTopPoints(params),
    side_points: standSidePoints(params),
    side_hole_radius: standSideGeometry(params).innerRadius,
    side_x: standTopGeometry(params).outer1.x,
    top_z: standSideGeometry(params).outer3.z,
  }
  return Object.entries(definitions).flatMap(([name, value]) => ['-D', `${name}=${JSON.stringify(value)}`])
}
