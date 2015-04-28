var Rx = require('rx');
var Observable = Rx.Observable;
var R = require('../../src/Router');
var TestRunner = require('./../TestRunner');
var falcor = require('falcor');
var $ref = falcor.Model.ref;

module.exports = function() {
    return {
        Integers: function() {
            return [{
                route: 'genreLists[{range:indices}]',
                get: function(path) {
                    return Observable.defer(function() {
                        var genreLists = {};
                        TestRunner.rangeToArray(path.indices).
                            forEach(function(x) {
                                genreLists[x] = $ref(['videos', x, 'summary']);
                            });

                        return Observer.return({
                            jsong: {
                                genreLists: genreLists
                            }
                        });
                    });
                }
            }];
        }
    };
};
