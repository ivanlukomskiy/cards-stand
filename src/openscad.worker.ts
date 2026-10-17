import baseSource from './models/base.scad?raw'
import hingeSource from './models/hinge.scad?raw'
import { baseDefinitions } from './model'
import type { BaseParameters } from './model'
import { hingeDefinitions } from './hinge-model'

export type ModelName = 'base' | 'hinge'

const models: Record<ModelName, { source: string; definitions: (params: BaseParameters) => string[] }> = {
  base: { source: baseSource, definitions: baseDefinitions },
  hinge: { source: hingeSource, definitions: hingeDefinitions },
}

interface OpenScadInstance {
  FS: {
    writeFile(path: string, data: string): void
    readFile(path: string): Uint8Array
  }
  callMain(args: string[]): number
}

// OpenSCAD's CLI is single-use. Each build gets an isolated worker/runtime.
self.onmessage = async ({ data }: MessageEvent<{ model: ModelName; params: BaseParameters; runtimeUrl: string }>) => {
  const messages: string[] = []
  try {
    const model = models[data.model]
    const definitions = model.definitions(data.params)
    const { default: OpenSCAD } = await import(/* @vite-ignore */ data.runtimeUrl)
    const instance: OpenScadInstance = await OpenSCAD({
      noInitialRun: true,
      print: (message: string) => messages.push(message),
      printErr: (message: string) => messages.push(message),
    })
    instance.FS.writeFile('/model.scad', model.source)
    const code = instance.callMain([
      '/model.scad', ...definitions,
      '--export-format', 'binstl', '-o', '/model.stl',
    ])
    if (code !== 0) throw new Error(messages.join('\n') || `OpenSCAD exited with code ${code}.`)
    const stl = instance.FS.readFile('/model.stl').slice().buffer
    self.postMessage({ stl }, { transfer: [stl] })
  } catch (cause) {
    self.postMessage({ error: cause instanceof Error ? cause.message : String(cause) })
  }
}
