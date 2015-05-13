var Observable = require('rx').Observable;
var isArray = Array.isArray;
module.exports = function convertOutputToObservable(valueOrObservable) {

    // place holder
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
    else {
        valueOrObservable = Observable.of(valueOrObservable);
    }

    return valueOrObservable;
};
