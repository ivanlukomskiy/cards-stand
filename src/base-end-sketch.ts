import { defaultBaseParameters } from './model.ts'
import type { BaseParameters } from './model.ts'

import { baseEndGeometry, cutOutlineEpsilon } from './base-end-geometry.ts'
export { baseEndGeometry } from './base-end-geometry.ts'

export function baseEndSketch(params: BaseParameters = defaultBaseParameters) {
  const { start, atHeight, slope, center, radius, holeRadius, offsetStart, rest1, rest2, outer3, outer4, hingeCenter, hingeCenter2, hingeCenter3, hingeRadius, midCut1, midCut2, midCut3, hinge2Bottom, hinge2Tangent } = baseEndGeometry(params)
  const beamTop = params.baseHeight * 1.4
  const beamEndY = start.y + beamTop * slope
  const unit = Math.max(beamEndY, beamTop, center.y + radius, outer3.y, rest1.y, hingeCenter.y, hingeCenter2.y, 1) / 40
  const minY = Math.min(0, hingeCenter.y, hingeCenter2.y, midCut1.y) - 10 * unit
  const maxY = Math.max(beamEndY, atHeight.y, center.y + radius, outer3.y, rest1.y, hingeCenter.y, hingeCenter2.y) + 14 * unit
  const minZ = Math.min(0, offsetStart.z, hingeCenter2.z - hingeRadius, midCut3.z) - 10 * unit
  const maxZ = Math.max(beamTop, hingeCenter.z) + 8 * unit
  const parallelOffset = (params.hingeThickness + params.hingeTolerance) / 2
  // Offset away from the main circle, matching the hinge-centre direction.
  const parallelY = (z: number) => start.y + z * slope - parallelOffset / Math.sin(params.baseAngle * Math.PI / 180)
  const a = { x: -hingeCenter.y, y: -hingeCenter.z }
  const b = { x: -hingeCenter2.y, y: -hingeCenter2.z }
  const separation = Math.hypot(b.x - a.x, b.y - a.y)
  const nx = separation > 0 ? -(b.y - a.y) / separation : 1
  const ny = separation > 0 ? (b.x - a.x) / separation : 0
  const tangent = (point: typeof a, side: number) => `${point.x + side * hingeRadius * nx} ${point.y + side * hingeRadius * ny}`
  const hingeOutline = separation > 1e-9
    ? `<path class="sketch-outline sketch-hinge-outline" d="M ${tangent(a, 1)}
        L ${tangent(b, 1)} A ${hingeRadius} ${hingeRadius} 0 0 0 ${tangent(b, -1)}
        L ${tangent(a, -1)} A ${hingeRadius} ${hingeRadius} 0 0 0 ${tangent(a, 1)} Z" />`
    : `<circle class="sketch-outline sketch-hinge-outline" cx="${a.x}" cy="${a.y}" r="${hingeRadius}" />`
  // Project positive Y to the left and positive Z upward.
  return `
    <svg class="sketch-canvas" viewBox="${-maxY} ${-maxZ} ${maxY - minY} ${maxZ - minZ}" role="img" aria-label="Base end sketch with positive Y pointing left and positive Z pointing up">
      <g class="sketch-axes" aria-hidden="true">
        <line x1="${-maxY + 2 * unit}" y1="0" x2="${-minY - 2 * unit}" y2="0" />
        <line x1="0" y1="${-minZ - 2 * unit}" x2="0" y2="${-maxZ + 2 * unit}" />
        <text x="${-maxY + 2 * unit}" y="${-2 * unit}" style="font-size:${3 * unit}px">Y</text>
        <text x="${2 * unit}" y="${-maxZ + 4 * unit}" style="font-size:${3 * unit}px">Z</text>
      </g>
      <g class="sketch-helper">
        <line x1="${-maxY + 2 * unit}" y1="${-(params.baseHeight - params.wallThickness)}" x2="${-minY - 2 * unit}" y2="${-(params.baseHeight - params.wallThickness)}" />
        <line x1="${-maxY + 2 * unit}" y1="${-params.wallThickness}" x2="${-minY - 2 * unit}" y2="${-params.wallThickness}" />
        <line x1="${-parallelY(minZ + 2 * unit)}" y1="${-minZ - 2 * unit}" x2="${-parallelY(maxZ - 2 * unit)}" y2="${-maxZ + 2 * unit}" />
      </g>
      <circle class="sketch-helper-circle" cx="${-center.y}" cy="${-center.z}" r="${radius}" />
      ${holeRadius > 0 ? `<circle class="sketch-inner-circle" cx="${-center.y}" cy="${-center.z}" r="${holeRadius}" />` : ''}
      <polygon class="sketch-outline" points="${[
        [-rest1.y, -rest1.z], [-atHeight.y, -atHeight.z], [-start.y, 0], [-rest2.y, 0],
      ].map(point => point.join(',')).join(' ')}" />
      <path class="sketch-outline sketch-inner-outline" d="M ${-rest2.y} 0
        L ${-center.y} 0
        A ${radius} ${radius} 0 0 1 ${-outer4.y} ${-outer4.z}
        L ${-outer3.y} ${-outer3.z}
        L ${-rest1.y} ${-rest1.z}" />
      ${hingeOutline}
      <path class="sketch-outline sketch-cut-outline" transform="translate(${-cutOutlineEpsilon} 0)" d="M ${-atHeight.y} ${-atHeight.z}
        L ${-midCut1.y} ${-midCut1.z}
        L ${-midCut2.y} ${-midCut2.z}
        A ${hingeRadius} ${hingeRadius} 0 0 1 ${-midCut3.y} ${-midCut3.z}
        L ${-hinge2Bottom.y} ${-hinge2Bottom.z}
        A ${hingeRadius} ${hingeRadius} 0 0 1 ${-hinge2Tangent.y} ${-hinge2Tangent.z} Z" />
      <g class="sketch-vertex" data-point-name="outer 1" data-x="${start.y}" data-y="0" data-first-axis="Y" data-second-axis="Z"
        data-x-formula="wall thickness + (hinge thickness + hinge tolerance) / sin(base angle)" data-y-formula="0"
        data-label-x="${-start.y - 2 * unit}" data-label-y="${4 * unit}" data-label-anchor="end" data-label-size="${3 * unit}">
        <circle class="sketch-vertex-dot" cx="${-start.y}" cy="0" r="${0.7 * unit}" />
      </g>
      <g class="sketch-vertex" data-point-name="outer 2" data-x="${atHeight.y}" data-y="${atHeight.z}" data-first-axis="Y" data-second-axis="Z"
        data-x-formula="wall thickness + (hinge thickness + hinge tolerance) / sin(base angle) + base height / tan(base angle)" data-y-formula="base height"
        data-label-x="${-atHeight.y - 2 * unit}" data-label-y="${-atHeight.z - 2 * unit}" data-label-anchor="end" data-label-size="${3 * unit}">
        <circle class="sketch-vertex-dot" cx="${-atHeight.y}" cy="${-atHeight.z}" r="${0.7 * unit}" />
      </g>
      <g class="sketch-vertex sketch-circle-center" data-point-name="circle centre" data-x="${center.y}" data-y="${center.z}" data-first-axis="Y" data-second-axis="Z"
        data-x-formula="wall thickness + (hinge thickness + hinge tolerance) / sin(base angle) + base height / (2 * tan(base angle)) + base height / (2 * sin(base angle)) + wall thickness / sin(base angle)" data-y-formula="base height / 2"
        data-label-x="${-center.y - 2 * unit}" data-label-y="${-center.z - 2 * unit}" data-label-anchor="end" data-label-size="${3 * unit}">
        <circle class="sketch-vertex-dot" cx="${-center.y}" cy="${-center.z}" r="${0.7 * unit}" />
      </g>
      <g class="sketch-vertex" data-point-name="outer 3" data-x="${outer3.y}" data-y="${outer3.z}" data-first-axis="Y" data-second-axis="Z"
        data-x-formula="circle centre Y + radius / tan(stand angle / 2)" data-y-formula="base height"
        data-label-x="${-outer3.y - 2 * unit}" data-label-y="${-outer3.z - 2 * unit}" data-label-anchor="end" data-label-size="${3 * unit}">
        <circle class="sketch-vertex-dot" cx="${-outer3.y}" cy="${-outer3.z}" r="${0.7 * unit}" />
      </g>
      <g class="sketch-vertex" data-point-name="outer 5" data-x="${center.y}" data-y="0" data-first-axis="Y" data-second-axis="Z"
        data-x-formula="circle centre Y" data-y-formula="0"
        data-label-x="${-center.y - 2 * unit}" data-label-y="${4 * unit}" data-label-anchor="end" data-label-size="${3 * unit}">
        <circle class="sketch-vertex-dot" cx="${-center.y}" cy="0" r="${0.7 * unit}" />
      </g>
      ${[rest1, rest2].map((point, index) => `
        <g class="sketch-vertex sketch-rest-vertex" data-point-name="rest ${index + 1}" data-x="${point.y}" data-y="${point.z}" data-first-axis="Y" data-second-axis="Z"
          data-x-formula="outer ${index === 0 ? 2 : 1} Y + wall thickness / sin(base angle)" data-y-formula="${index === 0 ? 'base height' : '0'}"
          data-label-x="${-point.y - 2 * unit}" data-label-y="${-point.z + (index === 0 ? -2 : 4) * unit}" data-label-anchor="end" data-label-size="${3 * unit}">
          <circle class="sketch-vertex-dot" cx="${-point.y}" cy="${-point.z}" r="${0.7 * unit}" />
        </g>
      `).join('')}
      <g class="sketch-vertex" data-point-name="outer 4" data-x="${outer4.y}" data-y="${outer4.z}" data-first-axis="Y" data-second-axis="Z"
        data-x-formula="circle centre Y + radius * sin(stand angle)" data-y-formula="circle centre Z - radius * cos(stand angle)"
        data-label-x="${-outer4.y - 2 * unit}" data-label-y="${-outer4.z - 2 * unit}" data-label-anchor="end" data-label-size="${3 * unit}">
        <circle class="sketch-vertex-dot" cx="${-outer4.y}" cy="${-outer4.z}" r="${0.7 * unit}" />
      </g>
      <circle class="sketch-helper-circle" cx="${-hingeCenter.y}" cy="${-hingeCenter.z}" r="${hingeRadius}" />
      <g class="sketch-vertex" data-point-name="hinge centre 1" data-x="${hingeCenter.y}" data-y="${hingeCenter.z}" data-first-axis="Y" data-second-axis="Z"
        data-x-formula="outer 1 Y + (wall thickness + hinge thickness / 2) / tan(base angle) - (hinge thickness + hinge tolerance) / (2 * sin(base angle))" data-y-formula="wall thickness + hinge thickness / 2"
        data-label-x="${-hingeCenter.y - 2 * unit}" data-label-y="${-hingeCenter.z - 2 * unit}" data-label-anchor="end" data-label-size="${3 * unit}">
        <circle class="sketch-vertex-dot" cx="${-hingeCenter.y}" cy="${-hingeCenter.z}" r="${0.7 * unit}" />
      </g>
      <circle class="sketch-helper-circle" cx="${-hingeCenter2.y}" cy="${-hingeCenter2.z}" r="${hingeRadius}" />
      <g class="sketch-vertex" data-point-name="hinge centre 2" data-x="${hingeCenter2.y}" data-y="${hingeCenter2.z}" data-first-axis="Y" data-second-axis="Z"
        data-x-formula="hinge centre 1 Y + (base height - wall thickness - hinge thickness / 2 - hinge centre 1 Z) / tan(base angle)" data-y-formula="base height - wall thickness - hinge thickness / 2"
        data-label-x="${-hingeCenter2.y - 2 * unit}" data-label-y="${-hingeCenter2.z - 2 * unit}" data-label-anchor="end" data-label-size="${3 * unit}">
        <circle class="sketch-vertex-dot" cx="${-hingeCenter2.y}" cy="${-hingeCenter2.z}" r="${0.7 * unit}" />
      </g>
      <circle class="sketch-helper-circle" cx="${-hingeCenter3.y}" cy="${-hingeCenter3.z}" r="${hingeRadius}" />
      <g class="sketch-vertex" data-point-name="hinge centre 3" data-x="${hingeCenter3.y}" data-y="${hingeCenter3.z}" data-first-axis="Y" data-second-axis="Z"
        data-x-formula="hinge centre 2 Y - distance(hinge centre 1, hinge centre 2)" data-y-formula="hinge centre 2 Z"
        data-label-x="${-hingeCenter3.y - 2 * unit}" data-label-y="${-hingeCenter3.z - 2 * unit}" data-label-anchor="end" data-label-size="${3 * unit}">
        <circle class="sketch-vertex-dot" cx="${-hingeCenter3.y}" cy="${-hingeCenter3.z}" r="${0.7 * unit}" />
      </g>
      <g class="sketch-vertex" data-point-name="mid cut 1" data-x="${midCut1.y}" data-y="${midCut1.z}" data-first-axis="Y" data-second-axis="Z"
        data-x-formula="hinge centre 3 Y - (hinge thickness + hinge tolerance) / 2" data-y-formula="base height"
        data-label-x="${-midCut1.y + 2 * unit}" data-label-y="${-midCut1.z - 2 * unit}" data-label-anchor="start" data-label-size="${3 * unit}">
        <circle class="sketch-vertex-dot" cx="${-midCut1.y}" cy="${-midCut1.z}" r="${0.7 * unit}" />
      </g>
      <text class="sketch-point-label" hidden></text>
    </svg>
    <div class="hud sketch-point-hud" hidden>
      <div class="point-name"></div>
      <div class="hud-hub"><div class="point-x"></div><div class="point-y"></div></div>
    </div>
  `
}
