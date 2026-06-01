import { commandsCtx, editorViewCtx } from '@milkdown/core'
import { findParentNode } from '@milkdown/prose'
import { TextSelection } from '@milkdown/prose/state'
import { slashFactory, SlashProvider } from '@milkdown/kit/plugin/slash'
import {
  createCodeBlockCommand,
  insertHrCommand,
  wrapInBlockquoteCommand,
  wrapInBulletListCommand,
  wrapInHeadingCommand,
  wrapInOrderedListCommand,
} from '@milkdown/kit/preset/commonmark'

export const slash = slashFactory('calm-slash')

/** @param {import('@milkdown/ctx').Ctx} ctx */
function removeSlash(ctx) {
  const view = ctx.get(editorViewCtx)
  const { from } = view.state.selection
  if (from > 0) {
    view.dispatch(view.state.tr.delete(from - 1, from))
  }
}

/** @param {import('@milkdown/prose/view').EditorView} view */
function shouldShowSlashAtLineStart(view) {
  const { selection } = view.state
  const { empty, $from } = selection
  if (!empty || !view.editable) return false
  if (!(selection instanceof TextSelection)) return false
  if (!findParentNode((node) => node.type.name === 'paragraph')(selection)) return false

  const before = $from.parent.textBetween(0, $from.parentOffset, undefined, '\uFFFC')
  return before.startsWith('/') && before.at(-1) === '/'
}

/** @param {import('@milkdown/ctx').Ctx} ctx */
export function createSlashActions(ctx) {
  const run = (key, payload) => {
    removeSlash(ctx)
    if (payload !== undefined) {
      ctx.get(commandsCtx).call(key, payload)
    } else {
      ctx.get(commandsCtx).call(key)
    }
    ctx.get(editorViewCtx).focus()
  }

  return {
    heading1: () => run(wrapInHeadingCommand.key, 1),
    heading2: () => run(wrapInHeadingCommand.key, 2),
    heading3: () => run(wrapInHeadingCommand.key, 3),
    bulletList: () => run(wrapInBulletListCommand.key),
    orderedList: () => run(wrapInOrderedListCommand.key),
    blockquote: () => run(wrapInBlockquoteCommand.key),
    codeBlock: () => run(createCodeBlockCommand.key),
    hr: () => run(insertHrCommand.key),
  }
}

/**
 * @typedef {ReturnType<typeof createSlashActions>} SlashActions
 */

/**
 * @param {import('@milkdown/ctx').Ctx} ctx
 * @param {(target: HTMLElement, props: { actions: SlashActions, hide: () => void }) => () => void} mountMenu
 */
export function applySlashMenu(ctx, mountMenu) {
  const content = document.createElement('div')
  content.className = 'slash-menu-root'
  content.dataset.show = 'false'

  const actions = createSlashActions(ctx)
  const provider = new SlashProvider({
    content,
    trigger: '/',
    debounce: 50,
    offset: 8,
    shouldShow: shouldShowSlashAtLineStart,
  })

  const hide = () => provider.hide()
  const destroyMount = mountMenu(content, { actions, hide })

  ctx.set(slash.key, {
    view: () => ({
      update: (view, prevState) => {
        provider.update(view, prevState)
      },
      destroy: () => {
        provider.destroy()
        destroyMount()
        content.remove()
      },
    }),
    props: {
      handleDOMEvents: {
        keydown: (view, event) => {
          if (event.key === 'Escape' && content.dataset.show === 'true') {
            provider.hide()
            view.focus()
            return true
          }
          return false
        },
      },
    },
  })
}
