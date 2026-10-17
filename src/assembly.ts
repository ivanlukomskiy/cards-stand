import { baseEndGeometry } from './base-end-geometry.ts'
import { rowPitch } from './model.ts'
import type { BaseParameters } from './model.ts'
import type { ModelName } from './openscad.worker.ts'

export type AssemblyPart = Exclude<ModelName, 'bolt'>
export const assemblyParts: readonly AssemblyPart[] = ['base', 'hinge', 'stand']

export interface AssemblyOptions {
  standExtended: boolean
  hingeExtended: boolean
}

// One placed copy of a part: rotate about the X axis, then translate, in OpenSCAD's (X, Y, Z).
export interface Placement {
  rotationX: number
  offset: [number, number, number]
}

export function applyPlacement({ rotationX, offset }: Placement, [x, y, z]: readonly [number, number, number]): [number, number, number] {
  const cos = Math.cos(rotationX), sin = Math.sin(rotationX)
  return [x + offset[0], y * cos - z * sin + offset[1], y * sin + z * cos + offset[2]]
}

export function assemblyPlacements(params: BaseParameters, options: AssemblyOptions): Record<AssemblyPart, Placement[]> {
  // Rule 1: every part is centred on X = 0. The base and hinge repeat per column from X = 0, so
  // their X extent is symmetric about the middle column; the stand is already mirrored about X = 0.
  const columnsCentre = (params.columns - 1) * (params.cellWidth + params.wallThickness) / 2
  // Rule 2: one hinge per row. Extended, its axis (the Hinge side circle centre, at the hinge's origin)
  // sits on Cell side hinge centre 1 and its plate (local +Y) runs up along outer 1 → outer 2; otherwise
  // the axis sits on hinge centre 2 and the plate runs toward mid cut 1 (−Y). Either way its extrusion
  // direction (local Z) is perpendicular to that line.
  const { hingeCenter, hingeCenter2 } = baseEndGeometry(params)
  const centre = options.hingeExtended ? hingeCenter : hingeCenter2
  const rotationX = options.hingeExtended ? params.baseAngle * Math.PI / 180 : Math.PI
  return {
    base: [{ rotationX: 0, offset: [-columnsCentre, 0, 0] }],
    hinge: Array.from({ length: params.rows }, (_, row) => ({
      rotationX,
      offset: [-columnsCentre, centre.y - row * rowPitch(params), centre.z] as [number, number, number],
    })),
    stand: [{ rotationX: 0, offset: [0, 0, 0] }],
  }
}
