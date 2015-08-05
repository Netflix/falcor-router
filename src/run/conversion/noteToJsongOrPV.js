var isJSONG = require('./../../support/isJSONG');
var errors = require('./../../exceptions');
var onNext = 'N';

module.exports = function noteToJsongOrPV(match) {
    return function(note) {
        return convertNoteToJsongOrPV(match, note);
    };
};

function convertNoteToJsongOrPV(matchAndPath, note) {
    var incomingJSONGOrPathValues;
    var kind = note.kind;

    if (kind === onNext) {
        incomingJSONGOrPathValues = note.value;
    }

    else {
        var exception = errors.unknown;
        if (note.exception) {
            exception = note.exception;
        }
        if (exception.throwToNext) {
            throw exception;
        }
        var value = {
            exception: true
        };

        // If the exception is an error, just append the message.
        if (exception instanceof Error) {
            value.message = exception.message;
        }

        // If the error is an object, copy all the keys on the value.
        else if (typeof exception === 'object') {
            Object.
                keys(exception).
                forEach(function(k) {
                    value[k] = exception[k];
                });
        }

        // If the exception is some sort of primitive, then just make
        // the value have an error key.
        else {
            value.error = exception;
        }

        incomingJSONGOrPathValues = {
            path: matchAndPath.path,
            value: {
                $type: 'error',
                value: value
            }
        };
    }

    // If its jsong we may need to optionally attach the
    // paths if the paths do not exist
    if (isJSONG(incomingJSONGOrPathValues) &&
        !incomingJSONGOrPathValues.paths) {

        incomingJSONGOrPathValues = {
            jsonGraph: incomingJSONGOrPathValues.jsonGraph,
            paths: [matchAndPath.path]
        };
    }

    return [matchAndPath.match, incomingJSONGOrPathValues];
}

