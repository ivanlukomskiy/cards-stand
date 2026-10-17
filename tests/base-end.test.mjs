import assert from 'node:assert/strict'
import { baseEndGeometry } from '../src/base-end-sketch.ts'
import { defaultBaseParameters, validateBaseParameters } from '../src/model.ts'

const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`)
for (const standAngle of [15, 45, 80, 90, 120, 170]) {
  const { center, radius, outer3, outer4, rest1, atHeight } = baseEndGeometry({...defaultBaseParameters, standAngle})
  const dy = outer3.y - outer4.y
  const dz = outer3.z - outer4.z
  near(Math.atan2(dz, dy) * 180 / Math.PI, standAngle)
  near(outer3.z, rest1.z)
  near(outer3.z, atHeight.z)
  near(Math.hypot(outer4.y - center.y, outer4.z - center.z), radius)
  // The tangent is perpendicular to the radius at outer 4.
  near(dy * (outer4.y - center.y) + dz * (outer4.z - center.z), 0)
  console.log(`PASS: ${standAngle}° stand tangent and horizontal intersection`)
}
assert.throws(() => validateBaseParameters({...defaultBaseParameters, standAngle: 0}))
assert.throws(() => validateBaseParameters({...defaultBaseParameters, standAngle: 180}))

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
