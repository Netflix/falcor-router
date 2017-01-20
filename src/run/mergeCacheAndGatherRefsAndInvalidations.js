var jsongMerge = require('./../cache/jsongMerge');
var pathValueMerge = require('./../cache/pathValueMerge');
var isJSONG = require('./../support/isJSONG');
var isMessage = require('./../support/isMessage');
module.exports = mergeCacheAndGatherRefsAndInvalidations;

/**
 * takes the response from an action and merges it into the
 * cache.  Anything that is an invalidation will be added to
 * the first index of the return value, and the inserted refs
 * are the second index of the return value.  The third index
 * of the return value is messages from the action handlers
 *
 * @param {Object} cache
 * @param {Array} jsongOrPVs
 */
function mergeCacheAndGatherRefsAndInvalidations(
    cache, jsongOrPVs, routerInstance
) {
    var references = [];
    var len = -1;
    var invalidations = [];
    var unhandledPaths = [];
    var messages = [];
    var values = [];

    // Go through each of the outputs from the route end point and separate out
    // each type of potential output.
    //
    // * There are values that need to be merged into the JSONGraphCache
    // * There are references that need to be merged and potentially followed
    // * There are messages that can alter the behavior of the
    //   recurseMatchAndExecute cycle.
    // * unhandledPaths happens when a path matches a route but the route does
    //   not match the entire path, therefore there is unmatched paths.
    jsongOrPVs.forEach(function(jsongOrPV) {
        var refsAndValues = [];

        if (isMessage(jsongOrPV)) {
            messages[messages.length] = jsongOrPV;
        }

        else if (isJSONG(jsongOrPV)) {
            refsAndValues = jsongMerge(cache, jsongOrPV, routerInstance);
        }

        // Last option are path values.
        else {
            refsAndValues = pathValueMerge(cache, jsongOrPV);
        }

        var refs = refsAndValues.references;
        var vals = refsAndValues.values;
        var invs = refsAndValues.invalidations;
        var unhandled = refsAndValues.unhandledPaths;

        if (vals && vals.length) {
            values = values.concat(vals);
        }

        if (invs && invs.length) {
            invalidations = invalidations.concat(invs);
        }

        if (unhandled && unhandled.length) {
            unhandledPaths = unhandledPaths.concat(unhandled);
        }

        if (refs && refs.length) {
            refs.forEach(function(ref) {
                references[++len] = ref;
            });
        }
    });

    return {
        invalidations: invalidations,
        references: references,
        messages: messages,
        values: values,
        unhandledPaths: unhandledPaths
    };
}
