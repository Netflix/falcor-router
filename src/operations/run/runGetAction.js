var isJSONG = require('./../../support/isJSONG');
var isArray = Array.isArray;
module.exports = function runGetAction(matches) {
    var self = this;
    var match = matches[0];
    var out = match.action.call(self, match.path);

    // place holder
    if (out.subscribe) { }

    // promise
    else if (out.then) {
        out = Observable.fromPromise(out);
    }

    // from array of pathValues.
    else if (isArray(out)) {
        out = Observable.from(out);
    }

    // this will be jsong or pathValue at this point.
    else {
        out = Observable.of(out);
    }

    return out.
        materialize().
        filter(function(note) {
            return note.kind !== 'C';
        }).
        map(function(note) {
            // TODO:fn What about errors
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
        });
};
