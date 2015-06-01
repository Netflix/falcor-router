var isJSONG = require('./../../support/isJSONG');
var outputToObservable = require('./../conversion/outputToObservable');
var noteToJsongOrPV = require('./../conversion/noteToJsongOrPV');
var errors = require('./../../exceptions');
var authorize = require('./../authorize');
var jsongMerge = require('./../../cache/jsongMerge');
var pathValueMerge = require('./../../cache/pathValueMerge');

module.exports =  outerRunCallAction;

function outerRunCallAction(routerInstance, callPath, args, suffixes, paths, jsongCache) {
    return function innerRunCallAction(matchAndPath) {
        return runCallAction(matchAndPath, routerInstance, callPath,
                             args, suffixes, paths, jsongCache);
    };
}

function runCallAction(matchAndPath, routerInstance, callPath, args, suffixes, paths, jsongCache) {
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
                var mergedRefs;

                // Will flatten any arrays of jsong/pathValues.
                var returnValue = res.reduce(function(flattenedRes, next) {
                    return flattenedRes.concat(next);
                }, []);
                var len = returnValue.length - 1;

                returnValue.forEach(function(r) {
                    // its json graph.
                    if (isJSONG(r)) {

                        // This is a hard error and must fully stop the server
                        if (!r.paths) {
                            var err = new Error(errors.callJSONGraphWithouPaths);
                            err.throwToNext = true;
                            throw err;
                        }
                        if (suffixes) {
                            mergedRefs = jsongMerge(tmpCache, r);
                        }
                    }

                    // Only merge if we have to.
                    else if (suffixes) {
                        mergedRefs = pathValueMerge(tmpCache, r);
                    }

                    // Merges in the refs from the pV or jsong Merge.
                    if (mergedRefs) {
                        mergedRefs.forEach(function(nextRef) {
                            refs[++len] = nextRef;
                        });
                        mergedRefs = null;
                    }
                });

                // NOTE: Things get tricky
                // Its time to execute the paths or suffixes
                // To do this, we are going to use the outside expand to
                // continue to operate on the returned paths and merge in
                // the call result.
                if (paths && (len + 1) || suffixes) {

                    // Sends a message to the outside expand saying to
                    // become a get rather than call.
                    returnValue[++len] = {isMessage: true, method: 'get'};

                    var callPathSave1 = callPath.slice(0, callPath.length - 1);
                    if (paths && (len + 1)) {
                        paths.forEach(function(path) {
                            returnValue[++len] = {
                                isMessage: true,
                                additionalPath: callPathSave1.concat(path)
                            };
                        });
                    }

                    if (suffixes) {
                        var optimizedPathLength = matchedPath.length - 1;

                        // Now its time to merge in some more path messages.
                        refs.forEach(function(ref) {
                            var deoptimizedPath = callPathSave1.concat(
                                    ref.path.slice(optimizedPathLength));
                            suffixes.forEach(function(suffix) {
                                returnValue[++len] = {
                                    isMessage: true,
                                    additionalPath: deoptimizedPath.concat(suffix)
                                };
                            });
                        });
                    }
                }

                return returnValue;
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
