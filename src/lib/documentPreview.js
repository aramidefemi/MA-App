import { convertFileSrc } from '@tauri-apps/api/core'
import { readFile, readTextFile } from '@tauri-apps/plugin-fs'
import mammoth from 'mammoth'
import { getPreviewKind } from './workspaceFileTypes.js'

/** @param {Uint8Array} bytes */
function toArrayBuffer(bytes) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}

/**
 * @param {string} path
 * @returns {Promise<
 *   | { status: 'ok', kind: 'pdf', url: string }
 *   | { status: 'ok', kind: 'html', html: string }
 *   | { status: 'ok', kind: 'text', text: string }
 *   | { status: 'unsupported', message: string }
 *   | { status: 'error', message: string }
 * >}
 */
export async function loadDocumentPreview(path) {
  const name = path.split(/[/\\]/).pop() ?? path
  const previewKind = getPreviewKind(name)

  if (!previewKind) {
    return { status: 'error', message: 'This file cannot be previewed.' }
  }

  if (previewKind === 'unsupported') {
    const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : ''
    return {
      status: 'unsupported',
      message: ext === '.doc'
        ? 'Legacy Word (.doc) files cannot be previewed here. Save as .docx to view in Ma.'
        : `Preview is not available for ${ext || 'this file type'} yet. You can open it in another app.`,
    }
  }

  try {
    if (previewKind === 'pdf') {
      return { status: 'ok', kind: 'pdf', url: convertFileSrc(path) }
    }

    if (previewKind === 'docx') {
      const bytes = await readFile(path)
      const { value } = await mammoth.convertToHtml({ arrayBuffer: toArrayBuffer(bytes) })
      return { status: 'ok', kind: 'html', html: value }
    }

    if (previewKind === 'html') {
      const text = await readTextFile(path)
      return { status: 'ok', kind: 'html', html: text }
    }

    const text = await readTextFile(path)
    return { status: 'ok', kind: 'text', text }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Could not load file for preview.'
    return { status: 'error', message }
  }
}

/** @param {{ url?: string } | null | undefined} payload */
export function revokePreviewPayload(payload) {
  if (payload?.url?.startsWith('blob:')) URL.revokeObjectURL(payload.url)
}
