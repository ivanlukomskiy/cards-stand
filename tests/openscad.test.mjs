import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import OpenSCAD from '../public/vendor/openscad/openscad.js'
import { DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three'
import { baseEndCutPoints, baseEndGeometry, baseEndInnerPoints } from '../src/base-end-geometry.ts'
import { STLLoader } from 'three/addons/loaders/STLLoader.js'
import { withDefinitions } from '../src/scad-source.ts'
import { baseDefinitions, defaultBaseParameters, rowPitch as modelRowPitch, cellFullRaisedProfiles, cellSemiRaisedProfiles } from '../src/model.ts'
import { cellPadEndPoints, cellMidCutOutline, cellMidCutPoints, cellMidPoints, cellOuterPoints } from '../src/sketch.ts'
import { hingeTravelX } from '../src/hinge-top-sketch.ts'

const wasmBinary = await fs.readFile(new URL('../public/vendor/openscad/openscad.wasm', import.meta.url))
const source = await fs.readFile(new URL('../src/models/base.scad', import.meta.url), 'utf8')
const solidSource = source.replace(/difference\(\) \{\s*base_solid\(\);\s*cell_hinge_cuts\(\);\s*row_cuts\(\);\s*\}/, 'base_solid();').replace(/\n\s*\/\/ Fused[^\n]*\n\s*base_end\(\);/, '')
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.0001, `${actual} != ${expected}`)

for (const changes of [
  { rows: 1, columns: 1, hingeAngle: 45 },
  { rows: 1, columns: 1, hingeAngle: 30, baseHeight: 16 },
  { rows: 1, columns: 1, hingeAngle: 90, cellMidCutWidth: 12 },
  { rows: 1, columns: 1, cellMidCutWidth: 0 },
  {},
  { rows: 3, columns: 2, hingeAngle: 30, wallThickness: 3 },
  { rows: 1, columns: 3, hingeAngle: 90 },
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
  const shear = 1 / Math.tan(params.hingeAngle * Math.PI / 180)
  const hingeSpanY = (params.hingeThickness + params.hingeTolerance) / Math.sin(params.hingeAngle * Math.PI / 180)
  const rowPitch = modelRowPitch(params)
  const colPitch = params.cellWidth + params.wallThickness
  const raisedHeight = params.baseHeight - params.wallThickness - params.hingeThickness - params.hingeTolerance - params.hingeRestTolerance
  near(min.x, -params.cellWidth / 2 - params.wallThickness)
  near(max.x, params.cellWidth / 2 + params.wallThickness + (params.columns - 1) * colPitch)
  near(min.y, -(params.rows - 1) * rowPitch - params.cellLength - params.wallThickness)
  near(max.y, Math.max(params.wallThickness * shear, params.wallThickness + hingeSpanY + params.baseHeight * shear, -params.cellLength + params.baseHeight * shear))
  near(min.z, 0)
  near(max.z, Math.max(params.wallThickness, params.baseHeight))
  if (params.rows === 1 && params.columns === 1) {
    // The floor excludes the mid cut rectangle; the profiles add volume only above it.
    const area = polygon => Math.abs(polygon.reduce((sum, p, i) => {
      const q = polygon[(i + 1) % polygon.length]
      return sum + p[0] * q[1] - q[0] * p[1]
    }, 0)) / 2
    const profiles = cellSemiRaisedProfiles(params)
    assert.deepEqual(profiles[1], profiles[0].map(([x,y]) => [-x,y]).reverse())
    const fullProfiles = cellFullRaisedProfiles(params)
    assert.deepEqual(fullProfiles[1], fullProfiles[0].map(([x,y]) => [-x,y]).reverse())
    // Once the travel ΔX moves the pad ends inside the mid cut, the profiles also lose the mid cut strips beside the pad end.
    const padEnd = cellPadEndPoints(params, hingeTravelX(params))
    const midCut = params.cellMidCutWidth > 0 ? cellMidCutOutline(params) : []
    // Keep the part of a polygon where f(point) >= 0, for a linear f (Sutherland–Hodgman against one half-plane).
    const clip = (polygon, f) => polygon.flatMap((p, i) => {
      const q = polygon[(i + 1) % polygon.length], fp = f(p), fq = f(q)
      const out = fp >= 0 ? [p] : []
      if ((fp >= 0) !== (fq >= 0)) { const t = fp / (fp - fq); out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]) }
      return out
    })
    const midCutOutsidePad = midCut.length ? 2 * area(clip(clip(midCut, ([x]) => x - padEnd[0].x), ([, y]) => y)) : 0
    const expectedVolume = (fullProfiles.reduce((sum, profile) => sum + area(profile), 0) - area(padEnd.map(({x, y}) => [x, y])) - midCutOutsidePad) * (params.baseHeight - params.wallThickness) + profiles.reduce((sum, profile) => sum + area(profile), 0) * (raisedHeight - params.wallThickness) + (area(cellOuterPoints(params).map(({x, y}) => [x, y])) - (midCut.length ? area(midCut) : 0)) * params.wallThickness
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
  console.log(`PASS: ${params.rows} × ${params.columns} cells, ${params.hingeAngle}°, ${raisedHeight} mm semi raised profiles; mesh bounds and single-cell volume`)
}
assert.throws(() => baseDefinitions({ ...defaultBaseParameters, hingeAngle: 0 }))
assert.throws(() => baseDefinitions({ ...defaultBaseParameters, baseHeight: 3.1 }))
assert.throws(() => baseDefinitions({ ...defaultBaseParameters, rows: 1.5 }))
assert.throws(() => baseDefinitions({ ...defaultBaseParameters, columns: 0 }))
assert.throws(() => baseDefinitions({ ...defaultBaseParameters, cellMidCutWidth: defaultBaseParameters.wallThickness }))
// Fixed dimensions keep these coordinate fixtures independent of UI defaults.
const coordinateFixture = {...defaultBaseParameters, wallThickness: 2, hingeTolerance: 0.25}
const topY = 2 + 3.25 / Math.sin(Math.PI / 4)
assert.deepEqual(cellMidPoints(coordinateFixture).map(({ name, x, y }) => [name, x, y]), [
  ['cell outer mid 1', 0, topY], ['cell outer mid 2', 0, -26],
  ['cell inner mid 1', 0, 0], ['cell inner mid 2', 0, -24],
])
assert.deepEqual(cellMidCutPoints(coordinateFixture).map(({name, x, y}) => [name, x, y]), [
  ['mid cut R 1', 16, topY - 2], ['mid cut R 2', 16, -22],
  ['mid cut L 2', -16, -22], ['mid cut L 1', -16, topY - 2],
])
assert.deepEqual(cellPadEndPoints(coordinateFixture).map(({name, x, y}) => [name, x, y]), [
  ['pad end 1 R', 20.75, topY], ['pad end 2 R', 20.75, 0],
  ['pad end 2 L', -20.75, 0], ['pad end 1 L', -20.75, topY],
])
console.log('PASS: midpoint, mid cut, and pad end coordinates and invalid parameter rejection')

