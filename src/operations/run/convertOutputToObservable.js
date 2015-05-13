var Observable = require('rx');
var isArray = Array.isArray;
module.exports = function convertOutputToObservable(obs) {
    // place holder
    if (out.subscribe) { }

    // promise
    else if (out.then) {
        out = Observable.
            fromPromise(out).
            flatMap(function(promiseResult) {
                if (isArray(promiseResult)) {
                    return Observable.from(promiseResult);
                }
                return Observable.of(promiseResult);
            });
    }

    // from array of pathValues.
    else if (isArray(out)) {
        out = Observable.from(out);
    }

    // this will be jsong or pathValue at this point.
    else {
        out = Observable.of(out);
    }

    return out;
};
