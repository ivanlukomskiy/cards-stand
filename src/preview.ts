import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { STLLoader } from 'three/addons/loaders/STLLoader.js'

// OpenSCAD supplies geometry in millimeters; Three.js only displays it.
export class BasePreview {
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(45, 1, 0.01, 100000)
  private readonly renderer = new THREE.WebGLRenderer({ antialias: true })
  private readonly controls: OrbitControls
  private readonly base = new THREE.Mesh(
    new THREE.BufferGeometry(),
    new THREE.MeshStandardMaterial({ color: '#5b9bd5', roughness: 0.65 }),
  )
  private readonly edges = new THREE.LineSegments(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({ color: '#a1c8e8', transparent: true, opacity: 0.55 }),
  )
  private readonly grid = new THREE.GridHelper(1000, 100, '#3a4050', '#2a2e39')
  private readonly observer: ResizeObserver
  private side = 50
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
    this.scene.add(key, fill, this.grid, this.base)
    this.base.add(this.edges)
    this.base.visible = false
    this.observer = new ResizeObserver(() => this.resize())
    this.observer.observe(host)
    this.resize()
    this.fit()
    this.renderer.setAnimationLoop(() => {
      this.controls.update()
      this.renderer.render(this.scene, this.camera)
    })
  }

  setModel(stl: ArrayBuffer, side: number) {
    const geometry = new STLLoader().parse(stl)
    // OpenSCAD uses Z-up; this viewport uses Y-up.
    geometry.rotateX(-Math.PI / 2)
    geometry.computeVertexNormals()
    const edges = new THREE.EdgesGeometry(geometry)
    this.base.geometry.dispose()
    this.edges.geometry.dispose()
    this.base.geometry = geometry
    this.edges.geometry = edges
    this.base.visible = true
    this.side = side
    // Keep the camera still so a size edit visibly changes the base.
    const step = 10 ** Math.floor(Math.log10(side / 5))
    this.grid.scale.setScalar(step / 10)
    this.camera.near = Math.max(side / 10000, 0.001)
    this.camera.far = Math.max(side * 1000, 100000)
    this.camera.updateProjectionMatrix()
    this.controls.minDistance = side * 0.03
    this.controls.maxDistance = Math.max(side * 40, 100000)
  }

  fit() {
    const center = new THREE.Vector3(0, this.side / 2, 0)
    const vertical = THREE.MathUtils.degToRad(this.camera.fov / 2)
    const horizontal = Math.atan(Math.tan(vertical) * this.camera.aspect)
    const distance = this.side * Math.sqrt(3) / 2 / Math.sin(Math.min(vertical, horizontal)) * 1.2
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

  dispose() {
    this.observer.disconnect()
    this.renderer.setAnimationLoop(null)
    this.controls.dispose()
    this.base.geometry.dispose()
    this.base.material.dispose()
    this.edges.geometry.dispose()
    this.edges.material.dispose()
    this.grid.geometry.dispose()
    const materials = Array.isArray(this.grid.material) ? this.grid.material : [this.grid.material]
    materials.forEach(material => material.dispose())
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
