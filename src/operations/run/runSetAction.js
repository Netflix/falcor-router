var isJSONG = require('./../../support/isJSONG');
var isArray = Array.isArray;
var convertOutputToObservable = require('./convertOutputToObservable');
var convertNoteToJsongOrPV = require('./convertNoteToJsongOrPV');

module.exports = function outerRunSetAction(modelContext) {
    return function innerRunSetAction(matches) {
        return runSetAction(modelContext, matches);
    };
};

function runSetAction(modelContext, matches) {
    var self = this;
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
                    var matchedResults = match.action.call(self, pathValues);
                    return convertOutputToObservable(matchedResults);
                });
    } else {
        out = match.action.call(self, match.path);
        out = convertOutputToObservable(out);
    }

    return out.
        materialize().
        filter(function(note) {
            return note.kind !== 'C';
        }).
        map(convertNoteToJsongOrPV(match));
}
