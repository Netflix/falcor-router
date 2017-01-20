var iterateKeySet = require('falcor-path-utils').iterateKeySet;
var types = require('./../support/types');
var $ref = types.$ref;
var $error = types.$error;
var clone = require('./../support/clone');
var cloneArray = require('./../support/cloneArray');
var catAndSlice = require('./../support/catAndSlice');

/**
 * merges jsong into a seed
 */
module.exports = function jsongMerge(cache, jsongEnv, routerInstance) {
    var paths = jsongEnv.paths;
    var j = jsongEnv.jsonGraph;
    var references = [];
    var values = [];

    paths.forEach(function(p) {
        merge({
            router: routerInstance,
            cacheRoot: cache,
            messageRoot: j,
            references: references,
            values: values,
            requestedPath: [],
            requestIdx: -1,
            ignoreCount: 0
        },  cache, j, 0, p);
    });

    return {
        references: references,
        values: values
    };
};

function merge(config, cache, message, depth, path, fromParent, fromKey) {
    var cacheRoot = config.cacheRoot;
    var messageRoot = config.messageRoot;
    var requestedPath = config.requestedPath;
    var ignoreCount = config.ignoreCount;
    var typeOfMessage = typeof message;
    var requestIdx = config.requestIdx;
    var updateRequestedPath = ignoreCount <= depth;
    if (updateRequestedPath) {
        requestIdx = ++config.requestIdx;
    }

    // The message at this point should always be defined.
    // Reached the end of the JSONG message path
    if (message === null || typeOfMessage !== 'object' || message.$type) {
        fromParent[fromKey] = clone(message);

        // If we notice an error while merging, we'll fire the error hook
        // for logging purposes.
        if (message && message.$type === $error) {
            config.router._pathErrorHook({ path: path, value: message });
        }

        // NOTE: If we have found a reference at our cloning position
        // and we have resolved our path then add the reference to
        // the unfulfilledRefernces.
        if (message && message.$type === $ref) {
            var references = config.references;
            references.push({
                path: cloneArray(requestedPath),
                value: message.value
            });
        }

        // We are dealing with a value.  We need this for call
        // Call needs to report all of its values into the jsongCache
        // and paths.
        else {
            var values = config.values;
            values.push({
                path: cloneArray(requestedPath),
                value: (message && message.type) ? message.value : message
            });
        }

        return;
    }

    var outerKey = path[depth];
    var iteratorNote = {};
    var key;
    key = iterateKeySet(outerKey, iteratorNote);

    // We always attempt this as a loop.  If the memo exists then
    // we assume that the permutation is needed.
    do {

        // If the cache exists and we are not at our height, then
        // just follow cache, else attempt to follow message.
        var cacheRes = cache[key];
        var messageRes = message[key];

        // We no longer materialize inside of jsonGraph merge.  Either the
        // client should specify all of the paths
        if (messageRes !== undefined) {

            var nextPath = path;
            var nextDepth = depth + 1;
            if (updateRequestedPath) {
                requestedPath[requestIdx] = key;
            }

            // We do not continue with this branch since the cache
            if (cacheRes === undefined) {
                cacheRes = cache[key] = {};
            }

            var nextIgnoreCount = ignoreCount;

            // TODO: Potential performance gain since we know that
            // references are always pathSets of 1, they can be evaluated
            // iteratively.

            // There is only a need to consider message references since the
            // merge is only for the path that is provided.
            if (messageRes && messageRes.$type === $ref &&
                depth < path.length - 1) {

                nextDepth = 0;
                nextPath = catAndSlice(messageRes.value, path, depth + 1);
                cache[key] = clone(messageRes);

                // Reset position in message and cache.
                nextIgnoreCount = messageRes.value.length;
                messageRes = messageRoot;
                cacheRes = cacheRoot;
            }

            // move forward down the path progression.
            config.ignoreCount = nextIgnoreCount;
            merge(config, cacheRes, messageRes,
                  nextDepth, nextPath, cache, key);
            config.ignoreCount = ignoreCount;
        }

        if (updateRequestedPath) {
            requestedPath.length = requestIdx;
        }

        // Are we done with the loop?
        key = iterateKeySet(outerKey, iteratorNote);
    } while (!iteratorNote.done);
}
