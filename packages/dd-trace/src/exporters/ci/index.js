'use strict'

const URL = require('url').URL
const log = require('../../log')
const Writer = require('./writer')
const Scheduler = require('./scheduler')

class AgentExporter {
  constructor ({ flushInterval }) {
    this._url = new URL('https://citestcycle-intake.datad0g.com')
    this._writer = new Writer({ url: this._url })

    if (flushInterval > 0) {
      this._scheduler = new Scheduler(() => this._writer.flush(), flushInterval)
    }
    this._scheduler && this._scheduler.start()
  }

  setUrl (url) {
    try {
      url = new URL(url)
      this._url = url
      this._writer.setUrl(url)
    } catch (e) {
      log.warn(e.stack)
    }
  }

  export (spans) {
    this._writer.append(spans)

    if (!this._scheduler) {
      this._writer.flush()
    }
  }
}

module.exports = AgentExporter
