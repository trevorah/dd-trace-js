'use strict'

const URL = require('url').URL
const log = require('../../../log')
const Writer = require('./writer')
const Scheduler = require('./scheduler')

class AgentlessCiVisibilityExporter {
  constructor (config) {
    const { flushInterval, tags } = config
    this._url = new URL(process.env.DD_TRACE_AGENT_PORT ? `http://localhost:${process.env.DD_TRACE_AGENT_PORT}` : 'https://citestcycle-intake.datad0g.com')
    this._writer = new Writer({ url: this._url, tags })

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

  export (trace) {
    this._writer.append(trace)

    if (!this._scheduler) {
      this._writer.flush()
    }
  }

  flush () {
    this._writer.flush()
  }
}

module.exports = AgentlessCiVisibilityExporter
