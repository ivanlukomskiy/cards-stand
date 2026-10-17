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
  // Hinge centre 3 lies on hinge centre 2's horizontal, one hinge centre 1–2 distance toward -Y.
  const hingeCenter3 = {
    y: hingeCenter2.y - Math.hypot(hingeCenter2.y - hingeCenter.y, hingeCenter2.z - hingeCenter.z),
    z: hingeCenter2.z,
  }
  // Mid cut 1: right of hinge centre 3 by the hinge radius (toward -Y), raised to outer 2's Z.
  const midCut1 = { y: hingeCenter3.y - hingeRadius, z: atHeight.z }
  // Mid cuts 2 and 3: the right and bottom points of hinge circle 3.
  const midCut2 = { y: hingeCenter3.y - hingeRadius, z: hingeCenter3.z }
  const midCut3 = { y: hingeCenter3.y, z: hingeCenter3.z - hingeRadius }
  // Mid cut 3 lies on the shared bottom tangent of hinge circles 2 and 3, so the tangent from it touches circle 2 at its bottom.
  const hinge2Bottom = { y: hingeCenter2.y, z: hingeCenter2.z - hingeRadius }
  // Circle 2 touches outer 1–outer 2 at the foot of the perpendicular from hinge centre 2.
  const hinge2Tangent = { y: hingeCenter2.y + hingeRadius * Math.sin(angle), z: hingeCenter2.z - hingeRadius * Math.cos(angle) }
  // The pink circle's diameter is reduced by the stand hinge tolerance.
  const holeRadius = (params.baseHeight - params.wallThickness * 2 - params.standHingeTolerance) / 2
  return { start, atHeight, slope, center, radius, holeRadius, offsetStart, rest1, rest2, outer3, outer4, hingeCenter, hingeCenter2, hingeCenter3, hingeRadius, midCut1, midCut2, midCut3, hinge2Bottom, hinge2Tangent }
}


// The yellow outline, closed by rest 1–rest 2, with its arc sampled at 64 segments per turn.
export function baseEndInnerPoints(params: BaseParameters): number[][] {
  const { center, radius, outer3, outer4, rest1, rest2 } = baseEndGeometry(params)
  const sweep = params.standAngle * Math.PI / 180
  const segments = Math.max(1, Math.ceil(64 * sweep / (2 * Math.PI)))
  // The arc runs from outer 5 at the circle bottom to outer 4, rising from +Y toward +Z.
  const arc = Array.from({ length: segments + 1 }, (_, i) => {
    const angle = -Math.PI / 2 + sweep * i / segments
    return [center.y + radius * Math.cos(angle), center.z + radius * Math.sin(angle)]
  })
  arc[arc.length - 1] = [outer4.y, outer4.z]
  return [[rest2.y, rest2.z], ...arc, [outer3.y, outer3.z], [rest1.y, rest1.z]]
}

// Sample a circle arc in (Y,Z) from one angle to another, at 64 segments per turn.
function arcPoints(center: { y: number, z: number }, radius: number, from: number, to: number): number[][] {
  const segments = Math.max(1, Math.ceil(64 * Math.abs(to - from) / (2 * Math.PI)))
  return Array.from({ length: segments + 1 }, (_, i) => {
    const angle = from + (to - from) * i / segments
    return [center.y + radius * Math.cos(angle), center.z + radius * Math.sin(angle)]
  })
}

// The purple outline is shifted toward +Y (left on the sketch) by this many millimetres.
export const cutOutlineEpsilon = 0.001

// The purple cut outline: outer 2 → mid cut 1 → mid cut 2 → arc → mid cut 3 → hinge 2 bottom → arc → hinge 2 tangent.
export function baseEndCutPoints(params: BaseParameters): number[][] {
  const { atHeight, midCut1, hingeCenter2, hingeCenter3, hingeRadius } = baseEndGeometry(params)
  const angle = params.baseAngle * Math.PI / 180
  return [
    [atHeight.y, atHeight.z],
    [midCut1.y, midCut1.z],
    ...arcPoints(hingeCenter3, hingeRadius, Math.PI, 1.5 * Math.PI),
    ...arcPoints(hingeCenter2, hingeRadius, -Math.PI / 2, angle - Math.PI / 2),
  ].map(([y, z]) => [y! + cutOutlineEpsilon, z!])
}
