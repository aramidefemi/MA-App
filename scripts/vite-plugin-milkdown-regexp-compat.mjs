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

/** @param {string} code */
export function patchMilkdownPresetGfm(code) {
  let out = code

  out = out.replace(
    'markRule(/(?<![\\w:/])(~{1,2})(.+?)\\1(?!\\w|\\/)/,',
    'markRule(/(?:^|[^\\w:/])(~{1,2})(.+?)\\1(?!\\w|\\/)/,',
  )
  out = out.replace(
    'new InputRule(/^\\|(?<col>\\d+)[xX](?<row>\\d+)\\|\\s$/,',
    'new InputRule(/^\\|(\\d+)[xX](\\d+)\\|\\s$/,',
  )
  out = out.replace(
    'createTable(ctx, Math.max(Number(match.groups?.row ?? 0), 2), Number(match.groups?.col))',
    'createTable(ctx, Math.max(Number(match[2] ?? 0), 2), Number(match[1]))',
  )
  out = out.replace(
    'new InputRule(/^\\[(?<checked>\\s|x)\\]\\s$/,',
    'new InputRule(/^\\[(\\s|x)\\]\\s$/,',
  )
  out = out.replace(
    'const checked = Boolean(match.groups?.checked === "x")',
    'const checked = Boolean(match[1] === "x")',
  )

  return out
}

/** @param {string} id @param {string} pkg */
function isPresetIndex(id, pkg) {
  return id.includes(`@milkdown/${pkg}`) && id.endsWith('/lib/index.js')
}

/** @param {string} code @param {string} id */
function patchPreset(code, id) {
  if (isPresetIndex(id, 'preset-commonmark')) return patchMilkdownPresetCommonmark(code)
  if (isPresetIndex(id, 'preset-gfm')) return patchMilkdownPresetGfm(code)
  return code
}

function createEsbuildPatchPlugin() {
  const presets = [
    { pkg: 'preset-commonmark', patch: patchMilkdownPresetCommonmark },
    { pkg: 'preset-gfm', patch: patchMilkdownPresetGfm },
  ]

  return {
    name: 'milkdown-regexp-compat-esbuild',
    setup(build) {
      for (const { pkg, patch } of presets) {
        build.onLoad({ filter: new RegExp(`\\/@milkdown\\/${pkg}\\/lib\\/index\\.js$`) }, async (args) => {
          const contents = patch(await readFile(args.path, 'utf8'))
          return { contents, loader: 'js' }
        })
      }
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
          include: [
            '@milkdown/preset-commonmark',
            '@milkdown/preset-gfm',
            '@milkdown/kit/preset/commonmark',
            '@milkdown/kit/preset/gfm',
          ],
          esbuildOptions: {
            plugins: [createEsbuildPatchPlugin()],
          },
        },
      }
    },
    transform(code, id) {
      const next = patchPreset(code, id)
      return next === code ? null : { code: next, map: null }
    },
  }
}
