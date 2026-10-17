import type { BaseParameters } from './model.ts'

export function baseEndGeometry(params: BaseParameters) {
  const start = { y: params.wallThickness + (params.hingeThickness + params.hingeTolerance) / Math.sin(params.baseAngle * Math.PI / 180), z: 0 }
  const slope = 1 / Math.tan(params.baseAngle * Math.PI / 180)
  const atHeight = { y: start.y + params.baseHeight * slope, z: params.baseHeight }
  // OY and the upper horizontal beam are baseHeight apart.
  const radius = params.baseHeight / 2
  const center = {
    y: start.y + radius * slope + radius / Math.sin(params.baseAngle * Math.PI / 180),
    z: radius,
  }
  // Unit normal toward the centre in (Y, Z) coordinates.
  const angle = params.baseAngle * Math.PI / 180
  const offsetStart = {
    y: start.y + params.wallThickness * Math.sin(angle),
    z: start.z - params.wallThickness * Math.cos(angle),
  }
  const rest2 = { y: start.y + params.wallThickness / Math.sin(angle), z: start.z }
  const rest1 = { y: rest2.y + params.baseHeight * slope, z: atHeight.z }
  // Move the circle and its dependent points left by the rest-line offset.
  center.y += rest1.y - atHeight.y
  const standAngle = params.standAngle * Math.PI / 180
  const outer4 = {
    y: center.y + radius * Math.sin(standAngle),
    z: center.z - radius * Math.cos(standAngle),
  }
  const outer3 = {
    y: center.y + radius / Math.tan(standAngle / 2),
    z: atHeight.z,
  }
  // Keep the hinge circles tangent to outer 1–outer 2 on its negative-Y side.
  const hingeRadius = (params.hingeThickness + params.hingeTolerance) / 2
  const hingeOffset = hingeRadius
  const hingeZ = params.wallThickness + params.hingeThickness / 2
  const hingeCenter = {
    y: start.y + hingeZ * slope - hingeOffset / Math.sin(angle),
    z: hingeZ,
  }
  const hingeCenter2 = {
    z: params.baseHeight - params.wallThickness - params.hingeThickness / 2,
    y: hingeCenter.y + (params.baseHeight - params.wallThickness - params.hingeThickness / 2 - hingeCenter.z) * slope,
  }
  return { start, atHeight, slope, center, radius, offsetStart, rest1, rest2, outer3, outer4, hingeCenter, hingeCenter2, hingeRadius }
}

