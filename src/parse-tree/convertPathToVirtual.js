var Keys = require('./../Keys');
var convertPathKeyToRange = require('./../operations/ranges/convertPathKeyToRange');
var convertPathKeyToIntegers = require('./../operations/integers/convertPathKeyToIntegers');
var convertPathKeyToKeys = require('./../operations/keys/convertPathKeyToKeys');
var isArray = Array.isArray;
/**
 * takes the path that was matched and converts it to the
 * virtual path.
 */
module.exports = function convertPathToVirtual(path, virtual) {
    var matched = [];
    // Always use virtual path since path can be longer since
    // it contains suffixes.
    for (var i = 0, len = virtual.length; i < len; ++i) {

        if (virtual[i].type) {
            var virt = virtual[i];
            switch (virt.type) {
                case Keys.ranges:
                    matched[i] =
                        convertPathKeyToRange(path[i]);
                    break;
                case Keys.integers:
                    matched[i] =
                        convertPathKeyToIntegers(path[i]);
                    break;
                case Keys.keys:
                    matched[i] =
                        convertPathKeyToKeys(path[i]);
                    break;

                // If type is an indexer.
                case Keys.indexer:
                    if (isArray(path[i])) {
                        matched[i] = path[i];
                    } else {
                        matched[i] = [path[i]];
                    }
                    break;
                default:
                    var err = new Error('Unknown route type.');
                    err.throwToNext = true;
                    break;
            }
            if (virt.named) {
                matched[virt.name] = matched[matched.length - 1];
            }
        }

        // Specific key matching, if there is no type, no need to
        // try to convert matched path into correct path.
        else {
            matched[matched.length] = path[i];
        }
    }

    return matched;
};


