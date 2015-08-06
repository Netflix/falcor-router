var Keys = require('./Keys');
var parseTree = require('./parse-tree');
var matcher = require('./operations/matcher');
var normalizePathSets = require('./operations/ranges/normalizePathSets');
var recurseMatchAndExecute = require('./run/recurseMatchAndExecute');
var optimizePathSets = require('./cache/optimizePathSets');
var pathValueMerge = require('./cache/pathValueMerge');
var runGetAction = require('./run/get/runGetAction');
var runSetAction = require('./run/set/runSetAction');
var runCallAction = require('./run/call/runCallAction');
var $atom = require('./support/types').$atom;
var get = 'get';
var set = 'set';
var call = 'call';
var pathUtils = require('falcor-path-utils');
var collapse = pathUtils.collapse;
var JSONGraphError = require('./JSONGraphError');
var MAX_REF_FOLLOW = 50;

var Router = function(routes, options) {
    var opts = options || {};

    this._routes = routes;
    this._rst = parseTree(routes);
    this._matcher = matcher(this._rst);
    this._debug = opts.debug;
    this.maxRefFollow = opts.maxRefFollow || MAX_REF_FOLLOW;
};

Router.createClass = function(routes) {
  function C(options) {
    var opts = options || {};
    this._debug = opts.debug;
  }

  C.prototype = new Router(routes);
  C.prototype.constructor = C;

  return C;
};

Router.prototype = {
    get: function(paths) {
        var jsongCache = {};
        var action = runGetAction(this, jsongCache);
        var router = this;
        var normPS = normalizePathSets(paths);
        return run(this._matcher, action, normPS, get, this, jsongCache).
            map(function(jsongEnv) {
                return materializeMissing(router, paths, jsongEnv);
            });
    },

    set: function(jsong) {
        // TODO: Remove the modelContext and replace with just jsongEnv
        // when http://github.com/Netflix/falcor-router/issues/24 is addressed
        var jsongCache = {};
        var action = runSetAction(this, jsong, jsongCache);
        var router = this;
        return run(this._matcher, action, jsong.paths, set, this, jsongCache).
            map(function(jsongEnv) {
                return materializeMissing(router, jsong.paths, jsongEnv);
            });
    },

    call: function(callPath, args, suffixes, paths) {
        var jsongCache = {};
        var action = runCallAction(this, callPath, args,
                                   suffixes, paths, jsongCache);
        var callPaths = [callPath];
        var router = this;
        return run(this._matcher, action, callPaths, call, this, jsongCache).
            map(function(jsongResult) {
                var reportedPaths = jsongResult.reportedPaths;
                var jsongEnv = materializeMissing(
                    router,
                    reportedPaths,
                    jsongResult);


                if (reportedPaths.length) {
                    jsongEnv.paths = reportedPaths;
                }
                else {
                    jsongEnv.paths = [];
                    jsongEnv.jsonGraph = {};
                }

                var invalidated = jsongResult.invalidated;
                if (invalidated && invalidated.length) {
                    jsongEnv.invalidated = invalidated;
                }
                jsongEnv.paths = collapse(jsongEnv.paths);
                return jsongEnv;
            });
    }
};

function run(matcherFn, actionRunner, paths, method,
             routerInstance, jsongCache) {
    return recurseMatchAndExecute(
            matcherFn, actionRunner, paths, method, routerInstance, jsongCache);
}

function materializeMissing(router, paths, jsongEnv, missingAtom) {
    var jsonGraph = jsongEnv.jsonGraph;
    var materializedAtom = missingAtom || {$type: $atom};

    // Optimizes the pathSets from the jsong then
    // inserts atoms of undefined.
    optimizePathSets(jsonGraph, paths, router.maxRefFollow).
        forEach(function(optMissingPath) {
            pathValueMerge(jsonGraph, {
                path: optMissingPath,
                value: materializedAtom
            });
        });

    return {jsonGraph: jsonGraph};
}

Router.ranges = Keys.ranges;
Router.integers = Keys.integers;
Router.keys = Keys.keys;
Router.JSONGraphError = JSONGraphError;
module.exports = Router;


