#!/usr/bin/env node
import { mkdir, readdir, readFile, writeFile, stat } from 'node:fs/promises'
import { join, dirname } from 'node:path'

const SRC = 'dist-esm'
const DEST = 'dist'

async function copyDir(src, dest) {
  await mkdir(dest, { recursive: true })
  const entries = await readdir(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = join(src, entry.name)
    const destPath = join(dest, entry.name)
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath)
    } else if (entry.isFile()) {
      const content = await readFile(srcPath)
      const ext = entry.name.endsWith('.js') ? '.mjs' : ''
      const finalPath = ext ? join(dest, entry.name.replace(/\.js$/, '.mjs')) : destPath
      await mkdir(dirname(finalPath), { recursive: true })
      await writeFile(finalPath, content)
    }
  }
}

async function main() {
  try {
    // Verify src exists and has files
    await stat(SRC)
    await copyDir(SRC, DEST)
    console.log('Copied ESM output to dist with .mjs extension')
  } catch (err) {
    console.error('Failed to copy ESM output:', err)
    process.exit(1)
  }
}

main()
