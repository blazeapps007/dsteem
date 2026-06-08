import {defineConfig} from 'tsup'
import {polyfillNode} from 'esbuild-plugin-polyfill-node'
import {readFileSync} from 'fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'))
const banner = `/*! dsteem v${pkg.version} | BSD-3-Clause | https://github.com/jnordberg/dsteem */`

export default defineConfig([
    // Node build — dual ESM + CJS + .d.ts
    {
        entry: {index: 'src/index-node.ts'},
        outDir: 'dist',
        format: ['esm', 'cjs'],
        target: 'node22',
        platform: 'node',
        dts: true,
        sourcemap: true,
        clean: true,
        minify: false,
        treeshake: true,
        splitting: false,
        // Bundle CJS-only deps so the ESM build sees named exports cleanly
        // (consumers shouldn't need a default-import + destructure dance).
        // @noble/* are tiny and ESM-native; leaving them external would also work
        // but bundling keeps the import graph self-contained.
        noExternal: ['verror', 'bs58', 'bytebuffer'],
        // bytebuffer ships a Node-specific entry (bytebuffer-node.js) that
        // dynamically `require('buffer')` to alias the global Buffer. esbuild's
        // CJS shim can't resolve runtime `require()` calls when the file is
        // bundled. The browser entry doesn't have this issue and works on Node
        // too (Buffer is a global in both ESM and CJS), so alias it directly.
        esbuildOptions(options) {
            options.alias = {
                ...(options.alias || {}),
                bytebuffer: 'bytebuffer/dist/bytebuffer.js'
            }
        },
        define: {__PACKAGE_VERSION__: JSON.stringify(pkg.version)},
        // Bridge esbuild's __require shim to Node's createRequire so bundled
        // CJS deps (verror -> safe-buffer -> require('buffer'), etc.) work in
        // the ESM output. Only applied to the .mjs file.
        banner: ({format}) => format === 'esm'
            ? {js: `${banner}\nimport {createRequire as __dsteemCreateRequire} from 'module';\nconst require = __dsteemCreateRequire(import.meta.url);`}
            : {js: banner},
        outExtension({format}) {
            return {js: format === 'cjs' ? '.cjs' : '.mjs'}
        }
    },
    // Browser IIFE bundle — replaces the legacy dist/dsteem.js
    {
        entry: {'dsteem.browser': 'src/index-browser.ts'},
        outDir: 'dist',
        format: ['iife'],
        globalName: 'dsteem',
        target: 'es2020',
        platform: 'browser',
        sourcemap: true,
        minify: true,
        treeshake: true,
        splitting: false,
        define: {
            __PACKAGE_VERSION__: JSON.stringify(pkg.version),
            global: 'globalThis'
        },
        banner: {js: banner},
        esbuildPlugins: [polyfillNode({polyfills: {crypto: true}})],
        // Bundle every dep into the browser build (consumer has nothing to install).
        noExternal: [/.*/]
    }
])
