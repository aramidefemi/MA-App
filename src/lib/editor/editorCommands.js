import { commandsCtx, editorViewCtx } from '@milkdown/core'
import { undoCommand, redoCommand } from '@milkdown/kit/plugin/history'
import { undoDepth, redoDepth } from '@milkdown/prose/history'

/** @typedef {{
 *   undo: () => void,
 *   redo: () => void,
 *   canUndo: () => boolean,
 *   canRedo: () => boolean,
 * }} EditorCommands */

/** @type {EditorCommands | null} */
let commands = null

/** @param {EditorCommands | null} next */
export function setEditorCommands(next) {
  commands = next
}

/** @returns {EditorCommands | null} */
export function getEditorCommands() {
  return commands
}

/** @param {import('@milkdown/ctx').Ctx} ctx */
export function createEditorCommands(ctx) {
  const run = (key) => {
    ctx.get(commandsCtx).call(key)
    ctx.get(editorViewCtx).focus()
  }

  return {
    undo: () => run(undoCommand.key),
    redo: () => run(redoCommand.key),
    canUndo: () => undoDepth(ctx.get(editorViewCtx).state) > 0,
    canRedo: () => redoDepth(ctx.get(editorViewCtx).state) > 0,
  }
}
