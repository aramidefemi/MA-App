import { persistSession } from '../modules/session'
import { syncMenuItemState } from '../appMenu.js'
import { aiDrift } from '../modules/aiDrift'
import { wordGoal } from '../modules/wordGoal'
import { menuSyncState } from './menuHandlers.js'
type AppEffectsCtx = {
  document: {
    filePath: string | null
    content: string
    isPreview: boolean
  }
  workspace: {
    folderPath: string | null
    showSidebar: boolean
    showOutline: boolean
  }
  research: { showResearch: boolean }
  session: {
    ready: boolean
    scrollTop: number
    typewriterScroll: boolean
    focusMode: boolean
    setScrollTop: (n: number) => void
  }
  autosave: { cancel(): void }
  revealTargetPath: () => string | null | undefined
}

export function setupAppEffects(ctx: AppEffectsCtx) {
  const { document, workspace, research, session, autosave, revealTargetPath } = ctx

  $effect(() => {
    document.filePath
    workspace.folderPath
    workspace.showSidebar
    workspace.showOutline
    research.showResearch
    session.scrollTop
    session.typewriterScroll
    session.focusMode
    persistSession()
  })

  $effect(() => {
    void syncMenuItemState(menuSyncState({ revealTargetPath, document, workspace }))
  })

  $effect(() => {
    aiDrift.notifyFileChange(document.filePath, document.content, document.isPreview)
  })

  let lastPersistedFilePath = $state<string | null | undefined>(undefined)
  $effect(() => {
    const path = document.filePath
    if (!session.ready) return
    if (lastPersistedFilePath === undefined) {
      lastPersistedFilePath = path
      return
    }
    if (path !== lastPersistedFilePath) {
      lastPersistedFilePath = path
      session.setScrollTop(0)
      wordGoal.reset()
    }
  })

  $effect(() => {
    document.filePath
    autosave.cancel()
  })
}
