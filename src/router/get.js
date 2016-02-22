var runGetAction = require('../run/get/runGetAction');
var get = 'get';
var recurseMatchAndExecute = require('../run/recurseMatchAndExecute');
var normalizePathSets = require('../operations/ranges/normalizePathSets');
var materialize = require('../run/materialize');
var Observable = require('../rx').Observable;
var mCGRI = require('./../run/mergeCacheAndGatherRefsAndInvalidations');

/**
 * The router get function
 */
module.exports = function routerGet(paths) {
    var jsongCache = {};
    var router = this;
    var action = runGetAction(router, jsongCache);
    var normPS = normalizePathSets(paths);
    return recurseMatchAndExecute(router._matcher, action, normPS,
                                  get, router, jsongCache).

        // Turn it(jsongGraph, invalidations, missing, etc.) into a
        // jsonGraph envelope
        flatMap(function flatMapAfterRouterGet(details) {
            var out = {
                jsonGraph: details.jsonGraph
            };


            // If the unhandledPaths are present then we need to
            // call the backup method for generating materialized.
            if (details.unhandledPaths.length && router._unhandled) {
                var unhandledPaths = details.unhandledPaths;

                // The 3rd argument is the beginning of the actions arguments,
                // which for get is the same as the unhandledPaths.
                return router._unhandled.
                    get(unhandledPaths).

                    // Merge the solution back into the overall message.
                    map(function(jsonGraphFragment) {
                        mCGRI(out.jsonGraph, [{
                            jsonGraph: jsonGraphFragment.jsonGraph,
                            paths: unhandledPaths
                        }]);
                        return out;
                    }).
                    defaultIfEmpty(out);
            }

            return Observable.return(out);
        }).

        // We will continue to materialize over the whole jsonGraph message.
        // This makes sense if you think about pathValues and an API that if
        // ask for a range of 10 and only 8 were returned, it would not
        // materialize for you, instead, allow the router to do that.
        map(function(jsonGraphEnvelope) {
            return materialize(router, normPS, jsonGraphEnvelope);
        });
};
