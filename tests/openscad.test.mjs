import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import OpenSCAD from '../public/vendor/openscad/openscad.js'
import { STLLoader } from 'three/addons/loaders/STLLoader.js'
import { baseDefinitions, defaultBaseParameters, cellRaisedProfiles, cellRimProfiles } from '../src/model.ts'
import { cellMidPoints, hingeCutRightPoints, cellOuterPoints } from '../src/sketch.ts'

const wasmBinary = await fs.readFile(new URL('../public/vendor/openscad/openscad.wasm', import.meta.url))
const source = await fs.readFile(new URL('../src/models/base.scad', import.meta.url), 'utf8')
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.0001, `${actual} != ${expected}`)

for (const changes of [
  { rows: 1, columns: 1, baseAngle: 45 },
  { rows: 1, columns: 1, baseAngle: 30, baseHeight: 16 },
  { rows: 1, columns: 1, baseAngle: 90 },
  {},
  { rows: 3, columns: 2, baseAngle: 30, wallThickness: 3 },
  { rows: 1, columns: 3, baseAngle: 90 },
]) {
  const params = { ...defaultBaseParameters, ...changes }
  const diagnostics = []
  const instance = await OpenSCAD({
    noInitialRun: true, wasmBinary,
    print: text => diagnostics.push(text), printErr: text => diagnostics.push(text),
  })
  instance.FS.writeFile('/base.scad', source)
  const code = instance.callMain(['/base.scad', ...baseDefinitions(params), '--export-format', 'binstl', '-o', '/base.stl'])
  assert.equal(code, 0, diagnostics.join('\n'))
  const geometry = new STLLoader().parse(instance.FS.readFile('/base.stl').slice().buffer)
  geometry.computeBoundingBox()
  const { min, max } = geometry.boundingBox
  const shear = 1 / Math.tan(params.baseAngle * Math.PI / 180)
  const yTolerance = params.hingeTolerance * Math.sin(params.baseAngle * Math.PI / 180)
  const rowPitch = params.cellLength + params.wallThickness * 2 + params.hingeThickness + yTolerance
  const colPitch = params.cellWidth + params.wallThickness
  const raisedHeight = params.baseHeight - params.hingeThickness - params.hingeTolerance
  near(min.x, -params.cellWidth / 2 - params.wallThickness)
  near(max.x, params.cellWidth / 2 + params.wallThickness + (params.columns - 1) * colPitch)
  near(min.y, -params.cellLength - params.wallThickness)
  near(max.y, (params.rows - 1) * rowPitch + Math.max(params.wallThickness * shear, params.wallThickness + params.hingeThickness + yTolerance + raisedHeight * shear, -params.cellLength + params.baseHeight * shear))
  near(min.z, 0)
  near(max.z, Math.max(params.wallThickness, params.baseHeight))
  if (params.rows === 1 && params.columns === 1) {
    // The profiles touch the floor at their boundaries without overlapping its volume.
    const area = polygon => Math.abs(polygon.reduce((sum, p, i) => {
      const q = polygon[(i + 1) % polygon.length]
      return sum + p[0] * q[1] - q[0] * p[1]
    }, 0)) / 2
    const profiles = cellRaisedProfiles(params)
    assert.deepEqual(profiles.slice(2), profiles.slice(0,2).map(profile => profile.map(([x,y]) => [-x,y]).reverse()))
    const rimProfiles = cellRimProfiles(params)
    assert.deepEqual(rimProfiles[1], rimProfiles[0].map(([x,y]) => [-x,y]).reverse())
    const expectedVolume = rimProfiles.reduce((sum, profile) => sum + area(profile), 0) * params.baseHeight + profiles.reduce((sum, profile) => sum + area(profile), 0) * raisedHeight + params.cellWidth * params.cellLength * params.wallThickness
    const position = geometry.attributes.position
    let volume = 0
    for (let i = 0; i < position.count; i += 3) {
      const a = [position.getX(i), position.getY(i), position.getZ(i)]
      const b = [position.getX(i+1), position.getY(i+1), position.getZ(i+1)]
      const c = [position.getX(i+2), position.getY(i+2), position.getZ(i+2)]
      volume += (a[0]*(b[1]*c[2]-b[2]*c[1]) + a[1]*(b[2]*c[0]-b[0]*c[2]) + a[2]*(b[0]*c[1]-b[1]*c[0])) / 6
    }
    assert.ok(Math.abs(Math.abs(volume) - expectedVolume) < expectedVolume * 1e-5, `Unexpected volume ${volume}; expected ${expectedVolume}`)
  }
  geometry.dispose()
  console.log(`PASS: ${params.rows} × ${params.columns} cells, ${params.baseAngle}°, ${raisedHeight} mm raised profiles; mesh bounds and single-cell volume`)
}
assert.throws(() => baseDefinitions({ ...defaultBaseParameters, baseAngle: 0 }))
assert.throws(() => baseDefinitions({ ...defaultBaseParameters, baseHeight: 3.1 }))
assert.throws(() => baseDefinitions({ ...defaultBaseParameters, rows: 1.5 }))
assert.throws(() => baseDefinitions({ ...defaultBaseParameters, columns: 0 }))
const topY = 5 + 0.1 * Math.sin(Math.PI / 4)
assert.deepEqual(cellMidPoints(defaultBaseParameters).map(({ name, x, y }) => [name, x, y]), [
  ['cell outer mid 1', 0, topY], ['cell outer mid 2', 0, -26],
  ['cell inner mid 1', 0, 0], ['cell inner mid 2', 0, -24],
])
console.log('PASS: midpoint coordinates and invalid parameter rejection')

assert.deepEqual(cellRaisedProfiles(defaultBaseParameters).slice(0,2), [
  [[0,topY],[22.9,topY],[22.9,2],[32,2],[32,topY],[34,topY],[34,-24],[32,-24],[32,0],[0,0]],
  [[0,-24],[25,-24],[25,-26],[0,-26]],
])
console.log('PASS: exact right-side profile coordinates and ordering')

assert.deepEqual(cellRimProfiles(defaultBaseParameters)[0], [[25,-24],[34,-24],[34,-26],[25,-26]])
console.log('PASS: full-height rim profile point ordering')

for (const baseAngle of [30, 45, 90]) {
  const params = {...defaultBaseParameters, baseAngle}
  const hinge = hingeCutRightPoints(params)
  near(hinge[0].y, 5 + 0.1 * Math.sin(baseAngle * Math.PI / 180))
  near(cellOuterPoints(params)[0].y, hinge[0].y)
  near(hinge[2].x, 22.9) // X tolerance must remain unprojected.
}
console.log('PASS: projected Y tolerance and unchanged X tolerance')
