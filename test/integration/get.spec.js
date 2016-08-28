var falcor = require('falcor');
var Rx = require('rxjs');
var R = require('./../../src/Router');
var Routes = require('./../data');
var noOp = function() {};
var chai = require('chai');
var expect = chai.expect;
describe('Get', function() {
    it('should take in a falcor model and get a value out.', function(done) {
        var router = new R(Routes().Videos.Summary());
        var model = new falcor.Model({
            source: router
        });
        var called = false;

        Rx.Observable.
            from(model.get('videos.summary')).
            do(function(x) {
                called = true;
                expect(x).to.deep.equals({
                    json: {
                        videos: {
                            summary: 75,
                            "$__path": ["videos"]
                        }
                    }
                });
            }, noOp, function() {
                expect(called).to.be.ok;
            }).
            subscribe(noOp, done, done);
    });

    it('should perform reference following.', function(done) {
        var router = new R(
            Routes().Videos.Integers.Summary().concat(
            Routes().Genrelists.Integers()
        ));
        var model = new falcor.Model({
            source: router
        });
        var called = false;

        Rx.Observable.
            from(model.get('genreLists[0].summary')).
            do(function(x) {
                called = true;
                expect(x).to.deep.equals({
                    json: {
                        genreLists: {
                            "$__path": ["genreLists"],
                            0: {
                                "$__path": ["videos", 0],
                                summary: {
                                    title: 'Some Movie 0'
                                }
                            }
                        }
                    }
                });
            }, noOp, function() {
                expect(called).to.be.ok;
            }).
            subscribe(noOp, done, done);
    });
});
