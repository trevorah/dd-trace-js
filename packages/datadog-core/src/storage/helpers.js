/**
 * @typedef { import('../../../..').Span } Span
 * @typedef { { [key: string|symbol]: unknown, span?: Span, noop?: boolean } } Store
 */

/**
 * @param {unknown} thing
 * @returns {thing is Store}
 */
function isStore (thing) {
  if (typeof thing !== 'object') return false
  if (thing === null) return false
  return true
}

module.exports = { isStore }
