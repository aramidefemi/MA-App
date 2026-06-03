export function revealInFileManagerLabel() {
  if (typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/.test(navigator.userAgent)) {
    return 'Reveal in Finder'
  }
  if (typeof navigator !== 'undefined' && /Win/.test(navigator.userAgent)) {
    return 'Reveal in File Explorer'
  }
  return 'Reveal in File Manager'
}
