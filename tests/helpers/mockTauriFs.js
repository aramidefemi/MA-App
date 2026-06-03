/** @typedef {Record<string, string | null>} FileTree */

const files = new Map()
const dirs = new Set()

/** @param {string} p */
export function normalizeMockPath(p) {
  const normalized = p.replace(/\\/g, '/').replace(/\/+/g, '/')
  return normalized.length > 1 ? normalized.replace(/\/$/, '') : normalized
}

export function resetMockFs() {
  files.clear()
  dirs.clear()
}

/** @param {string} root @param {FileTree} tree */
export function seedWorkspace(root, tree) {
  resetMockFs()
  const rootNorm = normalizeMockPath(root)
  dirs.add(rootNorm)

  for (const [rel, content] of Object.entries(tree)) {
    const full = normalizeMockPath(`${rootNorm}/${rel}`)
    const parts = full.split('/')
    for (let i = 1; i < parts.length; i += 1) {
      dirs.add(parts.slice(0, i).join('/'))
    }
    if (content === null) dirs.add(full)
    else files.set(full, content ?? '')
  }
}

function ensureParentDirs(path) {
  const parts = normalizeMockPath(path).split('/')
  for (let i = 1; i < parts.length; i += 1) {
    dirs.add(parts.slice(0, i).join('/'))
  }
}

/** @param {string} path */
async function mockExists(path) {
  const p = normalizeMockPath(path)
  return files.has(p) || dirs.has(p)
}

/** @param {string} path */
async function mockReadTextFile(path) {
  const p = normalizeMockPath(path)
  if (!files.has(p)) throw new Error(`Not found: ${p}`)
  return files.get(p)
}

/** @param {string} path @param {string} content */
async function mockWriteTextFile(path, content) {
  const p = normalizeMockPath(path)
  ensureParentDirs(p)
  files.set(p, content)
}

/** @param {string} path @param {{ recursive?: boolean }} [_opts] */
async function mockMkdir(path, _opts) {
  dirs.add(normalizeMockPath(path))
}

/** @param {string} from @param {string} to */
async function mockRename(from, to) {
  const src = normalizeMockPath(from)
  const dest = normalizeMockPath(to)
  if (!files.has(src) && !dirs.has(src)) throw new Error(`Not found: ${src}`)
  ensureParentDirs(dest)

  if (files.has(src)) {
    files.set(dest, files.get(src))
    files.delete(src)
  } else {
    dirs.add(dest)
    dirs.delete(src)
    for (const [key, value] of [...files.entries()]) {
      if (key === src || key.startsWith(`${src}/`)) {
        const next = key === src ? dest : `${dest}${key.slice(src.length)}`
        files.delete(key)
        files.set(next, value)
      }
    }
    for (const key of [...dirs]) {
      if (key === src || key.startsWith(`${src}/`)) {
        dirs.delete(key)
        dirs.add(key === src ? dest : `${dest}${key.slice(src.length)}`)
      }
    }
  }
}

/** @param {string} path @param {{ recursive?: boolean }} [_opts] */
async function mockRemove(path, _opts) {
  const p = normalizeMockPath(path)
  files.delete(p)
  dirs.delete(p)
  for (const key of [...files.keys()]) {
    if (key.startsWith(`${p}/`)) files.delete(key)
  }
  for (const key of [...dirs]) {
    if (key.startsWith(`${p}/`)) dirs.delete(key)
  }
}

/** @param {string} path */
async function mockReadDir(path) {
  const dir = normalizeMockPath(path)
  if (!dirs.has(dir)) {
    const hasChildren = [...files.keys(), ...dirs].some((k) => k.startsWith(`${dir}/`))
    if (!hasChildren) return []
  }
  /** @type {{ name: string, isDirectory: boolean, isFile: boolean, isSymlink: boolean }[]} */
  const entries = []
  const prefix = `${dir}/`

  for (const d of dirs) {
    if (d === dir || !d.startsWith(prefix)) continue
    const rest = d.slice(prefix.length)
    if (!rest || rest.includes('/')) continue
    entries.push({ name: rest, isDirectory: true, isFile: false, isSymlink: false })
  }

  for (const filePath of files.keys()) {
    if (!filePath.startsWith(prefix)) continue
    const rest = filePath.slice(prefix.length)
    if (!rest || rest.includes('/')) continue
    entries.push({ name: rest, isDirectory: false, isFile: true, isSymlink: false })
  }

  return entries
}

/** @param {string} path */
async function mockStat(path) {
  const p = normalizeMockPath(path)
  if (dirs.has(p)) return { isDirectory: true }
  if (files.has(p)) return { isDirectory: false }
  throw new Error(`Not found: ${p}`)
}

/** @param {...string} parts */
async function mockJoin(...parts) {
  return normalizeMockPath(parts.join('/'))
}

/** @param {string} path */
async function mockDirname(path) {
  const p = normalizeMockPath(path)
  const idx = p.lastIndexOf('/')
  return idx <= 0 ? p : p.slice(0, idx)
}

/** @param {string} path */
async function mockBasename(path) {
  const p = normalizeMockPath(path)
  return p.split('/').pop() ?? p
}

export function createMockPluginFs() {
  return {
    exists: mockExists,
    readDir: mockReadDir,
    readTextFile: mockReadTextFile,
    writeTextFile: mockWriteTextFile,
    mkdir: mockMkdir,
    rename: mockRename,
    remove: mockRemove,
    stat: mockStat,
  }
}

export function createMockTauriPath() {
  return {
    join: mockJoin,
    dirname: mockDirname,
    basename: mockBasename,
  }
}

export function getMockFiles() {
  return files
}

export function getMockDirs() {
  return dirs
}
