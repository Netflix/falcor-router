var Keys = require('../Keys');
var actionWrapper = require('./actionWrapper');
var pathSyntax = require('falcor-path-syntax');
var convertTypes = require('./convertTypes');
var parseTree = function(virtualPaths) {
    var parseTree = {};
    virtualPaths.forEach(function(virtualPath) {
        // converts the virtual string path to a real path with
        // extended syntax on.
        if (typeof virtualPath.route === 'string') {
            virtualPath.route = pathSyntax(virtualPath.route, true);
            convertTypes(virtualPath);
        }
        buildParseTree(parseTree, virtualPath, 0);
    });
    return parseTree;
};
module.exports = parseTree;

function buildParseTree(node, pathAndAction, depth, virtualRunner) {
    virtualRunner = virtualRunner || [];
    var route = pathAndAction.route;
    var get = pathAndAction.get;
    var set = pathAndAction.set;
    var call = pathAndAction.call;
    var el = route[depth];

    el = !isNaN(+el) && +el || el;
    var isArray = Array.isArray(el);
    var i = 0, j;

    do {
        var value = el;
        var next;
        if (isArray) {
            var tmp = virtualRunner;
            virtualRunner = [];
            for (j = 0; j < tmp.length; j++) {
                virtualRunner[j] = tmp[j];
            }
            value = value[i];
        }

        // continue to build up the array.
        virtualRunner[depth] = value;

        // There is a ranged token in this location with / without name.
        // only happens from parsed path-syntax paths.
        if (typeof value === 'object') {
            var routeType = value.type;
            next = fromRoutedToken(node, routeType, value);
        }

        // This is just a simple key.  Could be a ranged key.
        else {
            next = fromRoutedToken(node, value);
            // we have to create a falcor-router virtual object
            // so that the rest of the algorithm can match and coerse
            // when needed.  It is unnamed.
            if (next) {
                virtualRunner[depth] = {type: value};
            }
            else {
                if (!node[value]) {
                    node[value] = {};
                }
                next = node[value];
            }
        }

        // Continue to recurse or put get/set.
        if (depth + 1 === route.length) {
            next.__match = {};
            if (get) {
                next.__match.get = actionWrapper(virtualRunner, get);
            }
            if (set) {
                next.__match.set = actionWrapper(virtualRunner, set);
            }
            if (call) {
                next.__match.call = actionWrapper(virtualRunner, call);
            }
        } else {
            buildParseTree(next, pathAndAction, depth + 1, virtualRunner);
        }
    } while(isArray && ++i < el.length);
}


function fromRoutedToken(node, value, routeToken) {
    var next = null;
    switch (value) {
        case Keys.keys:
        case Keys.integers:
        case Keys.ranges:
            next = node[value];
            if (!next) {
                next = node[value] = {};
            }
    }
    if (next && routeToken) {
        // matches the naming information on the node.
        next[Keys.named] = routeToken.named;
        next[Keys.name] = routeToken.name;
    }

    return next;
}


