/* eslint-disable max-len */
var outputToObservable = require('../conversion/outputToObservable');
var noteToJsongOrPV = require('../conversion/noteToJsongOrPV');
var spreadPaths = require('./../../support/spreadPaths');
var getValue = require('./../../cache/getValue');
var jsongMerge = require('./../../cache/jsongMerge');
var optimizePathSets = require('./../../cache/optimizePathSets');
var hasIntersection = require('./../../operations/matcher/intersection/hasIntersection');
var pathValueMerge = require('./../../cache/pathValueMerge');
var Observable = require('rx').Observable;
/* eslint-enable max-len */

module.exports = function outerRunSetAction(routerInstance, modelContext,
                                            jsongCache) {
    return function innerRunSetAction(matchAndPath) {
        return runSetAction(routerInstance, modelContext,
                            matchAndPath, jsongCache);
    };
};

function runSetAction(routerInstance, jsongMessage, matchAndPath, jsongCache) {
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
        jsongMerge(arg, subJsonGraphEnv);
    }
    try {
        out = match.action.call(routerInstance, arg);
        out = outputToObservable(out);
    } catch (e) {
        out = Observable.throw(e);
    }

    return out.
        materialize().
        filter(function(note) {
            return note.kind !== 'C';
        }).
        map(noteToJsongOrPV(matchAndPath));
}
