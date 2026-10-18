import './style.css'
import { setupSidebarTooltips } from './sidebar-tooltips'
import { BasePreview } from './preview'
import { cellSketch } from './sketch'
import { baseEndSketch } from './base-end-sketch'
import { hingeTopSketch, hingeTravelX } from './hinge-top-sketch'
import { hingeSideSketch } from './hinge-side-sketch'
import { boltSketch } from './bolt-sketch'
import { standSideSketch, standTopSketch } from './stand-sketch'
import { defaultBaseParameters, validateBaseParameters } from './model'
import type { BaseParameters } from './model'
import type { ExportFormat, ModelName } from './openscad.worker'
import { assemblyParts, assemblyPlacements } from './assembly'
import { zip } from './zip'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <aside class="sidebar" aria-label="Model parameters">
    <div class="segmented-control" role="group" aria-label="View mode">
      <button id="assembly-mode" class="active" type="button" aria-pressed="true" aria-controls="assembly-view">Assembly</button>
      <button id="model-mode" type="button" aria-pressed="false" aria-controls="model-view">Parts</button>
      <button id="sketch-mode" type="button" aria-pressed="false" aria-controls="sketch-view">Sketches</button>
    </div>
    <details id="assembly-section" class="sidebar-section" open hidden>
      <summary>Assembly</summary>
      <div class="sidebar-section-content">
        <label class="checkbox-field"><input id="stand-extended" type="checkbox" checked /> Stand extended</label>
        <label class="checkbox-field"><input id="hinge-extended" type="checkbox" checked /> Hinge extended</label>
      </div>
    </details>
    <details id="parts-section" class="sidebar-section" open hidden>
      <summary>Parts</summary>
      <div class="sidebar-section-content">
          <div class="choice-list" role="group" aria-label="Part">
            <button id="base-model" class="active" type="button" aria-pressed="true">Base</button>
            <button id="hinge-model" type="button" aria-pressed="false">Hinge</button>
            <button id="bolt-model" type="button" aria-pressed="false">Bolt</button>
            <button id="stand-model" type="button" aria-pressed="false">Stand</button>
          </div>
      </div>
    </details>
    <details id="sketches-section" class="sidebar-section" open hidden>
      <summary>Sketches</summary>
      <div class="sidebar-section-content">
          <div class="choice-list" role="tablist" aria-label="Sketch" aria-orientation="vertical">
            <button id="cell-tab" class="active" type="button" role="tab" aria-selected="true" aria-controls="cell-sketch-panel">Cell top</button>
            <button id="base-end-tab" type="button" role="tab" aria-selected="false" aria-controls="base-end-sketch-panel" tabindex="-1">Cell side</button>
            <button id="hinge-top-tab" type="button" role="tab" aria-selected="false" aria-controls="hinge-top-sketch-panel" tabindex="-1">Hinge top</button>
            <button id="hinge-side-tab" type="button" role="tab" aria-selected="false" aria-controls="hinge-side-sketch-panel" tabindex="-1">Hinge side</button>
            <button id="bolt-tab" type="button" role="tab" aria-selected="false" aria-controls="bolt-sketch-panel" tabindex="-1">Bolt</button>
            <button id="stand-top-tab" type="button" role="tab" aria-selected="false" aria-controls="stand-top-sketch-panel" tabindex="-1">Stand top</button>
            <button id="stand-side-tab" type="button" role="tab" aria-selected="false" aria-controls="stand-side-sketch-panel" tabindex="-1">Stand side</button>
          </div>
      </div>
    </details>
    <details id="parameters-section" class="sidebar-section" open>
      <summary>Parameters</summary>
      <div class="sidebar-section-content">
        <details id="base-parameters" class="sidebar-section">
          <summary>Base</summary>
          <div class="sidebar-section-content">
            <div class="transform-field">
              <label for="cells-rows">Cells rows</label>
              <input id="cells-rows" name="cells-rows" type="number" min="1" step="1" value="5" />
            </div>
            <div class="transform-field">
              <label for="cell-columns">Cells columns</label>
              <input id="cell-columns" name="cell-columns" type="number" min="1" step="1" value="3" />
            </div>
            <div class="transform-field">
              <label for="base-tilt-angle">Base tilt angle, <em>°</em></label>
              <input id="base-tilt-angle" name="base-tilt-angle" type="number" min="0" max="179.9" step="0.1" value="30" />
            </div>
            <div class="transform-field">
              <label for="base-height">Base height, <em>mm</em></label>
              <input id="base-height" name="base-height" type="number" min="0.1" step="0.1" value="12" />
            </div>
            <div class="transform-field">
              <label for="wall-thickness">Wall thickness, <em>mm</em></label>
              <input id="wall-thickness" name="wall-thickness" type="number" min="0.1" step="0.1" value="1.6" />
            </div>
            <div class="transform-field">
              <label for="cell-width">Cell width, <em>mm</em></label>
              <input id="cell-width" name="cell-width" type="number" min="0.1" step="0.1" value="64" />
            </div>
            <div class="transform-field">
              <label for="cell-length">Cell length, <em>mm</em></label>
              <input id="cell-length" name="cell-length" type="number" min="0.1" step="0.1" value="24" />
            </div>
            <div class="transform-field">
              <label for="cell-mid-cut-width">Cell mid cut width, <em>mm</em></label>
              <input id="cell-mid-cut-width" name="cell-mid-cut-width" type="number" min="0" step="0.1" value="32" />
            </div>
            <div class="transform-field">
              <label for="rim-width">Rim width, <em>mm</em></label>
              <input id="rim-width" name="rim-width" type="number" min="0" step="0.1" value="7" />
            </div>
          </div>
        </details>
        <details id="hinge-parameters" class="sidebar-section">
          <summary>Hinge</summary>
          <div class="sidebar-section-content">
            <div class="transform-field">
              <label for="hinge-height">Hinge height, <em>mm</em></label>
              <input id="hinge-height" name="hinge-height" type="number" min="0" step="0.1" value="58" />
            </div>
            <div class="transform-field">
              <label for="hinge-top-width">Hinge top width, <em>mm</em></label>
              <input id="hinge-top-width" name="hinge-top-width" type="number" min="0" step="0.1" value="22" />
            </div>
            <div class="transform-field">
              <label for="hinge-thickness">Hinge thickness, <em>mm</em></label>
              <input id="hinge-thickness" name="hinge-thickness" type="number" min="0.1" step="0.1" value="3" />
            </div>
            <div class="transform-field">
              <label for="hinge-profile-width">Hinge profile width, <em>mm</em></label>
              <input id="hinge-profile-width" name="hinge-profile-width" type="number" min="0.1" step="0.1" value="7" />
            </div>
            <div class="transform-field">
              <label for="hinge-angle">Hinge angle, <em>°</em></label>
              <input id="hinge-angle" name="hinge-angle" type="number" min="0.1" step="0.1" value="45" max="90" />
            </div>
            <div class="transform-field">
              <label for="hinge-pin-extension">Hinge pin extension, <em>mm</em></label>
              <input id="hinge-pin-extension" name="hinge-pin-extension" type="number" min="0" step="0.1" value="2" />
            </div>
            <div class="transform-field">
              <label for="hinge-tolerance">Hinge tolerance, <em>mm</em></label>
              <input id="hinge-tolerance" data-tooltip="higher values means looser" name="hinge-tolerance" type="number" min="0" step="0.01" value="0.18" />
            </div>
          </div>
        </details>
        <details id="stand-parameters" class="sidebar-section">
          <summary>Stand</summary>
          <div class="sidebar-section-content">
            <div class="transform-field">
              <label for="stand-angle">Stand angle, <em>°</em></label>
              <input id="stand-angle" name="stand-angle" type="number" min="0.1" max="179.9" step="0.1" value="80" />
            </div>
            <div class="transform-field">
              <label for="stand-thickness">Stand thickness, <em>mm</em></label>
              <input id="stand-thickness" data-tooltip="plate and side walls" name="stand-thickness" type="number" min="0.1" step="0.1" value="2" />
            </div>
            <div class="transform-field">
              <label for="stand-profile-width-vertical">Stand profile width vertical, <em>mm</em></label>
              <input id="stand-profile-width-vertical" data-tooltip="top and bottom of the stand frame" name="stand-profile-width-vertical" type="number" min="0" step="0.1" value="10" />
            </div>
            <div class="transform-field">
              <label for="stand-profile-width-horizontal">Stand profile width horizontal, <em>mm</em></label>
              <input id="stand-profile-width-horizontal" data-tooltip="sides of the stand frame" name="stand-profile-width-horizontal" type="number" min="0" step="0.1" value="18" />
            </div>
            <div class="transform-field">
              <label for="stand-hinge-tolerance">Stand hinge tolerance, <em>mm</em></label>
              <input id="stand-hinge-tolerance" data-tooltip="higher values means looser" name="stand-hinge-tolerance" type="number" min="0" step="0.01" value="0.1" />
            </div>
            <div class="transform-field">
              <label for="stand-tolerance">Stand tolerance, <em>mm</em></label>
              <input id="stand-tolerance" data-tooltip="higher values means looser" name="stand-tolerance" type="number" min="0" step="0.01" value="0.5" />
            </div>
          </div>
        </details>
        <details id="stand-pattern-parameters" class="sidebar-section">
          <summary>Stand pattern</summary>
          <div class="sidebar-section-content">
            <div class="transform-field">
              <label for="stand-pattern-cell-size">Cell size, <em>mm</em></label>
              <input id="stand-pattern-cell-size" data-tooltip="0 for a single opening, otherwise at least 5" name="stand-pattern-cell-size" type="number" min="0" step="0.5" value="12" />
            </div>
            <div class="transform-field">
              <label for="stand-pattern-rib-width">Rib width, <em>mm</em></label>
              <input id="stand-pattern-rib-width" data-tooltip="solid between holes" name="stand-pattern-rib-width" type="number" min="0" step="0.1" value="2" />
            </div>
            <div class="transform-field">
              <label for="stand-pattern-corner-radius">Corner radius, <em>mm</em></label>
              <input id="stand-pattern-corner-radius" data-tooltip="rounding of the holes" name="stand-pattern-corner-radius" type="number" min="0" step="0.1" value="2" />
            </div>
            <div class="transform-field">
              <label for="stand-pattern-jitter">Jitter</label>
              <input id="stand-pattern-jitter" data-tooltip="higher values means more chaotic" name="stand-pattern-jitter" type="number" min="0" step="0.1" value="1.6" />
            </div>
            <div class="transform-field">
              <label for="stand-pattern-relaxations">Relaxations</label>
              <input id="stand-pattern-relaxations" data-tooltip="higher values means more regular" name="stand-pattern-relaxations" type="number" min="0" step="1" value="1" />
            </div>
            <div class="transform-field">
              <label for="stand-pattern-seed">Seed</label>
              <input id="stand-pattern-seed" data-tooltip="change for a different pattern" name="stand-pattern-seed" type="number" min="0" step="1" value="1" />
            </div>
          </div>
        </details>
        <details id="bolt-parameters" class="sidebar-section">
          <summary>Bolt</summary>
          <div class="sidebar-section-content">
            <div class="transform-field">
              <label for="bolt-length">Bolt length, <em>mm</em></label>
              <input id="bolt-length" name="bolt-length" type="number" min="0" step="0.1" value="10" />
            </div>
            <div class="transform-field">
              <label for="bolt-tolerance">Bolt tolerance, <em>mm</em></label>
              <input id="bolt-tolerance" data-tooltip="higher values means looser" name="bolt-tolerance" type="number" min="0" step="0.01" value="0.24" />
            </div>
          </div>
        </details>
        <p id="parameters-error" class="error" role="status"></p>
        <button id="reset-parameters" class="sidebar-button reset-parameters" type="button">Reset to defaults</button>
      </div>
    </details>
    <details id="export-section" class="sidebar-section" open>
      <summary>Export</summary>
      <div class="sidebar-section-content">
        <button id="export-stl" class="sidebar-button" type="button">Export STL</button>
        <button id="export-3mf" class="sidebar-button" type="button">Export 3MF</button>
        <p id="export-status" class="export-status" role="status"></p>
      </div>
    </details>
  </aside>
  <main class="viewport" aria-label="Constructor preview">
    <section id="sketch-view" class="preview-view" aria-label="2D sketch preview">
      <div id="cell-sketch-panel" class="sketch-panel" role="tabpanel" aria-labelledby="cell-tab">
        ${cellSketch(defaultBaseParameters, hingeTravelX(defaultBaseParameters))}
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
      <button id="fit" class="viewport-action" type="button">Fit model</button>
    </div>
    <div class="hud"><span id="model-name">Base</span><br><span id="dimensions" role="status">Building…</span></div>
    <div id="canvas-host"></div>
    <p id="preview-error" class="preview-error" role="alert" hidden></p>
    </section>
    <section id="assembly-view" class="preview-view" aria-label="Interactive assembly preview" hidden>
    <div class="viewport-actions">
      <button id="assembly-fit" class="viewport-action" type="button">Fit model</button>
    </div>
    <div class="hud"><span>Assembly</span><br><span id="assembly-dimensions" role="status">Building…</span></div>
    <div id="assembly-canvas-host" class="canvas-host"></div>
    <p id="assembly-error" class="preview-error" role="alert" hidden></p>
    </section>
  </main>
