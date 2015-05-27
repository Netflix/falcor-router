var hasAtomIntersection = require('./hasAtomIntersection');

/**
 * Checks to see if there is an intersection between the matched and
 * virtual paths.
 */
module.exports = function hasIntersection(matchedPath, virtualPath) {
    var intersection = true;

    // cycles through the atoms and ensure each one has an intersection.
    // only use the virtual path because it can be shorter than the full
    // matched path (since it includes suffix).
    for (var i = 0, len = virtualPath.length; i < len && intersection; ++i) {
        intersection = hasAtomIntersection(matchedPath[i], virtualPath[i]);
    }

    return intersection;
};