assert.deepEqual(cellFullRaisedProfiles(coordinateFixture)[0], [[0,topY],[34,topY],[34,-26],[25,-26],[25,-24],[32,-24],[32,0],[0,0]])
console.log('PASS: full raised right profile coordinates and ordering')

assert.deepEqual(cellSemiRaisedProfiles(coordinateFixture)[0], [[0,-24],[25,-24],[25,-26],[0,-26]])
console.log('PASS: semi raised right profile coordinates and ordering')

for (const hingeAngle of [30, 45, 90]) {
  const params = {...coordinateFixture, hingeAngle}
  near(cellOuterPoints(params)[0].y, 2 + 3.25 / Math.sin(hingeAngle * Math.PI / 180))
}
console.log('PASS: projected Y tolerance at cell outer 1')

// Check real cut meshes by probing the capsule centreline across all columns.
for (const columns of [1, 3]) {
  const params = {...coordinateFixture, rows: 2, columns}
  const {hingeCenter, hingeCenter2} = baseEndGeometry(params)
  const instance = await OpenSCAD({noInitialRun:true, wasmBinary, print:()=>{}, printErr:()=>{}})
  instance.FS.writeFile('/base.scad', source)
  assert.equal(instance.callMain(['/base.scad', ...baseDefinitions(params), '--export-format', 'binstl', '-o', '/base.stl']), 0)
  const geometry = new STLLoader().parse(instance.FS.readFile('/base.stl').slice().buffer)
  const material = new MeshBasicMaterial({side:DoubleSide})
  const mesh = new Mesh(geometry,material)
  mesh.updateMatrixWorld()
  const colPitch = params.cellWidth + params.wallThickness
  const rowPitch = modelRowPitch(params)
  const travelX = hingeTravelX(params)
  const cutLength = params.wallThickness*2 + params.hingeProfileWidth + params.hingeTolerance + travelX
  for (let row=0;row<params.rows;row++) {
    const z = (hingeCenter.z + hingeCenter2.z)/2 + 0.123
    const y = hingeCenter.y + (z-hingeCenter.z)/Math.tan(params.hingeAngle*Math.PI/180) - row*rowPitch
    const hits = new Raycaster(new Vector3(-1000,y,z),new Vector3(1,0,0)).intersectObject(mesh)
    const xs = hits.map(hit=>hit.point.x).filter((x,i,all)=>i===0 || Math.abs(x-all[i-1])>1e-5)
    // Each cell keeps two pads between the side grooves and the central pad end opening.
    // Sides shared with a neighbour: cuts shorter and pad ends wider by the wall thickness.
    const expected = Array.from({length: columns}, (_, column) => {
      const left = column > 0 ? params.wallThickness : 0
      const right = column < columns - 1 ? params.wallThickness : 0
      return [
        column*colPitch - params.cellWidth/2 - params.wallThickness + cutLength - left,
        column*colPitch - cellPadEndPoints(params, travelX)[0].x - left,
        column*colPitch + cellPadEndPoints(params, travelX)[0].x + right,
        column*colPitch + params.cellWidth/2 + params.wallThickness - cutLength + right,
      ]
    }).flat()
    assert.ok(xs.length === expected.length && xs.every((x, i) => Math.abs(x - expected[i]) < 1e-4), `Row ${row}: hinge cuts must reach the cut length from each cell side: ${xs} != ${expected}`)
  }
  material.dispose()
  geometry.dispose()
  console.log(`PASS: ${columns} columns, two rows: hinge capsules cut by wall thickness * 2 + hinge profile width + hinge tolerance + hinge travel ΔX from each cell side, less the wall thickness at shared walls`)
}

