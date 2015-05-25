/**
 *  Takes in a path and ensures its not a zero length path, meaning
 * that no empty arrays or bad ranges can exist.
 *
 * valid: [A, [B]. {to:1}]
 * invalid: [A, [], {to:1}]
 *
 * This happens when performing src/operations/matcher/strip/strip.js
 * @param {Array} path
 * @return {Boolean}
 */
module.exports = function isValidPath(path) {

};
