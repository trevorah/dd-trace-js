'use strict'

const dc = require('diagnostics_channel')
const path = require('path')
const semver = require('semver')
const iitm = require('../../../dd-trace/src/iitm')
const ritm = require('../../../dd-trace/src/ritm')
const parse = require('module-details-from-path')
const requirePackageJson = require('../../../dd-trace/src/require-package-json')
const { AsyncResource } = require('async_hooks')

const pathSepExpr = new RegExp(`\\${path.sep}`, 'g')
/** @type { { [name: string]: dc.Channel } } */
const channelMap = {}

/** @typedef { { name: string, versions: string[]?, file: string? } } Instrumentation */

/**
 * @param {string} name
 * @return dc.Channel
 */
exports.channel = function channel (name) {
  const maybe = channelMap[name]
  if (maybe) return maybe
  const ch = dc.channel(name)
  channelMap[name] = ch
  return ch
}

/**
 * @param {Instrumentation} instrumentation
 * @param { (exports: unknown) => unknown } hook
 */
exports.addHook = function addHook (instrumentation, hook) {
  const file = filename(instrumentation.name, instrumentation.file)
  /**
   * @param {unknown} moduleExports
   * @param {string} moduleName
   * @param {string} moduleBaseDir
   */
  const loaderHook = (moduleExports, moduleName, moduleBaseDir) => {
    moduleName = moduleName.replace(pathSepExpr, '/')
    const moduleVersion = getVersion(moduleBaseDir)
    if (moduleName !== file || !matchVersion(moduleVersion, instrumentation.versions)) {
      return moduleExports
    }
    return hook(moduleExports)
  }
  ritm([instrumentation.name], loaderHook)
  cjsPostLoad(instrumentation, hook)
  iitm([instrumentation.name], loaderHook)
}

/**
 * @param {string | undefined} version
 * @param {string[]?} ranges
 */
function matchVersion (version, ranges) {
  return !!(!version || (ranges && ranges.some(range => semver.satisfies(semver.coerce(version), range))))
}

/**
 * @param {string} moduleBaseDir
 * @return string | undefined
 */
function getVersion (moduleBaseDir) {
  if (moduleBaseDir) {
    const packageJson = requirePackageJson(moduleBaseDir, module)
    const version = packageJson.version
    if (typeof version === 'string') {
      return version
    }
  }
}

/**
 * @param {string} name
 * @param {string|undefined} file
 */
function filename (name, file) {
  return [name, file].filter(val => val).join('/')
}

// TODO this is basically Loader#_getModules + running the hook. DRY up.
/**
 * @param {Instrumentation} instrumentation
 * @param { (exports: unknown) => unknown } hook
 */
function cjsPostLoad (instrumentation, hook) {
  const ids = Object.keys(require.cache)

  let pkg

  for (let i = 0, l = ids.length; i < l; i++) {
    if (ids[i] === instrumentation.name) {
      const mod = require.cache[ids[i]]
      if (mod && mod.exports) {
        hook(mod.exports)
        continue
      }
    }

    const id = ids[i].replace(pathSepExpr, '/')

    if (!id.includes(`/node_modules/${instrumentation.name}/`)) continue

    if (instrumentation.file) {
      if (!id.endsWith(`/node_modules/${filename(instrumentation)}`)) continue

      const basedir = getBasedir(ids[i])

      pkg = requirePackageJson(basedir, module)
    } else {
      const basedir = getBasedir(ids[i])

      pkg = requirePackageJson(basedir, module)

      const mainFile = path.posix.normalize(pkg.main || 'index.js')
      if (!id.endsWith(`/node_modules/${instrumentation.name}/${mainFile}`)) continue
    }

    if (!matchVersion(pkg.version, instrumentation.versions)) continue

    hook(require.cache[ids[i]].exports)
  }
}

/** @param {string} id */
function getBasedir (id) {
  return parse(id).basedir.replace(pathSepExpr, '/')
}

if (semver.satisfies(process.versions.node, '>=16.0.0')) {
  exports.AsyncResource = AsyncResource
} else {
  exports.AsyncResource = class extends AsyncResource {
    static bind (fn, type, thisArg) {
      type = type || fn.name
      return (new exports.AsyncResource(type || 'bound-anonymous-fn')).bind(fn, thisArg)
    }

    bind (fn, thisArg = this) {
      const ret = this.runInAsyncScope.bind(this, fn, thisArg)
      Object.defineProperties(ret, {
        'length': {
          configurable: true,
          enumerable: false,
          value: fn.length,
          writable: false
        },
        'asyncResource': {
          configurable: true,
          enumerable: true,
          value: this,
          writable: true
        }
      })
      return ret
    }
  }
}
