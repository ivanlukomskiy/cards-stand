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
  const inner1 = { name: 'inner 1', x: 0, y: params.hingeHeight - params.hingeProfileWidth, xFormula: '0', yFormula: 'hinge height - hinge profile width' }
  // Unit normal of outer 2–outer 3, pointing toward O.
  const dx = outer3.x - outer2.x
  const dy = outer3.y - outer2.y
  const length = Math.hypot(dx, dy)
  let nx = -dy / length
  let ny = dx / length
  if (nx * -outer2.x + ny * -outer2.y < 0) { nx = -nx; ny = -ny }
  // The offset line satisfies n · (P - outer 2) = hinge profile width; intersect it with Y = inner 1 Y.
  const x = outer2.x + (params.hingeProfileWidth - ny * (inner1.y - outer2.y)) / nx
  return [
    inner1,
    { name: 'inner 2', x, y: inner1.y, xFormula: 'outer 2–outer 3 shifted toward O by hinge profile width, at inner 1 Y', yFormula: 'hinge height - hinge profile width' },
    { name: 'inner 3', x: outer4.x - params.hingeProfileWidth, y: outer4.y, xFormula: 'cell width / 2 - hinge profile width', yFormula: '0' },
  ]
}

// Outer 3 and outer 4 moved right by the wall thickness.
export function hingeBridgePoints(params: BaseParameters): readonly SketchPoint[] {
  const [, , outer3, outer4] = hingeOuterPoints(params) as [SketchPoint, SketchPoint, SketchPoint, SketchPoint]
  return [outer3, outer4].map((point, index) => ({
    ...point,
    name: `bridge ${index + 1}`,
    x: point.x + params.wallThickness,
    xFormula: 'cell width / 2 + wall thickness',
  }))
}

type Point = { x: number, y: number }

// Round the corner at `corner` between segments from `from` and to `to`, tangent to both.
export function fillet(from: Point, corner: Point, to: Point, radius: number) {
  const ax = from.x - corner.x, ay = from.y - corner.y
  const bx = to.x - corner.x, by = to.y - corner.y
  const al = Math.hypot(ax, ay), bl = Math.hypot(bx, by)
  const ux = ax / al, uy = ay / al, vx = bx / bl, vy = by / bl
  const half = Math.acos(Math.max(-1, Math.min(1, ux * vx + uy * vy))) / 2
  const tangent = radius / Math.tan(half)
  const bisector = Math.hypot(ux + vx, uy + vy)
  const centreDistance = radius / Math.sin(half)
  return {
    start: { x: corner.x + ux * tangent, y: corner.y + uy * tangent },
    end: { x: corner.x + vx * tangent, y: corner.y + vy * tangent },
    centre: { x: corner.x + (ux + vx) / bisector * centreDistance, y: corner.y + (uy + vy) / bisector * centreDistance },
    // Positive when the path turns counter-clockwise (Y up) at the corner.
    turn: Math.sign((corner.x - from.x) * (to.y - corner.y) - (corner.y - from.y) * (to.x - corner.x)),
  }
}

// Outline: outer 1 → outer 2 (rounded) → outer 3 → outer 4 → inner 3 → inner 2 (rounded) → inner 1 → close.
export function hingeOutline(params: BaseParameters) {
  const [outer1, outer2, outer3, outer4] = hingeOuterPoints(params) as [SketchPoint, SketchPoint, SketchPoint, SketchPoint]
  const [inner1, inner2, inner3] = hingeInnerPoints(params) as [SketchPoint, SketchPoint, SketchPoint]
  const radius = params.hingeProfileWidth / 2
  return {
    radius,
    outer1, outer3, outer4, inner3, inner1,
    outer2: fillet(outer1, outer2, outer3, radius),
    inner2: fillet(inner3, inner2, inner1, radius),
  }
}

// The hinge viewed from above, in the XOY plane: positive X right, positive Y up.
export function hingeTopSketch(params: BaseParameters = defaultBaseParameters) {
  const outerPoints = hingeOuterPoints(params)
  const bridgePoints = hingeBridgePoints(params)
  const points = [...outerPoints, ...hingeInnerPoints(params), ...bridgePoints]
  const outline = hingeOutline(params)
  // The sketch renders Y up, so a clockwise turn looks clockwise on screen, which is SVG sweep 1.
  const arc = (corner: ReturnType<typeof fillet>) =>
    `L ${corner.start.x} ${-corner.start.y} A ${outline.radius} ${outline.radius} 0 0 ${corner.turn < 0 ? 1 : 0} ${corner.end.x} ${-corner.end.y}`
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
      <path class="sketch-outline" d="M ${outline.outer1.x} ${-outline.outer1.y}
        ${arc(outline.outer2)}
        L ${outline.outer3.x} ${-outline.outer3.y}
        L ${outline.outer4.x} ${-outline.outer4.y}
        L ${outline.inner3.x} ${-outline.inner3.y}
        ${arc(outline.inner2)}
        L ${outline.inner1.x} ${-outline.inner1.y} Z" />
      <polygon class="sketch-outline sketch-hinge-outline" points="${[outerPoints[2]!, outerPoints[3]!, bridgePoints[1]!, bridgePoints[0]!].map(p => `${p.x},${-p.y}`).join(' ')}" />
      ${points.map(p => `
        <g class="sketch-vertex${bridgePoints.includes(p) ? ' sketch-hinge-vertex' : ''}" data-point-name="${p.name}" data-x="${p.x}" data-y="${p.y}" data-x-formula="${p.xFormula}" data-y-formula="${p.yFormula}"
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
