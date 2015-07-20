var isJSONG = require('./../../support/isJSONG');
var outputToObservable = require('./../conversion/outputToObservable');
var noteToJsongOrPV = require('./../conversion/noteToJsongOrPV');
var errors = require('./../../exceptions');
var authorize = require('./../authorize');
var jsongMerge = require('./../../cache/jsongMerge');
var pathValueMerge = require('./../../cache/pathValueMerge');

module.exports =  outerRunCallAction;

function outerRunCallAction(routerInstance, callPath, args,
                            suffixes, paths, jsongCache) {
    return function innerRunCallAction(matchAndPath) {
        return runCallAction(matchAndPath, routerInstance, callPath,
                             args, suffixes, paths, jsongCache);
    };
}

function runCallAction(matchAndPath, routerInstance, callPath, args,
                       suffixes, paths, jsongCache) {

    var match = matchAndPath.match;
    var matchedPath = matchAndPath.path;
    var out;

    // We are at out destination.  Its time to get out
    // the pathValues from the
    if (match.isCall) {

        // This is where things get interesting
        out = match.
            action.call(null, matchedPath, args, suffixes, paths);

        // Required to get the references from the outputting jsong
        // and pathValues.
        var tmpCache = {};
        out = outputToObservable(out).
            toArray().
            map(function(res) {
                // checks call for isJSONG and if there is jsong without paths
                // throw errors.
                var refs = [];
                var pathsFromCall = [];

                // Will flatten any arrays of jsong/pathValues.
                var callOutput = res.reduce(function(flattenedRes, next) {
                    return flattenedRes.concat(next);
                }, []);

                var refLen = -1;
                var mergedRefs;
                callOutput.forEach(function(r) {
                    // its json graph.
                    if (isJSONG(r)) {

                        // This is a hard error and must fully stop the server
                        if (!r.paths) {
                            var err =
                                new Error(errors.callJSONGraphWithouPaths);
                            err.throwToNext = true;
                            throw err;
                        }
                        mergedRefs = jsongMerge(tmpCache, r);
                        pathsFromCall = pathsFromCall.concat(r.paths);
                    }

                    // Only merge if we have to.
                    else {
                        mergedRefs = pathValueMerge(tmpCache, r);
                        pathsFromCall.push(r.path);
                    }

                    // Merges in the refs from the pV or jsong Merge.
                    if (mergedRefs) {
                        mergedRefs.forEach(function(nextRef) {
                            refs[++refLen] = nextRef;
                        });
                        mergedRefs = null;
                    }
                });

                var callLength = callOutput.length;
                var callPathSave1 = callPath.slice(0, callPath.length - 1);

                // We are going to use recurseMatchAndExecute to run
                // the paths and suffixes for call.  For that to happen
                // we must send a message to the outside to switch from
                // call to get.
                if (paths || suffixes) {
                    callOutput[++callLength] = {isMessage: true, method: 'get'};
                }

                // If there are paths to add then push them into the next
                // paths through 'additionalPaths' message.
                if (paths) {
                    if (paths && (callLength + 1)) {
                        paths.forEach(function(path) {
                            callOutput[++callLength] = {
                                isMessage: true,
                                additionalPath: callPathSave1.concat(path)
                            };
                        });
                    }

                }

                // Suffix is the same as paths except for how to calculate
                // a path per reference found from the callPath.
                if (suffixes) {

                    // matchedPath is the optimized path to call.
                    // e.g:
                    // callPath: [genreLists, 0, add] ->
                    // matchedPath: [lists, 'abc', add]
                    var optimizedPathLength = matchedPath.length - 1;

                    // For every reference build the complete path
                    // from the callPath - 1 and concat remaining
                    // path from the PathReference (path is where the
                    // reference was found, not the value of the reference).
                    // e.g: from the above example the output is:
                    // output = {path: [lists, abc, 0], value: [titles, 123]}
                    //
                    // This means the refs object = [output];
                    // callPathSave1: [genreLists, 0],
                    // optimizedPathLength: 3 - 1 = 2
                    // ref.path.slice(2): [lists, abc, 0].slice(2) = [0]
                    // deoptimizedPath: [genreLists, 0, 0]
                    //
                    // Add the deoptimizedPath to the callOutput messages.
                    // This will make the outer expand run those as a 'get'
                    //
                    refs.forEach(function(ref) {
                        var deoptimizedPath = callPathSave1.concat(
                                ref.path.slice(optimizedPathLength));
                        suffixes.forEach(function(suffix) {
                            var additionalPath =
                                deoptimizedPath.concat(suffix);
                            callOutput[++callLength] = {
                                isMessage: true,
                                additionalPath: additionalPath
                            };
                        });
                    });
                }

                // If there are no suffixes but there are references, report
                // the paths to the references.
                else if (pathsFromCall.length) {
                    pathsFromCall.forEach(function(path) {
                        callOutput[++callLength] = {
                            isMessage: true,
                            additionalPath: path
                        };
                    });
                }

                return callOutput;
            });
    } else {
        out = match.action.call(null, matchAndPath.path);
        out = outputToObservable(out);
    }

    return authorize(routerInstance, match, out).
        materialize().
        filter(function(note) {
            return note.kind !== 'C';
        }).
        map(noteToJsongOrPV(matchAndPath));
}
