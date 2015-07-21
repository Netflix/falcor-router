var clone = require('./../support/clone');
var cloneArray = require('./../support/cloneArray');
var types = require('./../support/types');
var $ref = types.$ref;
var permuteKey = require('./../support/permuteKey');
var isArray = Array.isArray;

/**
 * merges pathValue into a cache
 */
module.exports = function pathValueMerge(cache, pathValue) {
    var refs = [];
    var values = [];
    var invalidations = [];

    // The invalidation case.  Needed for reporting
    // of call.
    if (pathValue.value === undefined) {
        invalidations.push({path: pathValue.path});
    }

    // References.  Needed for evaluationg suffixes in
    // both call and get/set.
    else if (pathValue.value.$type === $ref) {
        refs.push({
            path: pathValue.path,
            value: pathValue.value.value
        });
    }


    // Values.  Needed for reporting for call.
    else {
        values.push(pathValue);
    }

    if (invalidations.length === 0) {
        // Merges the values/refs/invs into the cache.
        innerPathValueMerge(cache, pathValue);
    }

    return {
        references: refs,
        values: values,
        invalidations: invalidations
    };
};

function innerPathValueMerge(cache, pathValue) {
    var path = pathValue.path;
    var curr = cache;
    var next, key, cloned, outerKey, memo;
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

            if (!next) {
                next = curr[key] = {};
            }

            if (memo) {
                innerPathValueMerge(
                    next, {
                        path: path.slice(i + 1),
                        value: pathValue.value
                    });

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
            return;
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

        if (memo && !memo.done) {
            key = permuteKey(outerKey, memo);
        }
    } while (memo && !memo.done);
}
