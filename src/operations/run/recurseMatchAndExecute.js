var Rx = require('rx');
var Observable = Rx.Observable;
var jsongMerge = require('./../../merge/jsongMerge');
var pathValueMerge = require('./../../merge/pathValueMerge');
var isJSONG = require('./../../support/isJSONG');
var pluckHighestPrecedence = require('./pluckHighestPrecedence');
var precedenceAndReduce = require('./precedenceAndReduce');
var falcor = require('falcor');
var collapse = require('./../collapse');

/**
 * The recurse and match function will async recurse as long as
 * there are still more paths to be executed.  The match function
 * will return a set of objects that have how much of the path that
 * is matched.  If there still is more, denoted by suffixes,
 * paths to be matched then the recurser will keep running.
 */
module.exports = function recurseMatchAndExecute(match, actionRunner, paths) {
    return _recurseMatchAndExecute(match, actionRunner, paths, 0);
};

/**
 * performs the actual recursing
 */
function _recurseMatchAndExecute(match, actionRunner, paths, loopCount) {
    var theSeed = {};

    return Observable.

        // Each pathSet (some form of collapsed path) need to be sent independently.
        // for each collapsed pathSet will, if producing refs, be the highest likelihood
        // of collapsibility.
        from(paths).
        map(function(p) {
            return {
                nextPaths: p,
                jsong: theSeed,
                missing: [],
                invalidated: []
            };
        }).
        expand(function(outerResults) {
            var nextPaths = outerResults.nextPaths;
            if (!nextPaths.length) {
                return Observable.empty();
            }

            var matchedResults = match(nextPaths);
            return precedenceAndReduce(matchedResults.matched, actionRunner).

                // Generate from the combined results the next requestable paths
                // and insert errors / values into the cache.
                flatMap(function(results) {
                    var values = results.values;
                    var suffix = results.match.suffix;
                    var hasSuffix = suffix.length;
                    var nextPaths = [];
                    var insertedReferences = [];
                    var jsongSeed = outerResults.jsong;

                    values.forEach(function(jsongOrPV) {
                        var refs = [];
                        if (isJSONG(jsongOrPV)) {
                            refs = jsongMerge(jsongSeed, jsongOrPV);
                        }
                        else if (jsongOrPV.value === undefined) {
                            var invalidated = results.invalidated;
                            invalidated[invalidated.length] = jsongOrPV;
                        }
                        else {
                            refs = pathValueMerge(jsongSeed, jsongOrPV);
                        }

                        if (hasSuffix && refs.length) {
                            var len = -1;
                            refs.forEach(function(refs) {
                                nextPaths[++len] = refs.concat(suffix);
                            });

                            // TODO: collapse the next paths here.
                        }

                        else if (hasSuffix) {
                            // TODO: do we materialize?
                        }
                    });


                    // Each nextPaths should be executed on its own.
                    // The reasoning is that is it cannot collapse now
                    // it probably wont collapse in the future
                    return Observable.
                        from(nextPaths).
                        map(function(p) {
                            var next = {
                                nextPaths: p,
                                jsong: jsongSeed,
                                missing: matchedResults.
                                    missingPaths.
                                    concat(outerResults.missing)
                            };
                            return next;
                        }).
                        defaultIfEmpty({
                            nextPaths: [],
                            jsong: theSeed,
                            missing: matchedResults.
                                missingPaths.
                                concat(outerResults.missing)
                        });

                }).
                defaultIfEmpty({
                    nextPaths: [],
                    missing: matchedResults.missing
                });

        }).
        filter(function(x) { return x.nextPaths.length === 0; });
}

