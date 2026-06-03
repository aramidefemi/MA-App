import { createEditorCommands, setEditorCommands } from './editorCommands.js'

/** @param {import('@milkdown/core').Editor} editor */
export function wireCrepeApis(editor) {
  editor.action((ctx) => {
    setEditorCommands(createEditorCommands(ctx))
  })
}

/** @param {import('@milkdown/core').Editor} editor */
export function clearCrepeApis(editor) {
  editor.action(() => {
    setEditorCommands(null)
  })
}
