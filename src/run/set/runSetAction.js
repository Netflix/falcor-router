var outputToObservable = require('../conversion/outputToObservable');
var noteToJsongOrPV = require('../conversion/noteToJsongOrPV');
var authorize = require('./../authorize');

module.exports = function outerRunSetAction(routerInstance, modelContext) {
    return function innerRunSetAction(matchAndPath) {
        return runSetAction(routerInstance, modelContext, matchAndPath);
    };
};

function runSetAction(routerInstance, modelContext, matchAndPath) {
    var match = matchAndPath.match;
    var matchedPath = matchAndPath.path;
    var out;

    // We are at out destination.  Its time to get out
    // the pathValues from the
    if (match.isSet) {
        out =
            modelContext.
                get(matchedPath).
                toPathValues().
                toArray().
                flatMap(function(pathValues) {
                    var matchedResults =
                        match.action.call(routerInstance, pathValues);
                    return outputToObservable(matchedResults);
                });
    } else {
        out = match.action.call(routerInstance, matchAndPath.path);
        out = outputToObservable(out);
    }

    return authorize(routerInstance, match, out).
        materialize().
        filter(function(note) {
            return note.kind !== 'C';
        }).
        map(noteToJsongOrPV(matchAndPath));
}
