var falcor = require('falcor');
var R = require('./../../src/Router');
var Routes = require('./../data');
var chai = require('chai');
var expect = chai.expect;
var noOp = Function.prototype;

describe('Get', function() {
    it('should take in a falcor model and get a value out.', function(done) {
        var router = new R(Routes().Videos.Summary());

        var model = new falcor.Model({
            source: router
        });
        var called = false;

        model.get('videos.summary').
            do(function (x) {
              called = true;
              expect(x).to.deep.equals({
                  json: {
                      videos: {
                          summary: 75
                      }
                  }
              });
            }, null, function() {
                expect(called).to.be.ok;
            })
            .subscribe(noOp, done, done);
    });

    it('should perform reference following.', function(done) {
        var router = new R(
            Routes().Videos.Integers.Summary().concat(
              Routes().Genrelists.Integers()
            )
        );
        var model = new falcor.Model({
            source: router
        });
        var called = false;

        model.get('genreLists[0].summary').
            do(function (x) {
                called = true;
                expect(x).to.deep.equals({
                    json: {
                        genreLists: {
                            0: {
                                summary: {
                                    title: 'Some Movie 0'
                                }
                            }
                        }
                    }
                });
            }, null, function() {
                expect(called).to.be.ok;
            })
            .subscribe(noOp, done, done);
    });
});
