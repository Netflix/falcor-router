var permuteKey = require('./../support/permuteKey');
var isArray = Array.isArray;
var types = require('./../support/types');
var $ref = types.$ref;
var $atom = types.$atom;
var clone = require('./../support/clone');
var cloneArray = require('./../support/cloneArray');
var catAndSlice = require('./../support/catAndSlice');

/**
 * merges jsong into a seed
 */
module.exports = function jsongMerge(cache, jsongEnv) {
    var paths = jsongEnv.paths;
    var j = jsongEnv.jsong;
    var insertedReferences = [];
    paths.forEach(function(p) {
        merge(cache, cache, j, j, p, 0, insertedReferences);
    });
    return insertedReferences;
};

function merge(cache, cacheRoot, message,
               messageRoot, path, depth,
               insertedReferences, requestedPath, fromParent,
               fromKey) {

    var typeOfMessage = typeof message;
    requestedPath = requestedPath || [];

    // The message at this point should always be defined.
    if (message.$type || typeOfMessage !== 'object') {
        fromParent[fromKey] = clone(message);

        // NOTE: If we have found a reference at our cloning position
        // and we have resolved our path then add the reference to
        // the unfulfilledRefernces.
        if (message.$type === $ref) {
            insertedReferences[insertedReferences.length] = {
                path: cloneArray(requestedPath),
                value: message.value
            };
        }

        return;
    }

    var outerKey = path[depth];
    var memo, key;

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

    // We always attempt this as a loop.  If the memo exists then
    // we assume that the permutation is needed.
    do {

        // If the cache exists and we are not at our height, then
        // just follow cache, else attempt to follow message.
        var cacheRes = cache[key];
        var messageRes = message[key];
        var nextPath = path;
        var nextDepth = depth + 1;
        requestedPath[depth] = key;

        // Cache does not exist but message does.
        if (!cacheRes) {
            cacheRes = cache[key] = {};
        }

        // TODO: Can we hit a leaf node in the cache when traversing?

        if (messageRes) {

            // TODO: Potential performance gain since we know that
            // references are always pathSets of 1, they can be evaluated
            // iteratively.

            // There is only a need to consider message references since the
            // merge is only for the path that is provided.
            if (messageRes.$type === $ref && depth < path.length - 1) {
                nextDepth = 0;
                nextPath = catAndSlice(messageRes.value, path, depth + 1);
                cache[key] = clone(messageRes);

                // Reset position in message and cache.
                messageRes = messageRoot;
                cacheRes = cacheRoot;
            }

            // move forward down the path progression.
            merge(cacheRes, cacheRoot,
                  messageRes, messageRoot,
                  nextPath, nextDepth, insertedReferences,
                  requestedPath, cache, key);
        }

        // The second the incoming jsong must be fully qualified,
        // anything that is not will be materialized into the provided cache
        else {

            // do not materialize, continue down the cache.
            if (depth < path.length - 1) {
                merge(cacheRes, cacheRoot,
                      {}, messageRoot,
                      nextPath, nextDepth, insertedReferences,
                      requestedPath, cache, key);
            }

            // materialize the node
            else {
                cache[key] = {$type: $atom};
            }
        }

        requestedPath.length = depth;

        // Are we done with the loop?
        if (memo) {
            key = permuteKey(outerKey, memo);
        }
    } while (memo && !memo.done);
}
