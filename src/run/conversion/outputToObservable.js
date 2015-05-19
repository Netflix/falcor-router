var Observable = require('rx').Observable;
var isArray = Array.isArray;

/**
 * For the router there are several return types from user
 * functions.  The standard set are: synchronous type (boolean or
 * json graph) or an async type (observable or a thenable).
 */
module.exports = function outputToObservable(valueOrObservable) {

    // place holder.  Observables have highest precedence.
    if (valueOrObservable.subscribe) { }

    // promise
    else if (valueOrObservable.then) {
        valueOrObservable = Observable.
            fromPromise(valueOrObservable).
            flatMap(function(promiseResult) {
                if (isArray(promiseResult)) {
                    return Observable.from(promiseResult);
                }
                return Observable.of(promiseResult);
            });
    }

    // from array of pathValues.
    else if (isArray(valueOrObservable)) {
        valueOrObservable = Observable.from(valueOrObservable);
    }

    // this will be jsong or pathValue at this point.
    // NOTE: For the case of authorize this will be a boolean
    else {
        valueOrObservable = Observable.of(valueOrObservable);
    }

    return valueOrObservable;
};
