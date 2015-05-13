var Keys = require('./Keys');
var parseTree = require('./parse-tree');
var matcher = require('./operations/matcher');
var Rx = require('rx');
var Observable = Rx.Observable;
var normalizePathSets = require('./operations/ranges/normalizePathSets');
var isJSONG = require('./support/isJSONG');
var pathValueMerge = require('./merge/pathValueMerge');
var recurseMatchAndExecute = require('./operations/run/recurseMatchAndExecute');
var materializeMissing = require('./support/materializeMissing');
var runGetAction = require('./operations/run/runGetAction');
var runSetAction = require('./operations/run/runSetAction');
var falcor = require('falcor');

var Router = function(routes) {
    this._routes = routes;
    this._rst = parseTree(routes);
    this._get = matcher(this._rst, 'get');
    this._set = matcher(this._rst, 'set');
};

Router.prototype = {
    get: function(paths) {
        var get = this._get;
        var normalized = normalizePathSets(paths);
        return recurseMatchAndExecute(get, runGetAction, normalized).
            doAction(materializeMissing).
            map(function(x) { return x.jsong; });
    },

    set: function(jsong) {
        var set = this._set;
        var modelContext = new falcor.Model({cache: jsong});
        return recurseMatchAndExecute(set, runSetAction(modelContext), jsong).
            doAction(materializeMissing).
            map(function(x) { return x.jsong; });
    }
};

Router.ranges = Keys.ranges;
Router.integers = Keys.integers;
Router.keys = Keys.keys;
module.exports = Router;


