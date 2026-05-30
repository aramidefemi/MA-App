import { Menu, MenuItem, PredefinedMenuItem, Submenu } from '@tauri-apps/api/menu'
import { app } from './app.js'

/** @typedef {{
 *   newFile: () => void | Promise<void>,
 *   newWindow: () => void | Promise<void>,
 *   openFile: () => void | Promise<void>,
 *   saveFile: () => void | Promise<void>,
 *   saveAs: () => void | Promise<void>,
 *   exportDocx: () => void | Promise<void>,
 *   exportPdf: () => void | Promise<void>,
 *   print: () => void | Promise<void>,
 *   closeTab: () => void | Promise<void>,
 *   closeAll: () => void | Promise<void>,
 * }} FileMenuHandlers */

/**
 * @param {FileMenuHandlers} handlers
 */
export async function setupAppMenu(handlers) {
  const appSubmenu = await Submenu.new({
    text: app.displayName ?? app.name,
    items: [
      await PredefinedMenuItem.new({
        item: { About: { name: app.displayName ?? app.name } },
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
        text: 'Open',
        accelerator: 'CmdOrCtrl+O',
        action: () => handlers.openFile(),
      }),
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
      await PredefinedMenuItem.new({ item: 'Undo', accelerator: 'CmdOrCtrl+Z' }),
      await PredefinedMenuItem.new({
        item: 'Redo',
        accelerator: 'CmdOrCtrl+Shift+Z',
      }),
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await PredefinedMenuItem.new({ item: 'Cut', accelerator: 'CmdOrCtrl+X' }),
      await PredefinedMenuItem.new({ item: 'Copy', accelerator: 'CmdOrCtrl+C' }),
      await PredefinedMenuItem.new({ item: 'Paste', accelerator: 'CmdOrCtrl+V' }),
      await PredefinedMenuItem.new({
        item: 'SelectAll',
        accelerator: 'CmdOrCtrl+A',
      }),
    ],
  })

  const viewSubmenu = await Submenu.new({
    text: 'View',
    items: [await PredefinedMenuItem.new({ item: 'Fullscreen' })],
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
