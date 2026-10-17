import assert from 'node:assert/strict'
import { baseEndGeometry } from '../src/base-end-sketch.ts'
import { defaultBaseParameters, validateBaseParameters } from '../src/model.ts'
import { hingeBridgePoints, hingeInnerPoints, hingeOuterPoints, hingeOutline, hingeTopSketch } from '../src/hinge-top-sketch.ts'

const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`)
for (const standAngle of [25, 45, 80, 90, 120, 155]) {
  const params = {...defaultBaseParameters, standAngle}
  const { center, radius, arcRadius, outer3, outer4, outer5, rest1, atHeight } = baseEndGeometry(params)
  near(arcRadius, radius + params.standTolerance)
  // Outer 5 is where the enlarged circle crosses Z = 0, on the +Y side of the centre.
  near(outer5.z, 0)
  near(Math.hypot(outer5.y - center.y, outer5.z - center.z), arcRadius)
  assert.ok(outer5.y > center.y)
  const dy = outer3.y - outer4.y
  const dz = outer3.z - outer4.z
  near(Math.atan2(dz, dy) * 180 / Math.PI, standAngle)
  near(outer3.z, rest1.z)
  near(outer3.z, atHeight.z)
  near(Math.hypot(outer4.y - center.y, outer4.z - center.z), arcRadius)
  // The tangent is perpendicular to the radius at outer 4.
  near(dy * (outer4.y - center.y) + dz * (outer4.z - center.z), 0)
  console.log(`PASS: ${standAngle}° stand tangent and horizontal intersection`)
}
assert.throws(() => validateBaseParameters({...defaultBaseParameters, standAngle: 0}))
assert.throws(() => validateBaseParameters({...defaultBaseParameters, standAngle: 180}))
// With the default stand tolerance, outer 4 would leave the base below about 22.6° or above about 157.4°.
assert.throws(() => validateBaseParameters({...defaultBaseParameters, standAngle: 20}))
assert.throws(() => validateBaseParameters({...defaultBaseParameters, standAngle: 160}))
validateBaseParameters({...defaultBaseParameters, standAngle: 15, standTolerance: 0})

for (const baseAngle of [15, 45, 90]) {
  const params = {...defaultBaseParameters, baseAngle}
  const {start, slope, hingeCenter} = baseEndGeometry(params)
  near(hingeCenter.z, params.wallThickness + params.hingeThickness / 2)
  const distance = (hingeCenter.y - start.y - hingeCenter.z * slope) / Math.hypot(1, slope)
  near(distance, -(params.hingeThickness + params.hingeTolerance) / 2)
}
console.log('PASS: hinge centre Z and tangency to outer 1–outer 2')

for (const baseAngle of [15,45,90]) {
  const params = {...defaultBaseParameters, baseAngle}
  const {start, hingeCenter, hingeCenter2, slope} = baseEndGeometry(params)
  near((hingeCenter2.y - start.y - hingeCenter2.z * slope) / Math.hypot(1, slope), -(params.hingeThickness + params.hingeTolerance) / 2)
  near(hingeCenter2.z, params.baseHeight - params.wallThickness - params.hingeThickness / 2)
  near(hingeCenter2.y - hingeCenter.y, (hingeCenter2.z - hingeCenter.z) * slope)
}
console.log('PASS: hinge centre 2 target Z and beam-parallel translation')

for (const baseAngle of [30,45,90]) {
  const params = {...defaultBaseParameters,baseAngle}
  const geometry = baseEndGeometry(params)
  near(geometry.start.y, params.wallThickness + (params.hingeThickness + params.hingeTolerance) / Math.sin(baseAngle*Math.PI/180))
  near(geometry.atHeight.y-geometry.start.y, params.baseHeight*geometry.slope)
}
console.log('PASS: base end outer 1 projected tolerance and dependent beam position')

for (const baseAngle of [15,45,90]) {
  const {hingeCenter, hingeCenter2, hingeCenter3} = baseEndGeometry({...defaultBaseParameters, baseAngle})
  near(hingeCenter3.z, hingeCenter2.z)
  near(hingeCenter2.y - hingeCenter3.y, Math.hypot(hingeCenter2.y - hingeCenter.y, hingeCenter2.z - hingeCenter.z))
}
console.log('PASS: hinge centre 3 offset along -Y by the hinge centre 1–2 distance')

for (const baseAngle of [15,45,90]) {
  const params = {...defaultBaseParameters, baseAngle}
  const {hingeCenter3, hingeRadius, midCut1, atHeight} = baseEndGeometry(params)
  near(midCut1.y, hingeCenter3.y - hingeRadius)
  near(midCut1.z, atHeight.z)
}
console.log('PASS: mid cut 1 right of hinge centre 3 by its radius, at outer 2 Z')

for (const baseAngle of [15,45,90]) {
  const {hingeCenter3, hingeRadius, midCut2, midCut3} = baseEndGeometry({...defaultBaseParameters, baseAngle})
  near(midCut2.y, hingeCenter3.y - hingeRadius)
  near(midCut2.z, hingeCenter3.z)
  near(midCut3.y, hingeCenter3.y)
  near(midCut3.z, hingeCenter3.z - hingeRadius)
}
console.log('PASS: mid cuts 2 and 3 on the right and bottom of hinge circle 3')

for (const baseAngle of [15,45,90]) {
  const {start, slope, hingeCenter2, hingeCenter3, hingeRadius, midCut3, hinge2Bottom, hinge2Tangent} = baseEndGeometry({...defaultBaseParameters, baseAngle})
  // Mid cut 3 → hinge 2 bottom is the shared horizontal tangent of circles 3 and 2.
  near(midCut3.z, hinge2Bottom.z)
  near(Math.hypot(hinge2Bottom.y - hingeCenter2.y, hinge2Bottom.z - hingeCenter2.z), hingeRadius)
  near(hingeCenter3.z, hingeCenter2.z)
  // The final arc ends where circle 2 touches outer 1–outer 2.
  near(hinge2Tangent.y, start.y + hinge2Tangent.z * slope)
  near(Math.hypot(hinge2Tangent.y - hingeCenter2.y, hinge2Tangent.z - hingeCenter2.z), hingeRadius)
}
console.log('PASS: purple cut outline tangent points on hinge circle 2')

{
  const params = defaultBaseParameters
  const {hingeCenter, hingeCenter2} = baseEndGeometry(params)
  const distance = Math.hypot(hingeCenter2.y - hingeCenter.y, hingeCenter2.z - hingeCenter.z)
  assert.deepEqual(hingeOuterPoints(params).map(({name, x, y}) => [name, x, y]), [
    ['outer 1', 0, 58], ['outer 2', 11, 58], ['outer 3', 32, distance], ['outer 4', 32, 0],
  ])
}
console.log('PASS: hinge top outer points')

for (const changes of [{}, { hingeHeight: 40, hingeTopWidth: 10 }, { hingeProfileWidth: 4 }]) {
  const params = {...defaultBaseParameters, ...changes}
  const [, outer2, outer3] = hingeOuterPoints(params)
  const [inner1, inner2] = hingeInnerPoints(params)
  near(inner1.x, 0)
  near(inner1.y, params.hingeHeight - params.hingeProfileWidth)
  near(inner2.y, inner1.y)
  // Inner 2 is hinge profile width from the outer 2–outer 3 line, on the side of O.
  const cross = (p) => ((outer3.x - outer2.x) * (p.y - outer2.y) - (outer3.y - outer2.y) * (p.x - outer2.x)) / Math.hypot(outer3.x - outer2.x, outer3.y - outer2.y)
  near(Math.abs(cross(inner2)), params.hingeProfileWidth)
  assert.ok(Math.sign(cross(inner2)) === Math.sign(cross({x: 0, y: 0})))
}
assert.deepEqual(hingeInnerPoints(defaultBaseParameters)[2], { name: 'inner 3', x: 25, y: 0, xFormula: 'cell width / 2 - hinge profile width', yFormula: '0' })
console.log('PASS: hinge top inner 1, inner 2 offset intersection, and inner 3')

for (const changes of [{}, { hingeHeight: 40, hingeTopWidth: 10 }, { hingeProfileWidth: 4 }]) {
  const params = {...defaultBaseParameters, ...changes}
  const [outer1, outer2, outer3] = hingeOuterPoints(params)
  const [inner1, inner2, inner3] = hingeInnerPoints(params)
  const outline = hingeOutline(params)
  near(outline.radius, params.hingeProfileWidth / 2)
  const distanceToLine = (p, a, b) => Math.abs((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)) / Math.hypot(b.x - a.x, b.y - a.y)
  for (const [corner, from, to] of [[outline.outer2, outer1, outer3], [outline.inner2, inner3, inner1]]) {
    // Tangent points lie on their segments, radius away from the centre, and the centre is radius from both lines.
    near(distanceToLine(corner.start, from, from === outer1 ? outer2 : inner2), 0)
    near(distanceToLine(corner.end, from === outer1 ? outer2 : inner2, to), 0)
    near(Math.hypot(corner.start.x - corner.centre.x, corner.start.y - corner.centre.y), outline.radius)
    near(Math.hypot(corner.end.x - corner.centre.x, corner.end.y - corner.centre.y), outline.radius)
    near(distanceToLine(corner.centre, from, from === outer1 ? outer2 : inner2), outline.radius)
    near(distanceToLine(corner.centre, from === outer1 ? outer2 : inner2, to), outline.radius)
  }
  // Outer 2 turns clockwise (Y up) and inner 2 counter-clockwise, so the fillets bend opposite ways.
  assert.equal(outline.outer2.turn, -1)
  assert.equal(outline.inner2.turn, 1)
}
{
  // Outer 2 turns clockwise on screen (sweep 1); inner 2 turns counter-clockwise (sweep 0).
  const outline = hingeOutline(defaultBaseParameters)
  const svg = hingeTopSketch(defaultBaseParameters)
  assert.ok(svg.includes(`0 0 1 ${outline.outer2.end.x} ${-outline.outer2.end.y}`))
  assert.ok(svg.includes(`0 0 0 ${outline.inner2.end.x} ${-outline.inner2.end.y}`))
}
console.log('PASS: hinge top outline fillets at outer 2 and inner 2')

{
  const [, , outer3, outer4] = hingeOuterPoints(defaultBaseParameters)
  assert.deepEqual(hingeBridgePoints(defaultBaseParameters).map(({name, x, y}) => [name, x, y]), [
    ['bridge 1', outer3.x + 2, outer3.y], ['bridge 2', outer4.x + 2, outer4.y],
  ])
}
console.log('PASS: hinge top bridge points')

{
  // Sampled fillet arcs start and end on their tangent points and stay on the fillet circle.
  const { hingeOutlinePoints } = await import('../src/hinge-model.ts')
  const outline = hingeOutline(defaultBaseParameters)
  const points = hingeOutlinePoints(defaultBaseParameters)
  for (const corner of [outline.outer2, outline.inner2]) {
    const start = points.findIndex(([x, y]) => Math.abs(x - corner.start.x) < 1e-9 && Math.abs(y - corner.start.y) < 1e-9)
    const end = points.findIndex(([x, y]) => Math.abs(x - corner.end.x) < 1e-9 && Math.abs(y - corner.end.y) < 1e-9)
    assert.ok(start >= 0 && end > start + 1)
    for (const [x, y] of points.slice(start, end + 1)) near(Math.hypot(x - corner.centre.x, y - corner.centre.y), outline.radius)
    // The arc stays inside the corner: no sample is farther from the corner's centre side than the tangent points.
    const mid = points[Math.floor((start + end) / 2)]
    const chordMid = [(corner.start.x + corner.end.x) / 2, (corner.start.y + corner.end.y) / 2]
    assert.ok(Math.hypot(mid[0] - corner.centre.x, mid[1] - corner.centre.y) > Math.hypot(chordMid[0] - corner.centre.x, chordMid[1] - corner.centre.y))
  }
}
console.log('PASS: hinge outline fillet sampling')

{
  const { hingeSideGeometry } = await import('../src/hinge-side-sketch.ts')
  const side = hingeSideGeometry(defaultBaseParameters)
  near(side.radius, defaultBaseParameters.wallThickness / 2)
  assert.deepEqual(side.centre, {y: 0, z: 0})
}
console.log('PASS: hinge side circle')

{
  const { boltGeometry } = await import('../src/bolt-sketch.ts')
  const params = {...defaultBaseParameters, boltTolerance: 0.25}
  const bolt = boltGeometry(params)
  near(bolt.outerRadius, (params.baseHeight - params.hingeTolerance) / 2)
  near(bolt.innerRadius, (params.baseHeight - 2 * params.wallThickness - params.standHingeTolerance) / 2 - 0.25)
  near(bolt.innerRadius, baseEndGeometry(params).holeRadius - 0.25)
}
console.log('PASS: bolt circles')

{
  const { standSideGeometry } = await import('../src/stand-sketch.ts')
  const params = {...defaultBaseParameters, standHingeTolerance: 0.3}
  const stand = standSideGeometry(params)
  near(stand.outerRadius, (params.baseHeight - 0.3) / 2)
  near(stand.innerRadius, baseEndGeometry(params).holeRadius)
  assert.deepEqual([stand.outer1, stand.outer2], [{y: stand.outerRadius, z: 0}, {y: -stand.outerRadius, z: 0}])
}
console.log('PASS: stand side circles and green half-circle ends')
