import './style.css'
import { BasePreview } from './preview'
import { cellSketch } from './sketch'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <aside class="sidebar" aria-label="Model parameters">
    <div class="segmented-control" role="group" aria-label="View mode">
      <button id="sketch-mode" class="active" type="button" aria-pressed="true" aria-controls="sketch-view">Sketch</button>
      <button id="model-mode" type="button" aria-pressed="false" aria-controls="model-view">3D</button>
    </div>
    <details class="sidebar-section" open>
      <summary>Parameters</summary>
      <div class="sidebar-section-content">
        <div class="transform-field">
          <label for="cell-width">Cell width (mm)</label>
          <input id="cell-width" name="cell-width" type="number" min="0.1" step="0.1" value="64" />
        </div>
        <div class="transform-field">
          <label for="cell-length">Cell length (mm)</label>
          <input id="cell-length" name="cell-length" type="number" min="0.1" step="0.1" value="24" />
        </div>
        <div class="transform-field">
          <label for="base-height">Base height (mm)</label>
          <input id="base-height" name="base-height" type="number" min="0.1" step="0.1" value="12" />
        </div>
        <div class="transform-field">
          <label for="wall-thickness">Wall thickness (mm)</label>
          <input id="wall-thickness" name="wall-thickness" type="number" min="0.1" step="0.1" value="2" />
        </div>
        <div class="transform-field">
          <label for="hinge-thickness">Hinge thickness (mm)</label>
          <input id="hinge-thickness" name="hinge-thickness" type="number" min="0.1" step="0.1" value="3" />
        </div>
        <div class="transform-field">
          <label for="hinge-width-bottom">Hinge width bottom (mm)</label>
          <input id="hinge-width-bottom" name="hinge-width-bottom" type="number" min="0.1" step="0.1" value="7" />
        </div>
        <div class="transform-field">
          <label for="hinge-tolerance">Hinge tolerance (mm)</label>
          <input id="hinge-tolerance" name="hinge-tolerance" type="number" min="0" step="0.01" value="0.1" />
        </div>
        <div class="transform-field">
          <label for="base-angle">Base angle (°)</label>
          <input id="base-angle" name="base-angle" type="number" min="0" step="0.1" value="45" max="90" />
        </div>
      </div>
    </details>
    <details class="sidebar-section" open>
      <summary>Base</summary>
      <div class="sidebar-section-content">
        <div class="transform-field">
          <label for="side-length">Side length (mm)</label>
          <input id="side-length" type="number" min="0.1" max="10000" step="0.1" value="50" aria-describedby="size-error" />
        </div>
        <p id="size-error" class="error" role="status"></p>
      </div>
    </details>
  </aside>
  <main class="viewport" aria-label="Constructor preview">
    <section id="sketch-view" class="preview-view" aria-label="2D sketch preview">
      ${cellSketch()}
    </section>
    <section id="model-view" class="preview-view" aria-label="Interactive 3D model preview" hidden>
    <div class="viewport-actions">
      <button id="fit" class="viewport-action" type="button">Fit model</button>
      <button id="redraw" class="viewport-action" type="button">Redraw</button>
    </div>
    <div class="hud"><span>Base</span><br><span id="dimensions" role="status">Building…</span></div>
    <div id="canvas-host"></div>
    <p id="preview-error" class="preview-error" role="alert" hidden></p>
    </section>
  </main>
