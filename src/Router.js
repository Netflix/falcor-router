var Keys = require('./Keys');
var parseTree = require('./parse-tree');
var matcher = require('./operations/matcher');
var JSONGraphError = require('./errors/JSONGraphError');
var MAX_REF_FOLLOW = 50;
var MAX_PATHS = 9000;

var noOp = function noOp() {};
var defaultNow = function defaultNow() {
    return Date.now();
};

var Router = function(routes, options) {
    this._routes = routes;
    this._rst = parseTree(routes);
    this._matcher = matcher(this._rst);
    this._setOptions(options);
};

Router.createClass = function(routes) {
    function C(options) {
        this._setOptions(options);
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
     * Invokes a function in the DataSource's JSONGraph object at the path
     * provided in the callPath argument.  If there are references that are
     * followed, a get will be performed to get to the call function.
     *
     * @param {Path} callPath -
     * @param {Array.<*>} args -
     * @param {Array.<PathSet>} refPaths -
     * @param {Array.<PathSet>} thisPaths -
     */
    call: require('./router/call'),

    /**
     * When a route misses on a call, get, or set the unhandledDataSource will
     * have a chance to fulfill that request.
     * @param {DataSource} dataSource -
     */
    routeUnhandledPathsTo: function routeUnhandledPathsTo(dataSource) {
        this._unhandled = dataSource;
    },

    _setOptions: function _setOptions(options) {
        var opts = options || {};
        this._debug = opts.debug;
        this._pathErrorHook = (opts.hooks && opts.hooks.pathError) || noOp;
        this._errorHook = opts.hooks && opts.hooks.error;
        this._methodSummaryHook = opts.hooks && opts.hooks.methodSummary;
        this._now = (opts.hooks && opts.hooks.now) || opts.now || defaultNow;
        this.maxRefFollow = opts.maxRefFollow || MAX_REF_FOLLOW;
        this.maxPaths = opts.maxPaths || MAX_PATHS;
    }
};

Router.ranges = Keys.ranges;
Router.integers = Keys.integers;
Router.keys = Keys.keys;
Router.JSONGraphError = JSONGraphError;
module.exports = Router;
