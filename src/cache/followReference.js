var cloneArray = require('./../support/cloneArray');
var $ref = require('./../support/types').$ref;
/**
 * performs the simplified cache reference follow.  This
 * differs from get as there is just following and reporting,
 * not much else.
 */
module.exports = function fastFollowReference(cacheRoot, ref) {
    var current = cacheRoot;
    var refPath = ref;
    var depth = -1;
    var length = ref.length;
    var key, next, type;

    while (++depth < length) {
        key = ref[depth];
        next = current[key];
        type = next && next.$type;

        if (!next || type !== $ref) {
            break;
        }

        // potentially follow reference
        if (depth + 1 === length) {
            if (type === $ref) {
                depth = -1;
                refPath = ref = next.value;
                length = ref.length;
            }
        }
        current = next;
    }

    return [current, cloneArray(refPath)];
};
