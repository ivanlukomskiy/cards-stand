import { defaultBaseParameters } from './model.ts'
import type { BaseParameters } from './model.ts'

export function baseEndGeometry(params: BaseParameters) {
  const start = { y: params.wallThickness + params.hingeThickness + params.hingeTolerance, z: 0 }
  const slope = 1 / Math.tan(params.baseAngle * Math.PI / 180)
  const atHeight = { y: start.y + params.baseHeight * slope, z: params.baseHeight }
  // OY and the upper horizontal beam are baseHeight apart.
  const radius = params.baseHeight / 2
  const center = {
    y: start.y + radius * slope + radius / Math.sin(params.baseAngle * Math.PI / 180),
    z: radius,
  }
  // Unit normal toward the centre in (Y, Z) coordinates.
  const angle = params.baseAngle * Math.PI / 180
  const offsetStart = {
    y: start.y + params.wallThickness * Math.sin(angle),
    z: start.z - params.wallThickness * Math.cos(angle),
  }
  const rest2 = { y: start.y + params.wallThickness / Math.sin(angle), z: start.z }
  const rest1 = { y: rest2.y + params.baseHeight * slope, z: atHeight.z }
  // Move the circle and its dependent points left by the rest-line offset.
  center.y += rest1.y - atHeight.y
  return { start, atHeight, slope, center, radius, offsetStart, rest1, rest2 }
}

export function baseEndSketch(params: BaseParameters = defaultBaseParameters) {
  const { start, atHeight, slope, center, radius, offsetStart, rest1, rest2 } = baseEndGeometry(params)
  const beamTop = params.baseHeight * 1.4
  const beamEndY = start.y + beamTop * slope
  const unit = Math.max(beamEndY, beamTop, center.y + radius, rest1.y, 1) / 40
  const minY = -10 * unit
  const maxY = Math.max(beamEndY, atHeight.y, center.y + radius, rest1.y) + 14 * unit
  const minZ = Math.min(0, offsetStart.z) - 10 * unit
  const maxZ = beamTop + 8 * unit
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
        <line x1="${-start.y}" y1="0" x2="${-beamEndY}" y2="${-beamTop}" />
        <line x1="${-offsetStart.y}" y1="${-offsetStart.z}" x2="${-(offsetStart.y + (beamTop - offsetStart.z) * slope)}" y2="${-beamTop}" />
        <line x1="${-atHeight.y}" y1="${-atHeight.z}" x2="${-maxY + 2 * unit}" y2="${-atHeight.z}" />
      </g>
      <circle class="sketch-helper-circle" cx="${-center.y}" cy="${-center.z}" r="${radius}" />
      <polygon class="sketch-outline" points="${[
        [-rest1.y, -rest1.z], [-atHeight.y, -atHeight.z], [-start.y, 0], [-rest2.y, 0],
      ].map(point => point.join(',')).join(' ')}" />
      <path class="sketch-outline sketch-inner-outline" d="M ${-rest2.y} 0
        L ${-center.y} 0
        A ${radius} ${radius} 0 0 1 ${-center.y - radius} ${-center.z}
        L ${-center.y - radius} ${-center.z - radius}
        L ${-rest1.y} ${-rest1.z}" />
      <g class="sketch-vertex" data-point-name="outer 1" data-x="${start.y}" data-y="0" data-first-axis="Y" data-second-axis="Z"
        data-x-formula="wall thickness + hinge thickness + hinge tolerance" data-y-formula="0"
        data-label-x="${-start.y - 2 * unit}" data-label-y="${4 * unit}" data-label-anchor="end" data-label-size="${3 * unit}">
        <circle class="sketch-vertex-dot" cx="${-start.y}" cy="0" r="${0.7 * unit}" />
      </g>
      <g class="sketch-vertex" data-point-name="outer 2" data-x="${atHeight.y}" data-y="${atHeight.z}" data-first-axis="Y" data-second-axis="Z"
        data-x-formula="wall thickness + hinge thickness + hinge tolerance + base height / tan(base angle)" data-y-formula="base height"
        data-label-x="${-atHeight.y - 2 * unit}" data-label-y="${-atHeight.z - 2 * unit}" data-label-anchor="end" data-label-size="${3 * unit}">
        <circle class="sketch-vertex-dot" cx="${-atHeight.y}" cy="${-atHeight.z}" r="${0.7 * unit}" />
      </g>
      <g class="sketch-vertex sketch-circle-center" data-point-name="circle centre" data-x="${center.y}" data-y="${center.z}" data-first-axis="Y" data-second-axis="Z"
        data-x-formula="wall thickness + hinge thickness + hinge tolerance + base height / (2 * tan(base angle)) + base height / (2 * sin(base angle)) + wall thickness / sin(base angle)" data-y-formula="base height / 2"
        data-label-x="${-center.y - 2 * unit}" data-label-y="${-center.z - 2 * unit}" data-label-anchor="end" data-label-size="${3 * unit}">
        <circle class="sketch-vertex-dot" cx="${-center.y}" cy="${-center.z}" r="${0.7 * unit}" />
      </g>
      <g class="sketch-vertex" data-point-name="outer 3" data-x="${center.y + radius}" data-y="${center.z + radius}" data-first-axis="Y" data-second-axis="Z"
        data-x-formula="circle centre Y + radius" data-y-formula="circle centre Z + radius"
        data-label-x="${-center.y - radius - 2 * unit}" data-label-y="${-center.z - radius - 2 * unit}" data-label-anchor="end" data-label-size="${3 * unit}">
        <circle class="sketch-vertex-dot" cx="${-center.y - radius}" cy="${-center.z - radius}" r="${0.7 * unit}" />
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
      <g class="sketch-vertex" data-point-name="outer 4" data-x="${center.y + radius}" data-y="${center.z}" data-first-axis="Y" data-second-axis="Z"
        data-x-formula="circle centre Y + radius" data-y-formula="circle centre Z"
        data-label-x="${-center.y - radius - 2 * unit}" data-label-y="${-center.z - 2 * unit}" data-label-anchor="end" data-label-size="${3 * unit}">
        <circle class="sketch-vertex-dot" cx="${-center.y - radius}" cy="${-center.z}" r="${0.7 * unit}" />
      </g>
      <text class="sketch-point-label" hidden></text>
    </svg>
    <div class="hud sketch-point-hud" hidden>
      <div class="point-name"></div>
      <div class="hud-hub"><div class="point-x"></div><div class="point-y"></div></div>
    </div>
  `
}