// The base end spans the full model width and is fused to row 0's outer 1–outer 2 face.
for (const changes of [{ rows: 1, columns: 1, hingeAngle: 45 }, { rows: 3, columns: 3, hingeAngle: 30, standHingeTolerance: 0.5, standThickness: 2.5 }, { rows: 2, columns: 2, hingeAngle: 90, standHingeTolerance: 0 }]) {
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
  const innerMin = minX + params.wallThickness + params.standThickness
  const innerMax = maxX - params.wallThickness - params.standThickness
  assert.deepEqual(xsAt(center.y, center.z + holeRadius + chamfer * 1.5), round([innerMin, innerMax]), 'Yellow outline must be inset by the wall thickness plus the stand thickness')
  assert.deepEqual(xsAt(center.y, center.z), [], 'Hole must cut through the yellow extrusion')
  assert.deepEqual(xsAt(center.y, center.z + holeRadius + chamfer / 2), round([innerMin + chamfer / 2, innerMax - chamfer / 2]), 'Hole ends must have 45° chamfers of wall thickness / 2')
  const hits = new Raycaster(new Vector3(0,faceY-0.5,z),new Vector3(0,1,0)).intersectObject(mesh).filter(hit=>Math.abs(hit.point.y-faceY)<1e-4)
  assert.equal(hits.length, 1, 'Pad end opening exposes the base end face above the floor')
  material.dispose()
  geometry.dispose()
  console.log(`PASS: ${params.rows} × ${params.columns} cells, ${params.hingeAngle}°: base end spans full width, fuses to row 0, with inset yellow extrusion and chamfered hole`)
}

// The purple outline is cut through every row, leaving only the model's outer side walls.
for (const changes of [{ rows: 1, columns: 1, hingeAngle: 45 }, { rows: 3, columns: 3, hingeAngle: 30 }, { rows: 2, columns: 2, hingeAngle: 60 }]) {
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
  const rowPitch = modelRowPitch(params)
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
  console.log(`PASS: ${params.rows} × ${params.columns} cells, ${params.hingeAngle}°: purple outline cut through every row except outer walls`)
}

