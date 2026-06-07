#!/usr/bin/env node
/*
 * Copy the dsteem IIFE browser bundle out of node_modules and into ./lib/
 * so the static site is self-contained — i.e. shippable to a CDN / GitHub Pages
 * without dragging node_modules along.
 *
 * Runs automatically as the `postinstall` script after `npm install`.
 * Can also be re-run manually:   npm run setup
 *
 * Prerequisite: the parent dsteem repo must have been built first
 * (cd .. && npm run build) so that the file:.. install has dist/ to pack.
 */

'use strict'

const fs = require('node:fs')
const path = require('node:path')

const bundleName = 'dsteem.browser.global.js'
const src = path.join(__dirname, 'node_modules', 'dsteem', 'dist', bundleName)
const srcMap = src + '.map'
const libDir = path.join(__dirname, 'lib')
const dst = path.join(libDir, bundleName)
const dstMap = dst + '.map'

if (!fs.existsSync(src)) {
    console.error('[setup] Bundle not found at ' + src)
    console.error('[setup] Make sure the parent dsteem repo was built first:')
    console.error('[setup]     cd .. && npm install && npm run build')
    console.error('[setup] Then re-run:  npm install   (or:  npm run setup)')
    process.exit(1)
}

fs.mkdirSync(libDir, {recursive: true})
fs.copyFileSync(src, dst)
if (fs.existsSync(srcMap)) {
    fs.copyFileSync(srcMap, dstMap)
}

const kb = (fs.statSync(dst).size / 1024).toFixed(1)
console.log('[setup] Copied ' + bundleName + ' (' + kb + ' KB) to lib/')
