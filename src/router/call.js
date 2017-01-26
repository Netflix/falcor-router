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
var rxNewToRxNewAndOld = require('../run/conversion/rxNewToRxNewAndOld');

/**
 * Performs the call mutation.  If a call is unhandled, IE throws error, then
 * we will chain to the next dataSource in the line.
 */
module.exports = function routerCall(callPath, args,
                                     refPathsArg, thisPathsArg) {
    var router = this;
    var routeSummary;

    var source = Observable.defer(function() {

        var refPaths = normalizePathSets(refPathsArg || []);
        var thisPaths = normalizePathSets(thisPathsArg || []);
        var jsongCache = {};
        var action = runCallAction(router, callPath, args,
                                   refPaths, thisPaths, jsongCache);
        var callPaths = [callPath];

        if (getPathsCount(refPaths) +
            getPathsCount(thisPaths) +
            getPathsCount(callPaths) >
            router.maxPaths) {
            throw new MaxPathsExceededError();
        }

        return recurseMatchAndExecute(router._matcher, action, callPaths, call,
                                      router, jsongCache, routeSummary).

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
                    return router._unhandled.
                        call(callPath, args, refPaths, thisPaths);
                }
                throw e;
            });
    });


    if (router._routeSummaryHook || router._errorHook) {
        if (router._routeSummaryHook) {
            routeSummary = {
                method: 'call',
                start: router._now(),
                arguments: {
                    callPath: callPath,
                    args: args,
                    refPathsArg: refPathsArg,
                    thisPathsArg: thisPathsArg
                }
            };
        }

        source = source.
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
                if (router._errorHook) {
                    router._errorHook(err);
                }
            });
    }

    return rxNewToRxNewAndOld(source);
};
