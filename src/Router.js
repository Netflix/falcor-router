var Keys = require('./Keys');
var parseTree = require('./parse-tree');
var matcher = require('./operations/matcher');
var Rx = require('rx');
var Observable = Rx.Observable;
var normalizePathSets = require('./operations/ranges/normalizePathSets');
var isJSONG = require('./support/isJSONG');
var recurseMatchAndExecute = require('./run/recurseMatchAndExecute');
var optimizePathSets = require('./cache/optimizePathSets');
var pathValueMerge = require('./cache/pathValueMerge');
var runGetAction = require('./run/get/runGetAction');
var runSetAction = require('./run/set/runSetAction');
var runCallAction = require('./run/call/runCallAction');
var falcor = require('falcor');
var $atom = require('./support/types').$atom;

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
        // TODO:  This will work with call, but paths key will not be
        // emitted, but it must!

        // Materializes any paths that do not exist but were matched.
        map(function(jsongEnv) {
            var jsong = jsongEnv.jsong;
            var missingAtom = {$type: $atom};

            // Optimizes the pathSets from the jsong then
            // inserts atoms of undefined.
            optimizePathSets(jsong, paths).
                forEach(function(optMissingPath) {
                    pathValueMerge(jsong, {
                        path: optMissingPath,
                        value: missingAtom
                    });
                });

            return {jsong: jsong};
        });
}

Router.ranges = Keys.ranges;
Router.integers = Keys.integers;
Router.keys = Keys.keys;
module.exports = Router;


