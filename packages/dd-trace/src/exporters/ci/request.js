'use strict'

const https = require('https')

function request (data, options, callback) {
  options.headers['Content-Length'] = data.length

  const request = https.request(options, res => {
    let responseData = ''

    res.setTimeout(options.timeout)

    res.on('data', chunk => { responseData += chunk })
    res.on('end', () => {
      if (res.statusCode >= 200 && res.statusCode <= 299) {
        callback(null, responseData, res.statusCode)
      } else {
        const error = new Error(`Error from the intake: ${res.statusCode} ${https.STATUS_CODES[res.statusCode]}`)
        error.status = res.statusCode

        callback(error, null, res.statusCode)
      }
    })
    request.setTimeout(options.timeout, () => request.abort)

    return request
  })

  request.on('error', err => {
    callback(new Error(`Network error trying to reach the intake: ${err.message}`))
  })

  request.write(data)
  request.end()

  return request
}

module.exports = request
