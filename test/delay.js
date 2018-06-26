"use strict";
var Observable = require('falcor-observable/lib/es-observable').Observable;

function delay(time) {
    return function delayOperator(source) {
        return new Observable(function (observer) {
            return source.subscribe(
                function next(v) {
                    setTimeout(function () {
                        observer.next(v);
                    }, time);
                },
                function error(e) {
                    setTimeout(function () {
                        observer.error(e);
                    }, time);
                },
                function complete() {
                    setTimeout(function () {
                        observer.complete();
                    }, time);
                }
            );
        });
    };
}

module.exports = { delay: delay };
