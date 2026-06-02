import { Menu, MenuItem, PredefinedMenuItem } from '@tauri-apps/api/menu'
import { isTauri } from './tauriEnv.js'

/** @typedef {{ id: string, label: string, disabled?: boolean, accelerator?: string }} MenuItemDef */

function revealInFileManagerLabel() {
  if (typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/.test(navigator.userAgent)) {
    return 'Reveal in Finder'
  }
  if (typeof navigator !== 'undefined' && /Win/.test(navigator.userAgent)) {
    return 'Reveal in File Explorer'
  }
  return 'Reveal in File Manager'
}

/** @typedef {{ path: string, name: string, isDir: boolean }} TreeEntry */

/**
 * @param {TreeEntry | null} entry
 * @param {boolean} canUndoDelete
 * @returns {(MenuItemDef | 'separator')[]}
 */
export function buildFileTreeMenuItems(entry, canUndoDelete) {
  if (!entry) {
    const items = [
      { id: 'new-file', label: 'New File' },
      { id: 'new-folder', label: 'New Folder' },
    ]
    if (canUndoDelete) items.push({ id: 'undo-delete', label: 'Undo Delete' })
    return items
  }

  const shared = [
    { id: 'copy-path', label: 'Copy Path' },
    ...(entry.isDir ? [] : [{ id: 'copy-file', label: 'Copy File' }]),
    'separator',
    { id: 'rename', label: 'Rename', accelerator: 'F2' },
    'separator',
    { id: 'reveal', label: revealInFileManagerLabel() },
    'separator',
    { id: 'delete', label: 'Delete', accelerator: 'CmdOrCtrl+Backspace' },
  ]

  if (entry.isDir) {
    return [
      { id: 'new-file', label: 'New File' },
      { id: 'new-folder', label: 'New Folder' },
      'separator',
      ...shared,
    ]
  }

  return [
    { id: 'open', label: 'Open' },
    { id: 'duplicate', label: 'Duplicate' },
    'separator',
    ...shared,
  ]
}

/**
 * @param {(MenuItemDef | 'separator')[]} defs
 * @param {(id: string) => void | Promise<void>} onSelect
 */
async function menuFromDefs(defs, onSelect) {
  /** @type {import('@tauri-apps/api/menu').MenuItemOrPredefined[]} */
  const items = []

  for (const def of defs) {
    if (def === 'separator') {
      items.push(await PredefinedMenuItem.new({ item: 'Separator' }))
      continue
    }
    items.push(
      await MenuItem.new({
        id: `file-tree-${def.id}`,
        text: def.label,
        enabled: !def.disabled,
        accelerator: def.accelerator,
        action: () => onSelect(def.id),
      }),
    )
  }

  return Menu.new({ items })
}

/**
 * @param {TreeEntry | null} entry
 * @param {boolean} canUndoDelete
 * @param {(id: string) => void | Promise<void>} onSelect
 */
export async function popupNativeFileTreeContextMenu(entry, canUndoDelete, onSelect) {
  if (!isTauri()) return false

  const defs = buildFileTreeMenuItems(entry, canUndoDelete)
  const menu = await menuFromDefs(defs, onSelect)
  await menu.popup()
  return true
}

/** @param {(MenuItemDef | 'separator')[]} defs */
export function defsForWebMenu(defs) {
  return defs
    .filter((d) => d !== 'separator')
    .map((d) => ({
      id: d.id,
      label: d.label,
      disabled: d.disabled,
      shortcut: d.accelerator === 'F2' ? 'F2' : d.accelerator === 'CmdOrCtrl+Backspace' ? '⌫' : undefined,
      danger: d.id === 'delete',
    }))
}
