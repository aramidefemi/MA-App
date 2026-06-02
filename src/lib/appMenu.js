import { Menu, MenuItem, PredefinedMenuItem, Submenu } from '@tauri-apps/api/menu'
import { app } from './app.js'
import { MAX_ENTRIES } from './recentProjects.js'

/** @typedef {import('./recentProjects.js').RecentProject} RecentProject */

/** @typedef {{
 *   newFile: () => void | Promise<void>,
 *   newWindow: () => void | Promise<void>,
 *   openFile: () => void | Promise<void>,
 *   openFolder: () => void | Promise<void>,
 *   openRecent: (project: RecentProject) => void | Promise<void>,
 *   revealInFileManager: () => void | Promise<void>,
 *   duplicateFile: () => void | Promise<void>,
 *   newFileInFolder: () => void | Promise<void>,
 *   closeFolder: () => void | Promise<void>,
 *   saveFile: () => void | Promise<void>,
 *   saveAs: () => void | Promise<void>,
 *   exportDocx: () => void | Promise<void>,
 *   exportPdf: () => void | Promise<void>,
 *   print: () => void | Promise<void>,
 *   closeTab: () => void | Promise<void>,
 *   closeAll: () => void | Promise<void>,
 *   toggleSidebar: () => void,
 *   toggleOutline: () => void,
 *   toggleFocusMode: () => void,
 *   toggleTypewriterScroll: () => void,
 *   toggleTheme: () => void,
 *   toggleSettings: () => void,
 *   openFind: () => void,
 *   undo?: () => void,
 *   redo?: () => void,
 * }} AppMenuHandlers */

/** @typedef {{
 *   canReveal: boolean,
 *   canDuplicate: boolean,
 *   canNewFileInFolder: boolean,
 *   canCloseFolder: boolean,
 * }} MenuItemState */

function revealInFileManagerLabel() {
  if (typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/.test(navigator.userAgent)) {
    return 'Reveal in Finder'
  }
  if (typeof navigator !== 'undefined' && /Win/.test(navigator.userAgent)) {
    return 'Reveal in File Explorer'
  }
  return 'Reveal in File Manager'
}

/** @type {import('@tauri-apps/api/menu').MenuItem | null} */
let revealItem = null
/** @type {import('@tauri-apps/api/menu').MenuItem | null} */
let duplicateItem = null
/** @type {import('@tauri-apps/api/menu').MenuItem | null} */
let newFileInFolderItem = null
/** @type {import('@tauri-apps/api/menu').MenuItem | null} */
let closeFolderItem = null
/** @type {import('@tauri-apps/api/menu').MenuItem[]} */
const recentSlotItems = []
/** @type {RecentProject[]} */
let recentSlotData = []

/**
 * @param {RecentProject[]} projects
 */
export async function refreshRecentMenu(projects) {
  recentSlotData = projects.slice(0, MAX_ENTRIES)
  await Promise.all(
    recentSlotItems.map(async (item, i) => {
      const project = recentSlotData[i]
      if (project) {
        await item.setText(project.name)
        await item.setEnabled(true)
      } else {
        await item.setText(' ')
        await item.setEnabled(false)
      }
    }),
  )
}

/**
 * @param {MenuItemState} state
 */
export async function syncMenuItemState(state) {
  const tasks = []
  if (revealItem) tasks.push(revealItem.setEnabled(state.canReveal))
  if (duplicateItem) tasks.push(duplicateItem.setEnabled(state.canDuplicate))
  if (newFileInFolderItem) tasks.push(newFileInFolderItem.setEnabled(state.canNewFileInFolder))
  if (closeFolderItem) tasks.push(closeFolderItem.setEnabled(state.canCloseFolder))
  await Promise.all(tasks)
}

/**
 * @param {AppMenuHandlers} handlers
 */