// The hinge is the Hinge top blue outline extruded symmetrically about Z = 0, plus the Hinge side circle extruded along X from inner 3, both mirrored across ZOY, repeated per column at the cell pitch, with green bridges between neighbours only.
{
  const { hingeDefinitions, hingeOutlinePoints } = await import('../src/hinge-model.ts')
  const { hingeSideGeometry } = await import('../src/hinge-side-sketch.ts')
  const { hingeInnerPoints, hingeOuterPoints } = await import('../src/hinge-top-sketch.ts')
  const hingeSource = await fs.readFile(new URL('../src/models/hinge.scad', import.meta.url), 'utf8')
  for (const changes of [{ columns: 1 }, { columns: 3, hingeProfileWidth: 4, wallThickness: 3, hingeThickness: 2.5, hingePinExtension: 0 }, { hingePinExtension: 3 }, {}]) {
    const params = {...defaultBaseParameters, ...changes}
    const instance = await OpenSCAD({noInitialRun:true, wasmBinary, print:()=>{}, printErr:()=>{}})
    instance.FS.writeFile('/hinge.scad', hingeSource)
    assert.equal(instance.callMain(['/hinge.scad', ...hingeDefinitions(params), '--export-format', 'binstl', '-o', '/hinge.stl']), 0)
    const geometry = new STLLoader().parse(instance.FS.readFile('/hinge.stl').slice().buffer)
    geometry.computeBoundingBox()
    const { min, max } = geometry.boundingBox
    const radius = hingeSideGeometry(params).radius
    const circleStart = hingeInnerPoints(params)[2].x
    const circleLength = params.hingeProfileWidth + params.wallThickness
    const colPitch = params.cellWidth + params.wallThickness
    const last = (params.columns - 1) * colPitch
    near(min.x, -(circleStart + circleLength + params.hingePinExtension))
    near(max.x, last + circleStart + circleLength + params.hingePinExtension)
    near(min.y, -radius)
    near(max.y, params.hingeHeight)
    near(min.z, -params.hingeThickness / 2)
    near(max.z, params.hingeThickness / 2)
    // Below Y = 0 only the circle extrusions remain, from ±inner 3 for hinge profile width + wall thickness; neighbours' cylinders overlap and merge.
    const material = new MeshBasicMaterial({side:DoubleSide})
    const mesh = new Mesh(geometry, material)
    mesh.updateMatrixWorld()
    const xs = new Raycaster(new Vector3(-1000, -radius / 2, 0), new Vector3(1,0,0)).intersectObject(mesh)
      .map(hit=>hit.point.x).filter((x,i,all)=>i===0 || Math.abs(x-all[i-1])>1e-5)
    assert.deepEqual(xs.map(x => Math.round(x*1e4)/1e4), [-(circleStart + circleLength + params.hingePinExtension), ...Array.from({length: params.columns}, (_, column) => [column*colPitch - circleStart, column*colPitch + circleStart]).flat(), last + circleStart + circleLength + params.hingePinExtension].map(x => Math.round(x*1e4)/1e4))
    // Through the first hinge's plate near the top, the mirrored halves are fused: only its two outer edges are crossed.
    const topXs = new Raycaster(new Vector3(-colPitch / 2, params.hingeHeight - params.hingeProfileWidth / 2, 0), new Vector3(1,0,0)).intersectObject(mesh)
      .map(hit=>hit.point.x).filter(x => x < colPitch / 2).filter((x,i,all)=>i===0 || Math.abs(x-all[i-1])>1e-5)
    assert.equal(topXs.length, 2, 'Mirrored halves must fuse at X = 0')
    near(topXs[0], -topXs[1])
    // Bridges fill the gaps between neighbouring plates, but not the model's outer sides.
    const bridgeY = hingeOuterPoints(params)[2].y / 2
    const bridgeXs = new Raycaster(new Vector3(-1000, bridgeY, 0), new Vector3(1,0,0)).intersectObject(mesh)
      .map(hit=>hit.point.x).filter((x,i,all)=>i===0 || Math.abs(x-all[i-1])>1e-5)
    const inside = x => bridgeXs.filter(hitX => hitX < x).length % 2 === 1
    assert.equal(inside(-params.cellWidth/2 - params.wallThickness/2), false, 'No bridge at the left side')
    assert.equal(inside(last + params.cellWidth/2 + params.wallThickness/2), false, 'No bridge at the right side')
    for (let column = 0; column < params.columns - 1; column++) {
      assert.equal(inside(column*colPitch + params.cellWidth/2 + params.wallThickness/2), true, 'Bridge between neighbours')
    }
    material.dispose()
    const outline = hingeOutlinePoints(params)
    const area = Math.abs(outline.reduce((sum, p, i) => {
      const q = outline[(i + 1) % outline.length]
      return sum + p[0] * q[1] - q[0] * p[1]
    }, 0)) / 2
    const position = geometry.attributes.position
    let volume = 0
    for (let i = 0; i < position.count; i += 3) {
      const a = [position.getX(i), position.getY(i), position.getZ(i)]
      const b = [position.getX(i+1), position.getY(i+1), position.getZ(i+1)]
      const c = [position.getX(i+2), position.getY(i+2), position.getZ(i+2)]
      volume += (a[0]*(b[1]*c[2]-b[2]*c[1]) + a[1]*(b[2]*c[0]-b[0]*c[2]) + a[2]*(b[0]*c[1]-b[1]*c[0])) / 6
    }
    // The plate covers the circle's +Y half between inner 3 and outer 4; the 64-gon stands in for the circle.
    const circleArea = 32 * radius ** 2 * Math.sin(2 * Math.PI / 64)
    // Neighbouring hinges' cylinders overlap for one wall thickness; each bridge adds its slab minus the cylinders' +Y half inside it.
    const bridgeVolume = params.wallThickness * hingeOuterPoints(params)[2].y * params.hingeThickness - circleArea / 2 * params.wallThickness
    const expected = params.columns * 2 * (area * params.hingeThickness + circleArea * circleLength - circleArea / 2 * params.hingeProfileWidth) - (params.columns - 1) * (circleArea * params.wallThickness - bridgeVolume) + 2 * circleArea * params.hingePinExtension
    assert.ok(Math.abs(Math.abs(volume) - expected) < expected * 1e-5, `Unexpected hinge volume ${volume}; expected ${expected}`)
    geometry.dispose()
    console.log(`PASS: ${params.columns} hinges, ${params.hingeProfileWidth} mm profile width: symmetric ${params.hingeThickness} mm plate with circle along X from inner 3, mirrored across ZOY, bridged between neighbours`)
  }
}

// The bolt: red circle extruded by wall thickness, green circle by bolt length + wall thickness with a 45° end chamfer.
{
  const { boltDefinitions } = await import('../src/bolt-model.ts')
  const { boltGeometry } = await import('../src/bolt-sketch.ts')
  const boltSource = await fs.readFile(new URL('../src/models/bolt.scad', import.meta.url), 'utf8')
  for (const changes of [{}, { boltLength: 20, boltTolerance: 0.3, wallThickness: 1.5 }]) {
    const params = {...defaultBaseParameters, ...changes}
    const instance = await OpenSCAD({noInitialRun:true, wasmBinary, print:()=>{}, printErr:()=>{}})
    instance.FS.writeFile('/bolt.scad', boltSource)
    assert.equal(instance.callMain(['/bolt.scad', ...boltDefinitions(params), '--export-format', 'binstl', '-o', '/bolt.stl']), 0)
    const geometry = new STLLoader().parse(instance.FS.readFile('/bolt.stl').slice().buffer)
    geometry.computeBoundingBox()
    const { min, max } = geometry.boundingBox
    const { outerRadius, innerRadius } = boltGeometry(params)
    const length = params.boltLength + params.wallThickness
    const chamfer = innerRadius / 3
    near(max.x, outerRadius)
    near(min.x, -outerRadius)
    near(min.z, 0)
    near(max.z, length)
    // Volumes use the 64-gon OpenSCAD renders in place of each circle; the chamfer is a 64-gon frustum.
    const polygonArea = r => 32 * r ** 2 * Math.sin(2 * Math.PI / 64)
    const top = polygonArea(innerRadius - chamfer), bottom = polygonArea(innerRadius)
    const expected = polygonArea(outerRadius) * params.wallThickness + bottom * (length - chamfer - params.wallThickness) + chamfer / 3 * (bottom + top + Math.sqrt(bottom * top))
    const position = geometry.attributes.position
    let volume = 0
    for (let i = 0; i < position.count; i += 3) {
      const a = [position.getX(i), position.getY(i), position.getZ(i)]
      const b = [position.getX(i+1), position.getY(i+1), position.getZ(i+1)]
      const c = [position.getX(i+2), position.getY(i+2), position.getZ(i+2)]
      volume += (a[0]*(b[1]*c[2]-b[2]*c[1]) + a[1]*(b[2]*c[0]-b[0]*c[2]) + a[2]*(b[0]*c[1]-b[1]*c[0])) / 6
    }
    assert.ok(Math.abs(Math.abs(volume) - expected) < expected * 1e-5, `Unexpected bolt volume ${volume}; expected ${expected}`)
    // The top face is the chamfered radius.
    const material = new MeshBasicMaterial({side:DoubleSide})
    const mesh = new Mesh(geometry, material)
    mesh.updateMatrixWorld()
    const xs = new Raycaster(new Vector3(-1000, 0, length - 1e-6), new Vector3(1,0,0)).intersectObject(mesh).map(hit => hit.point.x)
    near(Math.max(...xs), innerRadius - chamfer)
    material.dispose()
    geometry.dispose()
    console.log(`PASS: bolt, ${params.boltLength} mm length: head, shank, and ${chamfer.toFixed(3)} mm chamfer`)
  }
}

