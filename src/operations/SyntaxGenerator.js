var SyntaxGenerator = {
    variableDeclarationAtDepth: function(depth) {
        return [
            'p', 'i', 'hasNumericKeys', 'numericKeys', 'someNumericKeys',
            'objectKeys', 'isArray', 'isRange',
            'inRange', 'start', 'stop',
            'value', 'typeofP', 'convertedRange', 'convertedArray', 'convertedKeys'
        ].map(function(x) { return x + depth; }).join(',');
    },
    integersOrRanges: function(depth, innerSrc) {
        var src = integersOrRangesString.
            replace(/_D/g, depth).
            replace('__INNER_INTEGERS_OR_RANGES__', innerSrc).
            split('\n');

        return src.join('\n');
    },
    integers: function(depth, innerSrc) {
        var src = integersString.
            replace(/_D/g, depth).
            replace('__INNER_INTEGERS__', innerSrc).
            split('\n');

        return src.join('\n');
    },
    keysStringFn: function(depth, innerSrc) {
        var src = keysString.
            replace(/_D/g, depth).
            replace('__INNER_KEYS__', innerSrc).
            split('\n');

        return src.join('\n');
    },
    readyStackAtDepth: function(depth, node) {
        var str = resetStackString.
            replace(/_D/g, depth).
            replace(/HAS_INTS/g, node.__hasInts).
            replace(/START/g, node.__start).
            replace(/STOP/g, node.__stop).
            split('\n');
        return str.join('\n') + '\n';
    },
    searchBody: function() {
        return searchBody;
    },
    /**
     * @param {Node} node
     * @returns {string}
     */
    getMethod: function(node) {
        return matchedGetMethodString.
            replace(/__GET__/g, node.__match.get).
            split('\n').
            join('\n');
    },
    /**
     * @param {Node} node
     * @returns {string}
     */
    setMethod: function(node) {
        return matchedSetMethodString.
            replace(/__GET__/g, node.__match.set).
            split('\n').
            join('\n');
    }
};

var matchedGetMethodString = fnToString(function innerBlock() {
    if (action === 'get') {
        copyRunner = virtualRunner.concat();
        copyRunner.precedence = virtualRunner.precedence.concat();
        dataResults.push({
            actionType: 'get',
            action: model.__virtualFns[__GET__],
            virtualRunner: copyRunner,
            valueRunner: valueRunner.concat()
        });
    }
});

var matchedSetMethodString = fnToString(function innerBlock() {
    if (action === 'set') {
        copyRunner = virtualRunner.concat();
        copyRunner.precedence = virtualRunner.precedence.concat();
        dataResults.push({
            actionType: 'set',
            action: model.__virtualFns[__SET__],
            virtualRunner: copyRunner,
            valueRunner: valueRunner.concat()
        });
    }
});

var integersOrRangesString = fnToString(function innerBlock() {
    // TODO: isArray_D could be made faster.
    if (isRange_D || isArray_D && someNumericKeys_D) {

        if (isArray_D) {
            convertedRange_D = (
                numericKeys_D ?
                    p_D.sort() :
                    p_D.filter(function (x) {
                        return typeof x === 'number';
                    }).sort()).
                reduce(function (acc, x) {
                    if (!acc) {
                        return [
                            {from: x, to: x}
                        ];
                    }

                    var searching = true;
                    acc.some(function (range) {
                        if (range.to + 1 === x) {
                            range.to++;
                        }

                        return searching;
                    });
                    if (searching) {
                        acc.push({from: x, to: x});
                    }

                    return acc;
                }, null);
        } else if (isRange_D) {
            convertedRange_D = {};
            if (p_D.length) {
                convertedRange_D.length = p_D.length;
            }
            if (p_D.from || p_D.from === 0) {
                convertedRange_D.from = p_D.from;
            }
            if (p_D.to || p_D.to === 0) {
                convertedRange_D.to = p_D.to;
            }
        } else {
            convertedRange_D = {from: p_D, to: p_D};
        }
        virtualRunner.push(Router.integersOrRanges);
        virtualRunner.precedence.push(Router.Precedence.integersOrRanges);
        valueRunner.push(value_D);
        __INNER_INTEGERS_OR_RANGES__
        valueRunner.splice(_D);
        virtualRunner.splice(_D);
        virtualRunner.precedence.splice(_D);
    }
});

