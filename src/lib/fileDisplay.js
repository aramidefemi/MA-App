/** Strip extension for UI labels only; paths on disk stay unchanged. */
export function displayFileName(name) {
  if (!name) return name
  return name.replace(/\.[^.]+$/, '')
}
