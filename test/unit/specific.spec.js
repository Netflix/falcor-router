var TestRunner = require('./../TestRunner');
var R = require('../../src/Router');
var Routes = require('./../data');
var Expected = require('./../data/expected');
var noOp = function() {};
var chai = require('chai');
var expect = chai.expect;
var falcor = require('falcor');
var $ref = falcor.Model.ref;
var $atom = falcor.Model.atom;

describe('Specific', function() {
    it('should execute a simple route matching.', function(done) {
        var router = new R(Routes().Videos.Summary());
        var obs = router.
            get([['videos', 'summary']]);
        var called = false;
        obs.subscribe(function(res) {
            expect(res).to.deep.equals(Expected().Videos.Summary);
            called = true;
        }, done, function() {
            expect(called, 'expect onNext called 1 time.').to.equal(true);
            done();
        });
    });

    it('should ensure that collapse is being ran.', function(done) {
        var videos = Routes().Videos.Integers.Summary(function(path) {
            expect(path.concat()).to.deep.equal(['videos', [0, 1], 'summary']);
        });
        var genreLists = Routes().Genrelists.Integers(function(incomingPaths) {
            expect(incomingPaths.concat()).to.deep.equal(['genreLists', [{from: 0, to: 1}]]);
        });
        var router = new R(videos.concat(genreLists));
        var obs = router.
            get([['genreLists', [0, 1], 'summary']]);
        var called = false;
        obs.
            doAction(function(res) {
                expect(res).to.deep.equals({
                    jsong: {
                        genreLists: {
                            0: $ref('videos[0]'),
                            1: $ref('videos[1]')
                        },
                        videos: {
                            0: {
                                summary: $atom({title: 'Some Movie 0'})
                            },
                            1: {
                                summary: $atom({title: 'Some Movie 1'})
                            }
                        }
                    }
                });
                called = true;
            }, noOp, function() {
                expect(called, 'expect onNext called 1 time.').to.equal(true);
            }).
            subscribe(noOp, done, done);
    });
});
