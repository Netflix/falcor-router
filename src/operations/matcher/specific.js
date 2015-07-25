var iterateKeySet = require('falcor-path-utils').iterateKeySet;

module.exports = function specificMatcher(keySet, currentNode) {
    // --------------------------------------
    // Specific key
    // --------------------------------------
    var iteratorNote = {};
    var nexts = [];

    var key = iterateKeySet(keySet, iteratorNote);
    do {

        if (currentNode[key]) {
            nexts[nexts.length] = key;
        }

        if (!iteratorNote.done) {
            key = iterateKeySet(keySet, iteratorNote);
        }
    } while (!iteratorNote.done);

    return nexts;
};
