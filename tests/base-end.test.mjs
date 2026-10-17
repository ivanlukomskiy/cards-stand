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
