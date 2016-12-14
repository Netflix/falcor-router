var falcorPathUtils = require('falcor-path-utils');

function getPathsCount(pathSets) {
    return pathSets.reduce(function(numPaths, pathSet) {
        return numPaths + falcorPathUtils.pathCount(pathSet);
    }, 0);
}

module.exports = getPathsCount;
