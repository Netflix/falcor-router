var R = require('../../../src/Router');
var noOp = function() {};
var chai = require('chai');
var expect = chai.expect;
var falcor = require('falcor');
var $error = falcor.Model.error;
var Observable = require('rx').Observable;
var Promise = require('promise');

describe('isAuthorized', function() {

    it('should run authorize function before call function', function(done) {
        var order = []
        
        var routes = new R([{
            route: 'list.push',
            call: function(callPath, args) {
                order.push("call")
                return [
                            { path: ['list', 0], value: args[0] },
                            { path: ['list', 'length'], value: 1 }
                        ];
            },
            authorize: function() { 
                order.push("auth")
                return true;
            }
        }]);
        
        routes.call(['list','push'], ["hello"]).
            doAction(function(res) {
                expect(order).to.deep.equals(["auth", "call"])
            }, noOp, noOp).
            subscribe(noOp, done, done);
    });


    it('should return an error for the pathSet if unauthorized, sync', function(done) {
        var routes = [{
            route: 'lists[{keys:ids}]',
            get: function(aliasMap) {
                return Observable.
                    returnValue({path: ['lists', aliasMap.ids], value: 5});
            },
            authorize: function() { return false; }
        }];
        var router = new R(routes);
        var obs = router.
            get([['lists', [0, 1]]]);
        var count = 0;
        obs.
            doAction(function(res) {
                expect(res).to.deep.equals({
                    jsonGraph: {
                        lists: {
                            0: $error({message: 'unauthorized', exception: true}),
                            1: $error({message: 'unauthorized', exception: true})
                        }
                    }
                });
                count++;
            }, noOp, function() {
                expect(count, 'expect onNext called 1 time.').to.equal(1);
            }).
            subscribe(noOp, done, done);
    });

    it('should return an error for the pathSet if unauthorized, async - obs', function(done) {
        var routes = [{
            route: 'lists[{keys:ids}]',
            get: function(aliasMap) {
                return Observable.
                    returnValue({path: ['lists', aliasMap.ids], value: 5});
            },
            authorize: function() { return Observable.of(false).delay(100); }
        }];
        var router = new R(routes);
        var obs = router.
            get([['lists', [0, 1]]]);
        var count = 0;
        obs.
            doAction(function(res) {
                expect(res).to.deep.equals({
                    jsonGraph: {
                        lists: {
                            0: $error({message: 'unauthorized', exception: true}),
                            1: $error({message: 'unauthorized', exception: true})
                        }
                    }
                });
                count++;
            }, noOp, function() {
                expect(count, 'expect onNext called 1 time.').to.equal(1);
            }).
            subscribe(noOp, done, done);
    });

    it('should return an error for the pathSet if unauthorized, async - promise', function(done) {
        var routes = [{
            route: 'lists[{keys:ids}]',
            get: function(aliasMap) {
                return Observable.
                    returnValue({path: ['lists', aliasMap.ids], value: 5});
            },
            authorize: function() {
                return new Promise(function(resolve) {
                    resolve(false);
                });
            }
        }];
        var router = new R(routes);
        var obs = router.
            get([['lists', [0, 1]]]);
        var count = 0;
        obs.
            doAction(function(res) {
                expect(res).to.deep.equals({
                    jsonGraph: {
                        lists: {
                            0: $error({message: 'unauthorized', exception: true}),
                            1: $error({message: 'unauthorized', exception: true})
                        }
                    }
                });
                count++;
            }, noOp, function() {
                expect(count, 'expect onNext called 1 time.').to.equal(1);
            }).
            subscribe(noOp, done, done);
    });

    it('should return the value for the pathSet if authorized, async - promise', function(done) {
        var routes = [{
            route: 'lists[{keys:ids}]',
            get: function(aliasMap) {
                return Observable.
                    returnValue({path: ['lists', aliasMap.ids], value: 5});
            },
            authorize: function() {
                return new Promise(function(resolve) {
                    resolve(true);
                });
            }
        }];
        var router = new R(routes);
        var obs = router.
            get([['lists', [0, 1]]]);
        var count = 0;
        obs.
            doAction(function(res) {
                expect(res).to.deep.equals({
                    jsonGraph: {
                        lists: {
                            0: 5,
                            1: 5
                        }
                    }
                });
                count++;
            }, noOp, function() {
                expect(count, 'expect onNext called 1 time.').to.equal(1);
            }).
            subscribe(noOp, done, done);
    });

    it('should return the value for the pathSet if authorized, async - obs', function(done) {
        var routes = [{
            route: 'lists[{keys:ids}]',
            get: function(aliasMap) {
                return Observable.
                    returnValue({path: ['lists', aliasMap.ids], value: 5});
            },
            authorize: function() { return Observable.of(true).delay(100); }
        }];
        var router = new R(routes);
        var obs = router.
            get([['lists', [0, 1]]]);
        var count = 0;
        obs.
            doAction(function(res) {
                expect(res).to.deep.equals({
                    jsonGraph: {
                        lists: {
                            0: 5,
                            1: 5
                        }
                    }
                });
                count++;
            }, noOp, function() {
                expect(count, 'expect onNext called 1 time.').to.equal(1);
            }).
            subscribe(noOp, done, done);
    });
});
