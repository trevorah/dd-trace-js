'use strict'

const request = require('./request')
const { startupLog } = require('../../startup-log')
const log = require('../../log')
const tracerVersion = require('../../../lib/version')

const { CiEncoder } = require('../../encode/ci')

class Writer {
  constructor ({ url }) {
    this._url = url
    this._encoder = new CiEncoder(this)
  }

  append (spans) {
    log.debug(() => `Encoding trace: ${JSON.stringify(spans)}`)

    this._encode(spans)
  }

  _sendPayload (data, count, done) {
    makeRequest(data, count, this._url, (err, res, status) => {
      startupLog({ agentError: err })
      if (err) {
        log.error(err)
        done()
        return
      }
      log.debug(`Response from the agent: ${res}`)
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

      this._sendPayload(payload, count, done)
    } else {
      done()
    }
  }
}

function setHeader (headers, key, value) {
  if (value) {
    headers[key] = value
  }
}

function makeRequest (data, count, url, cb) {
  const options = {
    path: `/`,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/msgpack',
      'Datadog-Meta-Tracer-Version': tracerVersion,
      'X-Datadog-Trace-Count': String(count)
    }
  }

  setHeader(options.headers, 'Datadog-Meta-Lang', 'nodejs')
  setHeader(options.headers, 'Datadog-Meta-Lang-Version', process.version)
  setHeader(options.headers, 'Datadog-Meta-Lang-Interpreter', process.jsEngine || 'v8')

  if (url.protocol === 'unix:') {
    options.socketPath = url.pathname
  } else {
    options.protocol = url.protocol
    options.hostname = url.hostname
    options.port = url.port
  }

  log.debug(() => `Request to the agent: ${JSON.stringify(options)}`)

  request(Object.assign({ data }, options), (err, res, status) => {
    // Note that logging will only happen once, regardless of how many times this is called.
    startupLog({
      agentError: status !== 404 && status !== 200 ? err : undefined
    })
    cb(err, res, status)
  })
}

module.exports = Writer