// The stand: Stand top outline extruded by wall thickness, plus the Stand side outline extruded toward O from outer 1 X.
{
  const { standDefinitions } = await import('../src/stand-model.ts')
  const { standSideGeometry, standTopGeometry } = await import('../src/stand-sketch.ts')
  const standSource = await fs.readFile(new URL('../src/models/stand.scad', import.meta.url), 'utf8')
  for (const changes of [{}, { columns: 3, rows: 3, wallThickness: 3, standThickness: 2.5 }]) {
    const params = {...defaultBaseParameters, ...changes}
    const instance = await OpenSCAD({noInitialRun:true, wasmBinary, print:()=>{}, printErr:()=>{}})
    instance.FS.writeFile('/stand.scad', withDefinitions(standSource, standDefinitions(params)))
    assert.equal(instance.callMain(['/stand.scad', '--export-format', 'binstl', '-o', '/stand.stl']), 0)
    const geometry = new STLLoader().parse(instance.FS.readFile('/stand.stl').slice().buffer)
    geometry.computeBoundingBox()
    const { min, max } = geometry.boundingBox
    const top = standTopGeometry(params)
    const side = standSideGeometry(params)
    near(min.x, -top.outer1.x)
    near(max.x, top.outer1.x)
    near(min.y, Math.min(-top.standLength, side.outer3.y))
    near(max.y, Math.max(top.yTop1, side.outer1.y))
    near(min.z, side.outer3.z - params.standThickness)
    near(max.z, side.outerRadius)
    const material = new MeshBasicMaterial({side:DoubleSide})
    const mesh = new Mesh(geometry, material)
    mesh.updateMatrixWorld()
    const round = values => values.map(x => Math.round(x*1e4)/1e4)
    // Below the top plate only the side remains: wall thickness thick, ending at outer 1 X (probed beside the red circle).
    const ringY = (side.innerRadius + side.outerRadius) / 2
    const sideXs = new Raycaster(new Vector3(-1000, ringY, side.outer3.z / 2), new Vector3(1,0,0)).intersectObject(mesh)
      .map(hit=>hit.point.x).filter((x,i,all)=>i===0 || Math.abs(x-all[i-1])>1e-5)
    assert.deepEqual(round(sideXs), round([-top.outer1.x, -top.outer1.x + params.standThickness, top.outer1.x - params.standThickness, top.outer1.x]))
    // The red circle is cut through the side; between it and the green arc the side stays solid.
    const holeXs = new Raycaster(new Vector3(-1000, 0, 0), new Vector3(1,0,0)).intersectObject(mesh)
    assert.equal(holeXs.length, 0, 'The red circle must be cut through the side')
    const ringXs = new Raycaster(new Vector3(-1000, 0, (side.innerRadius + side.outerRadius) / 2), new Vector3(1,0,0)).intersectObject(mesh)
      .map(hit=>hit.point.x).filter((x,i,all)=>i===0 || Math.abs(x-all[i-1])>1e-5)
    assert.deepEqual(round(ringXs), round([-top.outer1.x, -top.outer1.x + params.standThickness, top.outer1.x - params.standThickness, top.outer1.x]))
    // Across the plate near outer 2, the mirrored halves are fused: only the two outer edges are crossed.
    const plateXs = new Raycaster(new Vector3(-1000, top.outer2.y + 1, side.outer3.z - params.standThickness / 2), new Vector3(1,0,0)).intersectObject(mesh)
      .map(hit=>hit.point.x).filter((x,i,all)=>i===0 || Math.abs(x-all[i-1])>1e-5)
    assert.deepEqual(round(plateXs), round([-top.outer1.x, top.outer1.x]))
    // Inside the frame near outer 2, the top plate spans one wall thickness below outer 3 Z.
    const plateZs = new Raycaster(new Vector3(top.outer2.x - params.standThickness * 1.5, top.outer2.y + 1, -1000), new Vector3(0,0,1)).intersectObject(mesh)
      .map(hit=>hit.point.z).filter((z,i,all)=>i===0 || Math.abs(z-all[i-1])>1e-5)
    assert.deepEqual(round(plateZs), round([side.outer3.z - params.standThickness, side.outer3.z]))
    // Where the side sits on the plate they are fused: a vertical line through both crosses only the outer faces.
    const fusedZs = new Raycaster(new Vector3(top.outer1.x - params.standThickness / 2, ringY, -1000), new Vector3(0,0,1)).intersectObject(mesh)
      .map(hit=>hit.point.z).filter((z,i,all)=>i===0 || Math.abs(z-all[i-1])>1e-5)
    assert.equal(fusedZs.length, 2, 'Side and plate must fuse')
    near(fusedZs[0], side.outer3.z - params.standThickness)
    // Every pattern hole is cut through the plate: probe each one's vertex average on the X > 0 half.
    const { standTopHoles } = await import('../src/stand-sketch.ts')
    const holes = standTopHoles(params)
    assert.ok(holes.length > 0)
    for (const hole of holes) {
      const [hx, hy] = hole.reduce(([x, y], p) => [x + p[0] / hole.length, y + p[1] / hole.length], [0, 0])
      if (hx < 0) continue
      const openZs = new Raycaster(new Vector3(hx, hy, -1000), new Vector3(0,0,1)).intersectObject(mesh)
      assert.equal(openZs.length, 0, `The hole at (${hx}, ${hy}) must be open`)
    }
    material.dispose()
    geometry.dispose()
    console.log(`PASS: stand, ${params.columns} columns × ${params.rows} rows: top plate below outer 3 Z with pattern holes, and side, with red circle cut, extruded toward O, mirrored across YOZ`)
  }
}

