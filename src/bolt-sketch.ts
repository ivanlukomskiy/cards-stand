import { baseEndGeometry } from './base-end-geometry.ts'
import { defaultBaseParameters } from './model.ts'
import type { BaseParameters } from './model.ts'

export function boltGeometry(params: BaseParameters) {
  return {
    // Red circle.
    outerRadius: (params.baseHeight - params.hingeTolerance) / 2,
    // Green circle: the Cell side red (stand hinge) circle, with its diameter reduced by the bolt tolerance.
    innerRadius: baseEndGeometry(params).holeRadius - params.boltTolerance / 2,
  }
}

// The bolt viewed from above, in the XOY plane: positive X right, positive Y up.
export function boltSketch(params: BaseParameters = defaultBaseParameters) {
  const { outerRadius, innerRadius } = boltGeometry(params)
  const extent = Math.max(outerRadius, innerRadius, 1e-3)
  const unit = extent / 34
  const half = extent + 12 * unit
  return `
    <svg class="sketch-canvas" viewBox="${-half} ${-half} ${2 * half} ${2 * half}" role="img" aria-label="Bolt sketch with positive X pointing right and positive Y pointing up">
      <g class="sketch-axes" aria-hidden="true">
        <line x1="${-half + 2 * unit}" y1="0" x2="${half - 2 * unit}" y2="0" />
        <line x1="0" y1="${half - 2 * unit}" x2="0" y2="${-half + 2 * unit}" />
        <text x="${half - 2 * unit}" y="${-2 * unit}" text-anchor="end" style="font-size:${3 * unit}px">X</text>
        <text x="${2 * unit}" y="${-half + 4 * unit}" style="font-size:${3 * unit}px">Y</text>
      </g>
      ${outerRadius > 0 ? `<circle class="sketch-inner-circle" cx="0" cy="0" r="${outerRadius}" />` : ''}
      ${innerRadius > 0 ? `<circle class="sketch-outline sketch-hinge-outline" cx="0" cy="0" r="${innerRadius}" />` : ''}
      <g class="sketch-vertex" data-point-name="centre" data-x="0" data-y="0" data-x-formula="0" data-y-formula="0"
        data-label-x="${-2 * unit}" data-label-y="${4 * unit}" data-label-anchor="end" data-label-size="${3 * unit}">
        <circle class="sketch-vertex-dot" cx="0" cy="0" r="${0.7 * unit}" />
      </g>
      <text class="sketch-point-label" hidden></text>
    </svg>
    <div class="hud sketch-point-hud" hidden>
      <div class="point-name"></div>
      <div class="hud-hub"><div class="point-x"></div><div class="point-y"></div></div>
    </div>
  `
}
