var TestRunner = require('./../../TestRunner');
var Observable = require('rx').Observable;
var R = require('../../../src/Router');
var Routes = require('./../../data');
var Expected = require('./../../data/expected');
var noOp = function() {};
var chai = require('chai');
var expect = chai.expect;
var falcor = require('falcor');
var $ref = falcor.Model.ref;

describe('Set', function() {
    it('should perform a simple set.', function(done) {
        var did = false;
        var called = 0;
        var router = new R([{
            route: 'videos[{integers:id}].rating',
            set: function(pathValues) {
                try {
                    expect(pathValues.map(function(pV) {
                        return {
                            path: pV.path.concat(),
                            value: pV.value
                        };
                    })).to.deep.equals([
                        {path: ['videos', [1234], 'rating'], value: 5},
                        {path: ['videos', [333], 'rating'], value: 5}
                    ]);
                } catch (e) {
                    done(e);
                    did = true;
                }
                return pathValues;
            }
        }]);
        router.
            set({
                jsong: {
                    videos: {
                        1234: {
                            rating: 5
                        },
                        333: {
                            rating: 5
                        }
                    }
                },
                paths: [
                    ['videos', [1234, 333], 'rating']
                ]
            }).
            doAction(function(result) {
                expect(result).to.deep.equals({
                    jsong: {
                        videos: {
                            1234: {
                                rating: 5
                            },
                            333: {
                                rating: 5
                            }
                        }
                    }
                });
                called++;
            }).
            subscribe(noOp, done, function() {
                if (!did) {
                    expect(called).to.equals(1);
                    done();
                }
            });
    });

    it('should perform a set with get reference following.', function(done) {
        var did = false;
        var called = 0;
        var refFollowed = false;
        var router = new R(
            Routes().Genrelists.Integers(function() {
                refFollowed = true;
            }).concat(
            [{
                route: 'videos[{integers:id}].rating',
                set: function(pathValues) {
                    called++;
                    try {
                        expect(pathValues.map(function(pV) {
                            return {
                                path: pV.path.concat(),
                                value: pV.value
                            };
                        })).to.deep.equals([
                            {path: ['videos', [0], 'rating'], value: 5}
                        ]);
                    } catch (e) {
                        done(e);
                        did = true;
                    }
                    return pathValues;
                }
            }]));

        router.
            set({
                jsong: {
                    videos: {
                        0: {
                            rating: 5
                        }
                    }
                },
                paths: [
                    ['genreLists', 0, 'rating']
                ]
            }).
            doAction(function(res) {
                expect(res).to.deep.equals({
                    jsong: {
                        genreLists: {
                            0: $ref('videos[0]')
                        },
                        videos: {
                            0: {
                                rating: 5
                            }
                        }
                    }
                });
            }).
            subscribe(noOp, done, function() {
                expect(called && refFollowed).to.be.ok;
                done();
            });
    });
});
