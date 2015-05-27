var outputToObservable = require('../conversion/outputToObservable');
var noteToJsongOrPV = require('../conversion/noteToJsongOrPV');
var authorize = require('./../authorize');

module.exports = function runGetAction(routerInstance) {
    return function innerGetAction(matchAndPath) {
        return getAction(routerInstance, matchAndPath);
    };
};

function getAction(routerInstance, matchAndPath) {
    var match = matchAndPath.match;
    var matchAction = match.action.call(routerInstance, matchAndPath.path);
    var out = outputToObservable(matchAction);

    return authorize(routerInstance, match, out).
        materialize().
        filter(function(note) {
            return note.kind !== 'C';
        }).
        map(noteToJsongOrPV(matchAndPath));
}

