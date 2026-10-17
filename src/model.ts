import { baseEndCutPoints, baseEndGeometry, baseEndInnerPoints } from './base-end-geometry.ts'
import { cellInnerPoints, cellOuterPoints, cellMidPoints, rimRightPoints, defaultSketchParameters } from './sketch.ts'
import type { CellSketchParameters } from './sketch.ts'

export interface BaseParameters extends CellSketchParameters {
  rows: number
  columns: number
  standAngle: number
  standHingeTolerance: number
  baseHeight: number
}

export const defaultBaseParameters: BaseParameters = {
  ...defaultSketchParameters, rows: 2, columns: 2, standAngle: 80, standHingeTolerance: 0.1, baseAngle: 45, baseHeight: 12,
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

export function cellFullRaisedProfiles(params: BaseParameters): number[][][] {
  const outer = cellOuterPoints(params)
  const inner = cellInnerPoints(params)
  const mid = cellMidPoints(params)
  const rim = rimRightPoints(params)
  // Profiles close automatically back to their first point.
  const right = [mid[0]!, outer[0]!, outer[1]!, rim[1]!, rim[0]!, inner[1]!, inner[0]!, mid[2]!].map(({ x, y }) => [x, y])
  const left = right.map(([x, y]) => [-x!, y!]).reverse()
  return [right, left]
}

export function cellSemiRaisedProfiles(params: BaseParameters): number[][][] {
  const mid = cellMidPoints(params)
  const rim = rimRightPoints(params)
  const right = [mid[3]!, rim[0]!, rim[1]!, mid[1]!].map(({ x, y }) => [x, y])
  const left = right.map(([x, y]) => [-x!, y!]).reverse()
  return [right, left]
}

// Pass the same sketch coordinates to OpenSCAD that the SVG uses.
export function baseDefinitions(params: BaseParameters): string[] {
  validateBaseParameters(params)
  const { hingeCenter, hingeCenter2, hingeRadius, rest1, atHeight, start, rest2, center, holeRadius, slope } = baseEndGeometry(params)
  const definitions = {
    base_end_points: [rest1, atHeight, start, rest2].map(({ y, z }) => [y, z]),
    base_end_inner_points: baseEndInnerPoints(params),
    base_end_cut_points: baseEndCutPoints(params),
    // The sketch's pink circle.
    base_end_hole_centre: [center.y, center.z],
    base_end_hole_radius: holeRadius,
    hinge_centres: [[hingeCenter.y, hingeCenter.z], [hingeCenter2.y, hingeCenter2.z]],
    hinge_radius: hingeRadius,
    cell_width: params.cellWidth,
    full_raised_profiles: cellFullRaisedProfiles(params),
    semi_raised_profiles: cellSemiRaisedProfiles(params),
    base_height: params.baseHeight,
    semi_raised_height: params.baseHeight - params.hingeThickness - params.hingeTolerance,
    cell_outer_points: cellOuterPoints(params).map(({ x, y }) => [x, y]),
    rows: params.rows,
    columns: params.columns,
    column_pitch: params.cellWidth + params.wallThickness,
    row_pitch: params.cellLength + params.wallThickness * 2 + (params.hingeThickness + params.hingeTolerance) / Math.sin(params.baseAngle * Math.PI / 180),
    wall_thickness: params.wallThickness,
    // Computed here so sheared cell faces coincide exactly with base end points built from the same slope.
    shear: slope,
  }
  return Object.entries(definitions).flatMap(([name, value]) => ['-D', `${name}=${JSON.stringify(value)}`])
}
