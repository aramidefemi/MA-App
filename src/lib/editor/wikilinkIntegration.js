import { expectDomTypeError } from '@milkdown/exception'
import { InputRule } from '@milkdown/prose/inputrules'
import { Plugin } from '@milkdown/prose/state'
import {
  $ctx,
  $inputRule,
  $nodeAttr,
  $nodeSchema,
  $prose,
  $remark,
} from '@milkdown/utils'
import { visit } from 'unist-util-visit'

const WIKILINK_RE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g

export const wikilinkNavigateCtx = $ctx(
  /** @type {(target: string) => void} */ (() => {}),
  'wikilinkNavigate'
)

export const wikilinkAttr = $nodeAttr('wikilink', (node) => ({
  'data-wikilink-target': node.attrs.target,
  class: 'wikilink',
}))

export const wikilinkSchema = $nodeSchema('wikilink', (ctx) => ({
  inline: true,
  group: 'inline',
  atom: true,
  selectable: true,
  attrs: {
    target: { validate: 'string' },
    label: { default: '', validate: 'string' },
  },
  parseDOM: [
    {
      tag: 'a[data-wikilink-target]',
      getAttrs: (dom) => {
        if (!(dom instanceof HTMLElement)) throw expectDomTypeError(dom)
        const target = dom.getAttribute('data-wikilink-target') ?? ''
        return {
          target,
          label: dom.textContent?.trim() || target,
        }
      },
    },
  ],
  toDOM: (node) => [
    'a',
    {
      ...ctx.get(wikilinkAttr.key)(node),
      href: '#',
      title: node.attrs.target,
    },
    node.attrs.label || node.attrs.target,
  ],
  parseMarkdown: {
    match: ({ type }) => type === 'wikiLink',
    runner: (state, node, type) => {
      const target = String(node.target ?? '')
      const label = String(node.label ?? target)
      state.addNode(type, { target, label })
    },
  },
  leafText: (node) => formatWikilink(node.attrs.target, node.attrs.label),
  toMarkdown: {
    match: (node) => node.type.name === 'wikilink',
    runner: (state, node) => {
      const { target, label } = node.attrs
      state.addNode('text', undefined, formatWikilink(target, label))
    },
  },
}))

/** @param {string} target @param {string} [label] */
export function formatWikilink(target, label) {
  const display = label && label !== target ? label : null
  return display ? `[[${target}|${display}]]` : `[[${target}]]`
}

const remarkWikilink = $remark('remarkWikilink', () => () => (tree) => {
  visit(tree, 'text', (node, index, parent) => {
    if (!parent || index == null || typeof node.value !== 'string') return
    const value = node.value
    if (!value.includes('[[')) return

    /** @type {import('unist').Node[]} */
    const next = []
    let last = 0
    WIKILINK_RE.lastIndex = 0
    let match
    while ((match = WIKILINK_RE.exec(value))) {
      if (match.index > last) {
        next.push({ type: 'text', value: value.slice(last, match.index) })
      }
      const target = match[1].trim()
      const label = (match[2] ?? target).trim()
      next.push({ type: 'wikiLink', target, label })
      last = match.index + match[0].length
    }
    if (!next.length) return
    if (last < value.length) next.push({ type: 'text', value: value.slice(last) })
    parent.children.splice(index, 1, ...next)
  })
})

export const insertWikilinkInputRule = $inputRule(
  (ctx) =>
    new InputRule(
      /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/,
      (state, match, start, end) => {
        const target = match[1].trim()
        const label = (match[2] ?? target).trim()
        return state.tr.replaceWith(
          start,
          end,
          wikilinkSchema.type(ctx).create({ target, label })
        )
      }
    )
)

export const wikilinkClickPlugin = $prose((ctx) => {
  const onNavigate = (target) => ctx.get(wikilinkNavigateCtx.key)(target)
  return new Plugin({
    props: {
      handleClick(_view, _pos, event) {
        const el = event.target instanceof Element
          ? event.target.closest('[data-wikilink-target]')
          : null
        if (!el) return false
        event.preventDefault()
        const target = el.getAttribute('data-wikilink-target')
        if (target) onNavigate(target)
        return true
      },
    },
  })
})

/** @param {import('@milkdown/ctx').Ctx} ctx @param {{ onNavigate?: (target: string) => void }} opts */
export function configureWikilink(ctx, { onNavigate } = {}) {
  if (onNavigate) ctx.set(wikilinkNavigateCtx.key, onNavigate)
}

export const wikilinkIntegration = [
  wikilinkNavigateCtx,
  wikilinkAttr,
  wikilinkSchema.node,
  wikilinkSchema.ctx,
  remarkWikilink.plugin,
  remarkWikilink.options,
  insertWikilinkInputRule,
  wikilinkClickPlugin,
]
