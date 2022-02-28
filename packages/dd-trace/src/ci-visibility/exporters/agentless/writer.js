'use strict'

const request = require('./request')
const log = require('../../../log')

const { AgentlessCiVisibilityEncoder } = require('../../../encode/agentless-ci-visibility')

class Writer {
  constructor ({ url, tags }) {
    const { 'runtime-id': runtimeId, env, service } = tags
    this._url = url
    this._encoder = new AgentlessCiVisibilityEncoder({ runtimeId, env, service })
  }

  append (trace) {
    log.debug(() => `Encoding trace: ${JSON.stringify(trace)}`)

    this._encode(trace)
  }

  _sendPayload (data, done) {
    makeRequest(data, this._url, (err, res) => {
      if (err) {
        log.error(err)
        done()
        return
      }
      this._encoder.reset()
      log.debug(`Response from the intake: ${res}`)
      done()
    })
  }

  setUrl (url) {
    this._url = url
  }

  _encode (trace) {
    this._encoder.encode(trace)
  }

  flush (done = () => {}) {
    const count = this._encoder.count()

    if (count > 0) {
      const payload = this._encoder.makePayload()

      this._sendPayload(payload, done)
    } else {
      done()
    }
  }
}

function makeRequest (data, url, cb) {
  const options = {
    path: '/api/v2/citestcycle',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    timeout: 5000
  }
  if (process.env.DATADOG_API_KEY || process.env.DD_API_KEY) {
    options.headers['dd-api-key'] = process.env.DATADOG_API_KEY || process.env.DD_API_KEY
  }

  options.protocol = url.protocol
  options.hostname = url.hostname
  options.port = url.port

  log.debug(() => `Request to the intake: ${JSON.stringify(options)}`)

  request(data, options, (err, res) => {
    cb(err, res)
  })
}

module.exports = Writer
