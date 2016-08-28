var TestRunner = require('./../../TestRunner');
var R = require('../../../src/Router');
var Routes = require('./../../data');
var Expected = require('./../../data/expected');
var noOp = function() {};
var sinon = require("sinon");
var chai = require('chai');
var expect = chai.expect;

describe('Integers', function() {
    it('should match integers for videos with int keys passed in.', function(done) {
        var router = new R(
            Routes().Videos.Integers.Summary(function(pathSet) {
                TestRunner.comparePath(['videos', [1], 'summary'], pathSet);
            })
        );
        var obs = router.
            get([['videos', 1, 'summary']]);

        TestRunner.
            run(obs, [Expected().Videos[1].summary]).
            subscribe(noOp, done, done);
    });

    it('should match integers for videos with array of ints passed in.', function(done) {
        var router = new R(
            Routes().Videos.Integers.Summary(function(pathSet) {
                TestRunner.comparePath(['videos', [1, 2], 'summary'], pathSet);
            })
        );
        var obs = router.
            get([['videos', [1, 2], 'summary']]);

        TestRunner.
            run(obs, [Expected().Videos[1].summary, Expected().Videos[2].summary]).
            subscribe(noOp, done, done);
    });

    it('should match integers for videos with range passed in.', function(done) {
        var router = new R(
            Routes().Videos.Integers.Summary(function(pathSet) {
                TestRunner.comparePath(['videos', [0, 1], 'summary'], pathSet);
            })
        );
        var obs = router.
            get([['videos', {to: 1}, 'summary']]);

        TestRunner.
            run(obs, [Expected().Videos[0].summary, Expected().Videos[1].summary]).
            subscribe(noOp, done, done);
    });

    it('should match integers as last key.', function(done) {
        var router = new R(
            Routes().Videos.State.Integers(function(pathSet) {
                TestRunner.comparePath(['videos', 'state', [0]], pathSet);
            })
        );
        var obs = router.
            get([['videos', 'state', 0]]);

        TestRunner.
            run(obs, [Expected().Videos.state[0]]).
            subscribe(noOp, done, done);
    });

    it('should match ranges with integers pattern and coerce match into an array of integers.', function(done) {
        var onNext = sinon.spy();
        var router = new R([
            {
                route: 'titlesById[{integers}]["name", "rating"]',
                get: function() {
                    return [
                        {
                            path: ['titlesById', 1, 'name'],
                            value: 'Orange is the new Black'
                        },
                        {
                            path: ['titlesById', 1, 'rating'],
                            value: 5
                        }
                    ];
                }
            }
        ]);

        router.
            get([['titlesById', {from: 1, to: 1}, ["name", "rating"]]]).
            do(onNext).
            do(noOp, noOp, function(x) {
                expect(onNext.calledOnce).to.be.ok;
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    jsonGraph: {
                        titlesById: {
                            1: {
                                name: 'Orange is the new Black',
                                rating: 5
                            }
                        }
                    }
                });
            }).
            subscribe(noOp, done, done);
    });

});
