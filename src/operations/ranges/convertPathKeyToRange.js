var convertPathKeyTo = require('./../convertPathKeyTo');
var isArray = Array.isArray;

function onRange(out, range) {
    out[out.length] = range;
}

function keyReduce(out, key, range) {
    key = +key;
    if (range) {
        if (key - 1 === range.to) {
            range.to = key;
        }

        else if (key + 1 === range.from) {
            range.from = key;
        }

        else {
            range = null;
        }
    }

    if (!range) {
        range = {to: key, from: key};
        out[out.length] = range;
    }

    return range;
}

module.exports = convertPathKeyTo(onRange, keyReduce);
