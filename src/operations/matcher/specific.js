var permuteKey = require('./../../support/permuteKey');
var isArray = Array.isArray;

module.exports = function specificMatcher(keySet, currentNode) {
    // --------------------------------------
    // Specific key
    // --------------------------------------
    var key;
    var memo = {arrOffset: 0, rangeOffset: 0};
    var isKeySet = typeof keySet === 'object';
    var nexts = [];

    if (isKeySet) {
        memo.isArray = isArray(keySet);
        key = permuteKey(keySet, memo);
    } else {
        key = keySet;
        memo.done = true;
    }

    do {

        if (currentNode[key]) {
            nexts[nexts.length] = key;
        }

        if (!memo.done) {
            key = permuteKey(keySet, memo);
        }
    } while (!memo.done);

    return nexts;
};
