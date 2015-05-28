var outputToObservable = require('../conversion/outputToObservable');
var noteToJsongOrPV = require('../conversion/noteToJsongOrPV');
var authorize = require('./../authorize');
var spreadPaths = require('./../../support/spreadPaths');
var getValue = require('./../../cache/getValue');
var optimizePathSets = require('./../../cache/optimizePathSets');

module.exports = function outerRunSetAction(routerInstance, modelContext) {
    return function innerRunSetAction(matchAndPath) {
        return runSetAction(routerInstance, modelContext, matchAndPath);
    };
};

function runSetAction(routerInstance, jsongMessage, matchAndPath) {
    var jsongCache = routerInstance.jsongCache;
    var match = matchAndPath.match;
    var out;
    var arg = matchAndPath.path;

    // We are at out destination.  Its time to get out
    // the pathValues from the
    if (match.isSet) {
        var paths = spreadPaths(jsongMessage.paths);

        // We have to ensure that the paths maps in order
        // to the optimized paths array.
        var optimizedPaths = paths.map(function(path) {
            return optimizePathSets(jsongCache, [path])[0];
        });

        arg = paths.
            map(function(path, i) {
                return {
                    path: optimizedPaths[i],
                    value: getValue(jsongMessage.jsong, path)
                };
            });
    }
    out = match.action.call(routerInstance, arg);
    out = outputToObservable(out);

    return authorize(routerInstance, match, out).
        materialize().
        filter(function(note) {
            return note.kind !== 'C';
        }).
        map(noteToJsongOrPV(matchAndPath));
}
