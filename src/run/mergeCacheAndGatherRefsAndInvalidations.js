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
 * @param {Boolean} hasSuffix
 */
function mergeCacheAndGatherRefsAndInvalidations(cache, jsongOrPVs, hasSuffix) {
    var nextPaths = [];
    var len = -1;
    var invalidated = [];
    var messages = [];
    var foundPaths = [];

    jsongOrPVs.forEach(function(jsongOrPV) {
        var refs = [];
        if (isMessage(jsongOrPV)) {
            messages[messages.length] = jsongOrPV;
        }

        else if (isJSONG(jsongOrPV)) {
            refs = jsongMerge(cache, jsongOrPV);
            foundPaths = foundPaths.concat(jsongOrPV.paths);
        } else {

            if (jsongOrPV.value === undefined) { //eslint-disable-line no-undefined
                invalidated[invalidated.length] = jsongOrPV;
            } else {
                refs = pathValueMerge(cache, jsongOrPV);
            }

            foundPaths.push(jsongOrPV.path);
        }

        if (hasSuffix && refs.length) {
            refs.forEach(function(ref) {
                nextPaths[++len] = ref;
            });
        }
    });

    return [invalidated, nextPaths, messages, foundPaths];
}
