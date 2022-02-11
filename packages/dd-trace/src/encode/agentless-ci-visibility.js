'use strict'
const tracerVersion = require('../../lib/version')
const { truncateSpan } = require('./truncate-tags')
const ENCODING_VERSION = '1'

function formatSpan (span) {
  return {
    type: span.type === 'test' ? 'test' : 'span',
    version: ENCODING_VERSION,
    content: truncateSpan(span)
  }
}

class AgentlessCiVisibilityEncoder {
  constructor ({ runtimeId, service, env }) {
    this._events = []
    this.runtimeId = runtimeId
    this.service = service
    this.env = env
  }

  count () {
    return this._events.length
  }

  encode (trace) {
    this._events = this._events.concat(trace)
  }

  makePayload () {
    const payload = JSON.stringify({
      version: ENCODING_VERSION,
      metadata: {
        runtime_id: this.runtimeId,
        'language': 'javascript',
        'ci_library.version': tracerVersion,
        'language_interpreter': 'nodejs',
        'language_version': process.version,
        'env': this.env,
        'service': this.service
      },
      events: this._events.map(formatSpan)
    })
    this.reset()
    return payload
  }

  reset () {
    this._events = []
  }
}

module.exports = { AgentlessCiVisibilityEncoder }
