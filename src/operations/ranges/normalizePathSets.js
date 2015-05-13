var normalize = require('./normalize');

/**
 * warning:  This mutates the array of arrays.
 * It only converts the ranges to properly normalized ranges
 * so the rest of the algos do not have to consider it.
 */
module.exports = function normalizePathSets(path) {
    path.forEach(function(key, i) {
        // the algo becomes very simple if done recursively.  If
        // speed is needed, this is an easy optimization to make.
        if (Array.isArray(key)) {
            normalizePathSets(key);
        }

        else if (typeof key === 'object') {
            path[i] = normalize(path[i]);
        }
    });
    return path;
};
