'use strict'
const tracerVersion = require('../../lib/version')

const ENCODING_VERSION = '1'

// From agent truncators: https://github.com/DataDog/datadog-agent/blob/main/pkg/trace/agent/truncator.go

// Values from: https://github.com/DataDog/datadog-agent/blob/main/pkg/trace/traceutil/truncate.go#L22-L27
// MAX_RESOURCE_NAME_LENGTH the maximum length a span resource can have
const MAX_RESOURCE_NAME_LENGTH = 5000
// MAX_META_KEY_LENGTH the maximum length of metadata key
const MAX_META_KEY_LENGTH = 200
// MAX_META_VALUE_LENGTH the maximum length of metadata value
const MAX_META_VALUE_LENGTH = 25000
// MAX_METRIC_KEY_LENGTH the maximum length of a metric name key
const MAX_METRIC_KEY_LENGTH = MAX_META_KEY_LENGTH

const fromEntries = Object.fromEntries || (entries =>
  entries.reduce((obj, [k, v]) => Object.assign(obj, { [k]: v }), {}))

function truncateToLength (value, maxLength) {
  if (!value) {
    return value
  }
  if (value.length > maxLength) {
    return `${value.slice(0, maxLength)}...`
  }
  return value
}

function formatSpan (span) {
  const truncatedSpan = Object.entries(span).reduce((acc, [key, value]) => {
    if (key === 'resource') {
      acc.resource = truncateToLength(value, MAX_RESOURCE_NAME_LENGTH)
    } else if (key === 'meta') {
      acc.meta = fromEntries(Object.entries(value).map(([metaKey, metaValue]) => {
        return [truncateToLength(metaKey, MAX_META_KEY_LENGTH), truncateToLength(metaValue, MAX_META_VALUE_LENGTH)]
      }))
    } else if (key === 'metrics') {
      acc.metrics = fromEntries(Object.entries(value).map(([metricsKey, metricsValue]) => {
        return [truncateToLength(metricsKey, MAX_METRIC_KEY_LENGTH), metricsValue]
      }))
    } else {
      acc[key] = value
    }
    return acc
  }, {})

  return {
    type: span.type === 'test' ? 'test' : 'span',
    version: ENCODING_VERSION,
    content: truncatedSpan
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
