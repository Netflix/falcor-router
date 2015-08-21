module.exports = function onRange(range) {
    var from = range.from;
    var to = range.to;
    var dec = to - from + 1;
    var out = [];
    while (dec--) {
      out[dec] = to--;
    }

    return out;
};
