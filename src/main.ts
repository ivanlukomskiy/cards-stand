import './style.css'
import { BasePreview } from './preview'
import { cellSketch } from './sketch'
import { baseEndSketch } from './base-end-sketch'
import { hingeTopSketch } from './hinge-top-sketch'
import { hingeSideSketch } from './hinge-side-sketch'
import { boltSketch } from './bolt-sketch'
import { standSideSketch, standTopSketch } from './stand-sketch'
import { validateBaseParameters } from './model'
import type { BaseParameters } from './model'
import type { ModelName } from './openscad.worker'

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
          <label for="cells-rows">Cells rows</label>
          <input id="cells-rows" name="cells-rows" type="number" min="1" step="1" value="2" />
        </div>
        <div class="transform-field">
          <label for="cell-columns">Cell columns</label>
          <input id="cell-columns" name="cell-columns" type="number" min="1" step="1" value="2" />
        </div>
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
          <label for="hinge-profile-width">Hinge profile width (mm)</label>
          <input id="hinge-profile-width" name="hinge-profile-width" type="number" min="0.1" step="0.1" value="7" />
        </div>
        <div class="transform-field">
          <label for="hinge-tolerance">Hinge tolerance (mm)</label>
          <input id="hinge-tolerance" name="hinge-tolerance" type="number" min="0" step="0.01" value="0.1" />
        </div>
        <div class="transform-field">
          <label for="hinge-top-width">Hinge top width (mm)</label>
          <input id="hinge-top-width" name="hinge-top-width" type="number" min="0" step="0.1" value="22" />
        </div>
        <div class="transform-field">
          <label for="hinge-height">Hinge height (mm)</label>
          <input id="hinge-height" name="hinge-height" type="number" min="0" step="0.1" value="58" />
        </div>
        <div class="transform-field">
          <label for="rim-width">Rim width (mm)</label>
          <input id="rim-width" name="rim-width" type="number" min="0" step="0.1" value="7" />
        </div>
        <div class="transform-field">
          <label for="base-angle">Base angle (°)</label>
          <input id="base-angle" name="base-angle" type="number" min="0.1" step="0.1" value="45" max="90" />
        </div>
        <div class="transform-field">
          <label for="stand-angle">Stand angle (°)</label>
          <input id="stand-angle" name="stand-angle" type="number" min="0.1" max="179.9" step="0.1" value="80" />
        </div>
        <div class="transform-field">
          <label for="stand-hinge-tolerance">Stand hinge tolerance (mm)</label>
          <input id="stand-hinge-tolerance" name="stand-hinge-tolerance" type="number" min="0" step="0.01" value="0.1" />
        </div>
        <div class="transform-field">
          <label for="stand-tolerance">Stand tolerance (mm)</label>
          <input id="stand-tolerance" name="stand-tolerance" type="number" min="0" step="0.01" value="0.5" />
        </div>
        <div class="transform-field">
          <label for="bolt-tolerance">Bolt tolerance (mm)</label>
          <input id="bolt-tolerance" name="bolt-tolerance" type="number" min="0" step="0.01" value="0.1" />
        </div>
        <div class="transform-field">
          <label for="bolt-length">Bolt length (mm)</label>
          <input id="bolt-length" name="bolt-length" type="number" min="0" step="0.1" value="10" />
        </div>
        <p id="parameters-error" class="error" role="status"></p>
        <button id="reset-parameters" class="viewport-action reset-parameters" type="button">Reset to defaults</button>
      </div>
    </details>
  </aside>
  <main class="viewport" aria-label="Constructor preview">
    <section id="sketch-view" class="preview-view" aria-label="2D sketch preview">
      <div class="segmented-control sketch-tabs" role="tablist" aria-label="Sketch">
        <button id="cell-tab" class="active" type="button" role="tab" aria-selected="true" aria-controls="cell-sketch-panel">Cell top</button>
        <button id="base-end-tab" type="button" role="tab" aria-selected="false" aria-controls="base-end-sketch-panel" tabindex="-1">Cell side</button>
        <button id="hinge-top-tab" type="button" role="tab" aria-selected="false" aria-controls="hinge-top-sketch-panel" tabindex="-1">Hinge top</button>
        <button id="hinge-side-tab" type="button" role="tab" aria-selected="false" aria-controls="hinge-side-sketch-panel" tabindex="-1">Hinge side</button>
        <button id="bolt-tab" type="button" role="tab" aria-selected="false" aria-controls="bolt-sketch-panel" tabindex="-1">Bolt</button>
        <button id="stand-top-tab" type="button" role="tab" aria-selected="false" aria-controls="stand-top-sketch-panel" tabindex="-1">Stand top</button>
        <button id="stand-side-tab" type="button" role="tab" aria-selected="false" aria-controls="stand-side-sketch-panel" tabindex="-1">Stand side</button>
      </div>
      <div id="cell-sketch-panel" class="sketch-panel" role="tabpanel" aria-labelledby="cell-tab">
        ${cellSketch()}
      </div>
      <div id="base-end-sketch-panel" class="sketch-panel" role="tabpanel" aria-labelledby="base-end-tab" hidden>
        ${baseEndSketch()}
      </div>
      <div id="hinge-top-sketch-panel" class="sketch-panel" role="tabpanel" aria-labelledby="hinge-top-tab" hidden>
        ${hingeTopSketch()}
      </div>
      <div id="hinge-side-sketch-panel" class="sketch-panel" role="tabpanel" aria-labelledby="hinge-side-tab" hidden>
        ${hingeSideSketch()}
      </div>
      <div id="bolt-sketch-panel" class="sketch-panel" role="tabpanel" aria-labelledby="bolt-tab" hidden>
        ${boltSketch()}
      </div>
      <div id="stand-top-sketch-panel" class="sketch-panel" role="tabpanel" aria-labelledby="stand-top-tab" hidden>
        ${standTopSketch()}
      </div>
      <div id="stand-side-sketch-panel" class="sketch-panel" role="tabpanel" aria-labelledby="stand-side-tab" hidden>
        ${standSideSketch()}
      </div>
    </section>
    <section id="model-view" class="preview-view" aria-label="Interactive 3D model preview" hidden>
    <div class="viewport-actions">
      <div class="segmented-control model-tabs" role="group" aria-label="Model">
        <button id="base-model" class="active" type="button" aria-pressed="true">Base</button>
        <button id="hinge-model" type="button" aria-pressed="false">Hinge</button>
        <button id="bolt-model" type="button" aria-pressed="false">Bolt</button>
      </div>
      <button id="fit" class="viewport-action" type="button">Fit model</button>
      <button id="redraw" class="viewport-action" type="button">Redraw</button>
    </div>
    <div class="hud"><span id="model-name">Base</span><br><span id="dimensions" role="status">Building…</span></div>
    <div id="canvas-host"></div>
    <p id="preview-error" class="preview-error" role="alert" hidden></p>
    </section>
  </main>
