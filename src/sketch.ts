import { fillet, filletPath, filletPoints } from './fillet.ts'

export interface SketchPoint {
  name: string
  x: number
  y: number
  xFormula: string
  yFormula: string
}

export interface CellSketchParameters {
  hingeAngle: number
  cellWidth: number
  cellMidCutWidth: number
  cellLength: number
  wallThickness: number
  hingeThickness: number
  hingeProfileWidth: number
  hingeTolerance: number
  rimWidth: number
}

export const defaultSketchParameters: CellSketchParameters = {
  hingeAngle: 45,
  cellWidth: 64,
  cellMidCutWidth: 32,
  cellLength: 24,
  wallThickness: 1.6,
  hingeThickness: 3,
  hingeProfileWidth: 7,
  hingeTolerance: 0.18,
  rimWidth: 7,
}

// Sketch coordinates use millimeters, with Y increasing upward.
export function cellOuterPoints(params: CellSketchParameters): readonly SketchPoint[] {
  const x = params.cellWidth / 2 + params.wallThickness
  const top = params.wallThickness + (params.hingeThickness + params.hingeTolerance) / Math.sin(params.hingeAngle * Math.PI / 180)
  const bottom = -params.cellLength - params.wallThickness
  return [
    { name: 'cell outer 1', x, y: top, xFormula: 'cell width / 2 + wall thickness', yFormula: 'wall thickness + (hinge thickness + hinge tolerance) / sin(hinge angle)' },
    { name: 'cell outer 2', x, y: bottom, xFormula: 'cell width / 2 + wall thickness', yFormula: '-cell length - wall thickness' },
    { name: 'cell outer 3', x: -x, y: bottom, xFormula: '-(cell width / 2 + wall thickness)', yFormula: '-cell length - wall thickness' },
    { name: 'cell outer 4', x: -x, y: top, xFormula: '-(cell width / 2 + wall thickness)', yFormula: 'wall thickness + (hinge thickness + hinge tolerance) / sin(hinge angle)' },
  ]
}

export function cellInnerPoints(params: CellSketchParameters): readonly SketchPoint[] {
  const x = params.cellWidth / 2
  return [
    { name: 'cell inner 1', x, y: 0, xFormula: 'cell width / 2', yFormula: '0' },
    { name: 'cell inner 2', x, y: -params.cellLength, xFormula: 'cell width / 2', yFormula: '-cell length' },
    { name: 'cell inner 3', x: -x, y: -params.cellLength, xFormula: '-cell width / 2', yFormula: '-cell length' },
    { name: 'cell inner 4', x: -x, y: 0, xFormula: '-cell width / 2', yFormula: '0' },
  ]
}

export function rimRightPoints(params: CellSketchParameters): readonly SketchPoint[] {
  const right = cellOuterPoints(params)[1]!
  const inner = cellInnerPoints(params)[1]!
  const left = right.x - params.wallThickness - params.rimWidth
  return [
    { name: 'rim R 1', x: left, y: inner.y, xFormula: 'cell width / 2 - rim width', yFormula: inner.yFormula },
    { name: 'rim R 2', x: left, y: inner.y - params.wallThickness, xFormula: 'cell width / 2 - rim width', yFormula: '-cell length - wall thickness' },
  ]
}

export function rimLeftPoints(params: CellSketchParameters): readonly SketchPoint[] {
  return rimRightPoints(params).map(point => ({
    ...point,
    name: point.name.replace(' R ', ' L '),
    x: -point.x,
    xFormula: `-(${point.xFormula})`,
  }))
}

export function cellMidPoints(params: CellSketchParameters): readonly SketchPoint[] {
  const outer = cellOuterPoints(params)
  const inner = cellInnerPoints(params)
  return [
    ...outer.slice(0, 2).map((point, index) => ({
      ...point, name: `cell outer mid ${index + 1}`, x: 0, xFormula: '0',
    })),
    ...inner.slice(0, 2).map((point, index) => ({
      ...point, name: `cell inner mid ${index + 1}`, x: 0, xFormula: '0',
    })),
  ]
}

