import { baseEndGeometry } from './base-end-geometry.ts'
import { cellInnerPoints, cellOuterPoints, cellMidPoints, hingeCutRightPoints, rimRightPoints, defaultSketchParameters } from './sketch.ts'
import type { CellSketchParameters } from './sketch.ts'

export interface BaseParameters extends CellSketchParameters {
  rows: number
  columns: number
  standAngle: number
  baseHeight: number
}

export const defaultBaseParameters: BaseParameters = {
  ...defaultSketchParameters, rows: 2, columns: 2, standAngle: 80, baseAngle: 45, baseHeight: 12,
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
  if (params.baseHeight <= params.hingeThickness + params.hingeTolerance) {
    throw new Error('Base height must exceed hinge thickness + hinge tolerance.')
  }
  if (params.standAngle <= 0 || params.standAngle >= 180) {
    throw new Error('Stand angle must be greater than 0° and less than 180°.')
  }
  if (params.baseAngle <= 0 || params.baseAngle > 90) {
    throw new Error('Base angle must be greater than 0° and at most 90°.')
  }
}

export function cellRaisedProfiles(params: BaseParameters): number[][][] {
  const inner = cellInnerPoints(params)
  const mid = cellMidPoints(params)
  const hinge = hingeCutRightPoints(params)
  const rim = rimRightPoints(params)
  // Profiles close automatically back to their first point.
  const right = [
    [mid[0]!, hinge[3]!, hinge[2]!, hinge[1]!, inner[0]!, mid[2]!],
    [mid[3]!, rim[1]!, rim[2]!, mid[1]!],
  ].map(profile => profile.map(({ x, y }) => [x, y]))
  const left = right.map(profile => profile.map(([x, y]) => [-x!, y!]).reverse())
  return [...right, ...left]
}

export function cellFullHeightProfiles(params: BaseParameters): number[][][] {
  const rim = rimRightPoints(params)
  const outer = cellOuterPoints(params)
  const hinge = hingeCutRightPoints(params)
  const inner = cellInnerPoints(params)
  const right = [hinge[0]!, outer[0]!, outer[1]!, rim[2]!, rim[1]!, inner[1]!].map(({ x, y }) => [x, y])
  const left = right.map(([x, y]) => [-x!, y!]).reverse()
  return [right, left]
}

// Pass the same sketch coordinates to OpenSCAD that the SVG uses.
export function baseDefinitions(params: BaseParameters): string[] {
  validateBaseParameters(params)
  const { hingeCenter, hingeCenter2, hingeRadius } = baseEndGeometry(params)
  const definitions = {
    hinge_centres: [[hingeCenter.y, hingeCenter.z], [hingeCenter2.y, hingeCenter2.z]],
    hinge_radius: hingeRadius,
    cell_width: params.cellWidth,
    raised_profiles: cellRaisedProfiles(params),
    full_height_profiles: cellFullHeightProfiles(params),
    base_height: params.baseHeight,
    raised_height: params.baseHeight - params.hingeThickness - params.hingeTolerance,
    cell_inner_points: cellInnerPoints(params).map(({ x, y }) => [x, y]),
    rows: params.rows,
    columns: params.columns,
    column_pitch: params.cellWidth + params.wallThickness,
    row_pitch: params.cellLength + params.wallThickness * 2 + params.hingeThickness + params.hingeTolerance * Math.sin(params.baseAngle * Math.PI / 180),
    wall_thickness: params.wallThickness,
    base_angle: params.baseAngle,
  }
  return Object.entries(definitions).flatMap(([name, value]) => ['-D', `${name}=${JSON.stringify(value)}`])
}
