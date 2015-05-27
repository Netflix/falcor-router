var isArray = Array.isArray;
module.exports = function convertPathKeyTo(onRange, onKey) {
    return function converter(keySet) {
        var isKeySet = typeof keySet === 'object';
        var out = [];

        // The keySet we determine what type is this keyset.
        if (isKeySet) {
            if (isArray(keySet)) {
                var reducer = null;
                keySet.forEach(function(key) {
                    if (typeof key === 'object') {
                        reducer = onRange(out, key, reducer);
                    }
                    else {
                        reducer = onKey(out, key, reducer);
                    }
                });
            }

            // What passed in is a range.
            else {
                onRange(out, keySet);
            }
        }

        // simple value for keyset.
        else {
            onKey(out, keySet);
        }

        return out;
    };
};
