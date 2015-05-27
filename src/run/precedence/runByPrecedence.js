var Observable = require('rx').Observable;
var getExecutableMatches = require('./getExecutableMatches');

/**
 * Sorts and strips the set of available matches given the pathSet.
 */
module.exports = function runByPrecedence(pathSet, matches, actionRunner) {

    // Precendence matching
    var sortedMatches = matches.
        sort(function(a, b) {
            if (a.precedence > b.precedence) {
                return 1;
            } else if (a.precedence < b.precedence) {
                return -1;
            }

            return 0;
        });

    var matchesWithPaths = getExecutableMatches(sortedMatches, [pathSet]);
    return Observable.
        from(matchesWithPaths).
        flatMap(actionRunner).

        // Note: We do not wait for each observable to finish,
        // but repeat the cycle per onNext.
        map(function(actionTuple) {

            return {
                match: actionTuple[0],
                value: actionTuple[1]
            };
        });
};
