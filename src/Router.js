var Keys = require('./Keys');
var parseTree = require('./parse-tree');
var matcher = require('./operations/matcher');
var recurseMatchAndExecute = require('./run/recurseMatchAndExecute');
var runCallAction = require('./run/call/runCallAction');
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
     * @returns {Observable.<JSONGraphEnvelope>}
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

    /**
     * Takes in a jsonGraph and outputs a Observable.<jsonGraph>.  The set
     * method will use get until it evaluates the last key of the path inside
     * of paths.  At that point it will produce an intermediate structure that
     * matches the path and has the value that is found in the jsonGraph env.
     *
     * One of the requirements for interaction with a dataSource is that the
     * set message must be optimized to the best of the incoming sources
     * knowledge.
     *
     * @param {JSONGraphEnvelope} jsonGraph -
     * @returns {Observable.<JSONGraphEnvelope>}
     */
    set: require('./router/set'),

    /**
     * Takes in a function to call that has the same return inteface as any
     * route that will be called in the event of "unhandledPaths" on a set.
     *
     * What will come into the set function will be the subset of the jsonGraph
     * that represents the unhandledPaths of set.
     *
     * @param {Function} unhandledHandler -
     * @returns {undefined}
     */
    onUnhandledSet: function(unhandledHandler) {
        this._unhandled.set = unhandled(this, unhandledHandler);
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


