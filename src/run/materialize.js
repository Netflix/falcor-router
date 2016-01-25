var pathValueMerge = require('./../cache/pathValueMerge');
var optimizePathSets = require('./../cache/optimizePathSets');
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
    optimizePathSets(jsonGraph, paths, router.maxRefFollow).
        forEach(function(optMissingPath) {
            pathValueMerge(jsonGraph, {
                path: optMissingPath,
                value: materializedAtom
            });
        });

    return {jsonGraph: jsonGraph};
}
