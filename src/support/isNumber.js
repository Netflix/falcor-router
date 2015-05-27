/**
 * Will determine of the argument is a number.
 *
 * '1' returns true
 * 1 returns true
 * [1] returns false
 * null returns false
 * @param {*} x
 */
module.exports = function(x) {
    return String(Number(x)) === String(x) && typeof x !== 'object';
};
