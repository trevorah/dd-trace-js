'use strict'

// const { createHook } = require('async_hooks')

class NativeCpuProfiler {
  constructor (options = {}) {
    this.type = 'cpu'
    this._frequency = options.frequency || 99
    this._mapper = undefined
    this._pprof = undefined
    this._started = false

    // let hax = false
    // this._hook = createHook({
    //   before () {
    //     if (hax) return false
    //     hax = true
    //     console.log('before', global._ddtrace.scope().active())
    //     hax = false
    //   },

    //   after () {
    //     if (hax) return false
    //     hax = true
    //     console.log('after', global._ddtrace.scope().active())
    //     hax = false
    //   }
    // })
  }

  start ({ mapper } = {}) {
    if (this._started) return
    this._started = true

    this._mapper = mapper
    if (!this._pprof) {
      this._pprof = require('@datadog/pprof')
      this._cpuProfiler = new this._pprof.CpuProfiler()
    }

    this._cpuProfiler.start(this._frequency)
  }

  profile () {
    if (!this._started) return
    return this._cpuProfiler.profile()
  }

  encode (profile) {
    return this._pprof.encode(profile)
  }

  stop () {
    if (!this._started) return
    this._started = false

    this._cpuProfiler.stop()
  }
}

module.exports = NativeCpuProfiler
