export interface SketchPoint {
  name: string
  x: number
  y: number
}

export interface CellSketchParameters {
  cellWidth: number
  cellLength: number
  wallThickness: number
  hingeThickness: number
  hingeTolerance: number
}

export const defaultSketchParameters: CellSketchParameters = {
  cellWidth: 64,
  cellLength: 24,
  wallThickness: 2,
  hingeThickness: 3,
  hingeTolerance: 0.1,
}

// Sketch coordinates use millimeters, with Y increasing upward.
export function cellOuterPoints(params: CellSketchParameters): readonly SketchPoint[] {
  const x = params.cellWidth / 2 + params.wallThickness
  const top = params.wallThickness * 2 + params.hingeThickness + params.hingeTolerance
  const bottom = -params.cellLength - params.wallThickness
  return [
    { name: 'cell outer 1', x, y: top },
    { name: 'cell outer 2', x, y: bottom },
    { name: 'cell outer 3', x: -x, y: bottom },
    { name: 'cell outer 4', x: -x, y: top },
  ]
}

export function cellInnerPoints(params: CellSketchParameters): readonly SketchPoint[] {
  const x = params.cellWidth / 2
  return [
    { name: 'cell inner 1', x, y: 0 },
    { name: 'cell inner 2', x, y: -params.cellLength },
    { name: 'cell inner 3', x: -x, y: -params.cellLength },
    { name: 'cell inner 4', x: -x, y: 0 },
  ]
}

export function cellSketch(params: CellSketchParameters = defaultSketchParameters) {
  const outerPoints = cellOuterPoints(params)
  const innerPoints = cellInnerPoints(params)
  const points = [...outerPoints, ...innerPoints]
  const halfWidth = points[0]!.x
  const bottom = Math.min(...points.map(point => point.y))
  const top = Math.max(...points.map(point => point.y))
  const unit = Math.max(halfWidth * 2, top - bottom) / 68
  const left = -halfWidth - 12 * unit
  const right = halfWidth + 12 * unit
  const lower = bottom - 12 * unit
  const upper = top + 12 * unit
  return `
    <svg class="sketch-canvas" viewBox="${left} ${-upper} ${right - left} ${upper - lower}" role="img" aria-labelledby="sketch-title sketch-description">
      <title id="sketch-title">Cell sketch</title>
      <desc id="sketch-description">${points.map(p => `${p.name}: (${p.x}, ${p.y}) mm`).join('; ')}. In each set, points 3 and 4 mirror points 2 and 1 across the Y axis.</desc>
      <g class="sketch-axes" aria-hidden="true">
        <line x1="${left + 2 * unit}" y1="0" x2="${right - 2 * unit}" y2="0" />
        <line x1="0" y1="${-lower - 2 * unit}" x2="0" y2="${-upper + 2 * unit}" />
        <text x="${right - 2 * unit}" y="${-2 * unit}" text-anchor="end" style="font-size:${3 * unit}px">X</text>
        <text x="${2 * unit}" y="${-upper + 4 * unit}" style="font-size:${3 * unit}px">Y</text>
      </g>
      <polygon class="sketch-outline" points="${outerPoints.map(p => `${p.x},${-p.y}`).join(' ')}" />
      <polygon class="sketch-outline sketch-inner-outline" points="${innerPoints.map(p => `${p.x},${-p.y}`).join(' ')}" />
      ${points.map(p => `
        <g class="sketch-vertex${innerPoints.includes(p) ? ' sketch-inner-vertex' : ''}">
          <title>${p.name}: (${p.x}, ${p.y}) mm</title>
          <circle class="sketch-vertex-hit" cx="${p.x}" cy="${-p.y}" r="${2.5 * unit}" />
          <circle class="sketch-vertex-dot" cx="${p.x}" cy="${-p.y}" r="${0.7 * unit}" />
          <text x="${p.x + (p.x < 0 ? 2 : -2) * unit}" y="${-p.y + (p.y < 0 ? 4 : -2) * unit}" text-anchor="${p.x < 0 ? 'start' : 'end'}" style="font-size:${3 * unit}px">${p.name}</text>
        </g>
      `).join('')}
    </svg>
  `
}
