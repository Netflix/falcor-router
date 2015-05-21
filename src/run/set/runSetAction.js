var isJSONG = require('./../../support/isJSONG');
var isArray = Array.isArray;
var outputToObservable = require('../conversion/outputToObservable');
var noteToJsongOrPV = require('../conversion/noteToJsongOrPV');
var authorize = require('./../authorize');

module.exports = function outerRunSetAction(routerInstance, modelContext) {
    return function innerRunSetAction(matches) {
        return runSetAction(routerInstance, modelContext, matches);
    };
};

function runSetAction(routerInstance, modelContext, matches) {
    var match = matches[0];
    var matchedPath = match.path;
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
        out = match.action.call(routerInstance, match.path);
        out = outputToObservable(out);
    }

    return authorize(routerInstance, match, out).
        materialize().
        filter(function(note) {
            return note.kind !== 'C';
        }).
        map(noteToJsongOrPV(match));
}
