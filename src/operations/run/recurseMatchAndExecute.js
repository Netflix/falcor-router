var Rx = require('rx');
var Observable = Rx.Observable;
var jsongMerge = require('./../../merge/jsongMerge');
var pathValueMerge = require('./../../merge/pathValueMerge');
var isJSONG = require('./../../support/isJSONG');
var pluckHighestPrecedence = require('./pluckHighestPrecedence');
var precedenceAndReduce = require('./precedenceAndReduce');

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


    return Observable.
        of({nextPaths: paths, jsong: {}, missing: []}).
        expand(function(outerResults) {
            var nextPaths = outerResults.nextPaths;
            if (!nextPaths.length) {
                return Observable.empty();
            }

            var matchedResults = match(nextPaths);
            debugger
            return precedenceAndReduce(matchedResults.matched, actionRunner).

                // Generate from the combined results the next requestable paths
                // and insert errors / values into the cache.
                map(function(results) {
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
                        } else {
                            refs = pathValueMerge(jsongSeed, jsongOrPV);
                        }

                        if (hasSuffix && refs.length) {
                            var len = -1;
                            refs.forEach(function(refs) {
                                nextPaths[++len] = refs.concat(suffix);
                            });
                        }

                        else if (hasSuffix) {
                            // TODO: do we materialize?
                        }
                    });

                    results.nextPaths = nextPaths;
                    results.jsong = outerResults.jsong;
                    results.missing = matchedResults.
                        missingPaths.
                        concat(outerResults.missing);
                    return results;
                }).
                defaultIfEmpty({
                    nextPaths: [],
                    missing: matchedResults.missing
                });

        }).
        filter(function(x) { return x.nextPaths.length === 0; });
}

