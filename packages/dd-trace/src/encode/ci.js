'use strict'
const uuid = require('crypto-randomuuid')
const tracerVersion = require('../../lib/version')

const ENCODING_VERSION = '1'

class CiEncoder {
  constructor () {
    this._events = []
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
        runtime_id: uuid(),
        'ci_library.language': 'javascript',
        'ci_library.version': tracerVersion,
        'language_interpreter': 'nodejs',
        'language_version': process.version,
        'env': 'testing-juan',
        'service': 'testing-agentless'
      },
      events: this._events.map(span => {
        return {
          type: 'test',
          version: ENCODING_VERSION,
          content: span
        }
      })
    })
    this.reset()
    return payload
  }

  reset () {
    this._events = []
  }
}

module.exports = { CiEncoder }
