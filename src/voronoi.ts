type Point = [number, number]

// A small seeded PRNG (mulberry32), so the same seed always gives the same pattern.
function random(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Keep the part of a polygon where n · p <= c (Sutherland–Hodgman against one half-plane).
function clip(polygon: Point[], nx: number, ny: number, c: number): Point[] {
  const out: Point[] = []
  polygon.forEach((p, i) => {
    const q = polygon[(i + 1) % polygon.length]!
    const fp = nx * p[0] + ny * p[1] - c, fq = nx * q[0] + ny * q[1] - c
    if (fp <= 0) out.push(p)
    if ((fp <= 0) !== (fq <= 0)) {
      const t = fp / (fp - fq)
      out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])])
    }
  })
  return out
}

function signedArea(polygon: Point[]) {
  return polygon.reduce((sum, p, i) => {
    const q = polygon[(i + 1) % polygon.length]!
    return sum + p[0] * q[1] - q[0] * p[1]
  }, 0) / 2
}

function centroid(polygon: Point[]): Point {
  const area = signedArea(polygon)
  let x = 0, y = 0
  polygon.forEach((p, i) => {
    const q = polygon[(i + 1) % polygon.length]!
    const cross = p[0] * q[1] - q[0] * p[1]
    x += (p[0] + q[0]) * cross
    y += (p[1] + q[1]) * cross
  })
  return [x / (6 * area), y / (6 * area)]
}

// A convex polygon shrunk by `distance`: every edge moved inward.
function inset(polygon: Point[], distance: number): Point[] {
  const orientation = Math.sign(signedArea(polygon))
  let result = polygon
  polygon.forEach((p, i) => {
    const q = polygon[(i + 1) % polygon.length]!
    const length = Math.hypot(q[0] - p[0], q[1] - p[1])
    if (length < 1e-12) return
    // Outward normal of a counter-clockwise edge is (dy, -dx).
    const nx = orientation * (q[1] - p[1]) / length, ny = orientation * -(q[0] - p[0]) / length
    result = clip(result, nx, ny, nx * p[0] + ny * p[1] - distance)
  })
  return result
}

// A convex polygon grown by `radius` with round corners (its Minkowski sum with a circle), 64 segments per turn.
function rounded(polygon: Point[], radius: number): Point[] {
  // Clipping can leave repeated vertices; drop them so every edge has a direction.
  const distinct = polygon.filter((p, i) => {
    const q = polygon[(i + 1) % polygon.length]!
    return Math.hypot(q[0] - p[0], q[1] - p[1]) > 1e-9
  })
  const ccw = signedArea(distinct) > 0 ? distinct : [...distinct].reverse()
  const normal = (p: Point, q: Point) => Math.atan2(-(q[0] - p[0]), q[1] - p[1])
  return ccw.flatMap((v, i) => {
    const prev = ccw[(i + ccw.length - 1) % ccw.length]!, next = ccw[(i + 1) % ccw.length]!
    const from = normal(prev, v)
    let sweep = normal(v, next) - from
    while (sweep < 0) sweep += 2 * Math.PI
    while (sweep >= 2 * Math.PI) sweep -= 2 * Math.PI
    const segments = Math.max(1, Math.ceil(64 * sweep / (2 * Math.PI)))
    return Array.from({ length: segments + 1 }, (_, k): Point => {
      const angle = from + sweep * k / segments
      return [v[0] + radius * Math.cos(angle), v[1] + radius * Math.sin(angle)]
    })
  })
}

// The Voronoi cell of seeds[index] within the convex region, its bisectors moved toward the seed by `margin`.
function cell(region: Point[], seeds: Point[], index: number, margin: number): Point[] {
  const [sx, sy] = seeds[index]!
  let result = region
  seeds.forEach(([x, y], other) => {
    if (other === index || result.length === 0) return
    const length = Math.hypot(x - sx, y - sy)
    if (length < 1e-9) return
    const nx = (x - sx) / length, ny = (y - sy) / length
    result = clip(result, nx, ny, nx * (sx + x) / 2 + ny * (sy + y) / 2 - margin)
  })
  return result
}

export interface VoronoiOptions {
  // Target distance between neighbouring seeds.
  cellSize: number
  // Solid width left between neighbouring holes.
  ribWidth: number
  // Corner radius of the holes.
  cornerRadius: number
  seed: number
  relaxations?: number
  jitter?: number
}

// Rounded Voronoi holes filling a convex region that is symmetric about X = 0. Seeds are placed on the
// X >= 0 half and mirrored, so the pattern is symmetric too; seeds near X = 0 snap onto it.
export function voronoiHoles(region: Point[], { cellSize, ribWidth, cornerRadius, seed, relaxations = 1, jitter = 1.6 }: VoronoiOptions): Point[][] {
  const xs = region.map(p => p[0]), ys = region.map(p => p[1])
  const maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys)
  const next = random(seed)
  const rowStep = cellSize * Math.sqrt(3) / 2
  const snap = cellSize * 0.2
  // A jittered hexagonal grid over the half.
  let half: Point[] = []
  for (let row = 0; minY + rowStep * (row + 0.5) < maxY; row++) {
    for (let x = row % 2 ? cellSize / 2 : 0; x < maxX; x += cellSize) {
      const jx = x + (next() - 0.5) * jitter * cellSize
      const jy = minY + rowStep * (row + 0.5) + (next() - 0.5) * jitter * rowStep
      half.push([jx < snap ? 0 : Math.min(jx, maxX), Math.min(Math.max(jy, minY), maxY)])
    }
  }
  const mirrored = (points: Point[]) => [...points, ...points.filter(p => p[0] > 0).map(([x, y]): Point => [-x, y])]
  // Lloyd relaxation evens out the cell sizes; the mirrored set keeps the cells symmetric.
  for (let step = 0; step < relaxations; step++) {
    const seeds = mirrored(half)
    half = half.map((point, index) => {
      const polygon = cell(region, seeds, index, 0)
      if (polygon.length < 3 || Math.abs(signedArea(polygon)) < 1e-9) return point
      const [x, y] = centroid(polygon)
      return [point[0] === 0 || x < snap / 4 ? 0 : x, y]
    })
  }
  const seeds = mirrored(half)
  // Shrink each cell by half the rib plus the corner radius, then grow it back by the radius with round corners.
  const shrunk = inset(region, cornerRadius)
  return seeds.flatMap((_, index) => {
    const polygon = cell(shrunk, seeds, index, ribWidth / 2 + cornerRadius)
    if (polygon.length < 3 || Math.abs(signedArea(polygon)) < 1e-6) return []
    return [rounded(polygon, cornerRadius)]
  })
}
