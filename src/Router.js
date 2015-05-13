var Keys = require('./Keys');
var parseTree = require('./parse-tree');
var matcher = require('./operations/matcher');
var Rx = require('rx');
var Observable = Rx.Observable;
var normalizePathSets = require('./operations/ranges/normalizePathSets');
var isJSONG = require('./support/isJSONG');
var pathValueMerge = require('./merge/pathValueMerge');
var recurseMatchAndExecute = require('./operations/run/recurseMatchAndExecute');
var runGetAction = require('./operations/run/runGetAction');
var $atom = require('./merge/util/types').$atom;
var materialize = {$type: $atom};

var Router = function(routes) {
    this._routes = routes;
    this._rst = parseTree(routes);
    this._get = matcher(this._rst, 'get');
    this._set = matcher(this._rst, 'set');
};

Router.prototype = {
    get: function(paths) {
        var self = this;

        return recurseMatchAndExecute(self._get,
                                      runGetAction, normalizePathSets(paths)).

            map(function(results) {
                results.missing.forEach(function(missing) {
                    debugger
                    pathValueMerge(
                        results.jsong,
                        {path: missing, value: materialize});
                });

                // TODO: should handle the missing paths here.
                return {
                    jsong: results.jsong
                };
            });
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


