#!/usr/bin/env node

const fs = require('node:fs')
const path = require('node:path')

const rootDir = process.cwd()
const standaloneNodeModulesDir = path.join(rootDir, '.next', 'standalone', '.next', 'node_modules')

function materializeSymlink(linkPath) {
  const stat = fs.lstatSync(linkPath)
  if (!stat.isSymbolicLink()) {
    return false
  }

  const linkTarget = fs.readlinkSync(linkPath)
  const absoluteTarget = path.resolve(path.dirname(linkPath), linkTarget)

  if (!fs.existsSync(absoluteTarget)) {
    throw new Error(`Symlink target does not exist: ${linkPath} -> ${linkTarget}`)
  }

  fs.rmSync(linkPath, { force: true, recursive: true })
  fs.cpSync(absoluteTarget, linkPath, { recursive: true, force: true })
  return true
}

function main() {
  if (!fs.existsSync(standaloneNodeModulesDir)) {
    console.log('[materialize-standalone-symlinks] No standalone node_modules found, skipping.')
    return
  }

  const entries = fs.readdirSync(standaloneNodeModulesDir)
  let materializedCount = 0

  for (const entry of entries) {
    const entryPath = path.join(standaloneNodeModulesDir, entry)
    try {
      if (materializeSymlink(entryPath)) {
        materializedCount += 1
      }
    } catch (error) {
      console.error(`[materialize-standalone-symlinks] Failed for ${entry}:`, error)
      process.exitCode = 1
      return
    }
  }

  console.log(`[materialize-standalone-symlinks] Materialized ${materializedCount} symlink(s).`)
}

main()
