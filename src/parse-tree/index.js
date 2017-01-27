var Keys = require('../Keys');
var actionWrapper = require('./actionWrapper');
var pathSyntax = require('falcor-path-syntax');
var convertTypes = require('./convertTypes');
var prettifyRoute = require('./../support/prettifyRoute');
var errors = require('./../exceptions');
var cloneArray = require('./../support/cloneArray');
var ROUTE_ID = -3;

module.exports = function parseTree(routes) {
    var pTree = {};
    var parseMap = {};
    routes.forEach(function forEachRoute(route) {
        // converts the virtual string path to a real path with
        // extended syntax on.
        if (typeof route.route === 'string') {
            route.prettyRoute = route.route;
            route.route = pathSyntax(route.route, true);
            convertTypes(route);
        }
        if (route.get) {
            route.getId = ++ROUTE_ID;
        }
        if (route.set) {
            route.setId = ++ROUTE_ID;
        }
        if (route.call) {
            route.callId = ++ROUTE_ID;
        }

        setHashOrThrowError(parseMap, route);
        buildParseTree(pTree, route, 0, []);
    });
    return pTree;
};

function buildParseTree(node, routeObject, depth) {

    var route = routeObject.route;
    var get = routeObject.get;
    var set = routeObject.set;
    var call = routeObject.call;
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
                route[depth] = {type: value, named: false};
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
            var matchObject = next[Keys.match] || {};
            if (!next[Keys.match]) {
                next[Keys.match] = matchObject;
            }

            matchObject.prettyRoute = routeObject.prettyRoute;

            if (get) {
                matchObject.get = actionWrapper(route, get);
                matchObject.getId = routeObject.getId;
            }
            if (set) {
                matchObject.set = actionWrapper(route, set);
                matchObject.setId = routeObject.setId;
            }
            if (call) {
                matchObject.call = actionWrapper(route, call);
                matchObject.callId = routeObject.callId;
            }
        } else {
            buildParseTree(next, routeObject, depth + 1);
        }

    } while (isArray && ++i < el.length);
}

/**
 * ensure that two routes of the same precedence do not get
 * set in.
 */
function setHashOrThrowError(parseMap, routeObject) {
    var route = routeObject.route;
    var get = routeObject.get;
    var set = routeObject.set;
    var call = routeObject.call;

    getHashesFromRoute(route).
        map(function mapHashToString(hash) { return hash.join(','); }).
        forEach(function forEachRouteHash(hash) {
            if (get && parseMap[hash + 'get'] ||
                set && parseMap[hash + 'set'] ||
                    call && parseMap[hash + 'call']) {
                throw new Error(errors.routeWithSamePrecedence + ' ' +
                               prettifyRoute(route));
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
        });
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
function getHashesFromRoute(route, depth, hashes, hash) {
    /*eslint-disable no-func-assign, no-param-reassign*/
    depth = depth || 0;
    hashes = hashes || [];
    hash = hash || [];
    /*eslint-enable no-func-assign, no-param-reassign*/

    var routeValue = route[depth];
    var isArray = Array.isArray(routeValue);
    var length = isArray && routeValue.length || 0;
    var idx = 0;
    var value;

    if (typeof routeValue === 'object' && !isArray) {
        value = routeValue.type;
    }

    else if (!isArray) {
        value = routeValue;
    }

    do {
        if (isArray) {
            value = routeValue[idx];
        }

        if (value === Keys.integers || value === Keys.ranges) {
            hash[depth] = '__I__';
        }

        else if (value === Keys.keys) {
            hash[depth] ='__K__';
        }

        else {
            hash[depth] = value;
        }

        // recurse down the routed token
        if (depth + 1 !== route.length) {
            getHashesFromRoute(route, depth + 1, hashes, hash);
        }

        // Or just add it to hashes
        else {
            hashes.push(cloneArray(hash));
        }
    } while (isArray && ++idx < length);

    return hashes;
}