`

const sketchView = document.querySelector<HTMLElement>('#sketch-view')!
const cellPanel = document.querySelector<HTMLElement>('#cell-sketch-panel')!
const baseEndPanel = document.querySelector<HTMLElement>('#base-end-sketch-panel')!
const hingeTopPanel = document.querySelector<HTMLElement>('#hinge-top-sketch-panel')!
const hingeSidePanel = document.querySelector<HTMLElement>('#hinge-side-sketch-panel')!
const boltPanel = document.querySelector<HTMLElement>('#bolt-sketch-panel')!
const standTopPanel = document.querySelector<HTMLElement>('#stand-top-sketch-panel')!
const standSidePanel = document.querySelector<HTMLElement>('#stand-side-sketch-panel')!
const sketchPanels = [cellPanel, baseEndPanel, hingeTopPanel, hingeSidePanel, boltPanel, standTopPanel, standSidePanel]
const sketchTabs = [
  document.querySelector<HTMLButtonElement>('#cell-tab')!,
  document.querySelector<HTMLButtonElement>('#base-end-tab')!,
  document.querySelector<HTMLButtonElement>('#hinge-top-tab')!,
  document.querySelector<HTMLButtonElement>('#hinge-side-tab')!,
  document.querySelector<HTMLButtonElement>('#bolt-tab')!,
  document.querySelector<HTMLButtonElement>('#stand-top-tab')!,
  document.querySelector<HTMLButtonElement>('#stand-side-tab')!,
]
// Remember the selected view, sketch, and model across reloads. Storage can be unavailable, so failures are ignored.
const recall = (key: string) => { try { return localStorage.getItem(key) } catch { return null } }
const remember = (key: string, value: string) => { try { localStorage.setItem(key, value) } catch { /* not persisted */ } }
const forget = (key: string) => { try { localStorage.removeItem(key) } catch { /* not persisted */ } }
const selectSketch = (index: number) => {
  remember('cards-stand:sketch', sketchTabs[index]!.id)
  sketchPanels.forEach((panel, i) => { panel.hidden = i !== index })
  sketchTabs.forEach((tab, i) => {
    tab.classList.toggle('active', i === index)
    tab.setAttribute('aria-selected', String(i === index))
    tab.tabIndex = i === index ? 0 : -1
  })
}
sketchTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectSketch(index))
  tab.addEventListener('keydown', event => {
    const last = sketchTabs.length - 1
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? last :
      event.key === 'ArrowRight' ? (index + 1) % sketchTabs.length :
      event.key === 'ArrowLeft' ? (index + last) % sketchTabs.length : null
    if (next === null) return
    event.preventDefault()
    selectSketch(next)
    sketchTabs[next]!.focus()
  })
})
selectSketch(Math.max(0, sketchTabs.findIndex(tab => tab.id === recall('cards-stand:sketch'))))
const hoveredPoint = (target: EventTarget | null) => target instanceof Element
  ? target.closest<SVGElement>('.sketch-vertex') : null
sketchView.addEventListener('pointerover', event => {
  const point = hoveredPoint(event.target)
  if (!point) return
  const panel = point.closest<HTMLElement>('.sketch-panel')!
  const label = panel.querySelector<SVGTextElement>('.sketch-point-label')!
  label.setAttribute('x', point.dataset.labelX!)
  label.setAttribute('y', point.dataset.labelY!)
  label.setAttribute('text-anchor', point.dataset.labelAnchor!)
  label.style.fontSize = `${point.dataset.labelSize}px`
  label.textContent = point.dataset.pointName!
  label.removeAttribute('hidden')
  const hud = panel.querySelector<HTMLElement>('.sketch-point-hud')!
  const formatCoordinate = (value: string | undefined) => Number(Number(value).toFixed(6))
  hud.querySelector('.point-name')!.textContent = point.dataset.pointName!
  hud.querySelector('.point-x')!.textContent = `${point.dataset.firstAxis || 'X'} = ${point.dataset.xFormula} = ${formatCoordinate(point.dataset.x)} mm`
  hud.querySelector('.point-y')!.textContent = `${point.dataset.secondAxis || 'Y'} = ${point.dataset.yFormula} = ${formatCoordinate(point.dataset.y)} mm`
  hud.hidden = false
})
sketchView.addEventListener('pointerout', event => {
  const point = hoveredPoint(event.target)
  if (point && point !== hoveredPoint(event.relatedTarget)) {
    const panel = point.closest<HTMLElement>('.sketch-panel')!
    panel.querySelector<HTMLElement>('.sketch-point-hud')!.hidden = true
    panel.querySelector('.sketch-point-label')!.setAttribute('hidden', '')
  }
})
const parameterInputs = {
  rows: document.querySelector<HTMLInputElement>('#cells-rows')!,
  columns: document.querySelector<HTMLInputElement>('#cell-columns')!,
  baseAngle: document.querySelector<HTMLInputElement>('#base-angle')!,
  standAngle: document.querySelector<HTMLInputElement>('#stand-angle')!,
  standHingeTolerance: document.querySelector<HTMLInputElement>('#stand-hinge-tolerance')!,
  standTolerance: document.querySelector<HTMLInputElement>('#stand-tolerance')!,
  boltTolerance: document.querySelector<HTMLInputElement>('#bolt-tolerance')!,
  boltLength: document.querySelector<HTMLInputElement>('#bolt-length')!,
  baseHeight: document.querySelector<HTMLInputElement>('#base-height')!,
  cellWidth: document.querySelector<HTMLInputElement>('#cell-width')!,
  cellLength: document.querySelector<HTMLInputElement>('#cell-length')!,
  wallThickness: document.querySelector<HTMLInputElement>('#wall-thickness')!,
  hingeThickness: document.querySelector<HTMLInputElement>('#hinge-thickness')!,
  hingeProfileWidth: document.querySelector<HTMLInputElement>('#hinge-profile-width')!,
  hingeTolerance: document.querySelector<HTMLInputElement>('#hinge-tolerance')!,
  hingeTopWidth: document.querySelector<HTMLInputElement>('#hinge-top-width')!,
  hingeHeight: document.querySelector<HTMLInputElement>('#hinge-height')!,
  rimWidth: document.querySelector<HTMLInputElement>('#rim-width')!,
}
const parameterError = document.querySelector<HTMLElement>('#parameters-error')!
const readParameters = (): BaseParameters | null => {
  const entries = Object.entries(parameterInputs)
  let invalid = false
  for (const [, field] of entries) {
    const valid = field.validity.valid && Number.isFinite(field.valueAsNumber)
    field.setAttribute('aria-invalid', String(!valid))
    if (!valid) invalid = true
  }
  if (invalid) {
    parameterError.textContent = 'Enter valid parameters. Rows and columns must be positive integers; angle must be greater than 0° and at most 90°.'
    return null
  }
  const params = Object.fromEntries(entries.map(([name, field]) => [name, field.valueAsNumber])) as unknown as BaseParameters
  try {
    validateBaseParameters(params)
    parameterError.textContent = ''
    return params
  } catch (cause) {
    parameterError.textContent = cause instanceof Error ? cause.message : String(cause)
    return null
  }
}
const renderSketches = (params: BaseParameters) => {
  cellPanel.innerHTML = cellSketch(params)
  baseEndPanel.innerHTML = baseEndSketch(params)
  hingeTopPanel.innerHTML = hingeTopSketch(params)
  hingeSidePanel.innerHTML = hingeSideSketch(params)
  boltPanel.innerHTML = boltSketch(params)
  standTopPanel.innerHTML = standTopSketch(params)
  standSidePanel.innerHTML = standSideSketch(params)
}
// Sidebar values persist as typed; defaults come from each input's value attribute.
const parametersKey = 'cards-stand:parameters'
const parameterFields = Object.entries(parameterInputs)
try {
  const stored: unknown = JSON.parse(recall(parametersKey) ?? '{}')
  if (stored && typeof stored === 'object') {
    for (const [name, field] of parameterFields) {
      const value = (stored as Record<string, unknown>)[name]
      if (typeof value === 'string') field.value = value
    }
  }
} catch { /* ignore unreadable stored parameters */ }
const saveParameters = () => {
  if (parameterFields.every(([, field]) => field.value === field.defaultValue)) { forget(parametersKey); return }
  remember(parametersKey, JSON.stringify(Object.fromEntries(parameterFields.map(([name, field]) => [name, field.value]))))
}
parameterFields.forEach(([, field]) => field.addEventListener('input', () => {
  saveParameters()
  const params = readParameters()
  if (params) renderSketches(params)
}))
const initialParameters = readParameters()
if (initialParameters) renderSketches(initialParameters)
document.querySelector('#reset-parameters')!.addEventListener('click', () => {
  parameterFields.forEach(([, field]) => { field.value = field.defaultValue })
  // One input event saves, redraws the sketches, and schedules a rebuild.
  parameterFields[0]![1].dispatchEvent(new Event('input'))
})
const modelView = document.querySelector<HTMLElement>('#model-view')!
const sketchMode = document.querySelector<HTMLButtonElement>('#sketch-mode')!
const modelMode = document.querySelector<HTMLButtonElement>('#model-mode')!
const switchMode = (mode: 'sketch' | 'model') => {
  remember('cards-stand:mode', mode)
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
switchMode(recall('cards-stand:mode') === 'model' ? 'model' : 'sketch')

const message = document.querySelector<HTMLElement>('#preview-error')!
const dimensions = document.querySelector<HTMLElement>('#dimensions')!
const redraw = document.querySelector<HTMLButtonElement>('#redraw')!
let worker: Worker | undefined
let timer: ReturnType<typeof setTimeout> | undefined
let buildTimeout: ReturnType<typeof setTimeout> | undefined
let generation = 0
let firstModel = true
let currentModel: ModelName = 'base'
const modelButtons: Record<ModelName, HTMLButtonElement> = {
  base: document.querySelector<HTMLButtonElement>('#base-model')!,
  hinge: document.querySelector<HTMLButtonElement>('#hinge-model')!,
  bolt: document.querySelector<HTMLButtonElement>('#bolt-model')!,
}
const modelName = document.querySelector<HTMLElement>('#model-name')!
const showModel = (name: ModelName) => {
  remember('cards-stand:model', name)
  currentModel = name
  for (const [other, button] of Object.entries(modelButtons)) {
    button.classList.toggle('active', other === name)
    button.setAttribute('aria-pressed', String(other === name))
  }
  modelName.textContent = modelButtons[name].textContent
}
const storedModel = recall('cards-stand:model')
showModel(storedModel !== null && storedModel in modelButtons ? storedModel as ModelName : 'base')

try {
  const preview = new BasePreview(document.querySelector<HTMLDivElement>('#canvas-host')!)
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
    const params = readParameters()
    if (!params) return
    const request = generation
    message.hidden = true
    dimensions.textContent = 'Building…'
    redraw.textContent = 'Building…'
    redraw.setAttribute('aria-busy', 'true')
    const fail = (text: string) => {
      if (request !== generation) return
      cancel()
      message.textContent = `Could not build ${modelButtons[currentModel].textContent}. ${text}`
      message.hidden = false
      dimensions.textContent = 'Build failed'
    }
    try {
      worker = new Worker(new URL('./openscad.worker.ts', import.meta.url), { type: 'module' })
      worker.onmessage = ({ data }: MessageEvent<{ stl?: ArrayBuffer; error?: string }>) => {
        if (request !== generation) return
        if (!data.stl) { fail(data.error || 'OpenSCAD returned no mesh.'); return }
        try {
          const size = preview.setModel(data.stl)
          if (firstModel) { preview.fit(); firstModel = false }
          dimensions.textContent = `${size.toArray().map(value => Number(value.toFixed(3))).join(' × ')} mm`
          cancel()
        } catch (cause) {
          fail(cause instanceof Error ? cause.message : String(cause))
        }
      }
      worker.onerror = (event) => { event.preventDefault(); fail(event.message || 'OpenSCAD could not start.') }
      buildTimeout = setTimeout(() => fail('Rendering timed out. Try Redraw.'), 60000)
      worker.postMessage({
        model: currentModel,
        params,
        runtimeUrl: new URL(`${import.meta.env.BASE_URL}vendor/openscad/openscad.js`, document.baseURI).href,
      })
    } catch (cause) {
      fail(cause instanceof Error ? cause.message : String(cause))
    }
  }
  const onParametersChanged = () => {
    cancel()
    message.hidden = true
    const params = readParameters()
    dimensions.textContent = params ? 'Parameters changed' : 'Invalid parameters'
    if (!params) return
    timer = setTimeout(build, 250)
  }
  Object.values(parameterInputs).forEach(field => field.addEventListener('input', onParametersChanged))
  document.querySelector('#fit')!.addEventListener('click', () => preview.fit())
  redraw.addEventListener('click', build)
  for (const [name, button] of Object.entries(modelButtons) as [ModelName, HTMLButtonElement][]) {
    button.addEventListener('click', () => {
      if (name === currentModel) return
      showModel(name)
      // Frame the newly selected model once it arrives.
      firstModel = true
      build()
    })
  }
  build()
  import.meta.hot?.dispose(() => { cancel(); preview.dispose() })
} catch (cause) {
  message.hidden = false
  message.textContent = 'Could not start the 3D preview. Please enable WebGL and reload the page.'
  console.error(cause)
}
