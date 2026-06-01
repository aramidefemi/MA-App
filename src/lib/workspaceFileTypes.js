/** @param {string} name */
export function fileExtension(name) {
  const i = name.lastIndexOf('.')
  return i > 0 ? name.slice(i + 1).toLowerCase() : ''
}

/** Writer / research formats shown in the folder tree (not code or binaries). */
const WRITER_EXTENSIONS = new Set([
  'md', 'markdown', 'txt',
  'pdf',
  'doc', 'docx',
  'odt', 'rtf',
  'xml',
  'html', 'htm',
  'csv', 'tsv',
  'org', 'adoc', 'asciidoc',
  'epub',
])

/** Extensions opened in the markdown editor. */
const EDITABLE_EXTENSIONS = new Set(['md', 'markdown', 'txt'])

/** @param {string} name */
export function isWriterSourceFile(name) {
  return WRITER_EXTENSIONS.has(fileExtension(name))
}

/** @param {string} name */
export function isEditableInEditor(name) {
  return EDITABLE_EXTENSIONS.has(fileExtension(name))
}

/** @param {string} pathOrName */
export function isPreviewFile(pathOrName) {
  const name = pathOrName.split(/[/\\]/).pop() ?? pathOrName
  return isWriterSourceFile(name) && !isEditableInEditor(name)
}

/**
 * @param {string} name
 * @returns {'pdf' | 'docx' | 'html' | 'text' | 'unsupported' | null}
 */
export function getPreviewKind(name) {
  if (!isPreviewFile(name)) return null
  const ext = fileExtension(name)
  if (ext === 'pdf') return 'pdf'
  if (ext === 'docx') return 'docx'
  if (ext === 'html' || ext === 'htm') return 'html'
  if (['xml', 'csv', 'tsv', 'org', 'adoc', 'asciidoc', 'rtf'].includes(ext)) return 'text'
  return 'unsupported'
}

export const WRITER_FILE_EXTENSIONS = [...WRITER_EXTENSIONS]
