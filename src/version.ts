// `__PACKAGE_VERSION__` is replaced at build time by tsup (see tsup.config.ts
// `define`). For ts-node / dev-mode where the define isn't applied, fall back
// to reading package.json directly — Client and tests don't depend on the
// exact value, only the User-Agent header reflects it.
declare const __PACKAGE_VERSION__: string

let version: string
try {
    version = __PACKAGE_VERSION__
} catch {
     
    version = require('./../package.json').version
}

export default version
