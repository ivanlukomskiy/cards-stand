import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import OpenSCAD from '../public/vendor/openscad/openscad.js'
import { STLLoader } from 'three/addons/loaders/STLLoader.js'
import { baseDefinitions, defaultBaseParameters } from '../src/model.ts'
import { cellMidPoints } from '../src/sketch.ts'

const wasmBinary = await fs.readFile(new URL('../public/vendor/openscad/openscad.wasm', import.meta.url))
const source = await fs.readFile(new URL('../src/models/base.scad', import.meta.url), 'utf8')
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.0001, `${actual} != ${expected}`)

for (const changes of [
  { rows: 1, columns: 1, baseAngle: 45 },
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
  const rowPitch = params.cellLength + params.wallThickness * 2 + params.hingeThickness + params.hingeTolerance
  const colPitch = params.cellWidth + params.wallThickness
  near(min.x, -params.cellWidth / 2)
  near(max.x, params.cellWidth / 2 + (params.columns - 1) * colPitch)
  near(min.y, -params.cellLength)
  near(max.y, (params.rows - 1) * rowPitch + params.wallThickness * shear)
  near(min.z, 0)
  near(max.z, params.wallThickness)
  // Undo the shear: every vertex must match a corner of a translated inner rectangle.
  const position = geometry.attributes.position
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), y = position.getY(i), z = position.getZ(i)
    assert.ok(Math.abs(z) < 1e-4 || Math.abs(z - params.wallThickness) < 1e-4)
    let matched = false
    for (let row = 0; row < params.rows; row++) for (let col = 0; col < params.columns; col++) {
      const localX = x - col * colPitch
      const localY = y - z * shear - row * rowPitch
      if (Math.abs(Math.abs(localX) - params.cellWidth / 2) < 1e-4 &&
        (Math.abs(localY) < 1e-4 || Math.abs(localY + params.cellLength) < 1e-4)) matched = true
    }
    assert.ok(matched, `Unexpected extruded vertex ${x}, ${y}, ${z}`)
  }
  geometry.dispose()
  console.log(`PASS: ${params.rows} × ${params.columns} cells, ${params.baseAngle}°, ${params.wallThickness} mm Z thickness; bounds, shear and cell positions`)
}
assert.throws(() => baseDefinitions({ ...defaultBaseParameters, baseAngle: 0 }))
assert.throws(() => baseDefinitions({ ...defaultBaseParameters, rows: 1.5 }))
assert.throws(() => baseDefinitions({ ...defaultBaseParameters, columns: 0 }))
assert.deepEqual(cellMidPoints(defaultBaseParameters).map(({ name, x, y }) => [name, x, y]), [
  ['cell outer mid 1', 0, 5.1], ['cell outer mid 2', 0, -26],
  ['cell inner mid 1', 0, 0], ['cell inner mid 2', 0, -24],
])
console.log('PASS: midpoint coordinates and invalid parameter rejection')
