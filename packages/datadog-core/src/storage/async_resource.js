'use strict'
// @ts-check

/**
 * @typedef { { [key: string|symbol]: unknown } } PropertyBag
 */

/**
 * @param {unknown} thing
 * @returns {thing is PropertyBag}
 */
function isPropertyBag (thing) {
  if (typeof thing !== 'object') return false
  if (thing === null) return false
  return true
}

const { createHook, executionAsyncResource } = require('async_hooks')

class AsyncResourceStorage {
  constructor () {
    this._ddResourceStore = Symbol('ddResourceStore')
    this._enabled = false
    this._hook = this._createHook()
  }

  disable () {
    if (!this._enabled) return

    this._hook.disable()
    this._enabled = false
  }

  /**
   * @return {PropertyBag | undefined}
   */
  getStore () {
    if (!this._enabled) return

    const resource = this._executionAsyncResource()

    const store = resource[this._ddResourceStore]
    if (!isPropertyBag(store)) {
      throw new TypeError('store is not present')
    }

    return store
  }

  /**
   * @param {PropertyBag} store
   */
  enterWith (store) {
    this._enable()

    const resource = this._executionAsyncResource()

    resource[this._ddResourceStore] = store
  }

  /**
   * @param {PropertyBag} store
   * @param {function} callback
   * @param {unknown[]} args
   */
  run (store, callback, ...args) {
    this._enable()

    const resource = this._executionAsyncResource()
    const oldStore = resource[this._ddResourceStore]

    resource[this._ddResourceStore] = store

    try {
      return callback(...args)
    } finally {
      resource[this._ddResourceStore] = oldStore
    }
  }

  _createHook () {
    return createHook({
      init: this._init.bind(this)
    })
  }

  _enable () {
    if (this._enabled) return

    this._enabled = true
    this._hook.enable()
  }

  /**
   * @param {number} _asyncId
   * @param {string} _type
   * @param {number} _triggerAsyncId
   * @param {PropertyBag} resource
   */
  _init (_asyncId, _type, _triggerAsyncId, resource) {
    const currentResource = this._executionAsyncResource()

    if (Object.prototype.hasOwnProperty.call(currentResource, this._ddResourceStore)) {
      resource[this._ddResourceStore] = currentResource[this._ddResourceStore]
    }
  }

  /**
   * @returns {PropertyBag}
   */
  _executionAsyncResource () {
    const ar = executionAsyncResource()
    if (!isPropertyBag(ar)) return {}
    return ar
  }
}

module.exports = AsyncResourceStorage
