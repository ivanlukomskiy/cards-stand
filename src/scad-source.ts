// Apply `-D name=value` definitions to a model's source as top-level assignments, which is what -D does.
// Large values (such as the stand's pattern holes) overflow OpenSCAD's command line, but not its source.
// A default the source already assigns (such as part_color) is replaced in place, so OpenSCAD does not warn
// about it being overwritten.
export function withDefinitions(source: string, definitions: string[]) {
  const appended: string[] = []
  for (const definition of definitions.filter((_, index) => index % 2 === 1)) {
    const name = definition.slice(0, definition.indexOf('=')).trim()
    const assignment = new RegExp(`^${name}\\s*=.*;[ \\t]*$`, 'm')
    if (assignment.test(source)) source = source.replace(assignment, () => `${definition};`)
    else appended.push(`${definition};`)
  }
  return [source, ...appended].join('\n')
}
