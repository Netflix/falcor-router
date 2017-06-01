"use strict";
function noop() {}

function toRxNewObserver(observer) {
    var onNext = observer.onNext;
    var onError = observer.onError;
    var onCompleted = observer.onCompleted;
    if (
        typeof onNext !== "function" &&
        typeof onError !== "function" &&
        typeof onCompleted !== "function"
    ) {
        return observer;
    }
    // old observer!
    return {
        next: typeof onNext === "function"
            ? function(x) {
                  this.destination.onNext(x);
              }
            : noop,
        error: typeof onError === "function"
            ? function(err) {
                  this.destination.onError(err);
              }
            : noop,
        complete: typeof onCompleted === "function"
            ? function() {
                  this.destination.onCompleted();
              }
            : noop,
        destination: observer
    };
}

// WHY NOT BOTH?
module.exports = function rxNewToRxNewAndOld(rxNewObservable) {
    var _subscribe = rxNewObservable.subscribe;

    rxNewObservable.subscribe = function(observerOrNextFn, errFn, compFn) {
        var subscription;
        if (typeof observerOrNextFn !== "object" || observerOrNextFn === null) {
            subscription = _subscribe.call(
                this,
                observerOrNextFn,
                errFn,
                compFn
            );
        } else {
            var observer = toRxNewObserver(observerOrNextFn);
            subscription = _subscribe.call(this, observer);
        }

        var _unsubscribe = subscription.unsubscribe;

        subscription.unsubscribe = subscription.dispose = function() {
            this.isDisposed = true;
            _unsubscribe.call(this);
        };

        return subscription;
    };

    return rxNewObservable;
};
