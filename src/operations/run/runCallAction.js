var isJSONG = require('./../../support/isJSONG');
var isArray = Array.isArray;
var convertOutputToObservable = require('./convertOutputToObservable');
var convertNoteToJsongOrPV = require('./convertNoteToJsongOrPV');

module.exports =  outerRunCallAction;

function outerRunCallAction(routerInstance, args, suffixes, paths) {
    return function innerRunCallAction(matches) {
        return runCallAction(matches, routerInstance, args, suffixes, paths);
    };
}

function runCallAction(matches, routerInstance, args, suffixes, paths) {
    var match = matches[0];
    var matchedPath = match.path;
    var out;

    // We are at out destination.  Its time to get out
    // the pathValues from the
    if (match.isCall) {

        // This is where things get interesting
        out = match.
            action.call(null, matchedPath, args, suffixes, paths).
            toArray().
            flatMap(function(res) {
                debugger;
            });
    } else {
        out = match.action.call(null, match.path);
        out = convertOutputToObservable(out);
    }

    return out.
        materialize().
        filter(function(note) {
            return note.kind !== 'C';
        }).
        map(convertNoteToJsongOrPV(match));
}
