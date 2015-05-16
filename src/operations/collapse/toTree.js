var permuteKey = require('./../../support/permuteKey');
var isArray = Array.isArray;

/**
 * @param {Array.<Number>} paths
 */
module.exports = function toTree(paths) {
    return paths.reduce(function(acc, path) {
        innerToTree(acc, path);
        return acc;
    }, {});
};

function innerToTree(seed, path, depth) {
    depth = depth || 0;

    var keySet = path[depth];
    var memo, key;
    var nextDepth = depth + 1;

    if (typeof keySet === 'object') {
        memo = {
            isArray: isArray(keySet),
            arrOffset: 0
        };
        key = permuteKey(keySet, memo);
    } else {
        key = keySet;
        memo = false;
    }

    do {

        var next = seed[key];
        if (!next) {
            if (nextDepth === path.length) {
                seed[key] = null;
            } else {
                next = seed[key] = {};
            }
        }

        if (nextDepth < path.length) {
            innerToTree(next, path, nextDepth);
        }

        if (memo && !memo.done) {
            key = permuteKey(keySet, memo);
        }
    } while (memo && !memo.done);
}
