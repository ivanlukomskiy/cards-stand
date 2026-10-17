import { cellInnerPoints, defaultSketchParameters } from './sketch.ts'
import type { CellSketchParameters } from './sketch.ts'

export interface BaseParameters extends CellSketchParameters {
  rows: number
  columns: number
  baseAngle: number
  baseHeight: number
}

export const defaultBaseParameters: BaseParameters = {
  ...defaultSketchParameters, rows: 2, columns: 2, baseAngle: 45, baseHeight: 12,
}

export function validateBaseParameters(params: BaseParameters) {
  for (const [name, value] of Object.entries(params)) {
    if (!Number.isFinite(value)) throw new Error(`${name} must be a finite number.`)
    if (value < 0) throw new Error(`${name} must not be negative.`)
  }
  if (!Number.isInteger(params.rows) || !Number.isInteger(params.columns) || params.rows < 1 || params.columns < 1) {
    throw new Error('Rows and columns must be positive whole numbers.')
  }
  if (params.cellWidth <= 0 || params.cellLength <= 0 || params.wallThickness <= 0) {
    throw new Error('Cell width, cell length, and wall thickness must be greater than zero.')
  }
  if (params.baseAngle <= 0 || params.baseAngle > 90) {
    throw new Error('Base angle must be greater than 0° and at most 90°.')
  }
}

// Pass the same sketch coordinates to OpenSCAD that the SVG uses.
export function baseDefinitions(params: BaseParameters): string[] {
  validateBaseParameters(params)
  const definitions = {
    cell_inner_points: cellInnerPoints(params).map(({ x, y }) => [x, y]),
    rows: params.rows,
    columns: params.columns,
    column_pitch: params.cellWidth + params.wallThickness,
    row_pitch: params.cellLength + params.wallThickness * 2 + params.hingeThickness + params.hingeTolerance,
    wall_thickness: params.wallThickness,
    base_angle: params.baseAngle,
  }
  return Object.entries(definitions).flatMap(([name, value]) => ['-D', `${name}=${JSON.stringify(value)}`])
}
