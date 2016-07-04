var JSONGraphError = require('./../errors/JSONGraphError');
var onNext = 'N';

/**
 * Will call the onError callback on routerInstance with 
 * the path or pathSet if the note has an error
 * @param {Router} routerInstance
 * @param {PathSet|PathSet[]} pathOrPathSet -
 */
module.exports = function onError(routerInstance, matchAndPath) {
    return function(note) {
        return callOnErrorWithException(routerInstance, matchAndPath, note);
    };
};

function callOnErrorWithException(routerInstance, matchAndPath, note) {
    var kind = note.kind;

    if (kind !== onNext) {
        var pathOrPathSet = matchAndPath.path;

        var method = 'get';
        
        if (matchAndPath.match.isCall) {
            method = 'call';
        }
        else if (matchAndPath.match.isSet) {
            method = 'set';
        }

        // Make it possible for the callback to transform an Error to another Error or JSONGraphError
        var transformedError = routerInstance.onError(method, pathOrPathSet, note.error);
        
        if (transformedError) {
            if (transformedError instanceof Error || transformedError instanceof JSONGraphError) {
                note.error = transformedError;
            }
            else {
                throw new Error("onError callback should tranform Error to Error or JSONGraphError");
            }
        }
    }

    return note;
}