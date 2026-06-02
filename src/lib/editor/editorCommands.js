import { commandsCtx, editorViewCtx } from '@milkdown/core'
import { undoCommand, redoCommand } from '@milkdown/kit/plugin/history'
import { undoDepth, redoDepth } from '@milkdown/prose/history'
import { findNextInView, findPreviousInView } from './findInEditor.js'
import { cycleDriftIssueInView } from './driftNavigation.js'

/** @typedef {{
 *   undo: () => void,
 *   redo: () => void,
 *   canUndo: () => boolean,
 *   canRedo: () => boolean,
 *   findNext: (query: string) => boolean,
 *   findPrevious: (query: string) => boolean,
 *   nextDriftIssue: () => boolean,
 *   prevDriftIssue: () => boolean,
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
  const view = () => ctx.get(editorViewCtx)

  const run = (key) => {
    ctx.get(commandsCtx).call(key)
    view().focus()
  }

  return {
    undo: () => run(undoCommand.key),
    redo: () => run(redoCommand.key),
    canUndo: () => undoDepth(view().state) > 0,
    canRedo: () => redoDepth(view().state) > 0,
    findNext: (query) => findNextInView(view(), query),
    findPrevious: (query) => findPreviousInView(view(), query),
    nextDriftIssue: () => cycleDriftIssueInView(view()),
    prevDriftIssue: () => cycleDriftIssueInView(view(), { backward: true }),
  }
}
