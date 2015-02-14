var through = require("through2").obj;
module.exports = function(opts) {
    var prefix = new Buffer(opts.prefix + "\n" || "");
    var suffix = new Buffer("\n" + opts.suffix || "");
    return through(function(file, enc, cb) {
        if (file.isNull()) {
            return cb();
        }
        if (file.isBuffer()) {
            file.contents = Buffer.concat([prefix, file.contents, suffix]);
        }
        if (file.isStream()) {
            file.contents = [prefix, file.contents.toString(), suffix].join("");
        }
        this.push(file);
        return cb();
    });
};