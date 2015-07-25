var iterateKeySet = require('falcor-path-utils').iterateKeySet;
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

    /* eslint-disable no-param-reassign */
    currentPath = currentPath || [];
    /* eslint-enable no-param-reassign */

    if (depth === pathSet.length) {
        out[out.length] = cloneArray(currentPath);
        return;
    }

    // Simple case
    var key = pathSet[depth];
    if (typeof key !== 'object') {
        currentPath[depth] = key;
        _spread(pathSet, depth + 1, out, currentPath);
        return;
    }

    // complex key.
    var iteratorNote = {};
    var innerKey = iterateKeySet(key, iteratorNote);
    do {
        // spreads the paths
        currentPath[depth] = innerKey;
        _spread(pathSet, depth + 1, out, currentPath);
        currentPath.length = depth;

        innerKey = iterateKeySet(key, iteratorNote);
    } while (!iteratorNote.done);
}
