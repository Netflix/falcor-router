var stripFromRange = require('./stripFromRange');
var Keys = require('./../../Keys');
var isArray = Array.isArray;

/**
 * Takes a string, number, or RoutedToken and removes it from
 * the array.  The results are the relative complement of what
 * remains in the array.
 *
 * Don't forget: There was an intersection test performed but
 * since we recurse over arrays, we will get elements that do
 * not intersect.
 *
 * Another one is if its a routed token and a ranged array then
 * no work needs to be done as integers, ranges, and keys match
 * that token set.
 *
 * One more note.  When toStrip is an array, we simply recurse
 * over each key.  Else it requires a lot more logic.
 *
 * @param {Array|String|Number|RoutedToken} toStrip
 * @param {Array} array
 * @return {Array} the relative complement.
 */
module.exports = function stripFromArray(toStrip, array) {
    var complement;
    var matches = [];
    var typeToStrip = typeof toStrip;
    var isRangedArray = typeof array[0] === 'object';
    var isNumber = typeToStrip === 'number';
    var isString = typeToStrip === 'string';
    var isRoutedToken = !isNumber && !isString;
    var routeType = isRoutedToken && toStrip.type || false;
    var isKeys = routeType === Keys.keys;
    var toStripIsArray = isArray(toStrip);

    // The early break case.  If its a key, then there is never a
    // relative complement.
    if (isKeys) {
        complement = [];
        matches = array;
    }

    // Recurse over all the keys of the array.
    else if (toStripIsArray) {
        var currentArray = array;
        toStrip.forEach(function(atom) {
            var results = stripFromArray(atom, currentArray);
            if (results[0] !== undefined) { // eslint-disable-line no-undefined
                matches = matches.concat(results[0]);
            }
            currentArray = results[1];
        });
        complement = currentArray;
    }

    // The simple case, remove only the matching element from array.
    else if (!isRangedArray && !isRoutedToken) {
        matches = [toStrip];
        complement = array.filter(function(x) {
            return toStrip !== x;
        });
    }

    // 1: from comments above
    else if (isRangedArray && !isRoutedToken) {
        complement = array.reduce(function(comp, range) {
            var results = stripFromRange(toStrip, range);
            if (results[0] !== undefined) { // eslint-disable-line no-undefined
                matches = matches.concat(results[0]);
            }
            return comp.concat(results[1]);
        }, []);
    }

    // Strips elements based on routed token type.
    // We already matched keys above, so we only need to strip numbers.
    else if (!isRangedArray && isRoutedToken) {
        complement = array.filter(function(el) {
            var type = typeof el;
            if (type === 'number') {
                matches[matches.length] = el;
                return false;
            }
            return true;
        });
    }

    // The final complement is rangedArray with a routedToken,
    // relative complement is always empty.
    else {
        complement = [];
        matches = array;
    }

    return [matches, complement];
};
