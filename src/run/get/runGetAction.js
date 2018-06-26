var outputToObservable = require('../conversion/outputToObservable');
var noteToJsongOrPV = require('../conversion/noteToJsongOrPV');
var Observable = require('falcor-observable').Observable;
var filter = require('falcor-observable').filter;
var map = require('falcor-observable').map;
var materialize = require('falcor-observable').materialize;
var tap = require('falcor-observable').tap;

module.exports = function runGetAction(routerInstance, jsongCache,
    methodSummary) {
    return function innerGetAction(matchAndPath) {
        return getAction(routerInstance, matchAndPath,
            jsongCache, methodSummary);
    };
};

function getAction(routerInstance, matchAndPath, jsongCache, methodSummary) {
    var match = matchAndPath.match;
    var out;
    try {
        out = match.action.call(routerInstance, matchAndPath.path);
        out = outputToObservable(out);
        if (methodSummary) {
            var _out = out;
            out = Observable.defer(function () {
                var route = {
                    start: routerInstance._now(),
                    route: matchAndPath.match.prettyRoute,
                    pathSet: matchAndPath.path,
                    results: []
                };
                methodSummary.routes.push(route);
                return _out.pipe(tap(function (response) {
                    route.results.push({
                        time: routerInstance._now(),
                        value: response
                    });
                }, function (err) {
                    route.error = err;
                    route.end = routerInstance._now();
                }, function () {
                    route.end = routerInstance._now();
                }));
            })
        }
    } catch (e) {
        out = Observable.throw(e);
    }

    return out.pipe(
        materialize(),
        filter(function(note) {
            return note.kind !== 'C';
        }),
        map(noteToJsongOrPV(matchAndPath.path, false, routerInstance)),
        map(function(jsonGraphOrPV) {
            return [matchAndPath.match, jsonGraphOrPV];
        })
    );
}
