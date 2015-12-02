var Keys = require('./Keys');
var parseTree = require('./parse-tree');
var matcher = require('./operations/matcher');
var normalizePathSets = require('./operations/ranges/normalizePathSets');
var recurseMatchAndExecute = require('./run/recurseMatchAndExecute');
var runGetAction = require('./run/get/runGetAction');
var runSetAction = require('./run/set/runSetAction');
var runCallAction = require('./run/call/runCallAction');
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
        var normPS = normalizePathSets(paths);
        return run(this._matcher, action, normPS, get, this, jsongCache).
            map(function(details) {
                var out = {
                    jsonGraph: details.jsonGraph
                };

                if (details.unhandledPaths.length) {
                    out.unhandledPaths = details.unhandledPaths;
                    if (out.unhandledPaths.length > 1) {
                        out.unhandledPaths = collapse(out.unhandledPaths);
                    }
                }

                return out;
            });
    },

    set: function(jsong) {

        var jsongCache = {};
        var action = runSetAction(this, jsong, jsongCache);
        return run(this._matcher, action, jsong.paths, set, this, jsongCache).
            map(function(details) {
                // Set does not have unhandled paths.  There is no cascading
                // a set from one source to another.
                return {
                    jsonGraph: details.jsonGraph
                };
            });
    },

    call: function(callPath, args, suffixes, paths) {
        var jsongCache = {};
        var action = runCallAction(this, callPath, args,
                                   suffixes, paths, jsongCache);
        var callPaths = [callPath];
        return run(this._matcher, action, callPaths, call, this, jsongCache).
            map(function(jsongResult) {
                var reportedPaths = jsongResult.reportedPaths;
                var jsongEnv = {
                    jsonGraph: jsongResult.jsonGraph
                };

                // Call must report the paths that have been produced.
                if (reportedPaths.length) {
                    // Collapse the reported paths as they may be inefficient
                    // to send across the wire.
                    jsongEnv.paths = collapse(reportedPaths);
                }
                else {
                    jsongEnv.paths = [];
                    jsongEnv.jsonGraph = {};
                }

                // add the invalidated paths to the jsonGraph Envelope
                var invalidated = jsongResult.invalidated;
                if (invalidated && invalidated.length) {
                    jsongEnv.invalidated = invalidated;
                }

                // Call can still produce unhandledPaths since the follow-up
                // suffix and paths will produce the paths.
                var unhandledPaths = jsongResult.unhandledPaths;
                if (unhandledPaths && unhandledPaths.length) {
                    jsongEnv.unhandledPaths = unhandledPaths;
                }

                return jsongEnv;
            });
    }
};

function run(matcherFn, actionRunner, paths, method,
             routerInstance, jsongCache) {
    return recurseMatchAndExecute(
            matcherFn, actionRunner, paths, method, routerInstance, jsongCache);
}

Router.ranges = Keys.ranges;
Router.integers = Keys.integers;
Router.keys = Keys.keys;
Router.JSONGraphError = JSONGraphError;
module.exports = Router;


