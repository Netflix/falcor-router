var Keys = require('./../../Keys');
var Precedence = require('./../../Precedence');
var permuteKey = require('./../../support/permuteKey');
var copy = require('./../../support/copy');
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

/**
 * Creates a custom matching function for the match tree.
 * @param Object rst The routed syntax tree
 */
module.exports = function matcher(rst) {

    // This is where the matching is done.  Will recursively
    // match the paths until it has found all the matchable
    // functions.
    return function innerMatcher(paths, method) {
        var matchedFunctions = [];
        var missingPaths = [];
        paths.forEach(function(p) {
            var matched = [];
            match(rst, p, method, matched);

            if (matched.length) {
                matchedFunctions[matchedFunctions.length] = matched;
            } else {
                missingPaths[missingPaths.length] = p;
            }
        });
        return matchedFunctions;
    };
};

function match(
        curr, path, method, matchedFunctions,
        depth, requested, virtual, precedence) {

    // We are not at a node anymore.
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
    if (curr.__match && curr.__match[method]) {
        matchedFunctions[matchedFunctions.length] = {
            action: curr.__match[method],
            path: copy(requested),
            virtual: copy(virtual),
            precedence: +(precedence.join(''))
        };
    }

    var keySet = path[depth];
    var isKeySet = typeof keySet === 'object';
    var i, len, key, next;
    if (isKeySet) {
        precedence = copy(precedence);
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
            depth + 1,
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

            // recurses further.
            match(
                next,
                path, method, matchedFunctions,
                depth + 1,
                requested, virtual, precedence);

            // removes the added keys
            virtual.length = depth;
            requested.length = depth;
            precedence.length = depth;
        });
}