export function cellMidCutPoints(params: CellSketchParameters): readonly SketchPoint[] {
  const mid = cellMidPoints(params)
  const right = [mid[0]!, mid[3]!].map((point, index) => ({
    ...point, name: `mid cut R ${index + 1}`, x: params.cellMidCutWidth / 2, xFormula: 'cell mid cut width / 2',
    y: point.y + (index === 0 ? -params.wallThickness : params.wallThickness),
    yFormula: index === 0 ? `(${point.yFormula}) - wall thickness` : `(${point.yFormula}) + wall thickness`,
  }))
  const left = right.map(point => ({
    ...point, name: point.name.replace(' R ', ' L '), x: -point.x, xFormula: '-cell mid cut width / 2',
  }))
  return [...right, ...left.reverse()]
}

// hingeTravelX: the hinge top sketch's |ΔX| along inner 3 → inner 2 over the hinge centre travel.
// The mid cut rectangle's corners, rounded by the wall thickness.
export function cellMidCutFillets(params: CellSketchParameters) {
  const points = cellMidCutPoints(params)
  return points.map((point, index) => fillet(points[(index + points.length - 1) % points.length]!, point, points[(index + 1) % points.length]!, params.wallThickness))
}

// The rounded mid cut as a closed polygon, its arcs sampled at 64 segments per turn.
export function cellMidCutOutline(params: CellSketchParameters): number[][] {
  return cellMidCutFillets(params).flatMap(filletPoints)
}

export function cellPadEndPoints(params: CellSketchParameters, hingeTravelX = 0): readonly SketchPoint[] {
  const x = params.cellWidth / 2 - 2 * params.wallThickness - params.hingeProfileWidth - params.hingeTolerance - hingeTravelX
  const xFormula = 'cell width / 2 - 2 * wall thickness - hinge profile width - hinge tolerance - hinge travel ΔX'
  const right = [cellOuterPoints(params)[0]!, cellInnerPoints(params)[0]!].map((point, index) => ({
    ...point, name: `pad end ${index + 1} R`, x, xFormula,
  }))
  const left = right.map(point => ({
    ...point, name: point.name.replace(' R', ' L'), x: -point.x, xFormula: `-(${xFormula})`,
  }))
  return [...right, ...left.reverse()]
}

