import { save } from '@tauri-apps/plugin-dialog'
import { writeFile } from '@tauri-apps/plugin-fs'
import { displayFileName } from './fileDisplay.js'

const PRINT_STYLES = `
  body {
    margin: 0;
    padding: 48px 56px;
    font-family: Georgia, Cambria, 'Times New Roman', serif;
    font-size: 12pt;
    line-height: 1.75;
    color: #111;
    background: #fff;
  }
  h1, h2, h3 {
    font-family: 'SF Mono', 'JetBrains Mono', monospace;
    color: #111;
    page-break-after: avoid;
  }
  h1 { font-size: 1.9em; margin: 1.4em 0 0.6em; border-bottom: 1px solid #ddd; padding-bottom: 0.3em; }
  h2 { font-size: 1.35em; margin: 1.2em 0 0.5em; }
  h3 { font-size: 1.1em; margin: 1em 0 0.4em; color: #333; }
  p { margin: 0 0 1em; }
  code {
    font-family: 'SF Mono', monospace;
    font-size: 0.85em;
    background: #f4f4f4;
    padding: 1px 4px;
    border-radius: 3px;
  }
  pre {
    background: #f4f4f4;
    padding: 1em;
    border-radius: 4px;
    overflow-x: auto;
    page-break-inside: avoid;
  }
  blockquote {
    border-left: 2px solid #4ade80;
    margin: 0 0 1em;
    padding-left: 1.2em;
    color: #555;
    font-style: italic;
  }
  ul, ol { margin: 0 0 1em; padding-left: 1.5em; }
  hr { border: none; border-top: 1px solid #ddd; margin: 2em 0; }
`

function exportBaseName(fileName) {
  return displayFileName(fileName) || 'document'
}

function stripInline(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
}

/** @returns {{ type: string, level?: number, text?: string }[]} */
function parseMarkdownBlocks(markdown) {
  const blocks = []
  let inCode = false
  let codeLines = []

  for (const line of markdown.split('\n')) {
    if (line.startsWith('```')) {
      if (inCode) {
        blocks.push({ type: 'code', text: codeLines.join('\n') })
        codeLines = []
        inCode = false
      } else {
        inCode = true
      }
      continue
    }

    if (inCode) {
      codeLines.push(line)
      continue
    }

    const heading = line.match(/^(#{1,6})\s+(.+)/)
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length, text: stripInline(heading[2].trim()) })
      continue
    }

    if (!line.trim()) {
      blocks.push({ type: 'break' })
      continue
    }

    blocks.push({ type: 'paragraph', text: stripInline(line.trim()) })
  }

  return blocks
}

function pdfFontSize(level) {
  if (level === 1) return 20
  if (level === 2) return 16
  if (level === 3) return 14
  return 12
}

function addPdfText(doc, text, { x, y, maxWidth, fontSize, lineHeight }) {
  doc.setFontSize(fontSize)
  const lines = doc.splitTextToSize(text, maxWidth)
  let cursorY = y
  for (const line of lines) {
    if (cursorY > doc.internal.pageSize.getHeight() - 48) {
      doc.addPage()
      cursorY = 48
    }
    doc.text(line, x, cursorY)
    cursorY += lineHeight
  }
  return cursorY
}

async function buildPdf(markdown) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const margin = 56
  const maxWidth = doc.internal.pageSize.getWidth() - margin * 2
  let y = margin

  for (const block of parseMarkdownBlocks(markdown)) {
    if (block.type === 'heading') {
      y = addPdfText(doc, block.text ?? '', {
        x: margin,
        y,
        maxWidth,
        fontSize: pdfFontSize(block.level),
        lineHeight: pdfFontSize(block.level) * 1.4,
      })
      y += 8
      continue
    }

    if (block.type === 'code') {
      doc.setFont('courier', 'normal')
      y = addPdfText(doc, block.text ?? '', {
        x: margin,
        y,
        maxWidth,
        fontSize: 10,
        lineHeight: 14,
      })
      doc.setFont('helvetica', 'normal')
      y += 8
      continue
    }

    if (block.type === 'paragraph') {
      y = addPdfText(doc, block.text ?? '', {
        x: margin,
        y,
        maxWidth,
        fontSize: 12,
        lineHeight: 18,
      })
      continue
    }

    y += 10
  }

  return doc.output('arraybuffer')
}

async function buildDocxBuffer(content) {
  const { Document, HeadingLevel, Packer, Paragraph, TextRun } = await import('docx')
  const headingMap = {
    1: HeadingLevel.HEADING_1,
    2: HeadingLevel.HEADING_2,
    3: HeadingLevel.HEADING_3,
    4: HeadingLevel.HEADING_4,
    5: HeadingLevel.HEADING_5,
    6: HeadingLevel.HEADING_6,
  }

  const children = parseMarkdownBlocks(content).flatMap((block) => {
    if (block.type === 'heading') {
      return [
        new Paragraph({
          heading: headingMap[block.level] ?? HeadingLevel.HEADING_1,
          children: [new TextRun(block.text ?? '')],
        }),
      ]
    }
    if (block.type === 'code') {
      return [
        new Paragraph({
          children: [new TextRun({ text: block.text ?? '', font: 'Courier New' })],
        }),
      ]
    }
    if (block.type === 'paragraph') {
      return [new Paragraph({ children: [new TextRun(block.text ?? '')] })]
    }
    return [new Paragraph({ children: [new TextRun('')] })]
  })

  const doc = new Document({ sections: [{ children }] })
  return Packer.toBuffer(doc)
}

export async function exportDocx(content, fileName) {
  const path = await save({
    defaultPath: `${exportBaseName(fileName)}.docx`,
    filters: [{ name: 'Word Document', extensions: ['docx'] }],
  })
  if (!path) return

  const buffer = await buildDocxBuffer(content)
  await writeFile(path, new Uint8Array(buffer))
}

export async function exportPdf(content, fileName) {
  const path = await save({
    defaultPath: `${exportBaseName(fileName)}.pdf`,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  })
  if (!path) return

  await writeFile(path, new Uint8Array(await buildPdf(content)))
}

export function printDocument(title = 'Document') {
  const prose = document.querySelector('.milkdown .ProseMirror')
  const bodyHtml = prose?.innerHTML ?? `<p>${title}</p>`

  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;visibility:hidden'
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument
  if (!doc) {
    iframe.remove()
    window.print()
    return
  }

  doc.open()
  doc.write(`<!DOCTYPE html><html><head><title>${title}</title><style>${PRINT_STYLES}</style></head><body>${bodyHtml}</body></html>`)
  doc.close()

  const cleanup = () => iframe.remove()
  iframe.contentWindow?.addEventListener('afterprint', cleanup, { once: true })
  iframe.contentWindow?.focus()
  iframe.contentWindow?.print()
  setTimeout(cleanup, 60_000)
}
