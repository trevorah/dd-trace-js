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

function truncateSpan (span) {
  return fromEntries(Object.entries(span).map(([key, value]) => {
    if (key === 'resource') {
      return ['resource', truncateToLength(value, MAX_RESOURCE_NAME_LENGTH)]
    }
    if (key === 'meta') {
      return ['meta', fromEntries(Object.entries(value).map(([metaKey, metaValue]) =>
        [truncateToLength(metaKey, MAX_META_KEY_LENGTH), truncateToLength(metaValue, MAX_META_VALUE_LENGTH)]
      ))]
    }
    if (key === 'metrics') {
      return ['metrics', fromEntries(Object.entries(value).map(([metricsKey, metricsValue]) =>
        [truncateToLength(metricsKey, MAX_METRIC_KEY_LENGTH), metricsValue]
      ))]
    }
    return [key, value]
  }))
}

module.exports = { truncateSpan }