// hingeAxisY: the Y of the hinge axis, drawn as a horizontal helper line when given.
// hingeOutline: the Hinge top sketch's blue outline, flipped across its X axis and moved so that axis lies on the hinge axis, drawn with its mirror across Y.
export function cellSketch(params: CellSketchParameters = defaultSketchParameters, hingeTravelX = 0, hingeAxisY?: number, hingeOutline: number[][] = []) {
  const outerPoints = cellOuterPoints(params)
  const innerPoints = cellInnerPoints(params)
  const rimPoints = [...rimRightPoints(params), ...rimLeftPoints(params)]
  const midPoints = cellMidPoints(params)
  const innerMidPoints = midPoints.slice(2)
  const midCutPoints = cellMidCutPoints(params)
  const midCutFillets = cellMidCutFillets(params)
  const padEndPoints = cellPadEndPoints(params, hingeTravelX)
  const points = [...outerPoints, ...innerPoints, ...rimPoints, ...midPoints, ...midCutPoints, ...padEndPoints]
  const helperYs = hingeAxisY === undefined ? [] : [hingeAxisY]
  const hingeRight = hingeAxisY === undefined ? [] : hingeOutline.map(([x, y]) => [x!, hingeAxisY - y!])
  // Both halves start at outer 1 and end at inner 1 on X = 0, so joining them leaves no edge along the Y axis.
  const hingeHelper = [...hingeRight, ...hingeRight.map(([x, y]) => [-x!, y!]).reverse().slice(1, -1)]
  const minX = Math.min(...points.map(point => point.x), ...hingeHelper.map(([x]) => x!), 0)
  const maxX = Math.max(...points.map(point => point.x), ...hingeHelper.map(([x]) => x!), 0)
  const bottom = Math.min(...points.map(point => point.y), ...helperYs, ...hingeHelper.map(([, y]) => y!))
  const top = Math.max(...points.map(point => point.y), ...helperYs, ...hingeHelper.map(([, y]) => y!))
  const unit = Math.max(maxX - minX, top - bottom) / 68
  const left = minX - 12 * unit
  const right = maxX + 12 * unit
  const lower = bottom - 12 * unit
  const upper = top + 12 * unit
  return `
    <svg class="sketch-canvas" viewBox="${left} ${-upper} ${right - left} ${upper - lower}" role="img" aria-label="Cell sketch" aria-describedby="sketch-description">
      <desc id="sketch-description">${points.map(p => `${p.name}: (${p.x}, ${p.y}) mm`).join('; ')}. The outer and inner cell points are symmetric across the Y axis.</desc>
      <g class="sketch-axes" aria-hidden="true">
        <line x1="${left + 2 * unit}" y1="0" x2="${right - 2 * unit}" y2="0" />
        <line x1="0" y1="${-lower - 2 * unit}" x2="0" y2="${-upper + 2 * unit}" />
        <text x="${right - 2 * unit}" y="${-2 * unit}" text-anchor="end" style="font-size:${3 * unit}px">X</text>
        <text x="${2 * unit}" y="${-upper + 4 * unit}" style="font-size:${3 * unit}px">Y</text>
      </g>
      ${helperYs.length ? `<g class="sketch-helper">
        ${helperYs.map(y => `<line x1="${left + 2 * unit}" y1="${-y}" x2="${right - 2 * unit}" y2="${-y}" />`).join('')}
        ${hingeHelper.length ? `<polygon points="${hingeHelper.map(([x, y]) => `${x},${-y!}`).join(' ')}" />` : ''}
      </g>` : ''}
      <polygon class="sketch-outline" points="${outerPoints.map(p => `${p.x},${-p.y}`).join(' ')}" />
      <polygon class="sketch-outline sketch-inner-outline" points="${innerPoints.map(p => `${p.x},${-p.y}`).join(' ')}" />
      ${[rimRightPoints(params), rimLeftPoints(params)].map(([a, b]) => `<line class="sketch-outline sketch-rim-outline" x1="${a!.x}" y1="${-a!.y}" x2="${b!.x}" y2="${-b!.y}" />`).join('')}
      ${params.cellMidCutWidth > 0 ? `<path class="sketch-outline sketch-hinge-outline" d="M ${midCutFillets[0]!.start.x} ${-midCutFillets[0]!.start.y} ${midCutFillets.map(filletPath).join(' ')} Z" />` : ''}
      <polygon class="sketch-outline sketch-cut-outline" points="${padEndPoints.map(p => `${p.x},${-p.y}`).join(' ')}" />
      ${points.map(p => `
        <g data-label-x="${p.x + (p.x < 0 ? 2 : -2) * unit}" data-label-y="${-p.y + (p.y < 0 ? 4 : -2) * unit}" data-label-anchor="${p.x < 0 ? 'start' : 'end'}" data-label-size="${3 * unit}" data-point-name="${p.name}" data-x-formula="${p.xFormula}" data-y-formula="${p.yFormula}" data-x="${p.x}" data-y="${p.y}" class="sketch-vertex${padEndPoints.includes(p) ? ' sketch-cut-vertex' : rimPoints.includes(p) ? ' sketch-rim-vertex' : (innerPoints.includes(p) || innerMidPoints.includes(p)) ? ' sketch-inner-vertex' : ''}">
          <title>${p.name}: (${p.x}, ${p.y}) mm</title>
          <circle class="sketch-vertex-dot" cx="${p.x}" cy="${-p.y}" r="${0.7 * unit}" />
        </g>
      `).join('')}
      <text class="sketch-point-label" hidden></text>
    </svg>
    <div class="hud sketch-point-hud" hidden>
      <div class="point-name"></div>
      <div class="hud-hub">
        <div class="point-x"></div>
        <div class="point-y"></div>
      </div>
    </div>
  `
}
