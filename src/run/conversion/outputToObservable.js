var Observable = require('rx').Observable;
var isArray = Array.isArray;

/**
 * For the router there are several return types from user
 * functions.  The standard set are: synchronous type (boolean or
 * json graph) or an async type (observable or a thenable).
 */
module.exports = function outputToObservable(valueOrObservable) {
    var value = valueOrObservable,
        oldObservable;

    // falsy value
    if (!value) {
        return Observable.return(value);
    }

    // place holder.  Observables have highest precedence.
    else if (value.subscribe) {
        if (!(value instanceof Observable)) {
            oldObservable = value;
            value = Observable.create(function(observer) {
                return oldObservable.subscribe(observer);
            });
        }
    }

    // promise
    else if (value.then) {
        value = Observable.fromPromise(value);
    }

    // from array of pathValues.
    else if (isArray(value)) {
        value = Observable.of(value);
    }

    // this will be jsong or pathValue at this point.
    // NOTE: For the case of authorize this will be a boolean
    else {
        value = Observable.of(value);
    }

    return value;
};
