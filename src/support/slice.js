module.exports = function slice(args, i) {
    var len = args.length;
    var out = [];
    var j = 0;
    while (i < len) {
        out[j] = args[i];
        ++i;
        ++j;
    }
    return out;
};