// Assembly rules: every part centred on X = 0; one hinge per row with its axis on hinge centre 1 when extended, else hinge centre 2.
{
  const { applyPlacement, assemblyParts, assemblyPlacements } = await import('../src/assembly.ts')
  const { hingeDefinitions } = await import('../src/hinge-model.ts')
  const { standDefinitions } = await import('../src/stand-model.ts')
  const { rowPitch } = await import('../src/model.ts')
  const sources = {
    base: [source, baseDefinitions],
    hinge: [await fs.readFile(new URL('../src/models/hinge.scad', import.meta.url), 'utf8'), hingeDefinitions],
    stand: [await fs.readFile(new URL('../src/models/stand.scad', import.meta.url), 'utf8'), standDefinitions],
    bolt: [await fs.readFile(new URL('../src/models/bolt.scad', import.meta.url), 'utf8'), (await import('../src/bolt-model.ts')).boltDefinitions],
  }
  for (const [columns, rows] of [[1, 1], [2, 2], [3, 3]]) {
    const params = {...defaultBaseParameters, columns, rows}
    for (const hingeExtended of [false, true]) {
      const placements = assemblyPlacements(params, { standExtended: false, hingeExtended })
      assert.equal(placements.hinge.length, rows)
      for (const part of assemblyParts) {
        const [partSource, definitions] = sources[part]
        const instance = await OpenSCAD({noInitialRun:true, wasmBinary, print:()=>{}, printErr:()=>{}})
        instance.FS.writeFile('/part.scad', withDefinitions(partSource, definitions(params)))
        assert.equal(instance.callMain(['/part.scad', '--export-format', 'binstl', '-o', '/part.stl']), 0)
        const geometry = new STLLoader().parse(instance.FS.readFile('/part.stl').slice().buffer)
        const partBounds = { min: Infinity, max: -Infinity }
        for (const placement of placements[part]) {
          // Transform the way the preview does; it must agree with applyPlacement.
          const placed = geometry.clone()
          placed.rotateY(placement.rotationY ?? 0)
          placed.rotateX(placement.rotationX)
          placed.translate(...placement.offset)
          const position = geometry.attributes.position
          const expected = applyPlacement(placement, [position.getX(0), position.getY(0), position.getZ(0)])
          near(placed.attributes.position.getX(0), expected[0]); near(placed.attributes.position.getY(0), expected[1]); near(placed.attributes.position.getZ(0), expected[2])
          placed.computeBoundingBox()
          partBounds.min = Math.min(partBounds.min, placed.boundingBox.min.x)
          partBounds.max = Math.max(partBounds.max, placed.boundingBox.max.x)
          placed.dispose()
        }
        // All copies of a part together are centred on X = 0.
        near(partBounds.min, -partBounds.max)
        geometry.dispose()
      }
      const { hingeCenter, hingeCenter2, start, atHeight, midCut1 } = baseEndGeometry(params)
      const centre = hingeExtended ? hingeCenter : hingeCenter2
      // The plate direction follows outer 1 → outer 2 when extended, else outer 2 → mid cut 1.
      const [ty, tz] = hingeExtended ? [atHeight.y - start.y, atHeight.z - start.z] : [midCut1.y - atHeight.y, midCut1.z - atHeight.z]
      const length = Math.hypot(ty, tz)
      placements.hinge.forEach((placement, row) => {
        const axis = applyPlacement(placement, [0, 0, 0])
        near(axis[1], centre.y - row * rowPitch(params)); near(axis[2], centre.z)
        const along = applyPlacement(placement, [0, 1, 0])
        near(along[1] - axis[1], ty / length); near(along[2] - axis[2], tz / length)
        // Local Z (the extrusion direction) is perpendicular to that line.
        const normal = applyPlacement(placement, [0, 0, 1])
        near((normal[1] - axis[1]) * ty + (normal[2] - axis[2]) * tz, 0)
      })
    }
  }
  // The stand pivots on the Cell side circle centre; its plate's top face lies along outer 4 → outer 3 when extended, else on Z = -stand tolerance.
  {
    const { standSideGeometry } = await import('../src/stand-sketch.ts')
    const params = defaultBaseParameters
    const { center, outer3, outer4 } = baseEndGeometry(params)
    const plateTop = standSideGeometry(params).outer3.z
    for (const standExtended of [false, true]) {
      const placements = assemblyPlacements(params, { standExtended, hingeExtended: false })
      const [placement] = placements.stand
      // Measure in the base's own frame, undoing its placement (the tilt, when extended).
      const [base] = placements.base
      const toBase = ([x, y, z]) => {
        const dy = y - base.offset[1], dz = z - base.offset[2], cos = Math.cos(base.rotationX), sin = Math.sin(base.rotationX)
        return [x - base.offset[0], dy * cos + dz * sin, -dy * sin + dz * cos]
      }
      const origin = toBase(applyPlacement(placement, [0, 0, 0]))
      near(origin[1], center.y); near(origin[2], center.z)
      const a = toBase(applyPlacement(placement, [0, 0, plateTop]))
      const b = toBase(applyPlacement(placement, [0, 1, plateTop]))
      if (standExtended) {
        near(a[1], outer4.y); near(a[2], outer4.z)
        const length = Math.hypot(outer3.y - outer4.y, outer3.z - outer4.z)
        near(b[1] - a[1], (outer3.y - outer4.y) / length); near(b[2] - a[2], (outer3.z - outer4.z) / length)
      } else {
        near(a[2], -params.standTolerance); near(b[2], -params.standTolerance)
      }
    }
  }
  // With the stand extended, every part tilts rigidly by the base tilt angle about the base's far bottom edge.
  {
    const { tiltPivot } = await import('../src/assembly.ts')
    const params = {...defaultBaseParameters, rows: 3}
    const flat = assemblyPlacements(params, { standExtended: true, hingeExtended: true })
    const angle = params.baseTiltAngle * Math.PI / 180
    const [py, pz] = tiltPivot(params)
    // The pivot is the far end of the last row.
    near(py, -params.cellLength - params.wallThickness - (params.rows - 1) * rowPitch(params))
    const rotate = ([x, y, z]) => [x, (y - py) * Math.cos(angle) - (z - pz) * Math.sin(angle) + py, (y - py) * Math.sin(angle) + (z - pz) * Math.cos(angle) + pz]
    for (const part of assemblyParts) {
      for (const placement of flat[part]) {
        assert.ok(Math.abs(placement.rotationX - angle - (part === 'stand' ? params.standAngle * Math.PI / 180 : part === 'hinge' ? params.hingeAngle * Math.PI / 180 : 0)) < 1e-9)
      }
    }
    // A point fixed on the base stays fixed relative to it: the pivot edge does not move, and the stand end rises by the tilt.
    const [base] = flat.base
    const pivotPoint = applyPlacement(base, [0, py, 0])
    near(pivotPoint[1], py); near(pivotPoint[2], 0)
    const { center } = baseEndGeometry(params)
    const [stand] = flat.stand
    const hingeAxis = applyPlacement(stand, [0, 0, 0])
    const expected = rotate([0, center.y, center.z])
    near(hingeAxis[1], expected[1]); near(hingeAxis[2], expected[2])
    assert.ok(hingeAxis[2] > center.z, 'The stand end rises')
  }
  // The extended stand's tip lands on the table: its lowest plate end corner is at Z = 0, and the rendered stand reaches no lower.
  {
    const { standSideGeometry, standTopGeometry } = await import('../src/stand-sketch.ts')
    const { standDefinitions } = await import('../src/stand-model.ts')
    const standSource = await fs.readFile(new URL('../src/models/stand.scad', import.meta.url), 'utf8')
    for (const changes of [{}, { standAngle: 40, baseTiltAngle: 20, standThickness: 3 }, { rows: 3, standAngle: 120, baseTiltAngle: 15 }]) {
      const params = {...defaultBaseParameters, ...changes}
      const [stand] = assemblyPlacements(params, { standExtended: true, hingeExtended: false }).stand
      const { standLength } = standTopGeometry(params)
      const plateTop = standSideGeometry(params).outer3.z
      const tipZ = Math.min(applyPlacement(stand, [0, -standLength, plateTop])[2], applyPlacement(stand, [0, -standLength, plateTop - params.standThickness])[2])
      near(tipZ, 0)
      const instance = await OpenSCAD({noInitialRun:true, wasmBinary, print:()=>{}, printErr:()=>{}})
      instance.FS.writeFile('/stand.scad', withDefinitions(standSource, standDefinitions(params)))
      assert.equal(instance.callMain(['/stand.scad', '--export-format', 'binstl', '-o', '/stand.stl']), 0)
      const geometry = new STLLoader().parse(instance.FS.readFile('/stand.stl').slice().buffer)
      geometry.rotateX(stand.rotationX)
      geometry.translate(...stand.offset)
      geometry.computeBoundingBox()
      near(geometry.boundingBox.min.z, 0)
      geometry.dispose()
    }
  }
  // Two bolts on the base hole axis, heads flush with the base sides and shanks pointing into the base.
  {
    const { boltGeometry } = await import('../src/bolt-sketch.ts')
    const { boltDefinitions } = await import('../src/bolt-model.ts')
    const boltSource = await fs.readFile(new URL('../src/models/bolt.scad', import.meta.url), 'utf8')
    for (const columns of [1, 3]) {
      const params = {...defaultBaseParameters, columns}
      const { center } = baseEndGeometry(params)
      const half = (params.wallThickness * (columns + 1) + params.cellWidth * columns) / 2
      const bolts = assemblyPlacements(params, { standExtended: false, hingeExtended: false }).bolt
      assert.equal(bolts.length, 2)
      const instance = await OpenSCAD({noInitialRun:true, wasmBinary, print:()=>{}, printErr:()=>{}})
      instance.FS.writeFile('/bolt.scad', boltSource)
      assert.equal(instance.callMain(['/bolt.scad', ...boltDefinitions(params), '--export-format', 'binstl', '-o', '/bolt.stl']), 0)
      const geometry = new STLLoader().parse(instance.FS.readFile('/bolt.stl').slice().buffer)
      for (const [index, side] of [1, -1].entries()) {
        const placement = bolts[index]
        const axis = applyPlacement(placement, [0, 0, 0])
        near(axis[0], side * half); near(axis[1], center.y); near(axis[2], center.z)
        const tip = applyPlacement(placement, [0, 0, 1])
        near(tip[0] - axis[0], -side)
        const placed = geometry.clone()
        placed.rotateY(placement.rotationY); placed.rotateX(placement.rotationX); placed.translate(...placement.offset)
        placed.computeBoundingBox()
        const { min, max } = placed.boundingBox
        const length = params.boltLength + params.wallThickness
        // Head from the base side inward by wall thickness; shank on into the base.
        near(side > 0 ? max.x : -min.x, half)
        near(side > 0 ? min.x : -max.x, half - length)
        near(max.z - center.z, boltGeometry(params).outerRadius)
        placed.dispose()
      }
      geometry.dispose()
    }
  }
  console.log('PASS: assembly centres parts on X = 0, places hinges and stand, tilts everything when the stand is extended, lands the stand tip on Z = 0, and inserts two bolts')
}

