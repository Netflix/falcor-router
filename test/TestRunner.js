var chai = require('chai');
var expect = chai.expect;
var TestRunner = {
    run: function(obs, compares) {
        var count = 0;
        return obs.
            do(function(x) {
                var receivedPathTree = convertToTree({}, x.paths);
                // Validates against all comparables
                compares.forEach(function(c) {
                    jsongPartialCompare(c.jsong, x.jsong);
                    jsongPathContains(receivedPathTree, c.paths);
                });
                count++;
            }, undefined, function() {
                expect(count, 'The observable should of onNext one time').to.equal(1);
            });
    },
    
    comparePath: function(expected, actual) {
        expected.forEach(function(el, i) {
            var aEl = actual[i];
            if (typeof el === 'object') {
                el.forEach(function(innerEl, innerI) {
                    expect(aEl[innerI]).to.deep.equal(innerEl);
                });
            } else {
                expect(aEl).to.equal(el);
            }
        });
    },
    
    partialCompare: jsongPartialCompare
};

module.exports = TestRunner;
function jsongPartialCompare(expectedPartial, actual) {
    traverseAndConvert(actual);
    traverseAndConvert(expectedPartial);
    contains(expectedPartial, actual, '');
}
function jsongPathContains(responseTree, expectedPaths, depth) {
    expectedPaths.forEach(function(p) {
        pathDescend(responseTree, p, 0, function(obj, key, depth) {
            if (depth === p.length - 1) {
                expect(obj[key]).to.equal(null);
            } else {
                expect(obj[key], 'Expected ' + key + ' to exist at depth ' + depth + ' on the jsongEnv.paths tree for path ' + JSON.stringify(p)).to.be.ok;
            }
        });
    });
}

function pathDescend(obj, path, depth, cb) {
    if (depth === path.length) {
        return;
    }
    var key = path[depth];
    if (typeof key === 'object') {
        var keySet = key;

        // TODO: does not account for array of objects
        if (Array.isArray(keySet)) {
            keySet.forEach(function(key) {
                cb(obj, key, depth);
                if (obj[key]) {
                    pathDescend(obj[key], path, depth + 1, cb);
                }
            });
        } else {
            var start = keySet.from || 0;
            var stop = typeof keySet.to === 'number' ? keySet.to : keySet.length;
            for (key = start; key <= stop; key++) {
                cb(obj, key, depth);
                if (obj[key]) {
                    pathDescend(obj[key], path, depth + 1, cb);
                }
            }
        }
    } else {
        cb(obj, key, depth);
        if (obj[key]) {
            pathDescend(obj[key], path, depth + 1, cb);
        }
    }
}

function convertToTree(obj, paths) {
    paths.forEach(function(p) {
        pathDescend(obj, p, 0, function(obj, key, depth) {
            if (depth === p.length - 1) {
                obj[key] = null;
            } else if (!obj[key]) {
                obj[key] = {};
            }
        });
    });
    return obj;
}

function traverseAndConvert(obj) {
    if (Array.isArray(obj)) {
        for (var i = 0; i < obj.length; i++) {
            if (typeof obj[i] === "object") {
                traverseAndConvert(obj[i]);
            } else if (typeof obj[i] === "number") {
                obj[i] = obj[i] + "";
            } else if (typeof obj[i] === "undefined") {
                obj[i] = null;
            }
        }
    } else if (obj != null && typeof obj === "object") {
        Object.keys(obj).forEach(function (k) {
            if (typeof obj[k] === "object") {
                traverseAndConvert(obj[k]);
            } else if (typeof obj[k] === "number") {
                obj[k] = obj[k] + "";
            } else if (typeof obj[k] === "undefined") {
                obj[k] = null;
            }
        });
    }
    return obj;
}

function strip(obj, key) {
    var keys = Array.prototype.slice.call(arguments, 1);
    var args = [0].concat(keys);
    if (obj != null && typeof obj === "object") {
        Object.keys(obj).forEach(function (k) {
            if (~keys.indexOf(k)) {
                delete obj[k];
            } else if ((args[0] = obj[k]) != null && typeof obj[k] === "object") {
                strip.apply(null, args);
            }
        });
    }
}

function contains(expectedPartial, actual, position) {
    if (typeof actual !== 'object') {
        debugger
    }
    var obj = Object.keys(expectedPartial);
    obj.forEach(function (k) {
        var message = "Object" + position;
        expect(expectedPartial, message + " to have key " + k).to.include.keys(k);
        if (typeof expectedPartial[k] !== 'object' && typeof actual[k] !== 'object') {
            expect(actual[k], message + '.' + k).to.equals(expectedPartial[k]);
        } else if (typeof actual[k] === 'object' && Array.isArray(actual[k])) {
            expect(actual[k], message + '.' + k).to.deep.equals(expectedPartial[k]);
        } else {
            contains(expectedPartial[k], actual[k], position + '.' + k);
        }
    });
}
