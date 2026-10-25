// Copies the release executable produced by `tauri build` to ./NeoGet.exe.
//
// The Rust build directory depends on the environment:
//   - .cargo/config.toml points Cargo at $USERPROFILE/.cargo/target/neoget
//   - CI overrides it with CARGO_TARGET_DIR=src-tauri/target
// so every known location is probed instead of hardcoding one machine path.
import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

const candidates = [
  process.env.CARGO_TARGET_DIR
    ? join(process.env.CARGO_TARGET_DIR, 'release', 'neoget.exe')
    : null,
  join(homedir(), '.cargo', 'target', 'neoget', 'release', 'neoget.exe'),
  resolve('src-tauri', 'target', 'release', 'neoget.exe'),
  resolve('target', 'release', 'neoget.exe'),
  resolve('target', 'neoget', 'release', 'neoget.exe'),
].filter(Boolean)

try {
  execFileSync('taskkill', ['/F', '/IM', 'NeoGet.exe'], { stdio: 'ignore' })
} catch {
  // No running instance to close: nothing to do.
}

const source = candidates.find((candidate) => existsSync(candidate))

if (!source) {
  console.warn(
    `Warning: release executable not found. Looked in:\n${candidates.join('\n')}`,
  )
} else {
  copyFileSync(source, resolve('NeoGet.exe'))
  console.log(`Copied release executable from ${source}`)
}
