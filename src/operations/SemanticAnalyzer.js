var SemanticAnalyzer = {
    /**
     * Returns a new function that is the generated virtual code.
     * @param parser
     * @returns {*}
     */
    generate: function(parser, router) {
        return new Function('Router', 'router', 'return (function innerFunction(pathActions) { ' +
            topLevelStack(parser.depth, buildVirtualCode(parser.parseTree, 0)) +
        ' });')(Router, router);
    }
};

function buildVirtualCode(node, depth) {
    return [].
        concat(readyStack(node, depth)).
        concat(treeTraversal(node, depth)).
        join('');
}

function topLevelStack(largestStack, innerCode) {
    var str = "var i = -1, results = [], dataResults = [], path, action, virtualRunner = [], valueRunner = [], copyRunner";
    for (var i = 0; i < largestStack; i++) {
        str += ', ' + SyntaxGenerator.variableDeclarationAtDepth(i);
    }

    str += ';virtualRunner.precedence = [];\n';
    str += '\nwhile (++i < pathActions.length) {\n';
    str += 'path = pathActions[i].path;\n';
    str += 'action = pathActions[i].action;\n';
    str += innerCode + '\n}\n';
    str += 'return dataResults;\n';

    return str;
}

function readyStack(node, depth) {
    var exitEarly = valueNode(node);
    if (exitEarly) { return '// EMPTY SWITCH\n'; }
    return SyntaxGenerator.readyStackAtDepth(depth, node);
}

function treeTraversal(node, depth) {
    var exitEarly = valueNode(node);
    if (exitEarly) { return '// EMPTY KEY SET\n'; }
    var str = SyntaxGenerator.
        searchBody().
        replace('__SWITCH_KEYS__', switchKeys(node, depth)).
        replace('__INTEGERS_OR_RANGES__', integersOrRanges(node, depth)).
        replace('__INTEGERS__', integers(node, depth)).
        replace('__KEYS__', keys(node, depth)).
        replace(/DEPTH/g, depth).
        split('\n');
    return str.slice(1, str.length - 1).join('\n');
}

function switchKeys(node, depth) {
    if (!(node.__hasKeys || node.__hasInts)) {
        return "";
    }

    // Filters all private keys
    var keys = Object.
        keys(node).
        filter(function(x) { return !~x.indexOf('__'); });

    var str = "switch (valueDEPTH) {\n";
    keys.forEach(function(k) {
        if (typeof k === 'string' && isNaN(+k)) {
            str += ['case ', '"', k, '"', ':\n'].join('');
        } else {
            str += ['case ', k, ':\n'].join('');
        }
        str += executeMatched(node[k]);
        if (!valueNode(node[k])) {
            str += buildVirtualCode(node[k], depth + 1);
        }

        str += 'break;'
    });
    str += "}\n";
    return str;
}

function integersOrRanges(node, depth) {

    if (node.__integersOrRanges) {
        return SyntaxGenerator.integersOrRanges(depth, executeMatched(node) + buildVirtualCode(node.__integersOrRanges, depth + 1));
    }

    // nothing.  No code to generate at this level
    return '';
}

function integers(node, depth) {
    if (node.__integers) {
        return SyntaxGenerator.integers(depth, executeMatched(node) + buildVirtualCode(node.__integers, depth + 1));
    }

    // nothing.  No code to generate at this level
    return '';
}

function keys(node, depth) {
    if (node.__keys) {
        return SyntaxGenerator.keysStringFn(depth, executeMatched(node) + buildVirtualCode(node.__keys, depth + 1));
    }

    // nothing.  No code to generate at this level
    return '';
}

// TODO: move this to the Syntax generat
function executeMatched(node) {

    if (node.__match) {
        var str = '';
        if (typeof node.__match.get === 'number') {
            str += SyntaxGenerator.getMethod(node);
        }
        if (typeof node.__match.set === 'number') {
            str += SyntaxGenerator.setMethod(node);
        }

        return str;
    }
    return '// EMPTY MATCHES\n';
}

