import { baseEndGeometry } from './base-end-geometry.ts'
import { defaultBaseParameters, rowPitch } from './model.ts'
import { cellOuterPoints } from './sketch.ts'
import type { SketchPoint } from './sketch.ts'
import { fillet, filletPath } from './fillet.ts'
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

export function standTopGeometry(params: BaseParameters) {
  const { center, start, outer3, outer4, arcRadius } = baseEndGeometry(params)
  const [cellOuter1, cellOuter2] = cellOuterPoints(params) as readonly [SketchPoint, SketchPoint, ...SketchPoint[]]
  // Cell side: length of outer 3–outer 4.
  const yTop1 = Math.hypot(outer3.y - outer4.y, outer3.z - outer4.z)
  // Cell side: from outer 1 to the circle centre's projection on OY.
  const yTop2 = center.y - start.y
  // Cell top: cell outer 1–outer 2 length for the first row, plus one row pitch per further row.
  const fullLength = yTop2 + (cellOuter1.y - cellOuter2.y) + rowPitch(params) * (params.rows - 1)
  const standAngle = params.standAngle * Math.PI / 180
  const tiltAngle = params.baseTiltAngle * Math.PI / 180
  // The extended stand pivots on the circle centre (raised base height / 2 above the base bottom) and its plate
  // sits arcRadius (top face) to arcRadius + wall thickness (bottom face) from that axis. After rotating by the
  // stand angle and tilting by the base tilt angle about the base's far bottom edge, the plate's lowest end
  // corner lands at Z = 0 when the stand has this length.
  const total = standAngle + tiltAngle
  const lowestCorner = total >= Math.PI / 2 ? -arcRadius : -(arcRadius + params.wallThickness)
  const standLength = (fullLength * Math.sin(tiltAngle) + center.z * Math.cos(tiltAngle) + lowestCorner * Math.cos(total)) / Math.sin(total)
  // Half the full model width, less one wall thickness: the X of the stand's outer side.
  const halfWidth = (params.wallThickness * (params.columns + 1) + params.cellWidth * params.columns) / 2 - params.wallThickness
  return {
    yTop1, yTop2, fullLength, standLength,
    outer1: { x: halfWidth, y: yTop1 },
    outer2: { x: halfWidth, y: -standLength },
    // Projections of outer 2 and outer 1 onto OY.
    outer3: { x: 0, y: -standLength },
    outer4: { x: 0, y: yTop1 },
    // On OY, one stand profile width below OX.
    inner1: { x: 0, y: -params.standProfileWidth },
    // Outer 1 X moved left by the stand profile width, at the same Y as inner 1.
    inner2: { x: halfWidth - params.standProfileWidth, y: -params.standProfileWidth },
    // Inner 2 and inner 1 at one stand profile width above outer 3.
    inner3: { x: halfWidth - params.standProfileWidth, y: -standLength + params.standProfileWidth },
    inner4: { x: 0, y: -standLength + params.standProfileWidth },
  }
}

// Blue outline corners at inner 3 and inner 2, rounded by stand profile width / 2.
export function standTopFillets(params: BaseParameters) {
  const { inner1, inner2, inner3, inner4 } = standTopGeometry(params)
  const radius = params.standProfileWidth / 2
  return {
    inner3: fillet(inner4, inner3, inner2, radius),
    inner2: fillet(inner3, inner2, inner1, radius),
  }
}

// The stand viewed from above, in the XOY plane: positive X right, positive Y up.
export function standTopSketch(params: BaseParameters = defaultBaseParameters) {
  const { yTop1, standLength, outer1, outer2, outer3, outer4, inner1, inner2, inner3, inner4 } = standTopGeometry(params)
  const xFormula = '(wall thickness * (columns + 1) + cell width * columns) / 2 - wall thickness'
  const fillets = standTopFillets(params)
  return axesSketch(Math.max(outer1.x, yTop1, standLength), 'X', 'Y', false,
    'Stand top sketch with positive X pointing right and positive Y pointing up', unit => `
      <path class="sketch-outline" d="M ${outer1.x} ${-outer1.y} ${[outer2, outer3, inner4].map(p => `L ${p.x} ${-p.y}`).join(' ')}
        ${filletPath(fillets.inner3)} ${filletPath(fillets.inner2)}
        ${[inner1, outer4].map(p => `L ${p.x} ${-p.y}`).join(' ')} Z" />
      ${[[outer1, 'Y top 1', -2], [outer2, '-stand length', 4], [outer3, '-stand length', 4], [outer4, 'Y top 1', -2]].map(([point, yFormula, labelOffset], index) => {
        const { x, y } = point as { x: number, y: number }
        return `
        <g class="sketch-vertex" data-point-name="outer ${index + 1}" data-x="${x}" data-y="${y}" data-x-formula="${x === 0 ? '0' : xFormula}" data-y-formula="${yFormula}"
          data-label-x="${x - 2 * unit}" data-label-y="${-y + (labelOffset as number) * unit}" data-label-anchor="end" data-label-size="${3 * unit}">
          <circle class="sketch-vertex-dot" cx="${x}" cy="${-y}" r="${0.7 * unit}" />
        </g>`
      }).join('')}
      ${[[inner1, '0'], [inner2, `${xFormula} - stand profile width`], [inner3, `${xFormula} - stand profile width`], [inner4, '0']].map(([point, formula], index) => {
        const { x, y } = point as { x: number, y: number }
        return `
        <g class="sketch-vertex sketch-inner-vertex" data-point-name="inner ${index + 1}" data-x="${x}" data-y="${y}" data-x-formula="${formula}" data-y-formula="${index < 2 ? '-stand profile width' : '-stand length + stand profile width'}"
          data-label-x="${x}" data-label-y="${-y + 4 * unit}" data-label-anchor="middle" data-label-size="${3 * unit}">
          <circle class="sketch-vertex-dot" cx="${x}" cy="${-y}" r="${0.7 * unit}" />
        </g>`
      }).join('')}
    `)
}

