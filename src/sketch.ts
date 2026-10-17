export interface SketchPoint {
  name: string
  x: number
  y: number
}

// Sketch coordinates use millimeters, with Y increasing upward.
export const rectanglePoints: readonly SketchPoint[] = [
  { name: 'A', x: 0, y: 0 },
  { name: 'B', x: 64, y: 0 },
  { name: 'C', x: 64, y: 24 },
  { name: 'D', x: 0, y: 24 },
]

export function rectangleSketch() {
  return `
    <svg class="sketch-canvas" viewBox="-16 -42 96 60" role="img" aria-labelledby="sketch-title sketch-description">
      <title id="sketch-title">Rectangle sketch</title>
      <desc id="sketch-description">A 64 by 24 millimeter rectangle with vertices A (0, 0), B (64, 0), C (64, 24), and D (0, 24).</desc>
      <polygon class="sketch-outline" points="${rectanglePoints.map(p => `${p.x},${-p.y}`).join(' ')}" />
      ${rectanglePoints.map(p => `
        <g class="sketch-vertex">
          <title>${p.name}: (${p.x}, ${p.y}) mm</title>
          <circle class="sketch-vertex-hit" cx="${p.x}" cy="${-p.y}" r="2.5" />
          <circle class="sketch-vertex-dot" cx="${p.x}" cy="${-p.y}" r="0.7" />
          <text x="${p.x + (p.x === 0 ? -2 : 2)}" y="${-p.y + (p.y === 0 ? 4 : -2)}" text-anchor="${p.x === 0 ? 'end' : 'start'}">${p.name}</text>
        </g>
      `).join('')}
    </svg>
  `
}
