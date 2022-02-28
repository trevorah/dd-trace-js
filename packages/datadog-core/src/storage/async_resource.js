'use strict'
// @ts-check

const { isStore } = require('./helpers')

/**
 * @typedef { import('./helpers').Store } Store
 */

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
   * @return {Store | undefined}
   */
  getStore () {
    if (!this._enabled) return

    const resource = this._executionAsyncResource()

    const store = resource[this._ddResourceStore]
    if (!isStore(store)) {
      throw new TypeError('store is not present')
    }

    return store
  }

  /**
   * @param {Store} store
   */
  enterWith (store) {
    this._enable()

    const resource = this._executionAsyncResource()

    resource[this._ddResourceStore] = store
  }

  /**
   * @param {Store} store
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
   * @param {Store} resource
   */
  _init (_asyncId, _type, _triggerAsyncId, resource) {
    const currentResource = this._executionAsyncResource()

    if (Object.prototype.hasOwnProperty.call(currentResource, this._ddResourceStore)) {
      resource[this._ddResourceStore] = currentResource[this._ddResourceStore]
    }
  }

  /**
   * @returns {Store}
   */
  _executionAsyncResource () {
    const ar = executionAsyncResource()
    if (!isStore(ar)) return {}
    return ar
  }
}

module.exports = AsyncResourceStorage
