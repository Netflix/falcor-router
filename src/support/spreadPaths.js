var permuteKey = require('./permuteKey');
var cloneArray = require('./cloneArray');

/**
 * Takes in a ptahSet and will create a set of simple paths.
 * @param {Array} paths
 */
module.exports = function spreadPaths(paths) {
    var allPaths = [];
    paths.forEach(function(x) {
        _spread(x, 0, allPaths);
    });

    return allPaths;
};

function _spread(pathSet, depth, out, currentPath) {

    /* eslisnt-disable no-param-reassign */
    currentPath = currentPath || [];
    /* eslisnt-enable no-param-reassign */

    if (depth === pathSet.length) {
        out[out.length] = cloneArray(currentPath);
        return;
    }

    // Simple case
    var key = pathSet[depth];
    if (typeof key !== 'object') {
        currentPath[depth] = key;
        return _spread(pathSet, depth + 1, out, currentPath);
    }

    // complex key.
    var memo = {done: false, isArray: Array.isArray(key), arrOffset: 0};
    var innerKey = permuteKey(key, memo);
    do {
        // spreads the paths
        currentPath[depth] = innerKey;
        _spread(pathSet, depth + 1, out, currentPath);
        currentPath.length = depth;

        innerKey = permuteKey(key, memo);
    } while (!memo.done);
}
