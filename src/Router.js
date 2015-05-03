var Keys = require('./Keys');
var parseTree = require('./parse-tree');
var matcher = require('./operations/matcher');
var getProcessor = require('./operations/getProcessor');
var Rx = require('rx');
var Observable = Rx.Observable;
var falcor = require('falcor');
var normalizePathSets = require('./operations/ranges/normalizePathSets');
var isJSONG = require('./support/isJSONG');

var Router = function(routes) {
    this._routes = routes;
    this._rst = parseTree(routes);
    this._matcher = matcher(this._rst);
};

Router.prototype = {
    get: function(paths) {
        normalizePathSets(paths);
        return accumulateValues(getProcessor.bind(this)(this._matcher(paths, 'get')), paths);
    }
};

function accumulateValues(matchedResults, requestedPaths) {
    var model = new falcor.Model();
    return Observable.
        from(matchedResults).
        flatMap(function(obs) {
            return obs.
                materialize().
                filter(function(x) {
                    return x.kind !== 'C';
                });
        }).
        reduce(function(seed, value) {
            if (value.kind === 'N') {
                if (isJSONG(value.value)) {
                    out = model._setJSONGsAsJSONG(model, [value.value], seed);
                } else {
                    out = model._setPathSetsAsJSONG(model, [].concat(value.value), seed);
                }
            } else if (value.kind === 'E') {
                if (value.value && isJSONG(value.value)) {
                    out = model._setJSONGsAsJSONG(model, [value.value], seed);
                } else {
                    out = model._setPathSetsAsJSONG(model, [{
                        path: value.path,
                        value: {
                            $type: 'error',
                            message: value.exception.message
                        }
                    }], seed);
                }
            }
            return seed;
        }, [{}]).
        map(function(out) {
            return {jsong: out[0].jsong};
        });
}

Router.ranges = Keys.ranges;
Router.integers = Keys.integers;
Router.keys = Keys.keys;
module.exports = Router;