`

const sketchView = document.querySelector<HTMLElement>('#sketch-view')!
const hoveredPoint = (target: EventTarget | null) => target instanceof Element
  ? target.closest<SVGElement>('.sketch-vertex') : null
sketchView.addEventListener('pointerover', event => {
  const point = hoveredPoint(event.target)
  if (!point) return
  const label = sketchView.querySelector<SVGTextElement>('.sketch-point-label')!
  label.setAttribute('x', point.dataset.labelX!)
  label.setAttribute('y', point.dataset.labelY!)
  label.setAttribute('text-anchor', point.dataset.labelAnchor!)
  label.style.fontSize = `${point.dataset.labelSize}px`
  label.textContent = point.dataset.pointName!
  label.removeAttribute('hidden')
  const hud = sketchView.querySelector<HTMLElement>('.sketch-point-hud')!
  const formatCoordinate = (value: string | undefined) => Number(Number(value).toFixed(6))
  hud.querySelector('.point-name')!.textContent = point.dataset.pointName!
  hud.querySelector('.point-x')!.textContent = `X = ${point.dataset.xFormula} = ${formatCoordinate(point.dataset.x)} mm`
  hud.querySelector('.point-y')!.textContent = `Y = ${point.dataset.yFormula} = ${formatCoordinate(point.dataset.y)} mm`
  hud.hidden = false
})
sketchView.addEventListener('pointerout', event => {
  const point = hoveredPoint(event.target)
  if (point && point !== hoveredPoint(event.relatedTarget)) {
    sketchView.querySelector<HTMLElement>('.sketch-point-hud')!.hidden = true
    sketchView.querySelector('.sketch-point-label')!.setAttribute('hidden', '')
  }
})
const sketchInputs = {
  cellWidth: document.querySelector<HTMLInputElement>('#cell-width')!,
  cellLength: document.querySelector<HTMLInputElement>('#cell-length')!,
  wallThickness: document.querySelector<HTMLInputElement>('#wall-thickness')!,
  hingeThickness: document.querySelector<HTMLInputElement>('#hinge-thickness')!,
  hingeWidthBottom: document.querySelector<HTMLInputElement>('#hinge-width-bottom')!,
  hingeTolerance: document.querySelector<HTMLInputElement>('#hinge-tolerance')!,
}
const updateSketch = () => {
  const fields = Object.values(sketchInputs)
  for (const field of fields) {
    field.setAttribute('aria-invalid', String(!field.validity.valid || !Number.isFinite(field.valueAsNumber)))
  }
  if (fields.some(field => !field.validity.valid || !Number.isFinite(field.valueAsNumber))) return
  sketchView.innerHTML = cellSketch({
    cellWidth: sketchInputs.cellWidth.valueAsNumber,
    cellLength: sketchInputs.cellLength.valueAsNumber,
    wallThickness: sketchInputs.wallThickness.valueAsNumber,
    hingeThickness: sketchInputs.hingeThickness.valueAsNumber,
    hingeWidthBottom: sketchInputs.hingeWidthBottom.valueAsNumber,
    hingeTolerance: sketchInputs.hingeTolerance.valueAsNumber,
  })
}
Object.values(sketchInputs).forEach(field => field.addEventListener('input', updateSketch))
const modelView = document.querySelector<HTMLElement>('#model-view')!
const sketchMode = document.querySelector<HTMLButtonElement>('#sketch-mode')!
const modelMode = document.querySelector<HTMLButtonElement>('#model-mode')!
const switchMode = (mode: 'sketch' | 'model') => {
  const isSketch = mode === 'sketch'
  sketchView.hidden = !isSketch
  modelView.hidden = isSketch
  sketchMode.classList.toggle('active', isSketch)
  modelMode.classList.toggle('active', !isSketch)
  sketchMode.setAttribute('aria-pressed', String(isSketch))
  modelMode.setAttribute('aria-pressed', String(!isSketch))
}
sketchMode.addEventListener('click', () => switchMode('sketch'))
modelMode.addEventListener('click', () => switchMode('model'))

const input = document.querySelector<HTMLInputElement>('#side-length')!
const error = document.querySelector<HTMLElement>('#size-error')!
const message = document.querySelector<HTMLElement>('#preview-error')!
const dimensions = document.querySelector<HTMLElement>('#dimensions')!
const redraw = document.querySelector<HTMLButtonElement>('#redraw')!
let worker: Worker | undefined
let timer: ReturnType<typeof setTimeout> | undefined
let buildTimeout: ReturnType<typeof setTimeout> | undefined
let generation = 0
let firstModel = true

try {
  const preview = new BasePreview(document.querySelector<HTMLDivElement>('#canvas-host')!)
  const validSide = () => {
    const valid = input.value !== '' && input.validity.valid && Number.isFinite(input.valueAsNumber)
    input.setAttribute('aria-invalid', String(!valid))
    error.textContent = valid ? '' : 'Enter a side length between 0.1 and 10,000 mm.'
    return valid ? input.valueAsNumber : null
  }
  const cancel = () => {
    generation++
    clearTimeout(timer)
    clearTimeout(buildTimeout)
    worker?.terminate()
    worker = undefined
    redraw.textContent = 'Redraw'
    redraw.removeAttribute('aria-busy')
  }
  const build = () => {
    cancel()
    const side = validSide()
    if (side === null) return
    const request = generation
    message.hidden = true
    dimensions.textContent = 'Building…'
    redraw.textContent = 'Building…'
    redraw.setAttribute('aria-busy', 'true')
    const fail = (text: string) => {
      if (request !== generation) return
      cancel()
      message.textContent = `Could not build Base. ${text}`
      message.hidden = false
      dimensions.textContent = 'Build failed'
    }
    try {
      worker = new Worker(new URL('./openscad.worker.ts', import.meta.url), { type: 'module' })
      worker.onmessage = ({ data }: MessageEvent<{ stl?: ArrayBuffer; error?: string }>) => {
        if (request !== generation) return
        if (!data.stl) { fail(data.error || 'OpenSCAD returned no mesh.'); return }
        try {
          preview.setModel(data.stl, side)
          if (firstModel) { preview.fit(); firstModel = false }
          dimensions.textContent = `${side} × ${side} × ${side} mm`
          cancel()
        } catch (cause) {
          fail(cause instanceof Error ? cause.message : String(cause))
        }
      }
      worker.onerror = (event) => { event.preventDefault(); fail(event.message || 'OpenSCAD could not start.') }
      buildTimeout = setTimeout(() => fail('Rendering timed out. Try Redraw.'), 60000)
      worker.postMessage({
        side,
        runtimeUrl: new URL(`${import.meta.env.BASE_URL}vendor/openscad/openscad.js`, document.baseURI).href,
      })
    } catch (cause) {
      fail(cause instanceof Error ? cause.message : String(cause))
    }
  }
  input.addEventListener('input', () => {
    cancel()
    message.hidden = true
    dimensions.textContent = 'Parameters changed'
    if (validSide() !== null) timer = setTimeout(build, 250)
  })
  document.querySelector('#fit')!.addEventListener('click', () => preview.fit())
  redraw.addEventListener('click', build)
  build()
  import.meta.hot?.dispose(() => { cancel(); preview.dispose() })
} catch (cause) {
  message.hidden = false
  message.textContent = 'Could not start the 3D preview. Please enable WebGL and reload the page.'
  console.error(cause)
}
