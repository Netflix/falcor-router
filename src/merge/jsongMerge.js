var permuteKey = require('./../support/permuteKey');
var isArray = Array.isArray;
var types = require('./util/types');
var $ref = types.$ref;
var $atom = types.$atom;
var clone = require('./util/clone');

/**
 * merges jsong into a seed
 */
module.exports = function jsongMerge(cache, jsong) {
    var paths = jsong.paths;
    var j = jsong.jsong;
    paths.forEach(function(p) {
        merge(cache, cache, j, j, p, 0);
    });
    return cache;
};

function merge(cache, cacheRoot, message, messageRoot, path, depth, fromParent, fromKey) {
    var typeOfMessage = typeof message;

    // The message at this point should always be defined.
    if (message.$type || typeOfMessage !== 'object') {
        fromParent[fromKey] = clone(message);
        return;
    }

    var outerKey = path[depth];
    var memo, key;

    // Setup the memo and the key.
    if (outerKey && typeof outerKey === 'object') {
        memo = {
            isArray: isArray(outerKey),
            arrIndex: 0
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

        // Cache does not exist but message does.
        if (!cacheRes) {
            cacheRes = cache[key] = {};
        }

        // TODO: Can we hit a leaf node in the cache when traversing?

        if (messageRes) {


            // There is only a need to consider message references since the
            // merge is only for the path that is provided.
            if (messageRes.$type === $ref) {
                nextDepth = 0;
                nextPath = catAndSlice(messageRes.value, path, depth + 1);
                cache[key] = copy(messageRes);

                // Reset position in message and cache.
                messageRes = messageRoot;
                cacheRes = cacheRoot;
            }

            // move forward down the path progression.
            merge(cacheRes, cacheRoot,
                  messageRes, messageRoot,
                  nextPath, nextDepth, cache, key);
        }

        // The second the incoming jsong must be fully qualified,
        // anything that is not will be materialized into the provided cache
        else {

            // do not materialize, continue down the cache.
            if (depth < path.length - 1) {
                merge(cacheRes, cacheRoot,
                      {}, messageRoot,
                      nextPath, nextDepth, cache, key);
            }

            // materialize the node
            else {
                cache[key] = {$type: $atom};
            }
        }



        // Are we done with the loop?
        if (memo) {
            key = permuteKey(outerKey, memo);
        }
    } while (memo && memo.done);
}

function catAndSlice(a, b, slice) {
    var next = [], i, j, len;
    for (i = 0, len = a.length; i < len; ++i) {
        next[i] = a[i];
    }

    for (j = slice || 0, len = b.length; j < len; ++j, ++i) {
        next[i] = b[i];
    }

    return next;
}
