var convertPathKeyTo = require('./../convertPathKeyTo');
var rangeToArray = require('./../ranges/rangeToArray');

function onKey(out, key) {
    out[out.length] = key;
}

function onRange(out, range) {
    var len = out.length - 1;
    rangeToArray(range).forEach(function(el) {
        out[++len] = el;
    });
}

/**
 * will attempt to get integers from the key
 * or keySet provided. assumes everything passed in is an integer
 * or range of integers.
 */
module.exports = convertPathKeyTo(onRange, onKey);

