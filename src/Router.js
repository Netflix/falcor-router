var Keys = require('./Keys');
var parseTree = require('./parse-tree');
var matcher = require('./operations/matcher');
var recurseMatchAndExecute = require('./run/recurseMatchAndExecute');
var runSetAction = require('./run/set/runSetAction');
var runCallAction = require('./run/call/runCallAction');
var set = 'set';
var call = 'call';
var pathUtils = require('falcor-path-utils');
var collapse = pathUtils.collapse;
var JSONGraphError = require('./errors/JSONGraphError');
var MAX_REF_FOLLOW = 50;
var unhandled = require('./run/unhandled');

var Router = function(routes, options) {
    var opts = options || {};

    this._routes = routes;
    this._rst = parseTree(routes);
    this._matcher = matcher(this._rst);
    this._debug = opts.debug;
    this.maxRefFollow = opts.maxRefFollow || MAX_REF_FOLLOW;
    this._unhandled = {};
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
    /**
     * Performs the get algorithm on the router.
     * @param {PathSet[]} paths -
     * @returns {JSONGraphEnvelope}
     */
    get: require('./router/get'),

    /**
     * Takes in a function to call that has the same return inteface as any
     * route that will be called in the event of "unhandledPaths" on a get.
     *
     * @param {Function} unhandledHandler -
     * @returns {undefined}
     */
    onUnhandledGet: function(unhandledHandler) {
        this._unhandled.get = unhandled(this, unhandledHandler);
    },

    set: function(jsong) {

        var jsongCache = {};
        var action = runSetAction(this, jsong, jsongCache);
        return run(this._matcher, action, jsong.paths, set, this, jsongCache).

            // Turn it(jsongGraph, invalidations, missing, etc.) into a
            // jsonGraph envelope
            map(function(details) {
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

                return jsongEnv;
            });
    }
};

function run(matcherFn, actionRunner, paths, method,
             routerInstance, jsongCache) {
    return recurseMatchAndExecute(matcherFn, actionRunner, paths, method,
                                  routerInstance, jsongCache);
}

Router.ranges = Keys.ranges;
Router.integers = Keys.integers;
Router.keys = Keys.keys;
Router.JSONGraphError = JSONGraphError;
module.exports = Router;


