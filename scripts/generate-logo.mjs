// Generate the site icon: the Hinge top sketch's blue outline, mirrored across the Y axis and extruded by the
// default hinge thickness, drawn in an isometric view with the assembly's hinge colour and the preview's lights,
// on the preview background (no grid). Writes public/favicon.svg.
import fs from 'node:fs/promises'
import { hingeOutlinePoints } from '../src/hinge-model.ts'
import { defaultBaseParameters } from '../src/model.ts'

const color = '#73d6ac' // The assembly's hinge colour (partColors in src/main.ts).
const background = '#12141a' // BasePreview's scene background.
const size = 256

// Colours are lit in linear space and written as sRGB, as Three.js does.
const toLinear = c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
const toSrgb = c => c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055
const parse = hex => [1, 3, 5].map(i => toLinear(parseInt(hex.slice(i, i + 2), 16) / 255))
const format = rgb => `#${rgb.map(c => Math.round(Math.min(1, Math.max(0, toSrgb(c))) * 255).toString(16).padStart(2, '0')).join('')}`
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const normalize = v => { const l = Math.hypot(...v); return v.map(c => c / l) }
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]

// The full outline: the half sketch, then its mirror (X → -X) in reverse, without repeating the points on X = 0.
const half = hingeOutlinePoints(defaultBaseParameters)
const outline = [...half, ...half.map(([x, y]) => [-x, y]).reverse().slice(1, -1)]
const area = outline.reduce((sum, p, i) => { const q = outline[(i + 1) % outline.length]; return sum + p[0] * q[1] - q[0] * p[1] }, 0) / 2
const ccw = area > 0 ? outline : [...outline].reverse()
// Extruded symmetrically about Z = 0, as in hinge.scad.
const thickness = defaultBaseParameters.hingeThickness
// OpenSCAD's Z-up (x, y, z) shown in the preview's Y-up axes as (x, z, -y).
const toView = (x, y, z) => [x, z, -y]

// The preview's lights: ambient 0.6, key 2.6 from (125, 200, 125), fill 0.6 from (-100, -50, -100).
const albedo = parse(color)
const key = normalize([125, 200, 125]), fill = normalize([-100, -50, -100])
// MeshStandardMaterial's diffuse term (Lambert, albedo / π) for a dielectric.
const shade = normal => format(albedo.map(c => c * (0.6 + 2.6 * Math.max(0, dot(normal, key)) + 0.6 * Math.max(0, dot(normal, fill))) / Math.PI))
// The preview's edge lines: the part colour lerped 45% toward white, at 55% opacity.
const edge = format(albedo.map(c => c + (1 - c) * 0.45))

// An isometric camera: orthographic, looking along -(1, 1, 1).
const view = normalize([1, 1, 1])
const right = normalize(cross([0, 1, 0], view))
const up = cross(view, right)
const project = p => [dot(p, right), -dot(p, up)]
const depth = p => dot(p, view)

const faces = []
// Side walls facing the camera, farthest first.
ccw.forEach((p, i) => {
  const q = ccw[(i + 1) % ccw.length]
  const length = Math.hypot(q[0] - p[0], q[1] - p[1])
  if (length < 1e-9) return
  const normal = toView((q[1] - p[1]) / length, -(q[0] - p[0]) / length, 0)
  if (dot(normal, view) <= 0) return
  const corners = [toView(...p, thickness / 2), toView(...q, thickness / 2), toView(...q, -thickness / 2), toView(...p, -thickness / 2)]
  faces.push({ corners, fill: shade(normal), depth: corners.reduce((sum, c) => sum + depth(c), 0) / 4 })
})
faces.sort((a, b) => a.depth - b.depth)
// The top face faces the camera and lies above every wall, so it goes last.
faces.push({ corners: ccw.map(([x, y]) => toView(x, y, thickness / 2)), fill: shade(toView(0, 0, 1)) })

// Fit the drawing into the icon with a margin.
const points = faces.flatMap(face => face.corners.map(project))
const xs = points.map(p => p[0]), ys = points.map(p => p[1])
const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
const scale = size * 0.84 / Math.max(maxX - minX, maxY - minY)
const toIcon = ([x, y]) => [(x - (minX + maxX) / 2) * scale + size / 2, (y - (minY + maxY) / 2) * scale + size / 2]
const path = corners => corners.map(c => toIcon(project(c)).map(v => v.toFixed(2)).join(',')).join(' ')

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.18}" fill="${background}"/>
  <g stroke="${edge}" stroke-opacity="0.55" stroke-width="${size / 256}" stroke-linejoin="round">
${faces.map(face => `    <polygon points="${path(face.corners)}" fill="${face.fill}"/>`).join('\n')}
  </g>
</svg>
`
await fs.writeFile(new URL('../public/favicon.svg', import.meta.url), svg)
console.log(`Wrote public/favicon.svg (${faces.length} faces).`)
