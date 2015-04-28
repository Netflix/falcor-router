var Keys = require('./Keys');
var parseTree = require('./parse-tree');
var matcher = require('./operations/matcher');
var getProcessor = require('./operations/getProcessor');
var Rx = require('rx');
var Observable = Rx.Observable;
var falcor = require('falcor');
var normalizePathSets = require('./operations/ranges/normalizePathSets');

var Router = function(routes) {
    this._routes = routes;
    this._rst = parseTree(routes);
    this._matcher = matcher(this._rst);
};

Router.prototype = {
    get: function(paths) {
        normalizePathSets(paths);
        return accumulateValues(getProcessor(this._matcher(paths, 'get')));
    }
};

function accumulateValues(matchedResults) {
    var model = new falcor.Model();
    return Observable.
        from(matchedResults).
        flatMap(function(x) {
            var obs = x;
            if (x.then) {
                obs = Observable.fromPromise(x);
            }

            return obs.
                materialize().
                map(function(jsongEnvNote) {
                    return {
                        note: jsongEnvNote,
                        path: x.path
                    };
                });
        }).
        reduce(function(acc, value) {
            var note = value.note;
            var out;
            if (note.kind === 'N') {
                if (isJSONG(note.value)) {
                    out = model._setJSONGsAsJSONG(model, [note.value], [{}]);
                } else {
                    out = model._setPathsAsJSONG(model, [].concat(note.value));
                }
                acc = acc.concat(out.requestedPaths);
            } else if (note.kind === 'E') {
                if (note.value && router_isJSONG(note.value)) {
                    out = model._setJSONGsAsJSONG(model, [note.value], [{}]);
                } else {
                    out = model._setPathsAsJSONG(model, [{
                        path: value.path,
                        value: {
                            $type: 'error',
                            message: note.exception.message
                        }
                    }]);
                }
                acc = acc.concat(out.requestedPaths);
            }

            return acc;
        }, []).
        map(function(paths) {
            var out = [{}];
            var res = model._getPathSetsAsJSONG(model, paths, out);
            return out[0];
        });
}

function isJSONG(x) {
    return x.jsong && x.paths;
}

Router.ranges = Keys.ranges;
Router.integers = Keys.integers;
Router.keys = Keys.keys;
module.exports = Router;


