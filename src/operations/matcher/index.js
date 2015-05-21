var Keys = require('./../../Keys');
var Precedence = require('./../../Precedence');
var permuteKey = require('./../../support/permuteKey');
var cloneArray = require('./../../support/cloneArray');
var specificMatcher = require('./specific');
var pluckIntegers = require('./pluckIntergers');
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
 * The match object gives all the information about what was matched
 * and what it was matched against.
 * @typedef {Object} Match
 * @property {Array} path,
 * @property {Array} virtual,
 * @property {Number} precedence,
 * @property {(undefined|Function)} authorize
 *

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
     * @param [] paths
     */
    return function innerMatcher(method, paths) {
        var matched = [];
        var missing = [];
        match(rst, paths, method, matched, missing);
        return {
            matched: matched,
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

    depth = depth || 0;
    requested = requested || [];
    virtual = virtual || [];
    precedence = precedence || [];
    matchedFunctions = matchedFunctions || [];
    var result;

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
    if (curr[Keys.match] && curr[Keys.match][methodToUse]) {
        matchedFunctions[matchedFunctions.length] = {
            action: curr[Keys.match][methodToUse],
            authorize: curr[Keys.match].authorize,
            path: cloneArray(requested),
            fullPath: path.slice(0, depth),
            virtual: cloneArray(virtual),
            precedence: +(precedence.join('')),
            suffix: path.slice(depth),
            isSet: atEndOfPath && isSet,
            isCall: atEndOfPath && isCall
        };
    }

    var keySet = path[depth];
    var isKeySet = typeof keySet === 'object';
    var i, len, key, next;
    // TODO:Perf do i really need to do this?
    if (isKeySet) {
        precedence = cloneArray(precedence);
    }

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
