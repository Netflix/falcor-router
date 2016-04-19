var chai = require('chai');
var expect = chai.expect;
var TestRunner = {
    run: function(obs, compares) {
        var count = 0;
        return obs.
            do(function(x) {
                // Validates against all comparables
                compares.forEach(function(c) {
                    jsongPartialCompare(c.jsonGraph, x.jsonGraph);
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

    partialCompare: jsongPartialCompare,
    rangeToArray: function rangeToArray(ranges) {
        var out = [];
        ranges.forEach(function(range) {
            var to = range.to;
            for (var i = 0; i <= to; ++i) {
                out[out.length] = i;
            }
        });

        return out;
    }
};

module.exports = TestRunner;
function jsongPartialCompare(expectedPartial, actual) {
    traverseAndConvert(actual);
    traverseAndConvert(expectedPartial);
    contains(expectedPartial, actual, '');
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
    }

    /* eslint-disable no-eq-null, eqeqeq */
    else if (obj != null && typeof obj === "object") {
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
    /* eslint-enable no-eq-null, eqeqeq */
    return obj;
}

function contains(expectedPartial, actual, position) {
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