var integersString = fnToString(function innerBlock() {
    // TODO: isArray_D could be made faster.
    if (isRange_D || isArray_D && someNumericKeys_D || typeofP_D === 'number') {

        if (isArray_D) {
            if (numericKeys_D) {
                convertedArray_D = p_D.concat();
            } else {
                convertedArray_D = p_D.filter(function(x) { return typeof x === 'number'; });
            }
        } else if (isRange_D) {
            convertedArray_D = [];
            for (i_D = p_D.from; i_D < p_D.to; i_D++) {
                convertedArray_D.push(i_D);
            }
        } else {
            convertedArray_D = [p_D];
        }
        virtualRunner.push(Router.integers);
        virtualRunner.precedence.push(Router.Precedence.integers);
        valueRunner.push(value_D);
        __INNER_INTEGERS__
        valueRunner.splice(_D);
        virtualRunner.splice(_D);
        virtualRunner.precedence.splice(_D);
    }
});

var keysString = fnToString(function innerBlock() {
    if (isRange_D) {
        convertedKeys_D = [];
        for (i_D = p_D.from; i_D < p_D.to; i_D++) {
            convertedKeys_D.push(i_D);
        }
    } else if (isArray_D) {
        convertedKeys_D = p_D.concat();
    } else {
        convertedKeys_D = [p_D];
    }
    virtualRunner.push(Router.keys);
    virtualRunner.precedence.push(Router.Precedence.keys);
    valueRunner.push(value_D);
    __INNER_KEYS__
    valueRunner.splice(_D);
    virtualRunner.splice(_D);
    virtualRunner.precedence.splice(_D);
});

var resetStackString = fnToString(function innerBlock() {
    // reset
    // cannot go forward.
    p_D = path[_D];
    hasNumericKeys_D = HAS_INTS;
    start_D = START;
    stop_D = STOP;
    typeofP_D = typeof p_D;
    value_D = false;

    // Type setup
    if (typeofP_D === 'object') {
        p_D.position = 0;
        if (p_D instanceof Array) {
            isArray_D = true;
            someNumericKeys_D = p_D.some(function(el) { return typeof el === 'number'; });
            numericKeys_D = someNumericKeys_D && p_D.every(function(el) { return typeof el === 'number'; });
            objectKeys_D = !numericKeys_D && p_D.some(function(el) { return typeof el === 'object'; });
            p_D.__length = p_D.length;
        } else {
            isRange_D = true;
            p_D.from = p_D.from || 0;
            if (p_D.to === undefined) {
                p_D.to = (p_D.length - 1) || 0;
            }

            p_D.__length = p_D.to - p_D.from;

            // range intersects the available numeric keys
            inRange_D = isRange_D && hasNumericKeys_D &&
                p_D.from <= stop_D && p_D.to >= start_D ;
        }
    }
});

var searchBody = fnToString(function innerBlock() {
    if (!isArray_D || !isRange_D || (numericKeys_D || inRange_D) && hasNumericKeys_D || !hasNumericKeys_D) {
        do {
            value_D = isArray_D ? p_D[p_D.position] : (isRange_D ? p_D.position + p_D.from : p_D);
            virtualRunner.push(value_D);
            virtualRunner.precedence.push(Router.Precedence.specific);
            valueRunner.push(value_D);
            __SWITCH_KEYS__
            valueRunner.splice(_D);
            virtualRunner.splice(_D);
            virtualRunner.precedence.splice(_D);
        } while((isArray_D || isRange_D) && ++p_D.position < p_D.__length);
    }

    __INTEGERS_OR_RANGES__
    __INTEGERS__
    __KEYS__
});
    
function fnToString(x) {
    return x.toString();
}

module.exports = SyntaxGenerator;