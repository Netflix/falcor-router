var Keys = require('./../Keys');
var convertPathKeyToRange = require('./../operations/ranges/convertPathKeyToRange');
var convertPathKeyToIntegers = require('./../operations/integers/convertPathKeyToIntegers');
var convertPathKeyToKeys = require('./../operations/keys/convertPathKeyToKeys');
/**
 * takes the path that was matched and converts it to the
 * virtual path.
 */
module.exports = function convertPathToVirtual(path, virtual) {
    var matched = [];
    for (var i = 0, len = path.length; i < len; ++i) {

        // Specific key matching
        if (path[i] === virtual[i]) {
            matched[matched.length] = path[i];
        }

        else {
            var virt = virtual[i];
            switch (virt.type) {
                case Keys.ranges:
                    matched[matched.length] =
                        convertPathKeyToRange(path[i]);
                    break;
                case Keys.integers:
                    matched[matched.length] =
                        convertPathKeyToIntegers(path[i]);
                    break;
                case Keys.keys:
                    matched[matched.length] =
                        convertPathKeyToKeys(path[i]);
                    break;
            }
            if (virt.named) {
                matched[virt.name] = matched[matched.length - 1];
            }
        }
    }

    return matched;
};