`

const disposeSidebarTooltips = setupSidebarTooltips()
import.meta.hot?.dispose(disposeSidebarTooltips)

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
      event.key === 'ArrowDown' || event.key === 'ArrowRight' ? (index + 1) % sketchTabs.length :
      event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? (index + last) % sketchTabs.length : null
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
  hingeAngle: document.querySelector<HTMLInputElement>('#hinge-angle')!,
  standAngle: document.querySelector<HTMLInputElement>('#stand-angle')!,
  standHingeTolerance: document.querySelector<HTMLInputElement>('#stand-hinge-tolerance')!,
  standTolerance: document.querySelector<HTMLInputElement>('#stand-tolerance')!,
  baseTiltAngle: document.querySelector<HTMLInputElement>('#base-tilt-angle')!,
  standProfileWidthVertical: document.querySelector<HTMLInputElement>('#stand-profile-width-vertical')!,
  standProfileWidthHorizontal: document.querySelector<HTMLInputElement>('#stand-profile-width-horizontal')!,
  standThickness: document.querySelector<HTMLInputElement>('#stand-thickness')!,
  standPatternCellSize: document.querySelector<HTMLInputElement>('#stand-pattern-cell-size')!,
  standPatternRibWidth: document.querySelector<HTMLInputElement>('#stand-pattern-rib-width')!,
  standPatternSeed: document.querySelector<HTMLInputElement>('#stand-pattern-seed')!,
  standPatternCornerRadius: document.querySelector<HTMLInputElement>('#stand-pattern-corner-radius')!,
  standPatternJitter: document.querySelector<HTMLInputElement>('#stand-pattern-jitter')!,
  standPatternRelaxations: document.querySelector<HTMLInputElement>('#stand-pattern-relaxations')!,
  boltTolerance: document.querySelector<HTMLInputElement>('#bolt-tolerance')!,
  boltLength: document.querySelector<HTMLInputElement>('#bolt-length')!,
  baseHeight: document.querySelector<HTMLInputElement>('#base-height')!,
  cellWidth: document.querySelector<HTMLInputElement>('#cell-width')!,
  cellMidCutWidth: document.querySelector<HTMLInputElement>('#cell-mid-cut-width')!,
  cellLength: document.querySelector<HTMLInputElement>('#cell-length')!,
  wallThickness: document.querySelector<HTMLInputElement>('#wall-thickness')!,
  hingeThickness: document.querySelector<HTMLInputElement>('#hinge-thickness')!,
  hingeProfileWidth: document.querySelector<HTMLInputElement>('#hinge-profile-width')!,
  hingePinExtension: document.querySelector<HTMLInputElement>('#hinge-pin-extension')!,
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
  cellPanel.innerHTML = cellSketch(params, hingeTravelX(params))
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
// Remember which sidebar sections are expanded.
const sectionsKey = 'cards-stand:sections'
const sidebarSections = [...document.querySelectorAll<HTMLDetailsElement>('.sidebar-section[id]')]
try {
  const stored: unknown = JSON.parse(recall(sectionsKey) ?? '{}')
  if (stored && typeof stored === 'object') {
    for (const section of sidebarSections) {
      const open = (stored as Record<string, unknown>)[section.id]
      if (typeof open === 'boolean') section.open = open
    }
  }
} catch { /* ignore unreadable stored sections */ }
for (const section of sidebarSections) {
  section.addEventListener('toggle', () => remember(sectionsKey, JSON.stringify(
    Object.fromEntries(sidebarSections.map(other => [other.id, other.open])))))
}

type ViewMode = 'sketch' | 'model' | 'assembly'
const modeViews: Record<ViewMode, { button: HTMLButtonElement; view: HTMLElement }> = {
  sketch: { button: document.querySelector<HTMLButtonElement>('#sketch-mode')!, view: sketchView },
  model: { button: document.querySelector<HTMLButtonElement>('#model-mode')!, view: document.querySelector<HTMLElement>('#model-view')! },
  assembly: { button: document.querySelector<HTMLButtonElement>('#assembly-mode')!, view: document.querySelector<HTMLElement>('#assembly-view')! },
}
// Each view has its own sidebar section, shown only with that view.
const modeSections: Record<ViewMode, HTMLElement> = {
  assembly: document.querySelector<HTMLElement>('#assembly-section')!,
  model: document.querySelector<HTMLElement>('#parts-section')!,
  sketch: document.querySelector<HTMLElement>('#sketches-section')!,
}
let currentMode: ViewMode = 'assembly'
const isAssemblyMode = () => currentMode === 'assembly'
// Set once the assembly preview exists; builds the assembly if it is out of date.
let onAssemblyShown = () => {}
const switchMode = (mode: ViewMode) => {
  remember('cards-stand:mode', mode)
  currentMode = mode
  for (const [name, { button, view }] of Object.entries(modeViews)) {
    view.hidden = name !== mode
    button.classList.toggle('active', name === mode)
    button.setAttribute('aria-pressed', String(name === mode))
  }
  for (const [name, section] of Object.entries(modeSections)) section.hidden = name !== mode
  if (mode === 'assembly') onAssemblyShown()
}
for (const [name, { button }] of Object.entries(modeViews) as [ViewMode, { button: HTMLButtonElement }][]) {
  button.addEventListener('click', () => switchMode(name))
}
const storedMode = recall('cards-stand:mode')
switchMode(storedMode !== null && storedMode in modeViews ? storedMode as ViewMode : 'assembly')

// Assembly options persist like the other sidebar state.
const assemblyKey = 'cards-stand:assembly'
const assemblyOptions = {
  standExtended: document.querySelector<HTMLInputElement>('#stand-extended')!,
  hingeExtended: document.querySelector<HTMLInputElement>('#hinge-extended')!,
}
try {
  const stored: unknown = JSON.parse(recall(assemblyKey) ?? '{}')
  if (stored && typeof stored === 'object') {
    for (const [name, field] of Object.entries(assemblyOptions)) {
      const checked = (stored as Record<string, unknown>)[name]
      if (typeof checked === 'boolean') field.checked = checked
    }
  }
} catch { /* ignore unreadable stored options */ }
const saveAssemblyOptions = () => remember(assemblyKey, JSON.stringify(Object.fromEntries(
  Object.entries(assemblyOptions).map(([name, field]) => [name, field.checked]))))

// Each part type has its own colour in the assembly.
const partColors: Record<ModelName, string> = { base: '#5b9bd5', hinge: '#73d6ac', bolt: '#e5b567', stand: '#b48ce6' }
const runtimeUrl = () => new URL(`${import.meta.env.BASE_URL}vendor/openscad/openscad.js`, document.baseURI).href
// Render one model in its own worker (binary STL unless another format is asked for); cancel() terminates it.
const renderModel = (model: ModelName, params: BaseParameters, options: { format?: ExportFormat; color?: string } = {}) => {
  const worker = new Worker(new URL('./openscad.worker.ts', import.meta.url), { type: 'module' })
  let timeout: ReturnType<typeof setTimeout> | undefined
  const cancel = () => { clearTimeout(timeout); worker.terminate() }
  const promise = new Promise<ArrayBuffer>((resolve, reject) => {
    worker.onmessage = ({ data }: MessageEvent<{ stl?: ArrayBuffer; error?: string }>) => {
      if (data.stl) resolve(data.stl)
      else reject(new Error(data.error || 'OpenSCAD returned no mesh.'))
    }
    worker.onerror = event => { event.preventDefault(); reject(new Error(event.message || 'OpenSCAD could not start.')) }
    timeout = setTimeout(() => reject(new Error('Rendering timed out. Change a parameter to try again.')), 60000)
    worker.postMessage({ model, params, runtimeUrl: runtimeUrl(), ...options })
  })
  promise.then(cancel, cancel)
  return { promise, cancel }
}
// Export one file per part type, bundled as a single ZIP download; 3MF files carry the assembly colours.
const exportButtons: Record<ExportFormat, HTMLButtonElement> = {
  stl: document.querySelector<HTMLButtonElement>('#export-stl')!,
  '3mf': document.querySelector<HTMLButtonElement>('#export-3mf')!,
}
const exportStatus = document.querySelector<HTMLElement>('#export-status')!
const exportModels: readonly ModelName[] = ['base', 'hinge', 'bolt', 'stand']
const exportParts = async (format: ExportFormat) => {
  const params = readParameters()
  if (!params) { exportStatus.textContent = 'Fix the parameters before exporting.'; return }
  const buttons = Object.values(exportButtons)
  buttons.forEach(button => { button.disabled = true })
  exportButtons[format].setAttribute('aria-busy', 'true')
  exportStatus.textContent = 'Rendering parts…'
  try {
    const files = await Promise.all(exportModels.map(model =>
      renderModel(model, params, format === '3mf' ? { format, color: partColors[model] } : {}).promise))
    const names = exportModels.map(model => `${model}.${format}`)
    const archive = zip(names.map((name, index) => ({ name, data: new Uint8Array(files[index]!) })))
    const url = URL.createObjectURL(new Blob([archive], { type: 'application/zip' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `cards-stand-parts-${format}.zip`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    exportStatus.textContent = `Exported ${names.join(', ')}.`
  } catch (cause) {
    exportStatus.textContent = `Could not export. ${cause instanceof Error ? cause.message : String(cause)}`
  } finally {
    buttons.forEach(button => { button.disabled = false })
    exportButtons[format].removeAttribute('aria-busy')
  }
}
for (const [format, button] of Object.entries(exportButtons) as [ExportFormat, HTMLButtonElement][]) {
  button.addEventListener('click', () => exportParts(format))
}
const formatSize = (size: { toArray(): number[] }) => `${size.toArray().map(value => Number(value.toFixed(3))).join(' × ')} mm`

const message = document.querySelector<HTMLElement>('#preview-error')!
const dimensions = document.querySelector<HTMLElement>('#dimensions')!
const assemblyMessage = document.querySelector<HTMLElement>('#assembly-error')!
const assemblyDimensions = document.querySelector<HTMLElement>('#assembly-dimensions')!
let job: { cancel(): void } | undefined
let timer: ReturnType<typeof setTimeout> | undefined
let generation = 0
let firstModel = true
let currentModel: ModelName = 'base'
const modelButtons: Record<ModelName, HTMLButtonElement> = {
  base: document.querySelector<HTMLButtonElement>('#base-model')!,
  hinge: document.querySelector<HTMLButtonElement>('#hinge-model')!,
  bolt: document.querySelector<HTMLButtonElement>('#bolt-model')!,
  stand: document.querySelector<HTMLButtonElement>('#stand-model')!,
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
    job?.cancel()
    job = undefined
  }
  const build = () => {
    cancel()
    const params = readParameters()
    if (!params) return
    const request = generation
    message.hidden = true
    dimensions.textContent = 'Building…'
    const fail = (text: string) => {
      if (request !== generation) return
      cancel()
      message.textContent = `Could not build ${modelButtons[currentModel].textContent}. ${text}`
      message.hidden = false
      dimensions.textContent = 'Build failed'
    }
    try {
      const render = renderModel(currentModel, params)
      job = render
      render.promise.then(stl => {
        if (request !== generation) return
        const size = preview.setModel(stl)
        if (firstModel) { preview.fit(); firstModel = false }
        dimensions.textContent = formatSize(size)
        cancel()
      }).catch(cause => fail(cause instanceof Error ? cause.message : String(cause)))
    } catch (cause) {
      fail(cause instanceof Error ? cause.message : String(cause))
    }
  }

  // The assembly builds only while visible; parameter changes elsewhere just mark it stale.
  const assemblyPreview = new BasePreview(document.querySelector<HTMLDivElement>('#assembly-canvas-host')!)
  let assemblyJobs: { cancel(): void }[] = []
  let assemblyTimer: ReturnType<typeof setTimeout> | undefined
  let assemblyGeneration = 0
  let assemblyStale = true
  let firstAssembly = true
  const cancelAssembly = () => {
    assemblyGeneration++
    clearTimeout(assemblyTimer)
    assemblyJobs.forEach(render => render.cancel())
    assemblyJobs = []
  }
  const buildAssembly = () => {
    cancelAssembly()
    const params = readParameters()
    if (!params) return
    assemblyStale = false
    const request = assemblyGeneration
    assemblyMessage.hidden = true
    assemblyDimensions.textContent = 'Building…'
    const parts = assemblyParts
    const placements = assemblyPlacements(params, {
      standExtended: assemblyOptions.standExtended.checked,
      hingeExtended: assemblyOptions.hingeExtended.checked,
    })
    try {
      const renders = parts.map(part => renderModel(part, params))
      assemblyJobs = renders
      Promise.all(renders.map(render => render.promise)).then(stls => {
        if (request !== assemblyGeneration) return
        const size = assemblyPreview.setParts(stls.map((stl, index) => ({ stl, color: partColors[parts[index]!], placements: placements[parts[index]!] })))
        if (firstAssembly) { assemblyPreview.fit(); firstAssembly = false }
        assemblyDimensions.textContent = formatSize(size)
        cancelAssembly()
      }).catch(cause => {
        if (request !== assemblyGeneration) return
        cancelAssembly()
        assemblyMessage.textContent = `Could not build the assembly. ${cause instanceof Error ? cause.message : String(cause)}`
        assemblyMessage.hidden = false
        assemblyDimensions.textContent = 'Build failed'
      })
    } catch (cause) {
      assemblyMessage.textContent = `Could not build the assembly. ${cause instanceof Error ? cause.message : String(cause)}`
      assemblyMessage.hidden = false
    }
  }
  const onAssemblyChanged = () => {
    cancelAssembly()
    assemblyStale = true
    if (isAssemblyMode()) assemblyTimer = setTimeout(buildAssembly, 250)
  }
  onAssemblyShown = () => { if (assemblyStale) buildAssembly() }
  Object.values(assemblyOptions).forEach(field => field.addEventListener('change', () => { saveAssemblyOptions(); onAssemblyChanged() }))
  Object.values(parameterInputs).forEach(field => field.addEventListener('input', onAssemblyChanged))
  document.querySelector('#assembly-fit')!.addEventListener('click', () => assemblyPreview.fit())
  if (isAssemblyMode()) buildAssembly()
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
  import.meta.hot?.dispose(() => { cancel(); cancelAssembly(); preview.dispose(); assemblyPreview.dispose() })
} catch (cause) {
  for (const element of [message, assemblyMessage]) {
    element.hidden = false
    element.textContent = 'Could not start the 3D preview. Please enable WebGL and reload the page.'
  }
  console.error(cause)
}
