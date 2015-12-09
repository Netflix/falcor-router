var slice = Array.prototype.slice;
var outputToObservable = require('./conversion/outputToObservable');
var noteToJsongOrPV = require('./conversion/noteToJsongOrPV');
var mCGRI = require('./mergeCacheAndGatherRefsAndInvalidations');
var DEFAULT_VALUE = [];
var isArray = Array.isArray;

/**
 * Runs the unhandledRunner and converts the output to observable and
 * coerses it into a standard format.
 *
 * @param {Router} routerInstance - the "this" object of the onUnhandled*
 * @param {Function} unhandledRunner -
 */
module.exports = function unhandled(routerInstance, unhandledRunner) {

    // Returns a closure over the runner for unhandledPaths.
    return function _innerUnhandled(jsonGraphEnv, unhandledPaths) {
        var runnerArguments = slice.call(arguments, 2);
        var jsonCache = jsonGraphEnv.jsonGraph
        var out;

        // Convert the output from the runner into an observable if its not. It
        // can be a regular value, promise, or an observable, and it makes code
        // easier to normialize the value to an observable.
        try {
            out = unhandledRunner.apply(routerInstance, runnerArguments);
            out = outputToObservable(out);
        } catch (e) {
            // TODO: Talk with jafar about this.  This is a good question.  My
            // guess is that we are going to materialize the error for all
            // unhandled paths.
            throw e;
        }

        // We materialize so we get errors and onNexts through the same channel.
        // We will convert the
        return out.
            materialize().
            filter(function(note) {
                return note.kind !== 'C';
            }).
            map(noteToJsongOrPV(unhandledPaths, true)).
            defaultIfEmpty(DEFAULT_VALUE).
            map(function(valueArg) {
                var value = valueArg;

                // The value is forced into being an array.
                if (!isArray(value)) {
                    value = [value];
                }

                // merges the cache and plucks the invalidations.
                var invsRefsAndValues = mCGRI(jsonCache, value);
                var invalidations = invsRefsAndValues.invalidations;

                return {
                    jsonGraph: jsonCache,
                    invalidated: invalidations
                };
            });
    };
};
