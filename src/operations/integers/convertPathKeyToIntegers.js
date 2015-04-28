var convertPathKeyTo = require('./../convertPathKeyTo');
var isArray = Array.isArray;

function onRange(out, range) {
    var i = key.from;
    var to = key.to;
    var outIdx = out.length;
    for (; i < to; ++i, ++outIdx) {
        out[outIdx] = i;
    }
}

function onKey(out, key) {
    key = +key;
    if (!isNaN(key)) {
        out[out.length] = key;
    }
}

/**
 * will attempt to get integers from the key
 * or keySet provided. assumes everything passed in is an integer
 * or range of integers.
 */
module.exports = convertPathKeyTo(onRange, onKey);
