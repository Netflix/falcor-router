var Observable = require('falcor-observable').Observable;
var isArray = Array.isArray;
var $$observable = require('symbol-observable').default;

/**
 * For the router there are several return types from user
 * functions.  The standard set are: synchronous type (boolean or
 * json graph) or an async type (observable or a thenable).
 */
module.exports = function outputToObservable(valueOrObservable) {
    var value = valueOrObservable;

    // primitives, arrays.
    if (typeof value !== "object" || value === null || isArray(value)) {
        return Observable.of(value);
    }

    // compatible observables, classic observables, promises.
    if (
        typeof value[$$observable] === "function"
        || typeof value.subscribe === "function"
        || typeof value.then === "function"
    ) {
        return Observable.from(value);
    }

    // this will be jsong or pathValue at this point.
    return Observable.of(value);
};
