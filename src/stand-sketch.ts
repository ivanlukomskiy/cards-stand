import { defaultBaseParameters } from './model.ts'
import type { BaseParameters } from './model.ts'

// An empty sketch with dash-dot axes. `leftAxis` puts the first axis's positive direction to the left.
function axesSketch(extent: number, first: string, second: string, leftAxis: boolean, label: string) {
  const unit = extent / 34
  const half = extent + 12 * unit
  const firstLabelX = leftAxis ? -half + 2 * unit : half - 2 * unit
  return `
    <svg class="sketch-canvas" viewBox="${-half} ${-half} ${2 * half} ${2 * half}" role="img" aria-label="${label}">
      <g class="sketch-axes" aria-hidden="true">
        <line x1="${-half + 2 * unit}" y1="0" x2="${half - 2 * unit}" y2="0" />
        <line x1="0" y1="${half - 2 * unit}" x2="0" y2="${-half + 2 * unit}" />
        <text x="${firstLabelX}" y="${-2 * unit}"${leftAxis ? '' : ' text-anchor="end"'} style="font-size:${3 * unit}px">${first}</text>
        <text x="${2 * unit}" y="${-half + 4 * unit}" style="font-size:${3 * unit}px">${second}</text>
      </g>
      <text class="sketch-point-label" hidden></text>
    </svg>
    <div class="hud sketch-point-hud" hidden>
      <div class="point-name"></div>
      <div class="hud-hub"><div class="point-x"></div><div class="point-y"></div></div>
    </div>
  `
}

// The stand viewed from above, in the XOY plane: positive X right, positive Y up.
export function standTopSketch(params: BaseParameters = defaultBaseParameters) {
  return axesSketch(params.cellWidth / 2 + params.wallThickness, 'X', 'Y', false,
    'Stand top sketch with positive X pointing right and positive Y pointing up')
}

// The stand viewed from +X, in the YOZ plane: positive Y left and positive Z up, matching the Cell side sketch.
export function standSideSketch(params: BaseParameters = defaultBaseParameters) {
  return axesSketch(params.cellWidth / 2 + params.wallThickness, 'Y', 'Z', true,
    'Stand side sketch with positive Y pointing left and positive Z pointing up')
}
