'use strict'

const { createHook, executionAsyncId } = require('async_hooks')
const AsyncResourceStorage = require('./async_resource')

/**
 * @typedef { import('./helpers').Store } Store
 */

class AsyncHooksStorage extends AsyncResourceStorage {
  constructor () {
    super()

    /** @type Map<number, Store> */
    this._resources = new Map()
  }

  disable () {
    super.disable()

    this._resources.clear()
  }

  _createHook () {
    return createHook({
      init: this._init.bind(this),
      destroy: this._destroy.bind(this)
    })
  }

  /**
   * @param {number} asyncId
   * @param {string} type
   * @param {number} triggerAsyncId
   * @param {Store} resource
   */
  _init (asyncId, type, triggerAsyncId, resource) {
    super._init.call(this, asyncId, type, triggerAsyncId, resource)

    this._resources.set(asyncId, resource)
  }

  /**
   * @param {number} asyncId
   */
  _destroy (asyncId) {
    this._resources.delete(asyncId)
  }

  _executionAsyncResource () {
    const asyncId = executionAsyncId()

    let resource = this._resources.get(asyncId)

    if (!resource) {
      this._resources.set(asyncId, resource = {})
    }

    return resource
  }
}

module.exports = AsyncHooksStorage
