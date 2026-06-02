import { editorViewCtx } from '@milkdown/core'
import { createEditorCommands, setEditorCommands } from './editorCommands.js'
import { createFormatActions, getFormatActiveState } from './formatState.js'
import { pushFormatState, setFormatActions } from './formatEditorApi.js'

/** @param {import('@milkdown/core').Editor} editor */
export function wireCrepeApis(editor) {
  editor.action((ctx) => {
    setFormatActions(createFormatActions(ctx))
    setEditorCommands(createEditorCommands(ctx))
    pushFormatState(getFormatActiveState(ctx))

    const view = ctx.get(editorViewCtx)
    const sync = () => pushFormatState(getFormatActiveState(ctx))
    const origDispatch = view.dispatch.bind(view)
    view.dispatch = (tr) => {
      origDispatch(tr)
      if (tr.selectionSet || tr.docChanged) sync()
    }
  })
}

/** @param {import('@milkdown/core').Editor} editor */
export function clearCrepeApis(editor) {
  editor.action(() => {
    setFormatActions(null)
    setEditorCommands(null)
  })
}
