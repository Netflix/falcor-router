var R = require('../../../src/Router');
var noOp = function() {};
var chai = require('chai');
var expect = chai.expect;
var Observable = require('../../../src/RouterRx').Observable;
var Promise = require('promise');

describe('return-types', function() {
    describe('PathValues', function() {
        it('should allow sync returns of a pathValue.', function(done) {
            var ids = [1234];
            run(ids, getPathValues(ids), done);
        });

        it('should allow sync returns array of pathValues.', function(done) {
            var ids = [1234, 555];
            run(ids, getPathValues(ids), done);
        });

        it('should allow async promise returns of a pathValue.', function(done) {
            var ids = [1234];
            run(ids, promise(getPathValues(ids)), done);
        });

        it('should allow async promise returns array of pathValues.', function(done) {
            var ids = [1234, 555];
            run(ids, promise(getPathValues(ids)), done);
        });

        it('should allow async observable returns of a pathValue.', function(done) {
            var ids = [1234];
            run(ids, observable(getPathValues(ids)), done);
        });

        it('should allow async observable returns array of pathValues.', function(done) {
            var ids = [1234, 555];
            run(ids, observable(getPathValues(ids)), done);
        });
    });

    describe('Jsong', function() {
        it('should allow sync returns of a jsong.', function(done) {
            var ids = [1234];
            run(ids, getJsong(ids), done);
        });

        it('should allow sync returns array of jsongs.', function(done) {
            var ids = [1234, 555];
            run(ids, getJsong(ids), done);
        });

        it('should allow async promise returns of a jsong.', function(done) {
            var ids = [1234];
            run(ids, promise(getJsong(ids)), done);
        });

        it('should allow async promise returns array of jsongs.', function(done) {
            var ids = [1234, 555];
            run(ids, promise(getJsong(ids)), done);
        });

        it('should allow async observable returns of a jsong.', function(done) {
            var ids = [1234];
            run(ids, observable(getJsong(ids)), done);
        });

        it('should allow async observable returns array of jsongs.', function(done) {
            var ids = [1234, 555];
            run(ids, observable(getJsong(ids)), done);
        });
    });

    function getRouter(cb) {
        return new R([{
            route: 'videos[{integers:id}].title',
            get: function(aliasMap) {
                return cb(aliasMap);
            }
        }]);
    }

    function getJsong(ids) {
        return function() {
            var videos = {};
            for (var i = 0; i < ids.length; i++) {
                videos[ids[i]] = { title: 'House of Cards' };
            }
            return {
                jsonGraph: {
                    videos: videos
                }
            };
        };
    }

    function getPathValues(ids) {
        return function() {
            var videos = [];
            for (var i = 0; i < ids.length; i++) {
                videos[i] = {path: ['videos', ids[i], 'title'], value: 'House of Cards'};
            }
            return ids.length === 1 ? videos[0] : videos;
        };
    }

    function observable(fn) {
        return function() {
            return Observable.of(fn());
        };
    }

    function promise(fn) {
        return function() {
            return new Promise(function(res) {
                res(fn());
            });
        };
    }

    function getExpected(ids) {
        return getJsong(ids)();
    }

    function run(ids, dataFn, done) {
        var called = false;
        getRouter(dataFn).
            get([['videos', ids, 'title']]).
            do(function(x) {
                expect(x).to.deep.equals(getExpected(ids));
                called = true;
            }, noOp, function() {
                expect(called).to.be.ok;
            }).
            subscribe(noOp, done, done);
    }
});
