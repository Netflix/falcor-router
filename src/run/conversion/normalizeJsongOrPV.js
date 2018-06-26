var isJSONG = require('./../../support/isJSONG');

/**
 * Ensures jsonGraph has paths added.
 * @param {PathSet|PathSet[]} pathOrPathSet -
 * @param {Boolean} isPathSet -
 */
module.exports = function normalizeJsongOrPV(pathOrPathSet,
                                          isPathSet) {
    return function(value) {
        return normalizeJsongOrPVInner(
          pathOrPathSet, isPathSet, value
        );
    };
};

function normalizeJsongOrPVInner(pathOrPathSet,
                                isPathSet,
                                incomingJSONGOrPathValues) {

    // If its jsong we may need to optionally attach the
    // paths if the paths do not exist
    if (isJSONG(incomingJSONGOrPathValues) &&
        !incomingJSONGOrPathValues.paths) {

        return {
            jsonGraph: incomingJSONGOrPathValues.jsonGraph,
            paths: isPathSet && pathOrPathSet || [pathOrPathSet]
        };
    }

    return incomingJSONGOrPathValues;
}
