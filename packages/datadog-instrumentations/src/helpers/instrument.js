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

/** @typedef { { name: string, versions: string[] | undefined, file: string | undefined } } Instrumentation */

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
 * @param {string[] | undefined} ranges
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
 * @param {string} [file]
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
    const mod = require.cache[ids[i]]
    if (!mod || !mod.exports) continue
    if (ids[i] === instrumentation.name) {
      hook(mod.exports)
      continue
    }

    const id = ids[i].replace(pathSepExpr, '/')

    if (!id.includes(`/node_modules/${instrumentation.name}/`)) continue

    if (instrumentation.file) {
      if (!id.endsWith(`/node_modules/${filename(instrumentation.name, instrumentation.file)}`)) continue

      const basedir = getBasedir(ids[i])

      pkg = requirePackageJson(basedir, module)
    } else {
      const basedir = getBasedir(ids[i])

      pkg = requirePackageJson(basedir, module)

      const mainFile = path.posix.normalize(typeof pkg.main === 'string' ? pkg.main : 'index.js')
      if (!id.endsWith(`/node_modules/${instrumentation.name}/${mainFile}`)) continue
    }

    if (!matchVersion(typeof pkg.version === 'string' ? pkg.version : '', instrumentation.versions)) continue

    hook(mod.exports)
  }
}

/** @param {string} id */
function getBasedir (id) {
  return parse(id).basedir.replace(pathSepExpr, '/')
}

class PolyfilledAsyncResource extends AsyncResource {
  static bind (fn, type, thisArg) {
    type = type || fn.name
    return (new PolyfilledAsyncResource(type || 'bound-anonymous-fn')).bind(fn, thisArg)
  }

  /**
   * @param {(...args: unknown[]) => unknown} fn
   * @paran {unknown} thisArg
   */
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
exports.AsyncResource = PolyfilledAsyncResource
