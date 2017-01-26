var isJSONG = require('./../../support/isJSONG');
var onNext = 'N';
var errorToPathValue = require('./errorToPathValue');

/**
 * Takes a path and for every onNext / onError it will attempt
 * to pluck the value or error from the note and process it
 * with the path object passed in.
 * @param {PathSet|PathSet[]} pathOrPathSet -
 * @param {Boolean} isPathSet -
 */
module.exports = function noteToJsongOrPV(pathOrPathSet,
                                          isPathSet,
                                          routerInstance) {
    return function(note) {
        return convertNoteToJsongOrPV(
          pathOrPathSet, note, isPathSet, routerInstance
        );
    };
};

function convertNoteToJsongOrPV(pathOrPathSet,
                                note,
                                isPathSet,
                                routerInstance) {
    var incomingJSONGOrPathValues;
    var kind = note.kind;

    // Take what comes out of the function and assume its either a pathValue or
    // jsonGraph.
    if (kind === onNext) {
        incomingJSONGOrPathValues = note.value;
    }

    // Convert the error to a pathValue.
    else {
        incomingJSONGOrPathValues =
            errorToPathValue(note.error, pathOrPathSet);

        if (routerInstance._errorHook) {
            routerInstance._errorHook(note.error);
        }
    }

    // If its jsong we may need to optionally attach the
    // paths if the paths do not exist
    if (isJSONG(incomingJSONGOrPathValues) &&
        !incomingJSONGOrPathValues.paths) {

        incomingJSONGOrPathValues = {
            jsonGraph: incomingJSONGOrPathValues.jsonGraph,
            paths: isPathSet && pathOrPathSet || [pathOrPathSet]
        };
    }

    return incomingJSONGOrPathValues;
}
