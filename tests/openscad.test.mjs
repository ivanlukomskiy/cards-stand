import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import OpenSCAD from '../public/vendor/openscad/openscad.js'
import { STLLoader } from 'three/addons/loaders/STLLoader.js'

const wasmBinary = await fs.readFile(new URL('../public/vendor/openscad/openscad.wasm', import.meta.url))
const source = await fs.readFile(new URL('../src/models/base.scad', import.meta.url), 'utf8')

for (const side of [0.1, 50, 80, 10000]) {
  const diagnostics = []
  const instance = await OpenSCAD({
    noInitialRun: true, noExitRuntime: true, wasmBinary,
    print: text => diagnostics.push(text),
    printErr: text => diagnostics.push(text),
  })
  instance.FS.writeFile('/base.scad', source)
  const code = instance.callMain([
    '/base.scad', '-D', `side_length=${side}`,
    '--export-format', 'binstl', '-o', '/base.stl',
  ])
  assert.equal(code, 0, diagnostics.join('\n'))
  const bytes = instance.FS.readFile('/base.stl').slice()
  const geometry = new STLLoader().parse(bytes.buffer)
  geometry.rotateX(-Math.PI / 2)
  geometry.computeBoundingBox()
  const { min, max } = geometry.boundingBox
  assert.equal(geometry.attributes.position.count / 3, 12)
  for (const axis of ['x', 'y', 'z']) {
    assert.ok(Math.abs(max[axis] - min[axis] - side) < side * 1e-5, `Incorrect ${axis} size`)
  }
  assert.ok(Math.abs(min.y) < side * 1e-5, 'Base must sit on the ground')
  geometry.dispose()
  console.log(`PASS: OpenSCAD generates a grounded ${side} mm Base`)
}
