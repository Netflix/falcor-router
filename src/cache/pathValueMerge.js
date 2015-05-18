var clone = require('./../support/clone');
var types = require('./../support/types');
var $ref = types.$ref;
var permuteKey = require('./../support/permuteKey');
var isArray = Array.isArray;

/**
 * merges pathValue into a cache
 */
module.exports = function pathValueMerge(cache, pathValue) {
    var path = pathValue.path;
    var curr = cache;
    var next, key, cloned, outerKey, memo;
    var refs = [];
    debugger

    for (var i = 0, len = path.length - 1; i < len; ++i) {
        outerKey = path[i];

        // Setup the memo and the key.
        if (outerKey && typeof outerKey === 'object') {
            memo = {
                isArray: isArray(outerKey),
                arrOffset: 0
            };
            key = permuteKey(outerKey, memo);
        } else {
            key = outerKey;
            memo = false;
        }

        do {
            next = curr[key];

            if (!next) {
                next = curr[key] = {};
            }

            if (memo) {
                pathValueMerge(next, {
                    path: path.slice(i + 1),
                    value: pathValue.value});
                if (!memo.done) {
                    key = permuteKey(outerKey, memo);
                }
            }

            else {
                curr = next;
            }
        } while (memo && !memo.done);

        // All memoized paths need to be stopped to avoid
        // extra key insertions.
        if (memo) {
            return cache;
        }
    }


    // TODO: Consider a simple depth recursive solution.
    outerKey = path[i];

    // Setup the memo and the key.
    if (outerKey && typeof outerKey === 'object') {
        memo = {
            isArray: isArray(outerKey),
            arrOffset: 0
        };
        key = permuteKey(outerKey, memo);
    } else {
        key = outerKey;
        memo = false;
    }

    do {
        cloned = clone(pathValue.value);
        curr[key] = cloned;

        if (cloned.$type === $ref) {
            refs[refs.length] = cloned.value;
        }

        if (memo && !memo.done) {
            key = permuteKey(outerKey, memo);
        }
    } while (memo && !memo.done);

    return cache;
};


