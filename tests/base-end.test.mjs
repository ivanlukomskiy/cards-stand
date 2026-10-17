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
