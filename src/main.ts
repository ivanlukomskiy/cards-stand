import './style.css'
import { BasePreview } from './preview'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <aside class="sidebar" aria-label="Model parameters">
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
  <main class="viewport" aria-label="Interactive 3D model preview">
    <div class="viewport-actions">
      <button id="fit" class="viewport-action" type="button">Fit model</button>
      <button id="redraw" class="viewport-action" type="button">Redraw</button>
    </div>
    <div class="hud"><span>Base</span><br><span id="dimensions" role="status">Building…</span></div>
    <div id="canvas-host"></div>
    <p id="preview-error" class="preview-error" role="alert" hidden></p>
  </main>
`

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
