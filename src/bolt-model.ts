import { boltGeometry } from './bolt-sketch.ts'
import { validateBaseParameters } from './model.ts'
import type { BaseParameters } from './model.ts'

export function boltDefinitions(params: BaseParameters): string[] {
  validateBaseParameters(params)
  const { outerRadius, innerRadius } = boltGeometry(params)
  if (innerRadius <= 0) throw new Error('The bolt shank radius must be greater than zero.')
  const definitions = {
    wall_thickness: params.wallThickness,
    head_radius: outerRadius,
    shank_radius: innerRadius,
    shank_length: params.boltLength + params.wallThickness,
    chamfer: innerRadius / 3,
  }
  return Object.entries(definitions).flatMap(([name, value]) => ['-D', `${name}=${JSON.stringify(value)}`])
}
