var isJSONG = require('./../../support/isJSONG');
module.exports = function noteToJsongOrPV(match) {
    return function(note) {
        return convertNoteToJsongOrPV(match, note);
    };
};

function convertNoteToJsongOrPV(match, note) {
    var incomingJSONGOrPathValues;
    var kind = note.kind;

    if (kind === 'N') {
        incomingJSONGOrPathValues = note.value;
    }

    else if (note.value) {
        incomingJSONGOrPathValues = value.value;
    }

    else {
        var exception = 'Unknown Error';
        if (note.exception) {
            exception = note.exception;
        }
        if (exception.throwToNext) {
            throw exception;
        }
        incomingJSONGOrPathValues = {
            path: match.path,
            value: {
                $type: 'error',
                value: {
                    message: exception.message,
                    exception: true
                }
            }
        };
    }

    // If its jsong we may need to optionally attach the
    // paths if the paths do not exist
    if (isJSONG(incomingJSONGOrPathValues) &&
        !incomingJSONGOrPathValues.paths) {

        incomingJSONGOrPathValues = {
            jsong: incomingJSONGOrPathValues.jsong,
            paths: [match.path]
        };
    }

    return [match, incomingJSONGOrPathValues];
}

