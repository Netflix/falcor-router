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

        routerInstance.onError(method, pathOrPathSet, note.error);
    }

    return note;
}