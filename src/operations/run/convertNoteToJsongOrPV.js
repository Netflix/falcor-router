module.exports = function converter(match) {
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
        incomingJSONGOrPathValues = {
            path: value.path,
            value: {
                $type: 'error',
                message: value.exception.message
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

