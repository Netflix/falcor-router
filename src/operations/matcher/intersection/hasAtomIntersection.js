var Keys = require('./../../../Keys');
var isArray = Array.isArray;
var isRoutedToken = require('./../../../support/isRoutedToken');
var isRange = require('./../../../support/isRange');

/**
 * Takes a matched and virtual atom and validates that they have an
 * intersection.
 */
module.exports = function hasAtomIntersection(matchedAtom, virtualAtom) {
    var virtualIsRoutedToken = isRoutedToken(virtualAtom);
    var isKeys = virtualIsRoutedToken && virtualAtom.type === Keys.keys;
    var matched = false;
    var i, len;

    // To simplify the algorithm we do not allow matched atom to be an
    // array.  This makes the intersection test very simple.
    if (isArray(matchedAtom)) {
        for (i = 0, len = matchedAtom.length; i < len && !matched; ++i) {
            matched = hasAtomIntersection(matchedAtom[i], virtualAtom);
        }
    }

    // the == is very intentional here with all the use cases review.
    else if (doubleEquals(matchedAtom, virtualAtom)) {
        matched = true;
    }

    // Keys match everything.
    else if (isKeys) {
        matched = true;
    }

    // The routed token is for integers at this point.
    else if (virtualIsRoutedToken) {
        matched = isNumber(matchedAtom) || isRange(matchedAtom);
    }

    // is virtual an array
    // Go through each of the array elements and compare against matched item.
    else if (isArray(virtualAtom)) {
        for (i = 0, len = virtualAtom.length; i < len && !matched; ++i) {
            matched = hasAtomIntersection(matchedAtom, virtualAtom[i]);
        }
    }

    // is virtual a range (last option)
    else if (virtualAtom && typeof virtualAtom === 'object') {

        var from = virtualAtom.from || 0;
        var length = (doubleEquals(virtualAtom.to, null) ?
            virtualAtom.length :
            (virtualAtom.to - virtualAtom.from) + 1) || 0;

        if (!isNaN(from)) {
            if (isNumber(matchedAtom)) {
                matched = matchedAtom >= from && matchedAtom < from + length;
            } else if (isRange(matchedAtom)) {

                var matchFrom = matchedAtom.from || 0;
                var matchLength = (doubleEquals(matchedAtom.to, null) ?
                    matchedAtom.length :
                    (matchedAtom.to - matchedAtom.from) + 1) || 0;

                matched = (matchFrom >= from) && (matchLength <= length);
            }
        }
    }

    return matched;
};

//
function isNumber(x) {
    return String(Number(x)) === String(x);
}

/**
 * This was very intentional ==.  The reason is that '1' must equal 1.
 * {} of anysort are always false and array ['one'] == 'one' but that is
 * fine because i would have to go through the array anyways at the
 * last elseif check.
 */
function doubleEquals(a, b) {
    return a == b; // eslint-disable-line eqeqeq
}
