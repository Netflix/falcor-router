var isJSONG = require('./../../support/isJSONG');
var isArray = Array.isArray;
var convertOutputToObservable = require('./convertOutputToObservable');
var convertNoteToJsongOrPV = require('./convertNoteToJsongOrPV');

module.exports = function runSetAction(modelContext) {
    return function innerRunSetAction(matches) {
        return runSetAction(modelContext, matches);
    };
};

function runSetAction(modelContext, matches) {
    var self = this;
    var match = matches[0];
    var out = match.action.call(self, match.path);

    // We are at out destination.  Its time to get out
    // the pathValues from the
    if (match.isSet) {

    }
    out = convertOutputToObservable(out);

    return out.
        materialize().
        filter(function(note) {
            return note.kind !== 'C';
        }).
        map(convertNoteToJsongOrPV(match));
}
