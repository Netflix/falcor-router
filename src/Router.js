var Keys = require('./Keys');
var parseTree = require('./parse-tree');
var matcher = require('./operations/matcher');
var Rx = require('rx');
var normalizePathSets = require('./operations/ranges/normalizePathSets');
var recurseMatchAndExecute = require('./run/recurseMatchAndExecute');
var optimizePathSets = require('./cache/optimizePathSets');
var pathValueMerge = require('./cache/pathValueMerge');
var runGetAction = require('./run/get/runGetAction');
var runSetAction = require('./run/set/runSetAction');
var runCallAction = require('./run/call/runCallAction');
var falcor = require('falcor');
var $atom = require('./support/types').$atom;
var get = 'get';
var set = 'set';
var call = 'call';

// TODO: We should move this into the constructor.
Rx.config.longStackSupport = true;
var Router = function(routes, options) {
    var opts = options || {};

    this._routes = routes;
    this._rst = parseTree(routes);
    this._get = matcher(this._rst);
    this._set = matcher(this._rst);
    this._call = matcher(this._rst);
    this._debug = opts.debug;
    this.jsongCache = {};
};

Router.prototype = {
    get: function(paths) {
        var action = runGetAction(this);
        return run(this._get, action, normalizePathSets(paths), get, this).
            map(function(jsongEnv) {
                return materializeMissing(paths, jsongEnv);
            });
    },

    set: function(jsong) {
        // TODO: Remove the modelContext and replace with just jsongEnv
        // when http://github.com/Netflix/falcor-router/issues/24 is addressed
        var action = runSetAction(this, jsong);
        return run(this._set, action, jsong.paths, set, this).
            map(function(jsongEnv) {
                return materializeMissing(jsong.paths, jsongEnv);
            });
    },

    call: function(callPath, args, suffixes, paths) {
        var action = runCallAction(this, callPath, args, suffixes, paths);
        var callPaths = [callPath];
        return run(this._call, action, callPaths, call, this).
            map(function(jsongResult) {
                var jsongEnv = materializeMissing(
                    callPaths,
                    jsongResult,
                    {
                        $type: $atom,
                        $expires: 0
                    });

                jsongEnv.paths = jsongResult.reportedPaths.concat(callPaths);
                return jsongEnv;
            });
    }
};

function run(matcherFn, actionRunner, paths, method, routerInstance) {
    return recurseMatchAndExecute(
            matcherFn, actionRunner, paths, method, routerInstance);
}

function materializeMissing(paths, jsongEnv, missingAtom) {
    var jsong = jsongEnv.jsong;
    var materializedAtom = missingAtom || {$type: $atom};

    // Optimizes the pathSets from the jsong then
    // inserts atoms of undefined.
    optimizePathSets(jsong, paths).
        forEach(function(optMissingPath) {
            pathValueMerge(jsong, {
                path: optMissingPath,
                value: materializedAtom
            });
        });

    return {jsong: jsong};
}

Router.ranges = Keys.ranges;
Router.integers = Keys.integers;
Router.keys = Keys.keys;
module.exports = Router;


