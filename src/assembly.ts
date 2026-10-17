import { baseEndGeometry } from './base-end-geometry.ts'
import { rowPitch } from './model.ts'
import { cellOuterPoints } from './sketch.ts'
import type { BaseParameters } from './model.ts'
import type { ModelName } from './openscad.worker.ts'

export type AssemblyPart = ModelName
export const assemblyParts: readonly AssemblyPart[] = ['base', 'hinge', 'stand', 'bolt']

export interface AssemblyOptions {
  standExtended: boolean
  hingeExtended: boolean
}

// One placed copy of a part: optionally rotate about the Y axis, then about the X axis, then translate, in OpenSCAD's (X, Y, Z).
export interface Placement {
  rotationY?: number
  rotationX: number
  offset: [number, number, number]
}

export function applyPlacement({ rotationY = 0, rotationX, offset }: Placement, [x0, y0, z0]: readonly [number, number, number]): [number, number, number] {
  const cy = Math.cos(rotationY), sy = Math.sin(rotationY)
  const x = x0 * cy + z0 * sy, y = y0, z = -x0 * sy + z0 * cy
  const cos = Math.cos(rotationX), sin = Math.sin(rotationX)
  return [x + offset[0], y * cos - z * sin + offset[1], y * sin + z * cos + offset[2]]
}

// The base's far bottom edge (Y at the end of the last row, Z = 0), about which the extended stand tilts everything.
export function tiltPivot(params: BaseParameters): [number, number] {
  return [cellOuterPoints(params)[0]!.y - params.rows * rowPitch(params), 0]
}

// Rotate a placement by `angle` about the X-parallel axis through (Y, Z) = pivot.
function tilt({ rotationY, rotationX, offset }: Placement, angle: number, [py, pz]: [number, number]): Placement {
  const cos = Math.cos(angle), sin = Math.sin(angle)
  const y = offset[1] - py, z = offset[2] - pz
  return { rotationY, rotationX: rotationX + angle, offset: [offset[0], y * cos - z * sin + py, y * sin + z * cos + pz] }
}

export function assemblyPlacements(params: BaseParameters, options: AssemblyOptions): Record<AssemblyPart, Placement[]> {
  // Rule 1: every part is centred on X = 0. The base and hinge repeat per column from X = 0, so
  // their X extent is symmetric about the middle column; the stand is already mirrored about X = 0.
  const columnsCentre = (params.columns - 1) * (params.cellWidth + params.wallThickness) / 2
  // Rule 2: one hinge per row. Extended, its axis (the Hinge side circle centre, at the hinge's origin)
  // sits on Cell side hinge centre 1 and its plate (local +Y) runs up along outer 1 → outer 2; otherwise
  // the axis sits on hinge centre 2 and the plate runs toward mid cut 1 (−Y). Either way its extrusion
  // direction (local Z) is perpendicular to that line.
  const { hingeCenter, hingeCenter2, center } = baseEndGeometry(params)
  const centre = options.hingeExtended ? hingeCenter : hingeCenter2
  const rotationX = options.hingeExtended ? params.baseAngle * Math.PI / 180 : Math.PI
  const placements: Record<AssemblyPart, Placement[]> = {
    base: [{ rotationX: 0, offset: [-columnsCentre, 0, 0] }],
    hinge: Array.from({ length: params.rows }, (_, row) => ({
      rotationX,
      offset: [-columnsCentre, centre.y - row * rowPitch(params), centre.z] as [number, number, number],
    })),
    // Rule 3: the stand's origin (the Stand side circle centre) sits on the Cell side circle centre.
    // Extended, its XOY plane is parallel to outer 3–outer 4 (rotated by the stand angle, so the plate's
    // top face lies on that line); otherwise it is parallel to outer 5–rest 2 and lies under the base.
    stand: [{
      rotationX: options.standExtended ? params.standAngle * Math.PI / 180 : 0,
      offset: [0, center.y, center.z],
    }],
    // Rule 5: two bolts on the base hole axis (the Cell side circle centre), one from each side. Each
    // head's outer face is flush with the base's side, so the head sits one wall thickness inside it,
    // and the shank (the bolt's local +Z) points along X into the base.
    bolt: [1, -1].map(side => ({
      rotationY: -side * Math.PI / 2,
      rotationX: 0,
      offset: [side * (columnsCentre + params.cellWidth / 2 + params.wallThickness), center.y, center.z] as [number, number, number],
    })),
  }
  // Rule 4: with the stand extended, the base (and everything attached to it) tilts by the base tilt
  // angle about its far bottom edge, raising the stand end.
  if (!options.standExtended) return placements
  const angle = params.baseTiltAngle * Math.PI / 180
  const pivot = tiltPivot(params)
  return Object.fromEntries(Object.entries(placements).map(([part, copies]) =>
    [part, copies.map(placement => tilt(placement, angle, pivot))])) as Record<AssemblyPart, Placement[]>
}
