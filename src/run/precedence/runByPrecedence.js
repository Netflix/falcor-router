var Observable = require('falcor-observable').Observable;
var concat = require('falcor-observable').concat;
var map = require('falcor-observable').map;
var mergeMap = require('falcor-observable').mergeMap;
var getExecutableMatches = require('./getExecutableMatches');

/**
 * Sorts and strips the set of available matches given the pathSet.
 */
module.exports = function runByPrecedence(pathSet, matches, actionRunner) {

    // Precendence matching
    var sortedMatches = matches.
        sort(function(a, b) {
            if (a.precedence < b.precedence) {
                return 1;
            } else if (a.precedence > b.precedence) {
                return -1;
            }

            return 0;
        });

    var execs = getExecutableMatches(sortedMatches, [pathSet]);

    var setOfMatchedPaths = Observable.from(execs.matchAndPaths).pipe(
        mergeMap(actionRunner),

        // Note: We do not wait for each observable to finish,
        // but repeat the cycle per onNext.
        map(function(actionTuple) {

            return {
                match: actionTuple[0],
                value: actionTuple[1]
            };
        })
    );

    if (execs.unhandledPaths) {
        setOfMatchedPaths = setOfMatchedPaths.pipe(
            concat(Observable.of({
                match: {suffix: []},
                value: {
                    isMessage: true,
                    unhandledPaths: execs.unhandledPaths
                }
            }))
        );
    }

    return setOfMatchedPaths;
};
