var isJSONG = require('./../../support/isJSONG');
var isArray = Array.isArray;
var outputToObservable = require('./../conversion/outputToObservable');
var noteToJsongOrPV = require('./../conversion/noteToJsongOrPV');
var runPaths = require('./runPaths');
var runSuffix = require('./runSuffix');
var Observable = require('rx').Observable;
var errors = require('./../../exceptions');

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
            action.call(null, matchedPath, args, suffixes, paths);

        out = outputToObservable(out).
            toArray().
            flatMap(function(res) {
                // checks call for isJSONG and if there is jsong without paths
                // throw errors.
                var paths = [];
                var len = -1;
                res.forEach(function(r) {
                    // its json graph.
                    if (isJSONG(r)) {

                        // This is a hard error and must fully stop the server
                        if (!r.paths) {
                            var err = new Error(errors.callJSONGraphWithouPaths);
                            err.throwToNext = true;
                            throw err;
                        }

                        paths[++len] = r.paths;
                    }

                    // its a path value.
                    else {
                        paths[++len] = r.path;
                    }
                });

                return Observable.from(res);
            });
    } else {
        out = match.action.call(null, match.path);
        out = outputToObservable(out);
    }

    return out.
        materialize().
        filter(function(note) {
            return note.kind !== 'C';
        }).
        map(noteToJsongOrPV(match));
}
