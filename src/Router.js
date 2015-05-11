var Keys = require('./Keys');
var parseTree = require('./parse-tree');
var matcher = require('./operations/matcher');
var getProcessor = require('./operations/getProcessor');
var Rx = require('rx');
var Observable = Rx.Observable;
var normalizePathSets = require('./operations/ranges/normalizePathSets');
var isJSONG = require('./support/isJSONG');
var jsongMerge = require('./merge/jsongMerge');
var pathValueMerge = require('./merge/pathValueMerge');

var Router = function(routes) {
    this._routes = routes;
    this._rst = parseTree(routes);
    this._matcher = matcher(this._rst);
};

Router.prototype = {
    get: function(paths) {
        normalizePathSets(paths);
        return accumulateValues(getProcessor.call(this, this._matcher(paths, 'get')), paths);
    }
};

function accumulateValues(matchedResults, requestedPaths) {
    var out = {};

    return Observable.
        from(matchedResults).
        flatMap(function(obs) {
            return obs.
                materialize().
                filter(function(x) {
                    return x.kind !== 'C';
                });
        }).
        reduce(function(acc, value) {
            if (value.kind === 'N') {
                if (isJSONG(value.value)) {
                    jsongMerge(out, value.value);
                } else {
                    pathValueMerge(out, value.value);
                }
            } else if (value.kind === 'E') {
                if (value.value && isJSONG(value.value)) {
                    jsongMerge(out, value.value);
                } else {
                    pathValueMerge(out, {
                        path: value.path,
                        value: {
                            $type: 'error',
                            message: value.exception.message
                        }
                    });
                }
            }
        }, {}).
        map(function() {
            return {jsong: out};
        });
}

Router.ranges = Keys.ranges;
Router.integers = Keys.integers;
Router.keys = Keys.keys;
module.exports = Router;


