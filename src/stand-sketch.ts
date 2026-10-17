import { baseEndGeometry } from './base-end-geometry.ts'
import { defaultBaseParameters } from './model.ts'
import type { BaseParameters } from './model.ts'

// A sketch with dash-dot axes and optional content. `leftAxis` puts the first axis's positive direction to the left.
function axesSketch(extent: number, first: string, second: string, leftAxis: boolean, label: string, content: (unit: number) => string = () => '') {
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
      ${content(unit)}
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

export function standSideGeometry(params: BaseParameters) {
  return {
    // Green: fits the Cell side helper circle (diameter base height) with the stand hinge tolerance.
    outerRadius: (params.baseHeight - params.standHingeTolerance) / 2,
    // Red: the same as the Cell side red (stand hinge hole) circle.
    innerRadius: baseEndGeometry(params).holeRadius,
    // Ends of the green half circle after its bottom half is cut away.
    outer1: { y: (params.baseHeight - params.standHingeTolerance) / 2, z: 0 },
    outer2: { y: -(params.baseHeight - params.standHingeTolerance) / 2, z: 0 },
  }
}

// The stand viewed from +X, in the YOZ plane: positive Y left and positive Z up, matching the Cell side sketch.
export function standSideSketch(params: BaseParameters = defaultBaseParameters) {
  const { outerRadius, innerRadius, outer1, outer2 } = standSideGeometry(params)
  return axesSketch(Math.max(outerRadius, 1e-3), 'Y', 'Z', true,
    'Stand side sketch with positive Y pointing left and positive Z pointing up', unit => `
      ${outerRadius > 0 ? `<path class="sketch-outline sketch-hinge-outline" d="M ${-outer1.y} ${-outer1.z} A ${outerRadius} ${outerRadius} 0 0 1 ${-outer2.y} ${-outer2.z}" />` : ''}
      ${innerRadius > 0 ? `<circle class="sketch-inner-circle" cx="0" cy="0" r="${innerRadius}" />` : ''}
      <g class="sketch-vertex" data-point-name="centre" data-x="0" data-y="0" data-first-axis="Y" data-second-axis="Z" data-x-formula="0" data-y-formula="0"
        data-label-x="${-2 * unit}" data-label-y="${4 * unit}" data-label-anchor="end" data-label-size="${3 * unit}">
        <circle class="sketch-vertex-dot" cx="0" cy="0" r="${0.7 * unit}" />
      </g>
      ${[outer1, outer2].map((point, index) => `
        <g class="sketch-vertex sketch-hinge-vertex" data-point-name="outer ${index + 1}" data-x="${point.y}" data-y="${point.z}" data-first-axis="Y" data-second-axis="Z"
          data-x-formula="${index === 0 ? '' : '-'}(base height - stand hinge tolerance) / 2" data-y-formula="0"
          data-label-x="${-point.y}" data-label-y="${4 * unit}" data-label-anchor="middle" data-label-size="${3 * unit}">
          <circle class="sketch-vertex-dot" cx="${-point.y}" cy="${-point.z}" r="${0.7 * unit}" />
        </g>
      `).join('')}
    `)
}
