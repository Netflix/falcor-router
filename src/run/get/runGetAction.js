var isJSONG = require('./../../support/isJSONG');
var isArray = Array.isArray;
var outputToObservable = require('../conversion/outputToObservable');
var noteToJsongOrPV = require('../conversion/noteToJsongOrPV');

module.exports = function runGetAction(matches) {
    var self = this;
    var match = matches[0];
    var out = match.action.call(self, match.path);
    out = outputToObservable(out);

    return out.
        materialize().
        filter(function(note) {
            return note.kind !== 'C';
        }).
        map(noteToJsongOrPV(match));
};