export async function setupAppMenu(handlers) {
  recentSlotItems.length = 0

  const recentItems = await Promise.all(
    Array.from({ length: MAX_ENTRIES }, async (_, i) => {
      const item = await MenuItem.new({
        id: `file-recent-${i}`,
        text: ' ',
        enabled: false,
        action: () => {
          const project = recentSlotData[i]
          if (project) handlers.openRecent(project)
        },
      })
      recentSlotItems.push(item)
      return item
    }),
  )

  revealItem = await MenuItem.new({
    id: 'file-reveal',
    text: revealInFileManagerLabel(),
    enabled: false,
    action: () => handlers.revealInFileManager(),
  })

  duplicateItem = await MenuItem.new({
    id: 'file-duplicate',
    text: 'Duplicate',
    enabled: false,
    action: () => handlers.duplicateFile(),
  })

  newFileInFolderItem = await MenuItem.new({
    id: 'file-new-in-folder',
    text: 'New File in Folder',
    enabled: false,
    action: () => handlers.newFileInFolder(),
  })

  closeFolderItem = await MenuItem.new({
    id: 'file-close-folder',
    text: 'Close Folder',
    enabled: false,
    action: () => handlers.closeFolder(),
  })

  const appSubmenu = await Submenu.new({
    text: app.displayName ?? app.name,
    items: [
      await PredefinedMenuItem.new({
        item: { About: { name: app.displayName ?? app.name } },
      }),
      await MenuItem.new({
        id: 'app-settings',
        text: 'Settings…',
        accelerator: 'CmdOrCtrl+,',
        action: () => handlers.toggleSettings(),
      }),
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await PredefinedMenuItem.new({ item: 'Hide' }),
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await PredefinedMenuItem.new({
        item: 'Quit',
        accelerator: 'CmdOrCtrl+Q',
      }),
    ],
  })

  const fileSubmenu = await Submenu.new({
    text: 'File',
    items: [
      await MenuItem.new({
        id: 'file-new',
        text: 'New',
        accelerator: 'CmdOrCtrl+N',
        action: () => handlers.newFile(),
      }),
      await MenuItem.new({
        id: 'file-new-window',
        text: 'New window',
        action: () => handlers.newWindow(),
      }),
      await MenuItem.new({
        id: 'file-open',
        text: 'Open File',
        accelerator: 'CmdOrCtrl+O',
        action: () => handlers.openFile(),
      }),
      await MenuItem.new({
        id: 'file-open-folder',
        text: 'Open Folder',
        accelerator: 'CmdOrCtrl+Shift+O',
        action: () => handlers.openFolder(),
      }),
      await Submenu.new({
        text: 'Open Recent',
        items: recentItems,
      }),
      await PredefinedMenuItem.new({ item: 'Separator' }),
      revealItem,
      duplicateItem,
      newFileInFolderItem,
      closeFolderItem,
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await MenuItem.new({
        id: 'file-save',
        text: 'Save',
        accelerator: 'CmdOrCtrl+S',
        action: () => handlers.saveFile(),
      }),
      await MenuItem.new({
        id: 'file-save-as',
        text: 'Save as',
        action: () => handlers.saveAs(),
      }),
      await Submenu.new({
        text: 'Export',
        items: [
          await MenuItem.new({
            id: 'file-export-docx',
            text: 'Word (.docx)',
            action: () => handlers.exportDocx(),
          }),
          await MenuItem.new({
            id: 'file-export-pdf',
            text: 'PDF (.pdf)',
            action: () => handlers.exportPdf(),
          }),
        ],
      }),
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await MenuItem.new({
        id: 'file-print',
        text: 'Print',
        accelerator: 'CmdOrCtrl+P',
        action: () => handlers.print(),
      }),
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await MenuItem.new({
        id: 'file-close-tab',
        text: 'Close Tab',
        accelerator: 'CmdOrCtrl+W',
        action: () => handlers.closeTab(),
      }),
      await PredefinedMenuItem.new({
        text: 'Close Window',
        item: 'CloseWindow',
      }),
      await MenuItem.new({
        id: 'file-close-all',
        text: 'Close All',
        accelerator: 'CmdOrCtrl+Alt+W',
        action: () => handlers.closeAll(),
      }),
    ],
  })

  const editSubmenu = await Submenu.new({
    text: 'Edit',
    items: [
      await MenuItem.new({
        id: 'edit-undo',
        text: 'Undo',
        accelerator: 'CmdOrCtrl+Z',
        action: () => handlers.undo?.(),
      }),
      await MenuItem.new({
        id: 'edit-redo',
        text: 'Redo',
        accelerator: 'CmdOrCtrl+Shift+Z',
        action: () => handlers.redo?.(),
      }),
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await PredefinedMenuItem.new({ item: 'Cut', accelerator: 'CmdOrCtrl+X' }),
      await PredefinedMenuItem.new({ item: 'Copy', accelerator: 'CmdOrCtrl+C' }),
      await PredefinedMenuItem.new({ item: 'Paste', accelerator: 'CmdOrCtrl+V' }),
      await PredefinedMenuItem.new({
        item: 'SelectAll',
        accelerator: 'CmdOrCtrl+A',
      }),
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await MenuItem.new({
        id: 'edit-find',
        text: 'Find…',
        accelerator: 'CmdOrCtrl+F',
        action: () => handlers.openFind(),
      }),
    ],
  })

  const viewSubmenu = await Submenu.new({
    text: 'View',
    items: [
      await MenuItem.new({
        id: 'view-toggle-sidebar',
        text: 'Toggle Sidebar',
        accelerator: 'CmdOrCtrl+Shift+B',
        action: () => handlers.toggleSidebar(),
      }),
      await MenuItem.new({
        id: 'view-toggle-outline',
        text: 'Toggle Outline',
        accelerator: 'CmdOrCtrl+\\',
        action: () => handlers.toggleOutline(),
      }),
      await MenuItem.new({
        id: 'view-focus-mode',
        text: 'Focus Mode',
        accelerator: 'CmdOrCtrl+Shift+F',
        action: () => handlers.toggleFocusMode(),
      }),
      await MenuItem.new({
        id: 'view-typewriter-scroll',
        text: 'Typewriter Scrolling',
        accelerator: 'CmdOrCtrl+Shift+T',
        action: () => handlers.toggleTypewriterScroll(),
      }),
      await MenuItem.new({
        id: 'view-toggle-theme',
        text: 'Toggle Theme',
        accelerator: 'CmdOrCtrl+Shift+L',
        action: () => handlers.toggleTheme(),
      }),
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await PredefinedMenuItem.new({ item: 'Fullscreen' }),
    ],
  })

  const windowSubmenu = await Submenu.new({
    text: 'Window',
    items: [
      await PredefinedMenuItem.new({
        item: 'Minimize',
        accelerator: 'CmdOrCtrl+M',
      }),
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await PredefinedMenuItem.new({ item: 'BringAllToFront' }),
    ],
  })

  const menu = await Menu.new({
    items: [appSubmenu, fileSubmenu, editSubmenu, viewSubmenu, windowSubmenu],
  })

  await menu.setAsAppMenu()
}
