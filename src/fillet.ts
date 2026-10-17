type Point = { x: number, y: number }

// Round the corner at `corner` between segments from `from` and to `to`, tangent to both.
export function fillet(from: Point, corner: Point, to: Point, radius: number) {
  const ax = from.x - corner.x, ay = from.y - corner.y
  const bx = to.x - corner.x, by = to.y - corner.y
  const al = Math.hypot(ax, ay), bl = Math.hypot(bx, by)
  const ux = ax / al, uy = ay / al, vx = bx / bl, vy = by / bl
  const half = Math.acos(Math.max(-1, Math.min(1, ux * vx + uy * vy))) / 2
  const tangent = radius / Math.tan(half)
  const bisector = Math.hypot(ux + vx, uy + vy)
  const centreDistance = radius / Math.sin(half)
  return {
    radius,
    start: { x: corner.x + ux * tangent, y: corner.y + uy * tangent },
    end: { x: corner.x + vx * tangent, y: corner.y + vy * tangent },
    centre: { x: corner.x + (ux + vx) / bisector * centreDistance, y: corner.y + (uy + vy) / bisector * centreDistance },
    // Positive when the path turns counter-clockwise (Y up) at the corner.
    turn: Math.sign((corner.x - from.x) * (to.y - corner.y) - (corner.y - from.y) * (to.x - corner.x)),
  }
}

export type Fillet = ReturnType<typeof fillet>

// SVG path commands for a fillet in a Y-up sketch drawn with Y negated: a line to its start, then the arc.
export function filletPath(corner: Fillet) {
  // The sketch renders Y up, so a clockwise turn looks clockwise on screen, which is SVG sweep 1.
  return `L ${corner.start.x} ${-corner.start.y} A ${corner.radius} ${corner.radius} 0 0 ${corner.turn < 0 ? 1 : 0} ${corner.end.x} ${-corner.end.y}`
}

// Sample a fillet arc from its start to its end tangent point, at 64 segments per turn.
export function filletPoints(corner: Fillet): number[][] {
  const from = Math.atan2(corner.start.y - corner.centre.y, corner.start.x - corner.centre.x)
  const to = Math.atan2(corner.end.y - corner.centre.y, corner.end.x - corner.centre.x)
  // The arc bends the same way the outline turns, and is always shorter than half a turn.
  let sweep = to - from
  if (corner.turn > 0 && sweep < 0) sweep += 2 * Math.PI
  if (corner.turn < 0 && sweep > 0) sweep -= 2 * Math.PI
  const segments = Math.max(1, Math.ceil(64 * Math.abs(sweep) / (2 * Math.PI)))
  return Array.from({ length: segments + 1 }, (_, i) => {
    const angle = from + sweep * i / segments
    return [corner.centre.x + corner.radius * Math.cos(angle), corner.centre.y + corner.radius * Math.sin(angle)]
  })
}
