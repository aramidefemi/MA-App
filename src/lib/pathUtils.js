/** @param {string} p */
export function normalizePath(p) {
  const normalized = p.replace(/\\/g, '/').replace(/\/+/g, '/')
  return normalized.length > 1 ? normalized.replace(/\/$/, '') : normalized
}

/** @param {string} parent @param {string} name */
export function joinPath(parent, name) {
  const separator = parent.includes('\\') && !parent.includes('/') ? '\\' : '/'
  return parent.endsWith('/') || parent.endsWith('\\')
    ? `${parent}${name}`
    : `${parent}${separator}${name}`
}

/** @param {string} rootPath @param {string} targetPath */
export function isPathInsideRoot(rootPath, targetPath) {
  const root = normalizePath(rootPath)
  const target = normalizePath(targetPath)
  return target === root || target.startsWith(`${root}/`)
}

/** @param {string} rootPath @param {string} targetPath @param {string} [label] */
export function assertInsideRoot(rootPath, targetPath, label = 'Path') {
  if (!isPathInsideRoot(rootPath, targetPath)) {
    throw new Error(`${label} is outside workspace`)
  }
}

/** @param {string} filePath */
export function parentDir(filePath) {
  const n = normalizePath(filePath)
  const i = n.lastIndexOf('/')
  return i > 0 ? n.slice(0, i) : n
}

/** @param {string} ancestor @param {string} descendant */
export function isDescendantOrSelf(ancestor, descendant) {
  const a = normalizePath(ancestor)
  const d = normalizePath(descendant)
  return d === a || d.startsWith(`${a}/`)
}

/** @param {string} path */
export function fileName(path) {
  const n = normalizePath(path)
  const i = n.lastIndexOf('/')
  return i >= 0 ? n.slice(i + 1) : n
}
