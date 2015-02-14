var Keys = require('../Keys');
var ParseTree = {
    generateParseTree: function(virtualPaths, router) {
        router.__virtualFns = [];
        var parseTree = {};
        var largestPath = -1;
        virtualPaths.forEach(function(virtualPath) {
            buildParseTree(parseTree, virtualPath, 0, router);
            if (virtualPath.route.length > largestPath) {
                largestPath = virtualPath.route.length;
            }
        });
        parseTree.depth = largestPath;
        return parseTree;
    }
};

module.exports = ParseTree;

function buildParseTree(node, pathAndAction, depth, router) {
    var route = pathAndAction.route;
    var get = pathAndAction.get;
    var set = pathAndAction.set;
    var el = route[depth];

    el = !isNaN(+el) && +el || el;
    var isArray = Array.isArray(el);
    var i = 0;

    do {
        var value = el;
        var next;
        if (isArray) {
            value = value[i];
        }

        if (value === Keys.keys) {
            next = node[Keys.keys] || (node[Keys.keys] = {});
        } else if (value === Keys.integers) {
            next = node[Keys.integers] || (node[Keys.integers] = {});
        } else if (value === Keys.integersOrRanges) {
            next = node[Keys.integersOrRanges] || (node[Keys.integersOrRanges] = {});
        } else {
            if (typeof value === 'number') {
                node.__hasInts = true;
                if (node.__start === undefined) {
                    node.__start = node.__stop = value;
                } else if (value < node.__start) {
                    node.__start = value;
                } else if (value > node.__stop) {
                    node.__stop = value;
                }
            } else {
                node.__hasKeys = true;
            }

            next = node[value] || (node[value] = {});
        }
        if (depth + 1 === route.length) {
            next.__match = {};
            if (get) {
                next.__match.get = router.__virtualFns.length;
                router.__virtualFns.push(get);
            }
            if (set) {
                next.__match.set = router.__virtualFns.length;
                router.__virtualFns.push(set);
            }
        } else {
            buildParseTree(next, pathAndAction, depth + 1, router);
        }
    } while(isArray && ++i < el.length);
}

