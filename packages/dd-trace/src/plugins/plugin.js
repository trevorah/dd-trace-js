'use strict'

const dc = require('diagnostics_channel')
const { storage } = require('../../../datadog-core')
const { isStore } = require('../../../datadog-core/src/storage/helpers')

/**
 * @typedef { import('diagnostics_channel').ChannelListener } ChannelListener
 * @typedef { import('../../../..').Span } Span
 * @typedef { import('../proxy') } TracerProxy
 * @typedef { import('../../../datadog-core/src/storage/helpers').Store } Store
 * @typedef { { enabled?: boolean, [key: string]: unknown } } PluginConfig
 */

class Subscription {
  /**
   * @param {string} event
   * @param {ChannelListener} handler
   */
  constructor (event, handler) {
    this._channel = dc.channel(event)
    /** @type {ChannelListener} */
    this._handler = (message, name) => {
      const store = storage.getStore()

      if (!store || !store.noop) {
        handler(message, name)
      }
    }
  }

  enable () {
    this._channel.subscribe(this._handler)
  }

  disable () {
    this._channel.unsubscribe(this._handler)
  }
}

module.exports = class Plugin {
  /**
   * @param {TracerProxy} tracer
   */
  constructor (tracer) {
    /** @type {Subscription[]} */
    this._subscriptions = []
    this._enabled = false
    /** @type {Store[]} */
    this._storeStack = []
    this._tracer = tracer
  }

  get tracer () {
    return this._tracer._tracer
  }

  /**
   * @param {Span} span
   * @param {Store | undefined} store
   */
  enter (span, store) {
    store = store || storage.getStore()
    if (!isStore(store)) {
      throw new TypeError('no store')
    }
    this._storeStack.push(store)
    storage.enterWith({ ...store, span })
  }

  /** Prevents creation of spans here and for all async descendants. */
  skip () {
    const store = storage.getStore()
    if (!isStore(store)) {
      throw new TypeError('no store')
    }
    this._storeStack.push(store)
    storage.enterWith({ noop: true })
  }

  exit () {
    const oldStore = this._storeStack.pop()
    if (oldStore) {
      storage.enterWith(oldStore)
    }
  }

  /**
   * @param {string} channelName
   * @param {ChannelListener} handler
   */
  addSub (channelName, handler) {
    this._subscriptions.push(new Subscription(channelName, handler))
  }

  /**
   * @param {PluginConfig} config
   */
  configure (config) {
    this.config = config
    if (config.enabled && !this._enabled) {
      this._enabled = true
      this._subscriptions.forEach(sub => sub.enable())
    } else if (!config.enabled && this._enabled) {
      this._enabled = false
      this._subscriptions.forEach(sub => sub.disable())
    }
  }
}