// 3MF export: each part, coloured through part_color, carries its colour as a 3MF material and keeps its geometry.
{
  const zlib = await import('node:zlib')
  const { hingeDefinitions } = await import('../src/hinge-model.ts')
  const { standDefinitions } = await import('../src/stand-model.ts')
  const { boltDefinitions } = await import('../src/bolt-model.ts')
  // Read one entry from a ZIP archive (stored or deflated) via its local header.
  const readZipEntry = (bytes, name) => {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    for (let offset = 0; offset + 30 < bytes.length;) {
      if (view.getUint32(offset, true) !== 0x04034b50) break
      const method = view.getUint16(offset + 8, true)
      const compressed = view.getUint32(offset + 18, true)
      const nameLength = view.getUint16(offset + 26, true), extraLength = view.getUint16(offset + 28, true)
      const entryName = new TextDecoder().decode(bytes.slice(offset + 30, offset + 30 + nameLength))
      const start = offset + 30 + nameLength + extraLength
      const data = bytes.slice(start, start + compressed)
      if (entryName === name) return method === 8 ? zlib.inflateRawSync(data) : Buffer.from(data)
      offset = start + compressed
    }
    throw new Error(`${name} not found`)
  }
  const colors = { base: '#5b9bd5', hinge: '#73d6ac', bolt: '#e5b567', stand: '#b48ce6' }
  const parts = {
    base: [source, baseDefinitions],
    hinge: [await fs.readFile(new URL('../src/models/hinge.scad', import.meta.url), 'utf8'), hingeDefinitions],
    bolt: [await fs.readFile(new URL('../src/models/bolt.scad', import.meta.url), 'utf8'), boltDefinitions],
    stand: [await fs.readFile(new URL('../src/models/stand.scad', import.meta.url), 'utf8'), standDefinitions],
  }
  for (const [part, [partSource, definitions]] of Object.entries(parts)) {
    const messages = []
    const instance = await OpenSCAD({noInitialRun:true, wasmBinary, print: t => messages.push(t), printErr: t => messages.push(t)})
    instance.FS.writeFile('/part.scad', withDefinitions(partSource, [...definitions(defaultBaseParameters), '-D', `part_color="${colors[part]}"`]))
    assert.equal(instance.callMain(['/part.scad', '--export-format', '3mf', '-o', '/part.3mf']), 0)
    assert.deepEqual(messages.filter(line => /WARNING|ERROR/.test(line)), [], `${part}: no warnings`)
    const model = readZipEntry(instance.FS.readFile('/part.3mf'), '3D/3dmodel.model').toString('utf8')
    // Every triangle points at the base material holding the part colour.
    const materials = [...model.matchAll(/<base [^>]*displaycolor="([^"]*)"/g)].map(match => match[1])
    const colourIndex = materials.indexOf(`${colors[part].toUpperCase()}FF`)
    assert.ok(colourIndex >= 0, `${part}: carries its assembly colour`)
    const triangles = model.match(/<triangle [^>]*\/>/g) ?? []
    assert.ok(triangles.length > 100, `${part}: has geometry`)
    assert.ok(triangles.every(triangle => triangle.includes(`p1="${colourIndex}"`)), `${part}: every triangle uses its colour`)
  }
  console.log('PASS: 3MF exports carry each part colour')
}
