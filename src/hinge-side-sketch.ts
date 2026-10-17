import { defaultBaseParameters } from './model.ts'
import type { BaseParameters } from './model.ts'

// A circle at the origin whose diameter is the hinge thickness.
export function hingeSideGeometry(params: BaseParameters) {
  return {
    radius: params.hingeThickness / 2,
    centre: { y: 0, z: 0 },
  }
}

// The hinge viewed from +X, in the YOZ plane: positive Y left and positive Z up, matching the Cell side sketch.
export function hingeSideSketch(params: BaseParameters = defaultBaseParameters) {
  const { radius, centre } = hingeSideGeometry(params)
  const unit = Math.max(2 * radius, 1e-3) / 20
  const half = radius + 10 * unit
  return `
    <svg class="sketch-canvas" viewBox="${-half} ${-half} ${2 * half} ${2 * half}" role="img" aria-label="Hinge side sketch with positive Y pointing left and positive Z pointing up">
      <g class="sketch-axes" aria-hidden="true">
        <line x1="${-half + 2 * unit}" y1="0" x2="${half - 2 * unit}" y2="0" />
        <line x1="0" y1="${half - 2 * unit}" x2="0" y2="${-half + 2 * unit}" />
        <text x="${-half + 2 * unit}" y="${-2 * unit}" style="font-size:${3 * unit}px">Y</text>
        <text x="${2 * unit}" y="${-half + 4 * unit}" style="font-size:${3 * unit}px">Z</text>
      </g>
      <circle class="sketch-outline" cx="${-centre.y}" cy="${-centre.z}" r="${radius}" />
      <g class="sketch-vertex" data-point-name="circle centre" data-x="${centre.y}" data-y="${centre.z}" data-first-axis="Y" data-second-axis="Z"
        data-x-formula="0" data-y-formula="0"
        data-label-x="${-centre.y}" data-label-y="${-radius - 2 * unit}" data-label-anchor="middle" data-label-size="${3 * unit}">
        <circle class="sketch-vertex-dot" cx="${-centre.y}" cy="${-centre.z}" r="${0.7 * unit}" />
      </g>
      <text class="sketch-point-label" hidden></text>
    </svg>
    <div class="hud sketch-point-hud" hidden>
      <div class="point-name"></div>
      <div class="hud-hub"><div class="point-x"></div><div class="point-y"></div></div>
    </div>
  `
}
