var outputToObservable = require('./conversion/outputToObservable');
var Observable = require('rx').Observable;
var JSONGraphError = require('./../JSONGraphError');
var $type = require('./../support/types');

/**
 * Takes in the matches from the action runner and emits a
 * true / false value to specify if the user is actually able
 * to be using this route.
 * @param {Router} routerInstance
 * @param {Match} match
 * @param {Observable} next
 */
module.exports = function authorize(routerInstance, match, next) {
    if (!match.authorize) {
        return Observable.
            of(true).
            flatMap(function() { return next; });
    }

    var out = match.authorize.call(routerInstance, match);
    return outputToObservable(out).
        doAction(function(isAuthorized) {
            if (!isAuthorized) {
                throw new JSONGraphError({
                    $type: $type.$error,
                    value: {
                        unauthorized: true,
                        message: 'unauthorized'
                    }
                });
            }
        }).
        flatMap(function() {
            return next;
        });
};