export function standSideGeometry(params: BaseParameters) {
  // The radius of the Cell side yellow arc (base end circle enlarged by the stand tolerance).
  const drop = baseEndGeometry(params).arcRadius
  const halfWidth = (params.baseHeight - params.standHingeTolerance) / 2
  return {
    // Green: fits the Cell side helper circle (diameter base height) with the stand hinge tolerance.
    outerRadius: (params.baseHeight - params.standHingeTolerance) / 2,
    // Red: diameter is base height minus two wall thicknesses.
    innerRadius: (params.baseHeight - 2 * params.wallThickness) / 2,
    // Ends of the green half circle after its bottom half is cut away.
    outer1: { y: halfWidth, z: 0 },
    outer2: { y: -halfWidth, z: 0 },
    // Outer 2 and outer 1 moved down by the yellow arc's radius.
    outer3: { y: -halfWidth, z: -drop },
    outer4: { y: halfWidth, z: -drop },
    // Outer 3 and outer 4 moved down by the wall thickness.
    outer5: { y: -halfWidth, z: -drop - params.wallThickness },
    outer6: { y: halfWidth, z: -drop - params.wallThickness },
  }
}

// The stand viewed from +X, in the YOZ plane: positive Y left and positive Z up, matching the Cell side sketch.
export function standSideSketch(params: BaseParameters = defaultBaseParameters) {
  const { outerRadius, innerRadius, outer1, outer2, outer3, outer4, outer5, outer6 } = standSideGeometry(params)
  return axesSketch(Math.max(outerRadius, -outer5.z, 1e-3), 'Y', 'Z', true,
    'Stand side sketch with positive Y pointing left and positive Z pointing up', unit => `
      ${outerRadius > 0 ? `<path class="sketch-outline sketch-hinge-outline" d="M ${-outer1.y} ${-outer1.z} A ${outerRadius} ${outerRadius} 0 0 1 ${-outer2.y} ${-outer2.z} L ${-outer3.y} ${-outer3.z} L ${-outer4.y} ${-outer4.z} Z" />` : ''}
      <polygon class="sketch-outline sketch-cut-outline" points="${[outer3, outer5, outer6, outer4].map(p => `${-p.y},${-p.z}`).join(' ')}" />
      ${innerRadius > 0 ? `<circle class="sketch-inner-circle" cx="0" cy="0" r="${innerRadius}" />` : ''}
      <g class="sketch-vertex" data-point-name="centre" data-x="0" data-y="0" data-first-axis="Y" data-second-axis="Z" data-x-formula="0" data-y-formula="0"
        data-label-x="${-2 * unit}" data-label-y="${4 * unit}" data-label-anchor="end" data-label-size="${3 * unit}">
        <circle class="sketch-vertex-dot" cx="0" cy="0" r="${0.7 * unit}" />
      </g>
      ${[outer1, outer2, outer3, outer4, outer5, outer6].map((point, index) => `
        <g class="sketch-vertex ${index < 4 ? 'sketch-hinge-vertex' : 'sketch-cut-vertex'}" data-point-name="outer ${index + 1}" data-x="${point.y}" data-y="${point.z}" data-first-axis="Y" data-second-axis="Z"
          data-x-formula="${point.y > 0 ? '' : '-'}(base height - stand hinge tolerance) / 2" data-y-formula="${index < 2 ? '0' : index < 4 ? '-(base height / 2 + stand tolerance)' : '-(base height / 2 + stand tolerance) - wall thickness'}"
          data-label-x="${-point.y}" data-label-y="${-point.z + 4 * unit}" data-label-anchor="middle" data-label-size="${3 * unit}">
          <circle class="sketch-vertex-dot" cx="${-point.y}" cy="${-point.z}" r="${0.7 * unit}" />
        </g>
      `).join('')}
    `)
}
