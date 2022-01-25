'use strict'

const https = require('https')
const log = require('../../log')

function retriableRequest (options, callback, data) {
  const req = https.request(options, res => {
    let data = ''

    res.setTimeout(options.timeout)

    res.on('data', chunk => { data += chunk })
    res.on('end', () => {
      if (res.statusCode >= 200 && res.statusCode <= 299) {
        callback(null, data, res.statusCode)
      } else {
        const error = new Error(`Error from the intake: ${res.statusCode} ${https.STATUS_CODES[res.statusCode]}`)
        error.status = res.statusCode

        callback(error, null, res.statusCode)
      }
    })
  })
  req.setTimeout(options.timeout, req.abort)
  data.forEach(buffer => req.write(buffer))
  return req
}

function request (options, callback) {
  options = Object.assign({
    headers: {},
    data: [],
    timeout: 2000
  }, options)

  const data = [].concat(options.data)

  options.headers['Content-Length'] = byteLength(data)

  const firstRequest = retriableRequest(options, callback, data)

  // The first request will be retried if it fails due to a socket connection close
  const firstRequestErrorHandler = error => {
    if (firstRequest.reusedSocket && (error.code === 'ECONNRESET' || error.code === 'EPIPE')) {
      log.debug('Retrying request due to socket connection error')
      const retriedReq = retriableRequest(options, callback, data)
      // The retried request will fail normally
      retriedReq.on('error', e => callback(new Error(`Network error trying to reach the intake: ${e.message}`)))
      retriedReq.end()
    } else {
      callback(new Error(`Network error trying to reach the intake: ${error.message}`))
    }
  }

  firstRequest.on('error', firstRequestErrorHandler)
  firstRequest.end()

  return firstRequest
}

function byteLength (data) {
  return data.length > 0 ? data.reduce((prev, next) => prev + next.length, 0) : 0
}

module.exports = request
