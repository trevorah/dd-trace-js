'use strict'

const request = require('./request')
const log = require('../../log')

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

  _sendPayload (data, done) {
    makeRequest(data, this._url, (err, res, status) => {
      if (err) {
        log.error(err)
        done()
        return
      }
      this._encoder.reset()
      log.error(`Response from the intake: ${res}`)
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
      'Content-Type': 'application/json',
      'dd-api-key': process.env.DATADOG_API_KEY
    },
    timeout: 5000
  }

  options.protocol = url.protocol
  options.hostname = url.hostname
  options.port = url.port

  log.debug(() => `Request to the intake: ${JSON.stringify(options)}`)

  request(data, options, (err, res, status) => {
    cb(err, res, status)
  })
}

module.exports = Writer
