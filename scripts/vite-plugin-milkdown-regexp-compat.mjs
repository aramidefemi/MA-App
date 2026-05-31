import { readFile } from 'node:fs/promises'

/** Patch Milkdown input-rule regexes for WebKit before Safari 16.4 (no lookbehind / named groups). */
/** @param {string} code */
export function patchMilkdownPresetCommonmark(code) {
  let out = code

  out = out.replace(
    'markRule(/(?<![\\w:/])(?:\\*\\*|__)([^*_]+?)(?:\\*\\*|__)(?![\\w/])$/,',
    'markRule(/(?:^|[^\\w:/])(\\*\\*|__)([^*_]+?)\\1(?![\\w/])$/,',
  )
  out = out.replace(
    'textblockTypeInputRule(/^(?<hashes>#+)\\s$/,',
    'textblockTypeInputRule(/^(#+)\\s$/,',
  )
  out = out.replaceAll('match.groups?.hashes?.length', 'match[1]?.length')
  out = out.replace(
    'textblockTypeInputRule(/^```(?<language>[a-z]*)?[\\s\\n]$/,',
    'textblockTypeInputRule(/^```([a-z]*)?[\\s\\n]$/,' ,
  )
  out = out.replaceAll('match.groups?.language ?? ""', 'match[1] ?? ""')
  out = out.replace(
    '/!\\[(?<alt>.*?)\\]\\((?<filename>.*?)\\s*(?="|\\))"?(?<title>[^"]+)?"?\\)/',
    '/!\\[(.*?)\\]\\((.*?)\\s*(?="|\\))"?(?:([^"]+))?"?\\)/',
  )
  out = out.replace(
    '/!\\[(?<alt>.*?)]\\((?<filename>.*?)\\s*(?="|\\))"?(?<title>[^"]+)?"?\\)/',
    '/!\\[(.*?)\\]\\((.*?)\\s*(?="|\\))"?(?:([^"]+))?"?\\)/',
  )

  return out
}

/** @param {string} id */
function isPresetCommonmarkIndex(id) {
  return id.includes('@milkdown/preset-commonmark') && id.endsWith('/lib/index.js')
}

function createEsbuildPatchPlugin() {
  return {
    name: 'milkdown-regexp-compat-esbuild',
    setup(build) {
      build.onLoad({ filter: /\/@milkdown\/preset-commonmark\/lib\/index\.js$/ }, async (args) => {
        const contents = patchMilkdownPresetCommonmark(await readFile(args.path, 'utf8'))
        return { contents, loader: 'js' }
      })
    },
  }
}

export function milkdownRegexpCompat() {
  return {
    name: 'milkdown-regexp-compat',
    enforce: 'pre',
    config() {
      return {
        optimizeDeps: {
          include: ['@milkdown/preset-commonmark', '@milkdown/kit/preset/commonmark'],
          esbuildOptions: {
            plugins: [createEsbuildPatchPlugin()],
          },
        },
      }
    },
    transform(code, id) {
      if (!isPresetCommonmarkIndex(id)) return null
      const next = patchMilkdownPresetCommonmark(code)
      return next === code ? null : { code: next, map: null }
    },
  }
}
