var isJSONG = require('./../../support/isJSONG');
var JSONGraphError = require('./../../JSONGraphError');
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
        var typeValue = {
            $type: 'error',
            value: {}
        };
        var exception = {};

        // Rx3, what will this be called?
        if (note.exception) {
            exception = note.exception;
        }

        if (exception.throwToNext) {
            throw exception;
        }

        // If it is a special JSONGraph error then pull all the data
        if (exception instanceof JSONGraphError) {
            typeValue = exception.typeValue;
        }

        else if (exception instanceof Error) {
            typeValue.value.message = exception.message;
        }

        incomingJSONGOrPathValues = {
            path: matchAndPath.path,
            value: typeValue
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

