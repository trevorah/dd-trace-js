'use strict'

class CiEncoder {
  constructor (writer) {
    this._writer = writer
  }

  count () {

  }

  encode (trace) {

  }

  makePayload () {

  }

  _encode (bytes, trace) {

  }

  _reset () {

  }

  _encodeArrayPrefix () {

  }

  _encodeByte () {

  }

  _encodeId () {

  }

  _encodeInteger () {

  }

  _encodeLong () {

  }

  _encodeMap () {

  }

  _encodeValue (bytes, value) {
    switch (typeof value) {
      case 'string':
        this._encodeString(bytes, value)
        break
      case 'number':
        this._encodeFloat(bytes, value)
        break
      default:
        // should not happen
    }
  }

  _encodeString (bytes, value = '') {

  }

  _encodeFloat () {

  }

  _cacheString (value) {

  }

  _writeArrayPrefix () {

  }

  _writeStrings (buffer, offset) {
  }

  _writeTraces () {

  }
}

module.exports = { CiEncoder }
