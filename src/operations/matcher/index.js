var Keys = require('./../../Keys');
var Precedence = require('./../../Precedence');
var cloneArray = require('./../../support/cloneArray');
var specificMatcher = require('./specific');
var pluckIntegers = require('./pluckIntergers');
var pathUtils = require('falcor-path-utils');
var collapse = pathUtils.collapse;
var isRoutedToken = require('./../../support/isRoutedToken');

var intTypes = [{
        type: Keys.ranges,
        precedence: Precedence.ranges
    }, {
        type: Keys.integers,
        precedence: Precedence.integers
    }];
var keyTypes = [{
        type: Keys.keys,
        precedence: Precedence.keys
    }];
var allTypes = intTypes.concat(keyTypes);
var get = 'get';
var set = 'set';
var call = 'call';

/**
 * Creates a custom matching function for the match tree.
 * @param Object rst The routed syntax tree
 * @param String method the method to call at the end of the path.
 * @return {matched: Array.<Match>, missingPaths: Array.<Array>}
 */
module.exports = function matcher(rst) {

    /**
     * This is where the matching is done.  Will recursively
     * match the paths until it has found all the matchable
     * functions.
     * @param {[]} paths
     */
    return function innerMatcher(method, paths) {
        var matched = [];
        var missing = [];
        match(rst, paths, method, matched, missing);

        // We are at the end of the path but there is no match and its a
        // call.  Therefore we are going to throw an informative error.
        if (method === call && matched.length === 0) {
            var err = new Error('function does not exist');
            err.throwToNext = true;

            throw err;
        }

        var reducedMatched = matched.reduce(function(acc, matchedRoute) {
            if (!acc[matchedRoute.id]) {
                acc[matchedRoute.id] = [];
            }
            acc[matchedRoute.id].push(matchedRoute);

            return acc;
        }, {});

        var collapsedMatched = [];
        Object.
            keys(reducedMatched).
            forEach(function(k) {
                var reducedMatch = reducedMatched[k];

                // This one has no issues with collapsing, its ok to
                // merge it back into the collapsedMatched array
                if (reducedMatch.length === 1) {
                    return collapsedMatched.push(reducedMatch[0]);
                }

                // Since there are more than 1 routes, we need to see if
                // they can collapse and alter the amount of arrays.
                var collapsedResults =
                        collapse(
                            reducedMatch.
                                map(function(x) {
                                    return x.requested;
                                }));

                collapsedResults.forEach(function(path, i) {
                    var reducedVirtualPath = reducedMatch[i].virtual;
                    path.forEach(function(atom, index) {

                        // If its not a routed atom then wholesale replace
                        if (!isRoutedToken(reducedVirtualPath[index])) {
                            reducedVirtualPath[index] = atom;
                        }
                    });
                    collapsedMatched.push(reducedMatch[i]);
                });
            });
        return {
            matched: collapsedMatched,
            missingPaths: missing
        };
    };
};

function match(
        curr, path, method, matchedFunctions,
        missingPaths, depth, requested, virtual, precedence) {

    // Nothing left to match
    if (!curr) {
        return;
    }

    /* eslint-disable no-param-reassign */
    depth = depth || 0;
    requested = requested || [];
    virtual = virtual || [];
    precedence = precedence || [];
    matchedFunctions = matchedFunctions || [];
    /* eslint-disable no-param-reassign */

    // At this point in the traversal we have hit a matching function.
    // Its time to terminate.
    // Get: simple method matching
    // Set/Call: The method is unique.  If the path is not complete,
    // meaning the depth is equivalent to the length,
    // then we match a 'get' method, else we match a 'set' or 'call' method.
    var atEndOfPath = path.length === depth;
    var isSet = method === set;
    var isCall = method === call;
    var methodToUse = method;
    if ((isCall || isSet) && !atEndOfPath) {
        methodToUse = get;
    }

    // Stores the matched result if found along or at the end of
    // the path.  If we are doing a set and there is no set handler
    // but there is a get handler, then we need to use the get
    // handler.  This is so that the current value that is in the
    // clients cache does not get materialized away.
    var currentMatch = curr[Keys.match];

    // From https://github.com/Netflix/falcor-router/issues/76
    // Set: When there is no set hander then we should default to running
    // the get handler so that we do not destroy the client local values.
    if (currentMatch && isSet && !currentMatch[set]) {
        methodToUse = get;
    }

    // Check to see if we have
    if (currentMatch && currentMatch[methodToUse]) {
        matchedFunctions[matchedFunctions.length] = {

            // Used for collapsing paths that use routes with multiple
            // string indexers.
            id: currentMatch[methodToUse + 'Id'],
            requested: cloneArray(requested),

            action: currentMatch[methodToUse],
            authorize: currentMatch.authorize,
            virtual: cloneArray(virtual),
            precedence: +(precedence.join('')),
            suffix: path.slice(depth),
            isSet: atEndOfPath && isSet,
            isCall: atEndOfPath && isCall
        };
    }

    var keySet = path[depth];
    var i, len, key, next;

    // -------------------------------------------
    // Specific key matcher.
    // -------------------------------------------
    var specificKeys = specificMatcher(keySet, curr);
    for (i = 0, len = specificKeys.length; i < len; ++i) {
        key = specificKeys[i];
        virtual[depth] = key;
        requested[depth] = key;
        precedence[depth] = Precedence.specific;

        // Its time to recurse
        match(
            curr[specificKeys[i]],
            path, method, matchedFunctions,
            missingPaths, depth + 1,
            requested, virtual, precedence);

        // Removes the virtual, requested, and precedence info
        virtual.length = depth;
        requested.length = depth;
        precedence.length = depth;
    }

    var ints = pluckIntegers(keySet);
    var keys = keySet;
    var intsLength = ints.length;

    // -------------------------------------------
    // ints, ranges, and keys matcher.
    // -------------------------------------------
    allTypes.
        filter(function(typeAndPrecedence) {
            var type = typeAndPrecedence.type;
            // one extra move required for int types
            if (type === Keys.integers || type === Keys.ranges) {
                return curr[type] && intsLength;
            }
            return curr[type];
        }).
        forEach(function(typeAndPrecedence) {
            var type = typeAndPrecedence.type;
            var prec = typeAndPrecedence.precedence;
            next = curr[type];

            virtual[depth] = {
                type: type,
                named: next[Keys.named],
                name: next[Keys.name]
            };

            // The requested set of info needs to be set either
            // as ints, if int matchers or keys
            if (type === Keys.integers || type === Keys.ranges) {
                requested[depth] = ints;
            } else {
                requested[depth] = keys;
            }

            precedence[depth] = prec;

            // Continue the matching algo.
            match(
                next,
                path, method, matchedFunctions,
                missingPaths, depth + 1,
                requested, virtual, precedence);

            // removes the added keys
            virtual.length = depth;
            requested.length = depth;
            precedence.length = depth;
        });
}
