module.exports = function copy(valueType) {
    if (typeof valueType !== 'object') {
        return valueType;
    }

    return Object.
        keys(valueType).
        reduce(function(acc, k) {
            acc[k] = valueType[k];
            return acc;
        }, {});
};

