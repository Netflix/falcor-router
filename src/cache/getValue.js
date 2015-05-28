/**
 * To simplify this algorithm, the path must be a simple
 * path with no complex keys.
 *
 * Note: The path coming in must contain no references, as
 * all set data caches have no references.
 * @param {Object} cache
 * @param {PathSet} path
 */
module.exports = function getValue(cache, path) {
    return path.reduce(function(acc, key) {
        return acc[key];
    }, cache);
};
