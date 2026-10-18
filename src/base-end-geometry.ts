import type { BaseParameters } from './model.ts'

export function baseEndGeometry(params: BaseParameters) {
  const start = { y: params.wallThickness + (params.hingeThickness + params.hingeTolerance) / Math.sin(params.hingeAngle * Math.PI / 180), z: 0 }
  const slope = 1 / Math.tan(params.hingeAngle * Math.PI / 180)
  const atHeight = { y: start.y + params.baseHeight * slope, z: params.baseHeight }
  // OY and the upper horizontal beam are baseHeight apart.
  const radius = params.baseHeight / 2
  const center = {
    y: start.y + radius * slope + radius / Math.sin(params.hingeAngle * Math.PI / 180),
    z: radius,
  }
  // Unit normal toward the centre in (Y, Z) coordinates.
  const angle = params.hingeAngle * Math.PI / 180
  const offsetStart = {
    y: start.y + params.wallThickness * Math.sin(angle),
    z: start.z - params.wallThickness * Math.cos(angle),
  }
  const rest2 = { y: start.y + params.wallThickness / Math.sin(angle), z: start.z }
  const rest1 = { y: rest2.y + params.baseHeight * slope, z: atHeight.z }
  // Move the circle and its dependent points left by the rest-line offset.
  center.y += rest1.y - atHeight.y
  const standAngle = params.standAngle * Math.PI / 180
  // Outer 4 sits on the circle's radius increased by the stand tolerance, about the same centre.
  const arcRadius = radius + params.standTolerance
  const outer4 = {
    y: center.y + arcRadius * Math.sin(standAngle),
    z: center.z - arcRadius * Math.cos(standAngle),
  }
  // Outer 3: the line from outer 4 at the stand angle, tangent to the enlarged circle, meets Z = base height.
  const outer3 = {
    y: outer4.y + (atHeight.z - outer4.z) * Math.cos(standAngle) / Math.sin(standAngle),
    z: atHeight.z,
  }
  // Outer 5: the enlarged circle crosses Z = 0 on the +Y side of the centre; the arc is no longer tangent there.
  const outer5 = {
    y: center.y + Math.sqrt(Math.max(0, arcRadius ** 2 - center.z ** 2)),
    z: 0,
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
    z: params.baseHeight - params.wallThickness - (params.hingeThickness + params.hingeTolerance) / 2,
    y: hingeCenter.y + (params.baseHeight - params.wallThickness - (params.hingeThickness + params.hingeTolerance) / 2 - hingeCenter.z) * slope,
  }
  // Hinge centre 3 lies on hinge centre 2's horizontal, offset toward -Y by the centre distance plus hinge thickness.
  const hingeCenter3 = {
    y: hingeCenter2.y - Math.hypot(hingeCenter2.y - hingeCenter.y, hingeCenter2.z - hingeCenter.z) - params.hingeThickness,
    z: hingeCenter2.z,
  }
  // The purple cut's rounding: hinge circle 3 lowered by the hinge rest tolerance, so the cut's lower line
  // drops to the semi raised profiles' height while hinge centre 3 stays put.
  const cutCentre = { y: hingeCenter3.y, z: hingeCenter3.z - params.hingeRestTolerance }
  // Mid cut 1: right of hinge centre 3 by the hinge radius (toward -Y), raised to outer 2's Z.
  const midCut1 = { y: hingeCenter3.y - hingeRadius, z: atHeight.z }
  // Mid cuts 2 and 3: the right and bottom points of the lowered circle.
  const midCut2 = { y: cutCentre.y - hingeRadius, z: cutCentre.z }
  const midCut3 = { y: cutCentre.y, z: cutCentre.z - hingeRadius }
  // Extend the horizontal lower cut directly to outer 1–outer 2.
  const cutCorner = { y: start.y + midCut3.z * slope, z: midCut3.z }
  // The pink circle's diameter is reduced by the stand hinge tolerance.
  const holeRadius = (params.baseHeight - params.wallThickness * 2 - params.standHingeTolerance) / 2
  return { start, atHeight, slope, center, radius, arcRadius, outer5, holeRadius, offsetStart, rest1, rest2, outer3, outer4, hingeCenter, hingeCenter2, hingeCenter3, hingeRadius, cutCentre, midCut1, midCut2, midCut3, cutCorner }
}

// Hinge centre travel: the distance between hinge centres 1 and 2.
export function hingeCentreTravel(params: BaseParameters) {
  const { hingeCenter, hingeCenter2 } = baseEndGeometry(params)
  return Math.hypot(hingeCenter2.y - hingeCenter.y, hingeCenter2.z - hingeCenter.z)
}

// The yellow outline, closed by rest 1–rest 2, with its arc sampled at 64 segments per turn.
export function baseEndInnerPoints(params: BaseParameters): number[][] {
  const { center, arcRadius, outer3, outer4, outer5, rest1, rest2 } = baseEndGeometry(params)
  // The arc runs from outer 5 to outer 4 on the enlarged circle, rising from +Y toward +Z.
  const from = Math.atan2(outer5.z - center.z, outer5.y - center.y)
  const to = Math.atan2(outer4.z - center.z, outer4.y - center.y)
  const sweep = Math.max(0, to - from)
  const segments = Math.max(1, Math.ceil(64 * sweep / (2 * Math.PI)))
  const arc = Array.from({ length: segments + 1 }, (_, i) => {
    const angle = from + sweep * i / segments
    return [center.y + arcRadius * Math.cos(angle), center.z + arcRadius * Math.sin(angle)]
  })
  arc[0] = [outer5.y, outer5.z]
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

// The purple cut outline: outer 2 → mid cut 1 → mid cut 2 → arc → mid cut 3 → sharp corner on outer 1–outer 2.
export function baseEndCutPoints(params: BaseParameters): number[][] {
  const { atHeight, midCut1, cutCentre, hingeRadius, cutCorner } = baseEndGeometry(params)
  return [
    [atHeight.y, atHeight.z + cutOutlineEpsilon],
    [midCut1.y, midCut1.z + cutOutlineEpsilon],
    ...arcPoints(cutCentre, hingeRadius, Math.PI, 1.5 * Math.PI),
    [cutCorner.y, cutCorner.z],
  ].map(([y, z]) => [y! + cutOutlineEpsilon, z!])
}
