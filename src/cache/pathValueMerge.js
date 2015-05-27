var clone = require('./../support/clone');
var cloneArray = require('./../support/cloneArray');
var types = require('./../support/types');
var $ref = types.$ref;
var permuteKey = require('./../support/permuteKey');
var isArray = Array.isArray;

/**
 * merges pathValue into a cache
 */
module.exports = function pathValueMerge(cache, pathValue, requestedPath) {
    var path = pathValue.path;
    var curr = cache;
    var next, key, cloned, outerKey, memo;
    var refs = [];

    /*eslint-disable no-func-assign, no-param-reassign*/
    requestedPath = requestedPath || [];
    /*eslint-enable no-func-assign, no-param-reassign*/

    var startingLength = requestedPath.length;
    var i, len;

    for (i = 0, len = path.length - 1; i < len; ++i) {
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
            requestedPath[startingLength + i] = key;

            if (!next) {
                next = curr[key] = {};
            }

            if (memo) {
                pathValueMerge(
                    next, {
                        path: path.slice(i + 1),
                        value: pathValue.value
                    }, requestedPath);
                if (!memo.done) {
                    requestedPath.legth = startingLength + i;
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
            return refs;
        }
    }


    // TODO: This clearly needs a re-write.  I am just unsure of how i want
    // this to look.  Plus i want to measure performance.
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
        requestedPath[startingLength + i] = key;

        if (cloned.$type === $ref) {
            refs[refs.length] = {
                path: cloneArray(requestedPath),
                value: cloned.value
            };
        }

        if (memo && !memo.done) {
            requestedPath[startingLength + i] = key;
            key = permuteKey(outerKey, memo);
        }
    } while (memo && !memo.done);

    return refs;
};


