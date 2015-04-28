module.exports = function onRange(range) {
    var out = [];
    var i = range.from;
    var to = range.to;
    var outIdx = out.length;
    for (; i <= to; ++i, ++outIdx) {
        out[outIdx] = i;
    }

    return out;
};
