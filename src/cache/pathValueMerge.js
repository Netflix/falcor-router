var clone = require('./../support/clone');
var types = require('./../support/types');
var $ref = types.$ref;
var $refset = types.$refset;
var iterateKeySet = require('falcor-path-utils').iterateKeySet;

/**
 * merges pathValue into a cache
 */
module.exports = function pathValueMerge(cache, pathValue) {
    var refs = [];
    var values = [];
    var invalidations = [];
    var isValueType = true;

    var path = pathValue.path;
    var value = pathValue.value;
    var type = value && value.$type;

    // The pathValue invalidation shape.
    if (pathValue.invalidated === true) {
        invalidations.push({path: path});
        isValueType = false;
    }

    // References and reference sets. Needed for evaluating suffixes in all
    // three types, get, call and set.
    else if (type === $ref || type === $refset) {
        refs.push({
            path: path,
            value: value.value
        });
    }

    // Values.  Needed for reporting for call.
    else {
        values.push(pathValue);
    }

    // If the type of pathValue is a valueType (reference or value) then merge
    // it into the jsonGraph cache.
    if (isValueType) {
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
    var next, key, cloned, outerKey, iteratorNote;
    var i, len;

    for (i = 0, len = path.length - 1; i < len; ++i) {
        outerKey = path[i];

        // Setup the memo and the key.
        if (outerKey && typeof outerKey === 'object') {
            iteratorNote = {};
            key = iterateKeySet(outerKey, iteratorNote);
        } else {
            key = outerKey;
            iteratorNote = false;
        }

        do {
            next = curr[key];

            if (!next) {
                next = curr[key] = {};
            }

            if (iteratorNote) {
                innerPathValueMerge(
                    next, {
                        path: path.slice(i + 1),
                        value: pathValue.value
                    });

                if (!iteratorNote.done) {
                    key = iterateKeySet(outerKey, iteratorNote);
                }
            }

            else {
                curr = next;
            }
        } while (iteratorNote && !iteratorNote.done);

        // All memoized paths need to be stopped to avoid
        // extra key insertions.
        if (iteratorNote) {
            return;
        }
    }


    // TODO: This clearly needs a re-write.  I am just unsure of how i want
    // this to look.  Plus i want to measure performance.
    outerKey = path[i];

    iteratorNote = {};
    key = iterateKeySet(outerKey, iteratorNote);

    do {

        cloned = clone(pathValue.value);
        curr[key] = cloned;

        if (!iteratorNote.done) {
            key = iterateKeySet(outerKey, iteratorNote);
        }
    } while (!iteratorNote.done);
}
