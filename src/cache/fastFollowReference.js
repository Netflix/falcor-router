var cloneArray = require('./../support/cloneArray');
var $ref = require('./../support/types').$ref;
var errors = require('./../exceptions');

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

        if (!next || type && type !== $ref) {
            current = next;
            break;
        }

        // This is bad!
        if (type && type === $ref && depth + 1 < length) {
            var err = new Error(errors.innerReferences);
            err.throwToNext = true;
            throw err;
        }

        // potentially follow reference
        if (depth + 1 === length) {
            if (type === $ref) {
                depth = -1;
                refPath = ref = next.value;
                length = ref.length;
                next = cacheRoot;
            }
        }
        current = next;
    }

    return [current, cloneArray(refPath)];
};
