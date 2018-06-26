var Observable = require('falcor-observable').Observable;
var pathValueMerge = require('./../cache/pathValueMerge');
var optimizePathSets = require('falcor-path-utils').optimizePathSets;
var $atom = require('./../support/types').$atom;

/**
 * given a set of paths and a jsonGraph envelope, materialize missing will
 * crawl all the paths to ensure that they have been fully filled in.  The
 * paths that are missing will be filled with materialized atoms.
 */
module.exports = function materializeMissing(router, paths, jsongEnv) {
    var jsonGraph = jsongEnv.jsonGraph;
    var materializedAtom = {$type: $atom};

    // Optimizes the pathSets from the jsong then
    // inserts atoms of undefined.
    var result = optimizePathSets(jsonGraph, paths, router.maxRefFollow);
    if (result.error) {
        return Observable.throw(result.error);
    }
    result.paths.
        forEach(function(optMissingPath) {
            pathValueMerge(jsonGraph, {
                path: optMissingPath,
                value: materializedAtom
            });
        });

    return Observable.of(jsongEnv);
}
