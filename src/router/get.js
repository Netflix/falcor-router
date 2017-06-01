var runGetAction = require('../run/get/runGetAction');
var get = 'get';
var recurseMatchAndExecute = require('../run/recurseMatchAndExecute');
var normalizePathSets = require('../operations/ranges/normalizePathSets');
var materialize = require('../run/materialize');
var Observable = require('../RouterRx.js').Observable;
var mCGRI = require('./../run/mergeCacheAndGatherRefsAndInvalidations');
var MaxPathsExceededError = require('../errors/MaxPathsExceededError');
var getPathsCount = require('./getPathsCount');
var outputToObservable = require('../run/conversion/outputToObservable');
var rxNewToRxNewAndOld = require('../run/conversion/rxNewToRxNewAndOld');

/**
 * The router get function
 */
module.exports = function routerGet(paths) {

    var router = this;

    return rxNewToRxNewAndOld(Observable.defer(function() {
        var methodSummary;
        if (router._methodSummaryHook) {
            methodSummary = {
                method: 'get',
                pathSets: paths,
                start: router._now(),
                results: [],
                routes: []
            };
        }

        var result = Observable.defer(function () {
            var jsongCache = {};
            var action = runGetAction(router, jsongCache, methodSummary);
            var normPS = normalizePathSets(paths);

            if (getPathsCount(normPS) > router.maxPaths) {
                throw new MaxPathsExceededError();
            }

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

                        // The 3rd argument is the beginning of the actions
                        // arguments, which for get is the same as the
                        // unhandledPaths.
                        return outputToObservable(
                            router._unhandled.get(unhandledPaths)).

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
        });

        if (router._methodSummaryHook || router._errorHook) {
            result = result.
                do(function (response) {
                    if (router._methodSummaryHook) {
                        methodSummary.results.push({
                            time: router._now(),
                            value: response
                        });
                    }
                }, function (err) {
                    if (router._methodSummaryHook) {
                        methodSummary.end = router._now();
                        methodSummary.error = err;
                        router._methodSummaryHook(methodSummary);
                    }
                    if (router._errorHook) {
                        router._errorHook(err)
                    }
                }, function () {
                    if (router._methodSummaryHook) {
                        methodSummary.end = router._now();
                        router._methodSummaryHook(methodSummary);
                    }
                });
        }

        return result;
    }));
};