import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import OpenSCAD from '../public/vendor/openscad/openscad.js'
import { DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three'
import { baseEndCutPoints, baseEndGeometry, baseEndInnerPoints } from '../src/base-end-geometry.ts'
import { STLLoader } from 'three/addons/loaders/STLLoader.js'
import { baseDefinitions, defaultBaseParameters, cellRaisedProfiles, cellFullHeightProfiles } from '../src/model.ts'
import { cellMidPoints, hingeCutRightPoints, cellOuterPoints } from '../src/sketch.ts'

const wasmBinary = await fs.readFile(new URL('../public/vendor/openscad/openscad.wasm', import.meta.url))
const source = await fs.readFile(new URL('../src/models/base.scad', import.meta.url), 'utf8')
const solidSource = source.replace(/difference\(\) \{\s*base_solid\(\);\s*edge_hinge_cuts\(\);\s*row_cuts\(\);\s*\}/, 'base_solid();').replace(/\n\s*\/\/ Fused[^\n]*\n\s*base_end\(\);/, '')
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
  instance.FS.writeFile('/base.scad', solidSource)
  const code = instance.callMain(['/base.scad', ...baseDefinitions(params), '--export-format', 'binstl', '-o', '/base.stl'])
  assert.equal(code, 0, diagnostics.join('\n'))
  const geometry = new STLLoader().parse(instance.FS.readFile('/base.stl').slice().buffer)
  geometry.computeBoundingBox()
  const { min, max } = geometry.boundingBox
  const shear = 1 / Math.tan(params.baseAngle * Math.PI / 180)
  const hingeSpanY = (params.hingeThickness + params.hingeTolerance) / Math.sin(params.baseAngle * Math.PI / 180)
  const rowPitch = params.cellLength + params.wallThickness * 2 + hingeSpanY
  const colPitch = params.cellWidth + params.wallThickness
  const raisedHeight = params.baseHeight - params.hingeThickness - params.hingeTolerance
  near(min.x, -params.cellWidth / 2 - params.wallThickness)
  near(max.x, params.cellWidth / 2 + params.wallThickness + (params.columns - 1) * colPitch)
  near(min.y, -(params.rows - 1) * rowPitch - params.cellLength - params.wallThickness)
  near(max.y, Math.max(params.wallThickness * shear, params.wallThickness + hingeSpanY + params.baseHeight * shear, -params.cellLength + params.baseHeight * shear))
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
    const rimProfiles = cellFullHeightProfiles(params)
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
const topY = 2 + 3.1 / Math.sin(Math.PI / 4)
assert.deepEqual(cellMidPoints(defaultBaseParameters).map(({ name, x, y }) => [name, x, y]), [
  ['cell outer mid 1', 0, topY], ['cell outer mid 2', 0, -26],
  ['cell inner mid 1', 0, 0], ['cell inner mid 2', 0, -24],
])
console.log('PASS: midpoint coordinates and invalid parameter rejection')

assert.deepEqual(cellRaisedProfiles(defaultBaseParameters).slice(0,2), [
  [[0,topY],[22.9,topY],[22.9,2],[32,2],[32,0],[0,0]],
  [[0,-24],[25,-24],[25,-26],[0,-26]],
])
console.log('PASS: exact right-side profile coordinates and ordering')

assert.deepEqual(cellFullHeightProfiles(defaultBaseParameters)[0], [[32,topY],[34,topY],[34,-26],[25,-26],[25,-24],[32,-24]])
console.log('PASS: full-height side profile point ordering')

for (const baseAngle of [30, 45, 90]) {
  const params = {...defaultBaseParameters, baseAngle}
  const hinge = hingeCutRightPoints(params)
  near(hinge[0].y, 2 + 3.1 / Math.sin(baseAngle * Math.PI / 180))
  near(cellOuterPoints(params)[0].y, hinge[0].y)
  near(hinge[2].x, 22.9) // X tolerance must remain unprojected.
}
console.log('PASS: projected Y tolerance and unchanged X tolerance')

// Check real cut meshes by probing the capsule centreline across all columns.
for (const columns of [1, 3]) {
  const params = {...defaultBaseParameters, rows: 2, columns}
  const {hingeCenter, hingeCenter2} = baseEndGeometry(params)
  const instance = await OpenSCAD({noInitialRun:true, wasmBinary, print:()=>{}, printErr:()=>{}})
  instance.FS.writeFile('/base.scad', source)
  assert.equal(instance.callMain(['/base.scad', ...baseDefinitions(params), '--export-format', 'binstl', '-o', '/base.stl']), 0)
  const geometry = new STLLoader().parse(instance.FS.readFile('/base.stl').slice().buffer)
  const material = new MeshBasicMaterial({side:DoubleSide})
  const mesh = new Mesh(geometry,material)
  mesh.updateMatrixWorld()
  const colPitch = params.cellWidth + params.wallThickness
  const rowPitch = params.cellLength + 2*params.wallThickness + (params.hingeThickness + params.hingeTolerance)/Math.sin(params.baseAngle*Math.PI/180)
  for (let row=0;row<params.rows;row++) {
    const z = (hingeCenter.z + hingeCenter2.z)/2 + 0.123
    const y = hingeCenter.y + (z-hingeCenter.z)/Math.tan(params.baseAngle*Math.PI/180) - row*rowPitch
    const hits = new Raycaster(new Vector3(-1000,y,z),new Vector3(1,0,0)).intersectObject(mesh)
    const xs = hits.map(hit=>hit.point.x).filter((x,i,all)=>i===0 || Math.abs(x-all[i-1])>1e-5)
    const inside = x => xs.filter(hitX=>hitX<x).length%2===1
    assert.equal(inside(-params.cellWidth/2-params.wallThickness/2),false,'Left exterior must be cut')
    assert.equal(inside((columns-1)*colPitch+params.cellWidth/2+params.wallThickness/2),false,'Right exterior must be cut')
    for(let column=0;column<columns-1;column++) {
      assert.equal(inside(column*colPitch+params.cellWidth/2+params.wallThickness/2),true,'Interior wall must remain solid')
    }
  }
  material.dispose()
  geometry.dispose()
  console.log(`PASS: ${columns} columns, two rows: capsules cut only exterior walls`)
}

// The base end spans the full model width and is fused to row 0's outer 1–outer 2 face.
for (const changes of [{ rows: 1, columns: 1, baseAngle: 45 }, { rows: 3, columns: 3, baseAngle: 30, standHingeTolerance: 0.5 }, { rows: 2, columns: 2, baseAngle: 90, standHingeTolerance: 0 }]) {
  const params = {...defaultBaseParameters, ...changes}
  const {start, atHeight, rest1, rest2, center} = baseEndGeometry(params)
  const instance = await OpenSCAD({noInitialRun:true, wasmBinary, print:()=>{}, printErr:()=>{}})
  instance.FS.writeFile('/base.scad', source)
  assert.equal(instance.callMain(['/base.scad', ...baseDefinitions(params), '--export-format', 'binstl', '-o', '/base.stl']), 0)
  const geometry = new STLLoader().parse(instance.FS.readFile('/base.stl').slice().buffer)
  geometry.computeBoundingBox()
  const colPitch = params.cellWidth + params.wallThickness
  const minX = -params.cellWidth/2 - params.wallThickness
  const maxX = (params.columns-1)*colPitch + params.cellWidth/2 + params.wallThickness
  near(geometry.boundingBox.max.y, Math.max(rest1.y, rest2.y, ...baseEndInnerPoints(params).map(([y]) => y)))
  const material = new MeshBasicMaterial({side:DoubleSide})
  const mesh = new Mesh(geometry,material)
  mesh.updateMatrixWorld()
  // Probe inside the base end polygon, and across the shared face into row 0.
  const z = atHeight.z / 2 + 0.123
  const faceY = start.y + (atHeight.y - start.y) * z / atHeight.z
  for (const y of [faceY + (rest2.y - start.y) / 2, faceY - 0.01, faceY + 0.01]) {
    const hits = new Raycaster(new Vector3(-1000,y,z),new Vector3(1,0,0)).intersectObject(mesh)
    const xs = hits.map(hit=>hit.point.x).filter((x,i,all)=>i===0 || Math.abs(x-all[i-1])>1e-5)
    if (y > faceY) assert.deepEqual(xs.map(x => Math.round(x*1e4)/1e4), [minX, maxX].map(x => Math.round(x*1e4)/1e4), 'Base end must be one solid across the full width')
    else assert.ok(xs.length >= 2, 'Row 0 wall must meet the base end')
  }
  // The yellow outline extrusion stops twice the wall thickness short of each side; the pink hole is chamfered at both ends.
  const holeRadius = (params.baseHeight - 2*params.wallThickness - params.standHingeTolerance) / 2
  const chamfer = params.wallThickness / 2
  const xsAt = (y, z) => new Raycaster(new Vector3(-1000,y,z),new Vector3(1,0,0)).intersectObject(mesh)
    .map(hit=>hit.point.x).filter((x,i,all)=>i===0 || Math.abs(x-all[i-1])>1e-5).map(x => Math.round(x*1e4)/1e4)
  const round = values => values.map(x => Math.round(x*1e4)/1e4)
  const innerMin = minX + 2*params.wallThickness
  const innerMax = maxX - 2*params.wallThickness
  assert.deepEqual(xsAt(center.y, center.z + holeRadius + chamfer * 1.5), round([innerMin, innerMax]), 'Yellow outline must be inset by twice the wall thickness')
  assert.deepEqual(xsAt(center.y, center.z), [], 'Hole must cut through the yellow extrusion')
  assert.deepEqual(xsAt(center.y, center.z + holeRadius + chamfer / 2), round([innerMin + chamfer / 2, innerMax - chamfer / 2]), 'Hole ends must have 45° chamfers of wall thickness / 2')
  const hits = new Raycaster(new Vector3(0,faceY-0.5,z),new Vector3(0,1,0)).intersectObject(mesh).filter(hit=>Math.abs(hit.point.y-faceY)<1e-4)
  assert.equal(hits.length, 0, 'No internal face between row 0 and the base end')
  material.dispose()
  geometry.dispose()
  console.log(`PASS: ${params.rows} × ${params.columns} cells, ${params.baseAngle}°: base end spans full width, fuses to row 0, with inset yellow extrusion and chamfered hole`)
}

// The purple outline is cut through every row, leaving only the model's outer side walls.
for (const changes of [{ rows: 1, columns: 1, baseAngle: 45 }, { rows: 3, columns: 3, baseAngle: 30 }, { rows: 2, columns: 2, baseAngle: 60 }]) {
  const params = {...defaultBaseParameters, ...changes}
  const {midCut1, hingeCenter2} = baseEndGeometry(params)
  const instance = await OpenSCAD({noInitialRun:true, wasmBinary, print:()=>{}, printErr:()=>{}})
  instance.FS.writeFile('/base.scad', source)
  assert.equal(instance.callMain(['/base.scad', ...baseDefinitions(params), '--export-format', 'binstl', '-o', '/base.stl']), 0)
  const geometry = new STLLoader().parse(instance.FS.readFile('/base.stl').slice().buffer)
  const material = new MeshBasicMaterial({side:DoubleSide})
  const mesh = new Mesh(geometry,material)
  mesh.updateMatrixWorld()
  const colPitch = params.cellWidth + params.wallThickness
  const rowPitch = params.cellLength + 2*params.wallThickness + (params.hingeThickness + params.hingeTolerance)/Math.sin(params.baseAngle*Math.PI/180)
  const minX = -params.cellWidth/2 - params.wallThickness
  const maxX = (params.columns-1)*colPitch + params.cellWidth/2 + params.wallThickness
  const round = values => values.map(x => Math.round(x*1e4)/1e4)
  // A point inside the outline, between mid cut 1 and the hinge 2 circle, below the top.
  const z = (midCut1.z + hingeCenter2.z) / 2
  for (let row = 0; row < params.rows; row++) {
    const y = midCut1.y + 0.25 - row * rowPitch
    const xs = new Raycaster(new Vector3(-1000,y,z),new Vector3(1,0,0)).intersectObject(mesh)
      .map(hit=>hit.point.x).filter((x,i,all)=>i===0 || Math.abs(x-all[i-1])>1e-5)
    assert.deepEqual(round(xs), round([minX, minX + params.wallThickness, maxX - params.wallThickness, maxX]), `Row ${row}: only outer walls remain inside the cut`)
  }
  assert.ok(baseEndCutPoints(params).length > 4)
  material.dispose()
  geometry.dispose()
  console.log(`PASS: ${params.rows} × ${params.columns} cells, ${params.baseAngle}°: purple outline cut through every row except outer walls`)
}
