import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { STLLoader } from 'three/addons/loaders/STLLoader.js'

export interface PreviewPart {
  stl: ArrayBuffer
  color: string
  // Copies to show, each rotated about Y, then about X, then translated in OpenSCAD's Z-up axes; one untransformed copy if omitted.
  placements?: readonly { rotationY?: number; rotationX: number; offset: readonly [number, number, number] }[]
}

// OpenSCAD supplies geometry in millimeters; Three.js only displays it.
export class BasePreview {
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(45, 1, 0.01, 100000)
  private readonly renderer = new THREE.WebGLRenderer({ antialias: true })
  private readonly controls: OrbitControls
  private readonly parts = new THREE.Group()
  private readonly grid = new THREE.GridHelper(1000, 100, '#3a4050', '#2a2e39')
  private readonly observer: ResizeObserver
  private radius = 50
  private readonly center = new THREE.Vector3()
  private fittedVisibleViewport = false

  private readonly host: HTMLElement

  constructor(host: HTMLElement) {
    this.host = host
    this.scene.background = new THREE.Color('#12141a')
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.domElement.setAttribute('aria-label', 'Base preview: drag to orbit, scroll to zoom, right-drag to pan')
    this.renderer.domElement.setAttribute('tabindex', '0')
    host.append(this.renderer.domElement)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const key = new THREE.DirectionalLight(0xffffff, 2.6)
    key.position.set(125, 200, 125)
    const fill = new THREE.DirectionalLight(0xffffff, 0.6)
    fill.position.set(-100, -50, -100)
    this.scene.add(key, fill, this.grid, this.parts)
    this.observer = new ResizeObserver(() => this.resize())
    this.observer.observe(host)
    this.resize()
    this.fit()
    this.renderer.setAnimationLoop(() => {
      this.controls.update()
      this.renderer.render(this.scene, this.camera)
    })
  }

  setModel(stl: ArrayBuffer) {
    return this.setParts([{ stl, color: '#5b9bd5' }])
  }

  // Replace the displayed meshes; returns the combined size in OpenSCAD's Z-up axes.
  setParts(parts: readonly PreviewPart[]) {
    const bounds = new THREE.Box3()
    const meshes = parts.flatMap(({ stl, color, placements }) => {
      const source = new STLLoader().parse(stl)
      const copies = (placements ?? [{ rotationX: 0, offset: [0, 0, 0] as const }]).map(({ rotationY = 0, rotationX, offset }) => {
        const geometry = source.clone()
        geometry.rotateY(rotationY)
        geometry.rotateX(rotationX)
        geometry.translate(...offset)
        return geometry
      })
      source.dispose()
      return copies.map(geometry => this.createMesh(geometry, color, bounds))
    })
    this.clearParts()
    this.parts.add(...meshes)
    const size = bounds.getSize(new THREE.Vector3())
    const sphere = new THREE.Box3().setFromObject(this.parts).getBoundingSphere(new THREE.Sphere())
    this.center.copy(sphere.center)
    this.radius = Math.max(sphere.radius, 0.01)
    const side = this.radius * 2
    // Keep the camera still so parameter changes remain visible.
    const step = 10 ** Math.floor(Math.log10(side / 5))
    this.grid.scale.setScalar(step / 10)
    this.camera.near = Math.max(side / 10000, 0.001)
    this.camera.far = Math.max(side * 1000, 100000)
    this.camera.updateProjectionMatrix()
    this.controls.minDistance = side * 0.03
    this.controls.maxDistance = Math.max(side * 40, 100000)
    return size
  }

  // Build a coloured mesh with edges from Z-up geometry, adding its extent to `bounds`.
  private createMesh(geometry: THREE.BufferGeometry, color: string, bounds: THREE.Box3) {
    geometry.computeBoundingBox()
    bounds.union(geometry.boundingBox!)
    // OpenSCAD uses Z-up; this viewport uses Y-up.
    geometry.rotateX(-Math.PI / 2)
    geometry.computeVertexNormals()
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: 0.65 }))
    const edgeColor = new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.45)
    mesh.add(new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry),
      new THREE.LineBasicMaterial({ color: edgeColor, transparent: true, opacity: 0.55 }),
    ))
    return mesh
  }

  fit() {
    const center = this.center
    const vertical = THREE.MathUtils.degToRad(this.camera.fov / 2)
    const horizontal = Math.atan(Math.tan(vertical) * this.camera.aspect)
    const distance = this.radius / Math.sin(Math.min(vertical, horizontal)) * 1.2
    this.controls.target.copy(center)
    this.camera.position.copy(center).addScaledVector(new THREE.Vector3(0.875, 0.7, 1).normalize(), distance)
    this.controls.update()
  }

  private resize() {
    const width = Math.max(this.host.clientWidth, 1)
    const height = Math.max(this.host.clientHeight, 1)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
    if (!this.fittedVisibleViewport && this.host.clientWidth > 0 && this.host.clientHeight > 0) {
      this.fit()
      this.fittedVisibleViewport = true
    }
  }

  private clearParts() {
    this.parts.traverse(object => {
      if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
        object.geometry.dispose()
        object.material.dispose()
      }
    })
    this.parts.clear()
  }

  dispose() {
    this.observer.disconnect()
    this.renderer.setAnimationLoop(null)
    this.controls.dispose()
    this.clearParts()
    this.grid.geometry.dispose()
    const materials = Array.isArray(this.grid.material) ? this.grid.material : [this.grid.material]
    materials.forEach(material => material.dispose())
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
