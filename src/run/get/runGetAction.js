var isJSONG = require('./../../support/isJSONG');
var isArray = Array.isArray;
var outputToObservable = require('../conversion/outputToObservable');
var noteToJsongOrPV = require('../conversion/noteToJsongOrPV');
var authorize = require('./../authorize');

module.exports = function runGetAction(routerInstance) {
    return function innerGetAction(matches) {
        return getAction(routerInstance, matches);
    };
};

function getAction(routerInstance, matches) {
    var match = matches[0];
    var out = outputToObservable(match.action.call(routerInstance, match.path));

    return authorize(routerInstance, match, out).
        materialize().
        filter(function(note) {
            return note.kind !== 'C';
        }).
        map(noteToJsongOrPV(match));
};

