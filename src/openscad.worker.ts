import source from './models/base.scad?raw'
import { baseDefinitions } from './model'
import type { BaseParameters } from './model'

interface OpenScadInstance {
  FS: {
    writeFile(path: string, data: string): void
    readFile(path: string): Uint8Array
  }
  callMain(args: string[]): number
}

// OpenSCAD's CLI is single-use. Each build gets an isolated worker/runtime.
self.onmessage = async ({ data }: MessageEvent<{ params: BaseParameters; runtimeUrl: string }>) => {
  const messages: string[] = []
  try {
    const definitions = baseDefinitions(data.params)
    const { default: OpenSCAD } = await import(/* @vite-ignore */ data.runtimeUrl)
    const instance: OpenScadInstance = await OpenSCAD({
      noInitialRun: true,
      print: (message: string) => messages.push(message),
      printErr: (message: string) => messages.push(message),
    })
    instance.FS.writeFile('/base.scad', source)
    const code = instance.callMain([
      '/base.scad', ...definitions,
      '--export-format', 'binstl', '-o', '/base.stl',
    ])
    if (code !== 0) throw new Error(messages.join('\n') || `OpenSCAD exited with code ${code}.`)
    const stl = instance.FS.readFile('/base.stl').slice().buffer
    self.postMessage({ stl }, { transfer: [stl] })
  } catch (cause) {
    self.postMessage({ error: cause instanceof Error ? cause.message : String(cause) })
  }
}
