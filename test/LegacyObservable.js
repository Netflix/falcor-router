"use strict";

function noop() {
    // do nothing
}

var disposeNoop = { dispose: noop };

function disposable(dispose) {
    if (typeof dispose === "function") {
        return { dispose: dispose };
    }
    if (typeof dispose === "undefined" || dispose === null) {
        return disposeNoop;
    }
    return dispose;
}

function functionsObserver(onNext, onError, onCompleted) {
    return {
        onNext: typeof onNext === "function" ? onNext : noop,
        onError: typeof onError === "function" ? onError : noop,
        onCompleted: typeof onCompleted === "function" ? onCompleted : noop
    };
}

function partialObserver(partial) {
    return {
        onNext: typeof partial.onNext === "function"
            ? partial.onNext.bind(partial)
            : noop,
        onError: function onError(e) {
            if (typeof partial.onError === "function") {
                partial.onError(e);
            }
        },
        onCompleted: function onCompleted() {
            if (typeof partial.onCompleted === "function") {
                partial.onCompleted();
            }
        }
    };
}

function observer(observerOrOnNext, onError, onCompleted) {
    return typeof observerOrOnNext === "object" && observerOrOnNext !== null
        ? partialObserver(observerOrOnNext)
        : functionsObserver(observerOrOnNext, onError, onCompleted);
}

function create(subscribe) {
    return {
        subscribe: function(observerOrOnNext, onError, onCompleted) {
            return disposable(
                subscribe(observer(observerOrOnNext, onError, onCompleted))
            );
        }
    };
}

function empty() {
    return create(function(obs) {
        obs.onCompleted();
    });
}

function of(value) {
    return create(function(obs) {
        obs.onNext(value);
        obs.onCompleted();
    });
}

module.exports = {
    create: create,
    empty: empty,
    of: of
};
