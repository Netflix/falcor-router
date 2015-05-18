var Observable = require('rx').Observable;
/**
 * Processing the matches involve executing the highest
 * precedence match ... TODO: CR
 */
module.exports = function precedenceAndReduce(matches, actionRunner) {

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
        map(actionRunner).

        // NOTE:  We need reduce per observable.
        flatMap(function(actionObs) {
            return actionObs.

                // Gather the errors and values.
                reduce(function(acc, actionTuple) {
                    acc.values[acc.values.length] = actionTuple[1];

                    if (!acc.match && actionTuple) {
                        acc.match = actionTuple[0];
                    }

                    return acc;
                }, {
                    values: [],
                    match: null
                });
        });
};
