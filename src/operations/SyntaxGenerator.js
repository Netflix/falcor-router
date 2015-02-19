var SyntaxOutput = require('./SyntaxOutput');
var SyntaxGenerator = {
    variableDeclarationAtDepth: function(depth) {
        return [
            'p', 'i', 'hasNumericKeys', 'numericKeys', 'someNumericKeys',
            'objectKeys', 'isArray', 'isRange',
            'inRange', 'start', 'stop',
            'value', 'typeofP', 'convertedRange', 'convertedArray', 'convertedKeys'
        ].map(function(x) { return x + depth; }).join(',');
    },
    ranges: function(depth, innerSrc) {
        var src = SyntaxOutput.rangesString.
            replace(/_D/g, depth).
            replace('__INNER_RANGES__', innerSrc).
            split('\n');

        return src.join('\n');
    },
    integers: function(depth, innerSrc) {
        var src = SyntaxOutput.integersString.
            replace(/_D/g, depth).
            replace('__INNER_INTEGERS__', innerSrc).
            split('\n');

        return src.join('\n');
    },
    keysStringFn: function(depth, innerSrc) {
        var src = SyntaxOutput.keysString.
            replace(/_D/g, depth).
            replace('__INNER_KEYS__', innerSrc).
            split('\n');

        return src.join('\n');
    },
    readyStackAtDepth: function(depth, node) {
        var str = SyntaxOutput.resetStackString.
            replace(/_D/g, depth).
            replace(/HAS_INTS/g, node.__hasInts).
            replace(/START/g, node.__start).
            replace(/STOP/g, node.__stop).
            split('\n');
        return str.join('\n') + '\n';
    },
    searchBody: function() {
        return SyntaxOutput.searchBody;
    },
    /**
     * @param {Node} node
     * @returns {string}
     */
    getMethod: function(node) {
        return SyntaxOutput.matchedGetMethodString.
            replace(/__GET__/g, node.__match.get).
            split('\n').
            join('\n');
    },
    /**
     * @param {Node} node
     * @returns {string}
     */
    setMethod: function(node) {
        return SyntaxOutput.matchedSetMethodString.
            replace(/__GET__/g, node.__match.set).
            split('\n').
            join('\n');
    }
};
module.exports = SyntaxGenerator;

