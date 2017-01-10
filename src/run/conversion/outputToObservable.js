var Observable = require('../../RouterRx.js').Observable;
var isArray = Array.isArray;
var $$observable = require('symbol-observable').default;

/**
 * For the router there are several return types from user
 * functions.  The standard set are: synchronous type (boolean or
 * json graph) or an async type (observable or a thenable).
 */
module.exports = function outputToObservable(valueOrObservable) {
    var value = valueOrObservable;

    // if it's one of OUR observables, great.
    if (value instanceof Observable) {
        return value;
    }

    // falsy value
    if (!value) {
        return Observable.of(value);
    }

    // lowercase-o observables, 3rd party observables
    if (value[$$observable]) {
        return Observable.from(value);
    }

    // Rx4 and lower observables
    if (value.subscribe) {
        var oldObservable = value;
        return Observable.create(function(observer) {
            var oldObserver = {
              onNext: function (v) {
                  this.observer.next(v);
              },
              onError: function (err) {
                  this.observer.error(err);
              },
              onCompleted: function () {
                  this.observer.complete();
              },
              observer: observer
            };
            var oldSubscription = oldObservable.subscribe(oldObserver);
            return function () {
                oldSubscription.dispose();
            };
        });
    }

    // promises
    if (value.then) {
        return Observable.from(value);
    }

    // from array of pathValues.
    if (isArray(value)) {
        return Observable.of(value);
    }

    // this will be jsong or pathValue at this point.
    // NOTE: For the case of authorize this will be a boolean
    return Observable.of(value);
};
