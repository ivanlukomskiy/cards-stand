import baseSource from './models/base.scad?raw'
import hingeSource from './models/hinge.scad?raw'
import boltSource from './models/bolt.scad?raw'
import standSource from './models/stand.scad?raw'
import { baseDefinitions } from './model'
import type { BaseParameters } from './model'
import { hingeDefinitions } from './hinge-model'
import { boltDefinitions } from './bolt-model'
import { standDefinitions } from './stand-model'

export type ModelName = 'base' | 'hinge' | 'bolt' | 'stand'
export type ExportFormat = 'stl' | '3mf'

const models: Record<ModelName, { source: string; definitions: (params: BaseParameters) => string[] }> = {
  base: { source: baseSource, definitions: baseDefinitions },
  hinge: { source: hingeSource, definitions: hingeDefinitions },
  bolt: { source: boltSource, definitions: boltDefinitions },
  stand: { source: standSource, definitions: standDefinitions },
}

interface OpenScadInstance {
  FS: {
    writeFile(path: string, data: string): void
    readFile(path: string): Uint8Array
  }
  callMain(args: string[]): number
}

// OpenSCAD's CLI is single-use. Each build gets an isolated worker/runtime.
// `color` (a CSS hex colour) is applied through each model's part_color; it is only kept by formats with colour, such as 3MF.
self.onmessage = async ({ data }: MessageEvent<{ model: ModelName; params: BaseParameters; runtimeUrl: string; format?: ExportFormat; color?: string }>) => {
  const messages: string[] = []
  try {
    const model = models[data.model]
    const format = data.format ?? 'stl'
    const definitions = [...model.definitions(data.params), ...(data.color ? ['-D', `part_color=${JSON.stringify(data.color)}`] : [])]
    const { default: OpenSCAD } = await import(/* @vite-ignore */ data.runtimeUrl)
    const instance: OpenScadInstance = await OpenSCAD({
      noInitialRun: true,
      print: (message: string) => messages.push(message),
      printErr: (message: string) => messages.push(message),
    })
    instance.FS.writeFile('/model.scad', model.source)
    const code = instance.callMain([
      '/model.scad', ...definitions,
      '--export-format', format === 'stl' ? 'binstl' : '3mf', '-o', `/model.${format}`,
    ])
    if (code !== 0) throw new Error(messages.join('\n') || `OpenSCAD exited with code ${code}.`)
    const stl = instance.FS.readFile(`/model.${format}`).slice().buffer
    self.postMessage({ stl }, { transfer: [stl] })
  } catch (cause) {
    self.postMessage({ error: cause instanceof Error ? cause.message : String(cause) })
  }
}
