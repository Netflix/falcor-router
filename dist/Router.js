var Rx = require("rx");
var Observable = Rx.Observable;
function valueNode(node) {
    return !Object.keys(node).some(function (x) {
        return x === '__integers' || x === '__integersOrRanges' || x === '__keys' || !~x.indexOf('__');
    });
}
var ParseTree = {
    generateParseTree: function (virtualPaths, router) {
        router.__virtualFns = [];
        var parseTree = {};
        var largestPath = -1;
        virtualPaths.forEach(function (virtualPath) {
            buildParseTree(parseTree, virtualPath, 0, router);
            if (virtualPath.route.length > largestPath) {
                largestPath = virtualPath.route.length;
            }
        });
        return {
            depth: largestPath,
            parseTree: parseTree
        };
    }
};
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
    } while (isArray && ++i < el.length);
}
var PrecedenceProcessor = { execute: executeByPrecedence };
function executeByPrecedence(paths, matches) {
    // process until there are no more paths or no more matches.
    var matched;
    var newPerms;
    var matchedPaths;
    var i = 0;
    var generatedResults;
    var results = [];
    while (paths.length && matches.length) {
        matched = matches.shift();
        // Mutates the paths object.
        newPerms = [];
        matchedPaths = [];
        i = 0;
        do {
            if (// TODO: PERFORMANCE: doesn't need to be executed the first time.
                isMatch(paths[i], matched.valueRunner, matched.virtualRunner)) {
                generatedResults = generateFromMatched(paths[i], matched.virtualRunner, 0);
                newPerms = newPerms.concat(generatedResults.newPermutations);
                matchedPaths.push(generatedResults.matchedPath);
            } else {
                // if its not a match, then put it into the new perms.
                newPerms.push(paths[i]);
            }
        } while (++i < paths.length);
        paths.length = 0;
        paths = paths.concat(newPerms);
        // There will possibly have to be contexts
        matchedPaths.forEach(function (path) {
            // TODO: Error handling?
            results[results.length] = {
                obs: matched.action(matchVirtualPathFormat(path, matched.virtualRunner)),
                path: path
            };
        });
    }
    return {
        misses: paths,
        results: results
    };
}
function isMatch(incoming, value, virtual) {
    for (var i = 0; i < virtual.length; i++) {
        if (!isMatchAtom(incoming[i], value[i], virtual[i])) {
            return false;
        }
    }
    return true;
}
function isStrictComparable(incomingAtom, virtualAtom) {
    return typeof incomingAtom !== 'object' && typeof virtualAtom !== 'object' && virtualAtom !== Router.integers && virtualAtom !== Router.integersOrRanges;
}
function arrayComparable(incomingAtom, virtualAtom) {
    if (// is an array of keys
        typeof virtualAtom === 'object') {
        for (// TODO: PERFORMANCE: value map?
            var i = 0; i < incomingAtom.length; i++) {
            for (var j = 0; j < virtualAtom.length; j++) {
                if (incomingAtom[i] === virtualAtom[j]) {
                    return true;
                }
            }
        }
    } else if (// match on integers or ranges.
        virtualAtom === Router.integersOrRanges || virtualAtom === Router.integers) {
        return incomingAtom.some(function (x) {
            return typeof x === 'number';
        });
    } else if (// matches everything
        virtualAtom === Router.keys) {
        return true;
    } else {
        for (// Loop through incoming and compare against virtualAtom
            // TODO: PERFORMANCE: value map?
            var i = 0; i < incomingAtom.length; i++) {
            if (incomingAtom[i] === virtualAtom) {
                return true;
            }
        }
    }
    return false;
}
function objectComparable(incomingAtom, virtualAtom) {
    var from = incomingAtom.from || 0;
    var to = incomingAtom.to || incomingAtom.length + incomingAtom.from || 0;
    if (// is an array of keys
        typeof virtualAtom === 'object') {
        for (var i = 0; i < virtualAtom.length; i++) {
            if (virtualAtom[i] >= from && virtualAtom[i] <= to) {
                return true;
            }
        }
    } else if (// match on integers or ranges.
        virtualAtom === Router.integersOrRanges || virtualAtom === Router.integers) {
        return true;
    } else if (// matches everything
        virtualAtom === Router.keys) {
        return true;
    } else {
        if (virtualAtom >= from && virtualAtom <= to) {
            return true;
        }
    }
    return false;
}
function isMatchAtom(incomingAtom, valueAtom, virtualAtom) {
    if (// Shortcut for keys
        virtualAtom === Router.keys) {
        return true;
    }
    if (isStrictComparable(incomingAtom, valueAtom)) {
        return incomingAtom === valueAtom;
    } else if (Array.isArray(incomingAtom)) {
        return arrayComparable(incomingAtom, virtualAtom);
    }
    return objectComparable(incomingAtom, virtualAtom);
}
function generateFromMatched(incoming, virtual, matchedIdx) {
    var
        // remove from array
        virtualAtom, incomingAtom;
    var prefix = [];
    var newPermutations = [];
    var results;
    var prefixAtom;
    for (// push onto stack matched with each permutation point stripped out.
        var i = 0; i < virtual.length; i++) {
        virtualAtom = virtual[i];
        incomingAtom = incoming[i];
        prefixAtom = incomingAtom;
        if (// It is permutable.  Time to permute and produce a new array.
            typeof incomingAtom === 'object') {
            // [...] - x0
            results = permuateAt(prefix, virtualAtom, incomingAtom, incoming.slice(i + 1));
            if (results) {
                newPermutations = newPermutations.concat(results.newPermutations);
                prefixAtom = results.newPrefixAtom;
            }
        }
        prefix.push(prefixAtom);
    }
    return {
        newPermutations: newPermutations,
        matchedPath: flatten(prefix)
    };
}
function permuateAt(prefix, virtualAtom, incomingAtom, suffix) {
    if (// If its keys, we never permute.
        virtualAtom === Router.keys) {
        return null;
    }
    var virtualAtomIsIntegers = virtualAtom === Router.integers;
    var virtualAtomIsIntsOrRanges = virtualAtom === Router.integersOrRanges;
    var virtualAtomIsMatcher = virtualAtomIsIntegers || virtualAtomIsIntsOrRanges;
    var newPermutations = [];
    var newPrefixAtom = incomingAtom;
    if (Array.isArray(incomingAtom)) {
        var stripped;
        newPrefixAtom = [];
        if (// incoming atom is all integers and were expecting integers.
            (virtualAtomIsIntegers || virtualAtomIsIntsOrRanges) && incomingAtom.every(function (x) {
                return typeof x === 'number';
            })) {
            return null;
        } else if (// is virtualAtom an array of keys
            Array.isArray(virtualAtom)) {
            var
                // n^2 match
                larger, smaller;
            larger = virtualAtom.length >= incomingAtom.length ? virtualAtom : incomingAtom;
            smaller = virtualAtom.length >= incomingAtom.length ? incomingAtom : virtualAtom;
            stripped = [larger.reduce(function (acc, largerKey) {
                    var matched = false;
                    for (var i = 0; i < smaller.length; i++) {
                        matched = smaller[i] === largerKey;
                        if (matched) {
                            break;
                        }
                    }
                    if (matched) {
                        newPrefixAtom.push(largerKey);
                    } else {
                        acc.push(largerKey);
                    }
                    return acc;
                }, [])];
        } else if (// addressing virtualAtom as an integers matcher.
            virtualAtomIsMatcher) {
            stripped = [incomingAtom.reduce(function (acc, x) {
                    if (typeof x !== 'number') {
                        acc.push(x);
                    } else {
                        newPrefixAtom.push(x);
                    }
                    return acc;
                }, [])];
        } else {
            // virtualAtom is a primitive, check against each element.
            stripped = [incomingAtom.reduce(function (acc, el) {
                    if (el !== virtualAtom) {
                        acc.push(el);
                    } else {
                        newPrefixAtom.push(el);
                    }
                    return acc;
                }, [])];
        }
        if (// Stripped is a 2d array because its concat'd (flattened)
            // into prefix.
            stripped[0].length) {
            newPermutations.push(prefix.concat(flatten(stripped)).concat(suffix));
        }
    } else if (typeof incomingAtom === 'object') {
        if (// short circuit on ints/ranges
            virtualAtomIsIntsOrRanges || virtualAtomIsIntegers) {
            return null;
        }
        var from = incomingAtom.from || 0;
        var to = incomingAtom.to || from + incomingAtom.length;
        if (virtualAtom === from) {
            if (from + 1 > to) {
                return null;
            }
            newPermutations.push(prefix.concat({
                from: from + 1,
                to: to
            }).concat(suffix));
        } else if (virtualAtom === to) {
            if (to - 1 < from) {
                return null;
            }
            newPermutations.push(prefix.concat({
                from: from,
                to: to - 1
            }).concat(suffix));
        } else {
            newPermutations.push(prefix.concat({
                from: from,
                to: virtualAtom - 1
            }).concat(suffix));
            newPermutations.push(prefix.concat({
                from: virtualAtom + 1,
                to: to
            }).concat(suffix));
        }
        newPrefixAtom = virtualAtom;
    } else {
        if (// incomingAtom is a primitive, virtualAtom is unknown.
            // short circuit on ints/ranges
            virtualAtomIsIntsOrRanges || virtualAtomIsIntegers) {
            return null;
        }
        if (// either virtualAtom is array or primitive
            // No permutation on strictComparable.
            isStrictComparable(incomingAtom, virtualAtom)) {
            return null;
        }
        // virtualAtom is an array.
        stripped = [virtualAtom.reduce(function (acc, el) {
                if (el !== incomingAtom) {
                    acc.push(el);
                } else {
                    newPrefixAtom.push(el);
                }
                return acc;
            }, [])];
        if (stripped.length) {
            newPermutations.push(prefix.concat(flatten(stripped)).concat(suffix));
        }
    }
    return {
        newPermutations: newPermutations,
        newPrefixAtom: newPrefixAtom
    };
}
function flatten(x) {
    return x.map(function (atom) {
        if (Array.isArray(atom) && atom.length === 1) {
            return atom[0];
        }
        return atom;
    });
}
function matchVirtualPathFormat(incomingValues, virtualExpected, extentWithIncomingValues) {
    var output = [];
    var i = 0;
    virtualExpected.forEach(function (vK) {
        if (vK === Router.integers) {
            if (typeof incomingValues[i] !== 'object') {
                output[i] = [incomingValues[i]];
            } else if (!Array.isArray(incomingValues[i])) {
                output[i] = convertRangeToArray(array);
            }
        } else if (vK === Router.integersOrRanges) {
            if (typeof incomingValues[i] !== 'object') {
                output[i] = [incomingValues[i]];
            } else if (Array.isArray(incomingValues[i])) {
                output[i] = convertArrayToRange(incomingValues[i]);
            }
        } else if (vK === Router.keys) {
            if (typeof incomingValues[i] !== 'object') {
                output[i] = [incomingValues[i]];
            } else if (!Array.isArray(incomingValues[i])) {
                output[i] = convertRangeToArray(array);
            }
        } else {
            output[i] = incomingValues[i];
        }
        i++;
    });
    return output;
}
function convertRangeToArray(range) {
    var from = range.from || 0;
    var to = typeof range.to === 'number' ? range.to : range.length || 1;
    var convertedValue = [];
    for (var j = from; j <= to; j++) {
        convertedValue.push(j);
    }
    return convertedValue;
}
function convertArrayToRange(array$2) {
    var convertedRange = array$2.sort().reduce(function (acc, v) {
        if (!acc.length) {
            acc.push({
                from: v,
                to: v
            });
        } else {
            var currRange = acc[acc.length - 1];
            if (currRange.to + 1 < v) {
                acc.push({
                    from: v,
                    to: v
                });
            } else {
                currRange.to = v;
            }
        }
        return acc;
    }, []);
    if (convertedRange.length === 0) {
        return convertedRange[0];
    }
    return convertedRange;
}
var SemanticAnalyzer = {
    /**
     * Returns a new function that is the generated virtual code.
     * @param parser
     * @returns {*}
     */
    generate: function (parser, router) {
        return new Function('Router', 'Precedence', 'router', 'return (function innerFunction(pathActions) { ' + topLevelStack(parser.depth, buildVirtualCode(parser.parseTree, 0)) + ' });')(Router, Precedence, router);
    }
};
function buildVirtualCode(node, depth) {
    return [].concat(readyStack(node, depth)).concat(treeTraversal(node, depth)).join('');
}
function topLevelStack(largestStack, innerCode) {
    var str = 'var i = -1, results = [], dataResults = [], path, action, virtualRunner = [], valueRunner = [], copyRunner';
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
    if (exitEarly) {
        return '// EMPTY SWITCH\n';
    }
    return SyntaxGenerator.readyStackAtDepth(depth, node);
}
function treeTraversal(node, depth) {
    var exitEarly = valueNode(node);
    if (exitEarly) {
        return '// EMPTY KEY SET\n';
    }
    return SyntaxGenerator.searchBody().replace('__SWITCH_KEYS__', switchKeys(node, depth)).replace('__INTEGERS_OR_RANGES__', integersOrRanges(node, depth)).replace('__INTEGERS__', integers(node, depth)).replace('__KEYS__', keys(node, depth)).replace(/_D/g, depth);
}
function switchKeys(node, depth) {
    if (!(node.__hasKeys || node.__hasInts)) {
        return '';
    }
    var // Filters all private keys
    keys$2 = Object.keys(node).filter(function (x) {
        return !~x.indexOf('__');
    });
    var str = 'switch (value_D) {\n';
    keys$2.forEach(function (k) {
        if (typeof k === 'string' && isNaN(+k)) {
            str += [
                'case ',
                '"',
                k,
                '"',
                ':\n'
            ].join('');
        } else {
            str += [
                'case ',
                k,
                ':\n'
            ].join('');
        }
        str += executeMatched(node[k]);
        if (!valueNode(node[k])) {
            str += buildVirtualCode(node[k], depth + 1);
        }
        str += 'break;';
    });
    str += '}\n';
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
var SyntaxGenerator = {
    variableDeclarationAtDepth: function (depth) {
        return [
            'p',
            'i',
            'hasNumericKeys',
            'numericKeys',
            'someNumericKeys',
            'objectKeys',
            'isArray',
            'isRange',
            'inRange',
            'start',
            'stop',
            'value',
            'typeofP',
            'convertedRange',
            'convertedArray',
            'convertedKeys'
        ].map(function (x) {
            return x + depth;
        }).join(',');
    },
    integersOrRanges: function (depth, innerSrc) {
        var src = integersOrRangesString.replace(/_D/g, depth).replace('__INNER_INTEGERS_OR_RANGES__', innerSrc).split('\n');
        return src.join('\n');
    },
    integers: function (depth, innerSrc) {
        var src = integersString.replace(/_D/g, depth).replace('__INNER_INTEGERS__', innerSrc).split('\n');
        return src.join('\n');
    },
    keysStringFn: function (depth, innerSrc) {
        var src = keysString.replace(/_D/g, depth).replace('__INNER_KEYS__', innerSrc).split('\n');
        return src.join('\n');
    },
    readyStackAtDepth: function (depth, node) {
        var str = resetStackString.replace(/_D/g, depth).replace(/HAS_INTS/g, node.__hasInts).replace(/START/g, node.__start).replace(/STOP/g, node.__stop).split('\n');
        return str.join('\n') + '\n';
    },
    searchBody: function () {
        return searchBody;
    },
    /**
     * @param {Node} node
     * @returns {string}
     */
    getMethod: function (node) {
        return matchedGetMethodString.replace(/__GET__/g, node.__match.get).split('\n').join('\n');
    },
    /**
     * @param {Node} node
     * @returns {string}
     */
    setMethod: function (node) {
        return matchedSetMethodString.replace(/__GET__/g, node.__match.set).split('\n').join('\n');
    }
};
var matchedGetMethodString = ' if (action==="get"){copyRunner=virtualRunner.concat();copyRunner.precedence=virtualRunner.precedence.concat();dataResults.push({actionType:"get",action:router.__virtualFns[__GET__],virtualRunner:copyRunner,valueRunner:valueRunner.concat()});}';
var matchedSetMethodString = ' if (action==="set"){copyRunner=virtualRunner.concat();copyRunner.precedence=virtualRunner.precedence.concat();dataResults.push({actionType:"set",action:router.__virtualFns[__SET__],virtualRunner:copyRunner,valueRunner:valueRunner.concat()});}';
var integersOrRangesString = ' if (isRange_D||isArray_D&&someNumericKeys_D){ if (isArray_D){convertedRange_D=(numericKeys_D?p_D.sort():p_D.filter( function (x){ return  typeof x==="number";}).sort()).reduce( function (acc,x){ if (!acc){ return [{from:x,to:x}];} var searching=true;acc.some( function (range){ if (range.to+1===x){range.to++;} return searching;}); if (searching){acc.push({from:x,to:x});} return acc;},null);} else  if (isRange_D){convertedRange_D={}; if (p_D.length){convertedRange_D.length=p_D.length;} if (p_D.from||p_D.from===0){convertedRange_D.from=p_D.from;} if (p_D.to||p_D.to===0){convertedRange_D.to=p_D.to;}} else {convertedRange_D={from:p_D,to:p_D};}virtualRunner.push(Router.integersOrRanges);virtualRunner.precedence.push(Precedence.integersOrRanges);valueRunner.push(value_D);__INNER_INTEGERS_OR_RANGES__valueRunner.splice(_D);virtualRunner.splice(_D);virtualRunner.precedence.splice(_D);}';
var integersString = ' if (isRange_D||isArray_D&&someNumericKeys_D||typeofP_D==="number"){ if (isArray_D){ if (numericKeys_D){convertedArray_D=p_D.concat();} else {convertedArray_D=p_D.filter( function (x){ return  typeof x==="number";});}} else  if (isRange_D){convertedArray_D=[]; for (i_D=p_D.from;i_D<p_D.to;i_D++){convertedArray_D.push(i_D);}} else {convertedArray_D=[p_D];}virtualRunner.push(Router.integers);virtualRunner.precedence.push(Precedence.integers);valueRunner.push(value_D);__INNER_INTEGERS__valueRunner.splice(_D);virtualRunner.splice(_D);virtualRunner.precedence.splice(_D);}';
var keysString = ' if (isRange_D){convertedKeys_D=[]; for (i_D=p_D.from;i_D<p_D.to;i_D++){convertedKeys_D.push(i_D);}} else  if (isArray_D){convertedKeys_D=p_D.concat();} else {convertedKeys_D=[p_D];}virtualRunner.push(Router.keys);virtualRunner.precedence.push(Precedence.keys);valueRunner.push(value_D);__INNER_KEYS__valueRunner.splice(_D);virtualRunner.splice(_D);virtualRunner.precedence.splice(_D);';
var resetStackString = 'p_D=path[_D];hasNumericKeys_D=HAS_INTS;start_D=START;stop_D=STOP;typeofP_D= typeof p_D;value_D=false; if (typeofP_D==="object"){p_D.position=0; if (p_D instanceof Array){isArray_D=true;someNumericKeys_D=p_D.some( function (el){ return  typeof el==="number";});numericKeys_D=someNumericKeys_D&&p_D.every( function (el){ return  typeof el==="number";});objectKeys_D=!numericKeys_D&&p_D.some( function (el){ return  typeof el==="object";});p_D.__length=p_D.length;} else {isRange_D=true;p_D.from=p_D.from||0; if (p_D.to===undefined){p_D.to=(p_D.length-1)||0;}p_D.__length=p_D.to-p_D.from;inRange_D=isRange_D&&hasNumericKeys_D&&p_D.from<=stop_D&&p_D.to>=start_D;}}';
var searchBody = ' if (!isArray_D||!isRange_D||(numericKeys_D||inRange_D)&&hasNumericKeys_D||!hasNumericKeys_D){ do {value_D=isArray_D?p_D[p_D.position]:(isRange_D?p_D.position+p_D.from:p_D);virtualRunner.push(value_D);virtualRunner.precedence.push(Precedence.specific);valueRunner.push(value_D);__SWITCH_KEYS__valueRunner.splice(_D);virtualRunner.splice(_D);virtualRunner.precedence.splice(_D);} while ((isArray_D||isRange_D)&&++p_D.position<p_D.__length);}__INTEGERS_OR_RANGES____INTEGERS____KEYS__';
var Keys = {
    integersOrRanges: '__integersOrRanges__',
    integers: '__integers__',
    keys: '__keys__'
};
var Precedence = {
    specific: 4,
    integersOrRanges: 3,
    integers: 2,
    keys: 1
};
var Router = function (routes) {
    var router = {
        __virtualFns: null,
        get: null,
        set: null
    };
    var routeMatcher = SemanticAnalyzer.generate(ParseTree.generateParseTree(routes, router), router);
    var fn = function (pathActions) {
        var matched = routeMatcher(pathActions);
        var sorted = matched.map(function (a) {
            // Casts the precedence array into a number
            a.precedence = +a.virtualRunner.precedence.join('');
            return a;
        }).sort(function (a, b) {
            if (// reverse precedence ordering.
                a.precedence > b.precedence) {
                return -1;
            } else if (b.precedence > a.precedence) {
                return 1;
            }
            // can't happen?
            return 0;
        });
        var executionResults = PrecedenceProcessor.execute(pathActions.map(function (x) {
            return x.path;
        }), sorted);
        return executionResults;
    };
    //TODO: 'get' should just be passed in instead of creating objects
    this.get = function (paths) {
        var results = fn(paths.map(function (p) {
            return {
                path: p,
                action: 'get'
            };
        }));
        // Assumes falcor
        return accumulateValues(results);
    };
    this.set = function (paths) {
        var results = fn(paths.map(function (p) {
            return {
                path: p,
                action: 'set'
            };
        }));
        return Observable.resu(results).flatMap(function (x) {
            return x.materialize();
        });
    };
};
function accumulateValues(precedenceMatches) {
    var model = new falcor.JSONGModel();
    return Observable.from(precedenceMatches.results).flatMap(function (x) {
        debugger;
        return x.obs.materialize().map(function (jsongEnvNote) {
            return {
                note: jsongEnvNote,
                path: x.path
            };
        });
    }).reduce(function (acc, value) {
        var // TODO: should be easy to accept all formats
        note = value.note;
        var seed = [acc.jsong];
        var res = null;
        if (note.kind === 'N') {
            if (isJSONG(note.value)) {
                res = model._setJSONGsAsJSONG(model, [note.value], seed);
            }
            acc.paths[acc.paths.length] = value.path;
        } else if (note.kind === 'E') {
            if (isJSONG(note.value)) {
                res = model._setJSONGsAsJSONG(model, [note.value], seed);
            } else {
                res = model._setPathsAsJSONG(model, [{
                        path: value.path,
                        value: note.value
                    }], seed);
            }
            acc.paths[acc.paths.length] = value.path;
        }
        return acc;
    }, {
        jsong: {},
        paths: [],
        errors: []
    });
}
function isJSONG(x) {
    return x.jsong && x.paths;
}
Router.integersOrRanges = Keys.integersOrRanges;
Router.integers = Keys.integers;
Router.keys = Keys.keys;

module.exports = Router;