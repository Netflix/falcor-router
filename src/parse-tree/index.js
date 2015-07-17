var Keys = require('../Keys');
var actionWrapper = require('./actionWrapper');
var pathSyntax = require('falcor-path-syntax');
var convertTypes = require('./convertTypes');
var errors = require('./../exceptions');
var cloneArray = require('./../support/cloneArray');
var ROUTE_ID = -3;

var parseTree = function(virtualPaths) {
    var pTree = {};
    var parseMap = {};
    virtualPaths.forEach(function(virtualPath) {
        // converts the virtual string path to a real path with
        // extended syntax on.
        if (typeof virtualPath.route === 'string') {
            virtualPath.route = pathSyntax(virtualPath.route, true);
            convertTypes(virtualPath);
        }
        ROUTE_ID += 3;
        buildParseTree(parseMap, pTree, virtualPath, 0, [], ROUTE_ID);
    });
    return pTree;
};

module.exports = parseTree;

function buildParseTree(parseMap, node, pathAndAction,
                        depth, virtualRunner, routeId) {

    var route = pathAndAction.route;
    var get = pathAndAction.get;
    var set = pathAndAction.set;
    var call = pathAndAction.call;
    var authorize = pathAndAction.authorize;
    var el = route[depth];

    el = !isNaN(+el) && +el || el;
    var isArray = Array.isArray(el);
    var i = 0;

    do {
        var value = el;
        var next;
        if (isArray) {
            value = value[i];
        }

        // continue to build up the array.
        virtualRunner[depth] = value;

        // There is a ranged token in this location with / without name.
        // only happens from parsed path-syntax paths.
        if (typeof value === 'object') {
            var routeType = value.type;
            next = decendTreeByRoutedToken(node, routeType, value);
        }

        // This is just a simple key.  Could be a ranged key.
        else {
            next = decendTreeByRoutedToken(node, value);
            // we have to create a falcor-router virtual object
            // so that the rest of the algorithm can match and coerse
            // when needed.
            if (next) {
                virtualRunner[depth] = {type: value, named: false};
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

            // Insert match into routeSyntaxTree
            var matchObject = next[Keys.match] || {authorize: authorize};
            if (!next[Keys.match]) {
                next[Keys.match] = matchObject;
            }

            // Not the same path
            if (matchObject.get && get ||
                matchObject.set && set ||
                matchObject.call && call) {
                var prettyRoute = prettifyVirtualPath(route);
                throw new Error(
                    errors.routeWithSamePath + ' ' + JSON.stringify(prettyRoute));
            }
            setHashOrThrowError(parseMap, virtualRunner, get, set, call);

            var clonedVirtualRunner = cloneArray(virtualRunner);
            if (get) {
                matchObject.get = actionWrapper(clonedVirtualRunner, get);
                matchObject.getId = routeId;
            }
            if (set) {
                matchObject.set = actionWrapper(clonedVirtualRunner, set);
                matchObject.setId = routeId + 1;
            }
            if (call) {
                matchObject.call = actionWrapper(clonedVirtualRunner, call);
                matchObject.callId = routeId + 2;
            }
        } else {
            buildParseTree(
                parseMap, next, pathAndAction,
                depth + 1, virtualRunner, routeId);
        }

        virtualRunner.length = depth;
    } while(isArray && ++i < el.length);
}

/**
 * ensure that two routes of the same precedence do not get
 * set in.
 */
function setHashOrThrowError(parseMap, virtualRunner, get, set, call) {
    var hash = getHashFromVirtualPath(virtualRunner);

    if (get && parseMap[hash + 'get'] ||
        set && parseMap[hash + 'set'] ||
        call && parseMap[hash + 'call']) {
        throw new Error(errors.routeWithSamePrecedence);
    }
    if (get) {
        parseMap[hash + 'get'] = true;
    }
    if (set) {
        parseMap[hash + 'set'] = true;
    }
    if (call) {
        parseMap[hash + 'call'] = true;
    }
}

/**
 * decends the rst and fills in any naming information at the node.
 * if what is passed in is not a routed token identifier, then the return
 * value will be null
 */
function decendTreeByRoutedToken(node, value, routeToken) {
    var next = null;
    switch (value) {
        case Keys.keys:
        case Keys.integers:
        case Keys.ranges:
            next = node[value];
            if (!next) {
                next = node[value] = {};
            }
            break;
        default:
            break;
    }
    if (next && routeToken) {
        // matches the naming information on the node.
        next[Keys.named] = routeToken.named;
        next[Keys.name] = routeToken.name;
    }

    return next;
}

/**
 * creates a hash of the virtual path where integers and ranges
 * will collide but everything else is unique.
 */
function getHashFromVirtualPath(virtualPath) {
    var length = 0;
    var str = [];
    for (var i = 0, len = virtualPath.length; i < len; ++i, ++length) {
        var value = virtualPath[i];
        if (typeof value === 'object') {
            value = value.type;
        }

        if (value === Keys.integers || value === Keys.ranges) {
            str[length] = '__I__';
        }

        else if (value === Keys.keys) {
            str[length] = '__K__';
        }

        else {
            str[length] = value;
        }
    }

    return str.join('');
}

/**
 * beautify the virtual path, meaning paths with virtual keys will
 * not be displayed as a stringified object but instead as a string.
 */
function prettifyVirtualPath(virtualPath) {
    var length = 0;
    var str = [];
    for (var i = 0, len = virtualPath.length; i < len; ++i, ++length) {
        var value = virtualPath[i];
        if (typeof value === 'object') {
            value = value.type;
        }

        if (value === Keys.integers) {
            str[length] = 'integers';
        }

        else if (value === Keys.ranges) {
            str[length] = 'ranges';
        }

        else if (value === Keys.keys) {
            str[length] = 'keys';
        }

        else {
            str[length] = value;
        }
    }

    return str;
}
