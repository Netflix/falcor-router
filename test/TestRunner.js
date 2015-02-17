var chai = require('chai');
var expect = chai.expect;
var TestRunner = {
    run: function(obs, compares) {
        var count = 0;
        return obs.
            do(function(x) {
                // Validates against all comparables
                compares.forEach(function(c) {
                    partialCompare(c, x);
                });
                count++;
            }, undefined, function() {
                expect(count, 'The observable should of onNext one time').to.equal(1);
            });
    }
};

module.exports = TestRunner;
function partialCompare(shouldContain, container) {
    traverseAndConvert(shouldContain);
    traverseAndConvert(container);
    contains(shouldContain, container, '');
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
    debugger;
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

function contains(has, toHave, position) {
    var obj = Object.keys(has);
    obj.forEach(function (k) {
        expect(toHave, "Object" + position + " to have key " + k).to.include.keys(k);
        if (typeof has[k] !== 'object') {
            expect(has[k]).to.equals(toHave[k]);
        } else if (typeof has[k] === 'object' && Array.isArray(has[k])) {
            expect(has[k]).to.deep.equals(toHave[k]);
        } else {
            contains(has[k], toHave[k], position + '.' + k);
        }
    });
}
