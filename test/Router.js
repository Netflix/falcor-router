var Rx = require('rx');
var Observable = Rx.Observable;
var chai = require('chai');
var expect = chai.expect;
var R = require('../bin/Router');

var router = new R([
    {
        route: ['videos', 'summary'],
        get: function(path) {
            return Observable.from({
                videos: {
                    summary: {
                        $type: 'leaf', // TODO: Does paul know about this typing
                        length: 45
                    }
                }
            });
        }
    }
]);

describe('Router', function() {
    it('should execute a simple route matching.', function(done) {
        router.
            get([['videos', 'summary']]).
            subscribe(function(x) {
                debugger;
            }, done, done);
    });
});