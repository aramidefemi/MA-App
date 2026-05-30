import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const config = JSON.parse(readFileSync(join(root, 'app.config.json'), 'utf8'))

const tauriPath = join(root, 'src-tauri/tauri.conf.json')
const tauri = JSON.parse(readFileSync(tauriPath, 'utf8'))
tauri.productName = config.name
tauri.identifier = config.bundleId
writeFileSync(tauriPath, JSON.stringify(tauri, null, 2) + '\n')

const cargoPath = join(root, 'src-tauri/Cargo.toml')
const cargo = readFileSync(cargoPath, 'utf8')
const updatedCargo = cargo
  .replace(/^name = ".*"$/m, `name = "${config.crateName}"`)
  .replace(/^description = ".*"$/m, `description = "${config.name} — ${config.description}"`)
writeFileSync(cargoPath, updatedCargo)

const pkgPath = join(root, 'package.json')
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
pkg.name = config.npmPackageName
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')

console.log(`Synced native branding → ${config.name} (${config.bundleId})`)
