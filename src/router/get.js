var runGetAction = require('../run/get/runGetAction');
var get = 'get';
var recurseMatchAndExecute = require('../run/recurseMatchAndExecute');
var normalizePathSets = require('../operations/ranges/normalizePathSets');
var materialize = require('../run/materialize');
var Observable = require('../RouterRx.js').Observable;
var mCGRI = require('./../run/mergeCacheAndGatherRefsAndInvalidations');
var MaxPathsExceededError = require('../errors/MaxPathsExceededError');
var getPathsCount = require('./getPathsCount');
var rxNewToRxNewAndOld = require('../run/conversion/rxNewToRxNewAndOld');

/**
 * The router get function
 */
module.exports = function routerGet(paths) {

    var router = this;
    var routeSummary = null;
    if (router._routeSummaryHook) {
        routeSummary = {
            type: 'get',
            start: router._now(),
            arguments: {
                paths: paths
            }
        };
    }

    return rxNewToRxNewAndOld(Observable.defer(function() {

        var jsongCache = {};
        var action = runGetAction(router, jsongCache);
        var normPS = normalizePathSets(paths);

        if (getPathsCount(normPS) > router.maxPaths) {
            throw new MaxPathsExceededError();
        }

        return recurseMatchAndExecute(router._matcher, action, normPS,
                                      get, router, jsongCache, routeSummary).

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

                    // The 3rd argument is the beginning of the actions
                    // arguments, which for get is the same as the
                    // unhandledPaths.
                    return router._unhandled.
                        get(unhandledPaths).

                        // Merge the solution back into the overall message.
                        map(function(jsonGraphFragment) {
                            mCGRI(out.jsonGraph, [{
                                jsonGraph: jsonGraphFragment.jsonGraph,
                                paths: unhandledPaths
                            }], router);
                            return out;
                        }).
                        defaultIfEmpty(out);
                }

                return Observable.of(out);
            }).

            // We will continue to materialize over the whole jsonGraph message.
            // This makes sense if you think about pathValues and an API that if
            // ask for a range of 10 and only 8 were returned, it would not
            // materialize for you, instead, allow the router to do that.
            map(function(jsonGraphEnvelope) {
                return materialize(router, normPS, jsonGraphEnvelope);
            });
    }).
    do(function summaryHookHandler(response) {
        if (router._routeSummaryHook) {
            routeSummary.end = router._now();
            routeSummary.response = response;
            router._routeSummaryHook(routeSummary);
        }
    }, function summaryHookErrorHandler(err) {
        if (router._routeSummaryHook) {
            routeSummary.end = router._now();
            routeSummary.error = err;
            router._routeSummaryHook(routeSummary);
        }
    }).
    do(null, function errorHookHandler(err) {
      router._errorHook(err);
    }));
};
