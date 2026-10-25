// Copies the release executable produced by `tauri build` to ./NeoGet.exe.
//
// The Rust build directory depends on the environment:
//   - .cargo/config.toml points Cargo at <repo>/target/neoget
//   - CI overrides it with CARGO_TARGET_DIR=src-tauri/target
// so every known location is probed. When several exist, the most recently
// built one wins: a stale binary left in an older location must never be
// copied over a fresh build.
import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

const candidates = [
  process.env.CARGO_TARGET_DIR
    ? join(process.env.CARGO_TARGET_DIR, 'release', 'neoget.exe')
    : null,
  resolve('target', 'neoget', 'release', 'neoget.exe'),
  resolve('src-tauri', 'target', 'release', 'neoget.exe'),
  resolve('target', 'release', 'neoget.exe'),
  join(homedir(), '.cargo', 'target', 'neoget', 'release', 'neoget.exe'),
].filter(Boolean)

try {
  execFileSync('taskkill', ['/F', '/IM', 'NeoGet.exe'], { stdio: 'ignore' })
} catch {
  // No running instance to close: nothing to do.
}

const existing = candidates
  .filter((candidate) => existsSync(candidate))
  .map((candidate) => ({ candidate, modified: statSync(candidate).mtimeMs }))
  .sort((a, b) => b.modified - a.modified)

if (existing.length === 0) {
  console.warn(
    `Warning: release executable not found. Looked in:\n${candidates.join('\n')}`,
  )
} else {
  const { candidate } = existing[0]
  copyFileSync(candidate, resolve('NeoGet.exe'))
  console.log(`Copied release executable from ${candidate}`)
}
