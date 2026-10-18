const LOG_PATH = ['logs', 'Client.txt']
const GAME_FOLDER = 'Path of Exile 2'

export function steamLibraries(vdf: string): string[] {
  return [...vdf.matchAll(/"path"\s+"([^"]+)"/g)].map(([, path]) => path.replace(/\\\\/g, '\\'))
}

export function clientLogCandidates(programFiles: string[], steamFolders: string[]): string[][] {
  return [
    ...programFiles.map((folder) => [folder, 'Grinding Gear Games', GAME_FOLDER, ...LOG_PATH]),
    ...steamFolders.map((folder) => [folder, 'steamapps', 'common', GAME_FOLDER, ...LOG_PATH]),
  ]
}

export function completeLines(buffered: string, chunk: string): { lines: string[]; rest: string } {
  const parts = (buffered + chunk).split(/\r?\n/)
  return { lines: parts.slice(0, -1), rest: parts[parts.length - 1] }
}
