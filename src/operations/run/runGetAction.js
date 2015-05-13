var isJSONG = require('./../../support/isJSONG');
var isArray = Array.isArray;
var convertOutputToObservable = require('./convertOutputToObservable');
var convertNoteToJsongOrPV = require('./convertNoteToJsongOrPV');

module.exports = function runGetAction(matches) {
    var self = this;
    var match = matches[0];
    var out = match.action.call(self, match.path);
    out = convertOutputToObservable(out);

    return out.
        materialize().
        filter(function(note) {
            return note.kind !== 'C';
        }).
        map(convertNoteToJsongOrPV(match));
};

