'use strict'

const { AsyncResource } = require('async_hooks')

/**
 * @param {function} origThen
 */
exports.wrapThen = function wrapThen (origThen) {
  /**
   * @param {function} onFulfilled
   * @param {function} onRejected
   * @param {function?} onProgress
   * @this Promise<unknown>
   */
  return function then (onFulfilled, onRejected, onProgress) {
    const ar = new AsyncResource('bound-anonymous-fn')

    arguments[0] = wrapCallback(ar, onFulfilled)
    arguments[1] = wrapCallback(ar, onRejected)

    // not standard but sometimes supported
    if (onProgress) {
      arguments[2] = wrapCallback(ar, onProgress)
    }

    return origThen.apply(this, arguments)
  }
}

/**
 * @param {AsyncResource} ar
 * @param {function} callback
 */
function wrapCallback (ar, callback) {
  if (typeof callback !== 'function') return callback

  /** @this {unknown} */
  return function () {
    return ar.runInAsyncScope(() => {
      return callback.apply(this, arguments)
    })
  }
}
