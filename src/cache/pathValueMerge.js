var clone = require('./../support/clone');
var types = require('./../support/types');
var $ref = types.$ref;
var iterateKeySet = require('falcor-path-utils').iterateKeySet;

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
    else if ((pathValue.value !== null) && (pathValue.value.$type === $ref)) {
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
        innerPathValueMerge(cache, cache, pathValue.value, pathValue.path, 0);
    }

    return {
        references: refs,
        values: values,
        invalidations: invalidations
    };
};

/* eslint-disable no-constant-condition */
function innerPathValueMerge(root, node, value, path, depth, reference) {

    var note = {};
    var branch = depth < path.length - 1;
    var keySet = path[depth];
    var key = iterateKeySet(keySet, note);

    do {
        var curr = node;
        var type = curr.$type;

        while (type === $ref) {
            curr = innerPathValueMerge(root, root, value, curr.value, 0, true);
            type = curr.$type;
        }

        if (type === void 0) {

            var prev = curr;

            curr = prev[key];

            if (branch) {
                if (!curr) {
                    curr = prev[key] = {};
                }
                curr = innerPathValueMerge(root, curr, value, path, depth + 1, reference);
            } else if (reference) {
                if (!curr) {
                    curr = prev[key] = {};
                }
            } else if (!curr) {
                curr = prev[key] = clone(value);
            }
        }

        key = iterateKeySet(keySet, note);
        if (note.done) {
            break;
        }
    } while (true);

    return curr;
}
/* eslint-enable */
