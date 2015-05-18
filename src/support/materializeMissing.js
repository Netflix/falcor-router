var $atom = require('./../support/types').$atom;
var materialize = {$type: $atom};

module.exports = function materializeMissing(results) {
    results.missing.forEach(function(missing) {
        pathValueMerge(
            results.jsong,
            {path: missing, value: materialize});
    });
};
