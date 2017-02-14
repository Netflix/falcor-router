/* eslint-disable max-len */
var outputToObservable = require('../conversion/outputToObservable');
var noteToJsongOrPV = require('../conversion/noteToJsongOrPV');
var spreadPaths = require('./../../support/spreadPaths');
var getValue = require('./../../cache/getValue');
var jsongMerge = require('./../../cache/jsongMerge');
var optimizePathSets = require('./../../cache/optimizePathSets');
var hasIntersection = require('./../../operations/matcher/intersection/hasIntersection');
var pathValueMerge = require('./../../cache/pathValueMerge');
var Observable = require('../../RouterRx.js').Observable;
/* eslint-enable max-len */

module.exports = function outerRunSetAction(routerInstance, modelContext,
                                            jsongCache, methodSummary) {
    return function innerRunSetAction(matchAndPath) {
        return runSetAction(routerInstance, modelContext,
                            matchAndPath, jsongCache, methodSummary);
    };
};

function runSetAction(routerInstance, jsongMessage, matchAndPath,
    jsongCache, methodSummary) {
    var match = matchAndPath.match;
    var out;
    var arg = matchAndPath.path;

    // We are at out destination.  Its time to get out
    // the pathValues from the
    if (match.isSet) {
        var paths = spreadPaths(jsongMessage.paths);

        // We have to ensure that the paths maps in order
        // to the optimized paths array.
        var optimizedPathsAndPaths =
            paths.
                // Optimizes each path.
                map(function(path) {
                    return [optimizePathSets(
                        jsongCache, [path], routerInstance.maxRefFollow)[0],
                        path];
                }).
                // only includes the paths from the set that intersect
                // the virtual path
                filter(function(optimizedAndPath) {
                    return optimizedAndPath[0] &&
                        hasIntersection(optimizedAndPath[0], match.virtual);
                });
        var optimizedPaths = optimizedPathsAndPaths.map(function(opp) {
            return opp[0];
        });
        var subSetPaths = optimizedPathsAndPaths.map(function(opp) {
            return opp[1];
        });
        var tmpJsonGraph = subSetPaths.
            reduce(function(json, path, i) {
                pathValueMerge(json, {
                    path: optimizedPaths[i],
                    value: getValue(jsongMessage.jsonGraph, path)
                });
                return json;
            }, {});

        // Takes the temporary JSONGraph, attaches only the matched paths
        // then creates the subset json and assigns it to the argument to
        // the set function.
        var subJsonGraphEnv = {
            jsonGraph: tmpJsonGraph,
            paths: [match.requested]
        };
        arg = {};
        jsongMerge(arg, subJsonGraphEnv, routerInstance);
    }
    try {
        out = match.action.call(routerInstance, arg);
        out = outputToObservable(out);

        if (methodSummary) {
            var _out = out;
            out = Observable.defer(function () {
                var route = {
                    route: matchAndPath.match.prettyRoute,
                    pathSet: matchAndPath.path,
                    start: routerInstance._now()
                };
                methodSummary.routes.push(route);

                return _out.do(
                    function (result) {
                        route.results = route.results || [];
                        route.results.push({
                            time: routerInstance._now(),
                            value: result
                        });
                    },
                    function (err) {
                        route.error = err;
                        route.end = routerInstance._now();
                    },
                    function () {
                        route.end = routerInstance._now();
                    }
                )
            });
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
