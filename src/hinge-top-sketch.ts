import { baseEndGeometry } from './base-end-geometry.ts'
import { defaultBaseParameters } from './model.ts'
import type { BaseParameters } from './model.ts'
import type { SketchPoint } from './sketch.ts'

export function hingeOuterPoints(params: BaseParameters): readonly SketchPoint[] {
  const { hingeCenter, hingeCenter2 } = baseEndGeometry(params)
  const hingeCentreDistance = Math.hypot(hingeCenter2.y - hingeCenter.y, hingeCenter2.z - hingeCenter.z)
  const top = params.hingeTopWidth / 2
  const side = params.cellWidth / 2
  return [
    { name: 'outer 1', x: 0, y: params.hingeHeight, xFormula: '0', yFormula: 'hinge height' },
    { name: 'outer 2', x: top, y: params.hingeHeight, xFormula: 'hinge top width / 2', yFormula: 'hinge height' },
    { name: 'outer 3', x: side, y: hingeCentreDistance, xFormula: 'cell width / 2', yFormula: 'distance(hinge centre 1, hinge centre 2)' },
    { name: 'outer 4', x: side, y: 0, xFormula: 'cell width / 2', yFormula: '0' },
  ]
}

export function hingeInnerPoints(params: BaseParameters): readonly SketchPoint[] {
  const [, outer2, outer3, outer4] = hingeOuterPoints(params) as [SketchPoint, SketchPoint, SketchPoint, SketchPoint]
  const inner1 = { name: 'inner 1', x: 0, y: params.hingeHeight - params.hingeWidthBottom, xFormula: '0', yFormula: 'hinge height - hinge width bottom' }
  // Unit normal of outer 2–outer 3, pointing toward O.
  const dx = outer3.x - outer2.x
  const dy = outer3.y - outer2.y
  const length = Math.hypot(dx, dy)
  let nx = -dy / length
  let ny = dx / length
  if (nx * -outer2.x + ny * -outer2.y < 0) { nx = -nx; ny = -ny }
  // The offset line satisfies n · (P - outer 2) = hinge width bottom; intersect it with Y = inner 1 Y.
  const x = outer2.x + (params.hingeWidthBottom - ny * (inner1.y - outer2.y)) / nx
  return [
    inner1,
    { name: 'inner 2', x, y: inner1.y, xFormula: 'outer 2–outer 3 shifted toward O by hinge width bottom, at inner 1 Y', yFormula: 'hinge height - hinge width bottom' },
    { name: 'inner 3', x: outer4.x - params.hingeWidthBottom, y: outer4.y, xFormula: 'cell width / 2 - hinge width bottom', yFormula: '0' },
  ]
}

// The hinge viewed from above, in the XOY plane: positive X right, positive Y up.
export function hingeTopSketch(params: BaseParameters = defaultBaseParameters) {
  const points = [...hingeOuterPoints(params), ...hingeInnerPoints(params)]
  const extentX = Math.max(...points.map(point => Math.abs(point.x)), 1)
  const top = Math.max(...points.map(point => point.y), 0)
  const bottom = Math.min(...points.map(point => point.y), 0)
  const unit = Math.max(2 * extentX, top - bottom) / 68
  const left = -extentX - 12 * unit
  const right = extentX + 12 * unit
  const lower = bottom - 12 * unit
  const upper = top + 12 * unit
  return `
    <svg class="sketch-canvas" viewBox="${left} ${-upper} ${right - left} ${upper - lower}" role="img" aria-label="Hinge top sketch with positive X pointing right and positive Y pointing up">
      <g class="sketch-axes" aria-hidden="true">
        <line x1="${left + 2 * unit}" y1="0" x2="${right - 2 * unit}" y2="0" />
        <line x1="0" y1="${-lower - 2 * unit}" x2="0" y2="${-upper + 2 * unit}" />
        <text x="${right - 2 * unit}" y="${-2 * unit}" text-anchor="end" style="font-size:${3 * unit}px">X</text>
        <text x="${2 * unit}" y="${-upper + 4 * unit}" style="font-size:${3 * unit}px">Y</text>
      </g>
      ${points.map(p => `
        <g class="sketch-vertex" data-point-name="${p.name}" data-x="${p.x}" data-y="${p.y}" data-x-formula="${p.xFormula}" data-y-formula="${p.yFormula}"
          data-label-x="${p.x - 2 * unit}" data-label-y="${-p.y + (p.y > 0 ? -2 : 4) * unit}" data-label-anchor="end" data-label-size="${3 * unit}">
          <title>${p.name}: (${p.x}, ${p.y}) mm</title>
          <circle class="sketch-vertex-dot" cx="${p.x}" cy="${-p.y}" r="${0.7 * unit}" />
        </g>
      `).join('')}
      <text class="sketch-point-label" hidden></text>
    </svg>
    <div class="hud sketch-point-hud" hidden>
      <div class="point-name"></div>
      <div class="hud-hub"><div class="point-x"></div><div class="point-y"></div></div>
    </div>
  `
}
