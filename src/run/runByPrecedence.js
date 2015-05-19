var Observable = require('rx').Observable;
var authorize = require('./authorize');
/**
 * Processing the matches involve executing the highest
 * precedence match ... TODO: CR
 */
module.exports = function runByPrecedence(matches, actionRunner) {

    // Precendence matching
    matches = matches.
        sort(function(a, b) {
            if (a.precedence > b.precedence) {
                return 1;
            } else if (a.precedence < b.precedence) {
                return -1;
            }

            return 0;
        });

    return Observable.
        of(matches).
        flatMap(actionRunner).

        // NOTE: We are not reducing per observable
        map(function(actionTuple) {

            return {
                match: actionTuple[0],
                value: actionTuple[1]
            };
        });
};
