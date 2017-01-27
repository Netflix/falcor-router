var outputToObservable = require('../conversion/outputToObservable');
var noteToJsongOrPV = require('../conversion/noteToJsongOrPV');
var Observable = require('../../RouterRx.js').Observable;

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
                var start = routerInstance._now();
                var responses = [];
                return _out.do(function (response) {
                    responses.push(response);
                }, function (err) {
                    responses.push({ error: err });
                    var end = routerInstance._now();
                    methodSummary.routes = methodSummary.routes || [];
                    methodSummary.routes.push({
                        route: matchAndPath.match.prettyRoute,
                        start: start,
                        end: end,
                        error: err,
                        paths: matchAndPath.path
                    });
                }, function () {
                    var end = routerInstance._now();
                    methodSummary.routes = methodSummary.routes || [];
                    methodSummary.routes.push({
                        route: matchAndPath.match.prettyRoute,
                        start: start,
                        end: end,
                        responses: responses,
                        paths: matchAndPath.path
                    });
                });
            })
        }
    } catch (e) {
        out = Observable.throw(e);
    }

    return out.
        materialize().
        filter(function(note) {
            return note.kind !== 'C';
        }).
        map(noteToJsongOrPV(matchAndPath.path, false, routerInstance)).
        map(function(jsonGraphOrPV) {
            return [matchAndPath.match, jsonGraphOrPV];
        });
}
