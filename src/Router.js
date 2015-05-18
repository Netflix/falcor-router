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
var runGetAction = require('./operations/run/get/runGetAction');
var runSetAction = require('./operations/run/set/runSetAction');
var runCallAction = require('./operations/run/call/runCallAction');
var falcor = require('falcor');
Rx.config.longStackSupport = true;
var Router = function(routes, options) {
    options = options || {};

    this._routes = routes;
    this._rst = parseTree(routes);
    this._get = matcher(this._rst, 'get');
    this._set = matcher(this._rst, 'set');
    this._call = matcher(this._rst, 'call');
    this._debug = options.debug;
};

Router.prototype = {
    get: function(paths) {
        return run(this._get,
                   runGetAction.bind(this),
                   normalizePathSets(paths));
    },

    set: function(jsong) {
        var modelContext = new falcor.Model({cache: jsong.jsong});
        return run(this._set,
                   runSetAction.call(this, modelContext),
                   jsong.paths);
    },

    call: function(callPath, args, suffixes, paths) {
        var action = runCallAction(this, args, suffixes, paths);
        return run(this._call,
                   action,
                   [callPath]);
    }
};

function run(method, actionRunner, paths) {
    return recurseMatchAndExecute(method, actionRunner, paths).
        doAction(materializeMissing).
        map(mapResults);
}

function mapResults(results) {
    return {
        jsong: results.jsong
    };
}

Router.ranges = Keys.ranges;
Router.integers = Keys.integers;
Router.keys = Keys.keys;
module.exports = Router;


