var call = 'call';
var runCallAction = require('./../run/call/runCallAction');
var recurseMatchAndExecute = require('./../run/recurseMatchAndExecute');
var normalizePathSets = require('../operations/ranges/normalizePathSets');
var CallNotFoundError = require('./../errors/CallNotFoundError');
var materialize = require('../run/materialize');
var pathUtils = require('falcor-path-utils');
var collapse = pathUtils.collapse;
var Observable = require('../RouterRx.js').Observable;
var MaxPathsExceededError = require('../errors/MaxPathsExceededError');
var getPathsCount = require('./getPathsCount');
var outputToObservable = require('../run/conversion/outputToObservable');
var rxNewToRxNewAndOld = require('../run/conversion/rxNewToRxNewAndOld');

/**
 * Performs the call mutation.  If a call is unhandled, IE throws error, then
 * we will chain to the next dataSource in the line.
 */
module.exports = function routerCall(callPath, args,
                                     refPathsArg, thisPathsArg) {
    var router = this;

    var source = Observable.defer(function () {
        var methodSummary;
        if (router._methodSummaryHook) {
            methodSummary = {
                method: 'call',
                start: router._now(),
                callPath: callPath,
                args: args,
                refPaths: refPathsArg,
                thisPaths: thisPathsArg,
                results: [],
                routes: []
            };
        }

        var innerSource = Observable.defer(function() {

            var refPaths = normalizePathSets(refPathsArg || []);
            var thisPaths = normalizePathSets(thisPathsArg || []);
            var jsongCache = {};
            var action = runCallAction(router, callPath, args,
                refPaths, thisPaths, jsongCache, methodSummary);
            var callPaths = [callPath];

            if (getPathsCount(refPaths) +
                getPathsCount(thisPaths) +
                getPathsCount(callPaths) >
                router.maxPaths) {
                throw new MaxPathsExceededError();
            }

            return recurseMatchAndExecute(router._matcher, action,
                callPaths, call,
                router, jsongCache).

                // Take that
                map(function(jsongResult) {
                    var reportedPaths = jsongResult.reportedPaths;
                    var jsongEnv = {
                        jsonGraph: jsongResult.jsonGraph
                    };

                    // Call must report the paths that have been produced.
                    if (reportedPaths.length) {
                    // Collapse the reported paths as they may be inefficient
                    // to send across the wire.
                        jsongEnv.paths = collapse(reportedPaths);
                    }
                    else {
                        jsongEnv.paths = [];
                        jsongEnv.jsonGraph = {};
                    }

                    // add the invalidated paths to the jsonGraph Envelope
                    var invalidated = jsongResult.invalidated;
                    if (invalidated && invalidated.length) {
                        jsongEnv.invalidated = invalidated;
                    }

                    // Calls are currently materialized.
                    materialize(router, reportedPaths, jsongEnv);
                    return jsongEnv;
                }).

            // For us to be able to chain call requests then the error that is
            // caught has to be a 'function does not exist.' error.  From that
            // we will try the next dataSource in the line.
                catch(function catchException(e) {
                    if (e instanceof CallNotFoundError && router._unhandled) {
                        return outputToObservable(
                            router._unhandled.
                            call(callPath, args, refPaths, thisPaths));
                    }
                    throw e;
                });
        });

        if (router._methodSummaryHook || router._errorHook) {
            innerSource = innerSource.
                do(function (response) {
                    if (router._methodSummaryHook) {
                        methodSummary.results.push({
                            time: router._now(),
                            value: response
                        });
                    }
                }, function (err) {
                    if (router._methodSummaryHook) {
                        methodSummary.error = err;
                        methodSummary.end = router._now();
                        router._methodSummaryHook(methodSummary);
                    }
                    if (router._errorHook) {
                        router._errorHook(err);
                    }
                }, function () {
                    if (router._methodSummaryHook) {
                        methodSummary.end = router._now();
                        router._methodSummaryHook(methodSummary);
                    }
                });
        }

        return innerSource
    });







        return rxNewToRxNewAndOld(source);
};
