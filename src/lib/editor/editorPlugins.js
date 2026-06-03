import { wikilinkIntegration } from './wikilinkIntegration.js'
import { focusIntegration } from './focusIntegration.js'
import { createTypewriterScrollPlugin } from './typewriterScroll.js'
import { driftHighlightIntegration } from './driftHighlightIntegration.js'

/** @returns {import('@milkdown/kit').MilkdownPlugin[]} */
export function getEditorPlugins() {
  return [
    wikilinkIntegration,
    focusIntegration,
    createTypewriterScrollPlugin(),
    driftHighlightIntegration,
  ]
}
