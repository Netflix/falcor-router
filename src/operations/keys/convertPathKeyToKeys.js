var convertPathKeyTo = require('./../convertPathKeyTo');
var isArray = Array.isArray;

function onRange(out, range) {
    var i = range.from;
    var to = range.to;
    var outIdx = out.length;
    for (; i <= to; ++i, ++outIdx) {
        out[outIdx] = i;
    }
}

function onKey(out, key) {
    out[out.length] = key;
}

/**
 * will attempt to get integers from the key
 * or keySet provided. assumes everything passed in is an integer
 * or range of integers.
 */
module.exports = convertPathKeyTo(onRange, onKey);

