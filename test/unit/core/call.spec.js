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
var $atom = falcor.Model.atom;
var errors = require('./../../../src/exceptions');
var types = require('../../../src/support/types');

describe('Call', function() {
    it('should perform a simple call.', function(done) {
        var called = 0;
        getRouter().
            call(['videos', 1234, 'rating'], [5]).
            doAction(function(x) {
                expect(x).to.deep.equals({
                    jsonGraph: {
                        videos: {
                            1234: {
                                rating: 5
                            }
                        }
                    },
                    paths: [['videos', 1234, 'rating']]
                });
                ++called;
            }).
            subscribe(noOp, done, function() {
                expect(called).to.equals(1);
                done();
            });
    });

    it('should pass the #30 base call test with only suffix.', function(done) {
        var called = 0;
        var routes = getExtendedRouter().
            call(['lolomo', 'pvAdd'], ['Thrillers'], [['name']]).
            doAction(function(jsongEnv) {
                expect(jsongEnv).to.deep.equals({
                    jsonGraph: {
                        lolomo: $ref('lolomos[123]'),
                        lolomos: {
                            123: {
                                0: $ref('listsById[0]'),
                                pvAdd: {
                                    $type: types.$atom,
                                    $expires: 0
                                }
                            },
                        },
                        listsById: {
                            0: {
                                name: 'Thrillers'
                            }
                        }
                    },
                    paths: [
                        ['lolomo', 0, 'name'],
                        ['lolomo', 'pvAdd']
                    ]
                });
                ++called;
            }).
            subscribe(noOp, done, function() {
                expect(called).to.equals(1);
                done();
            });
    });

    it('should pass the #30 base call test with only paths.', function(done) {
        var called = 0;
        var routes = getExtendedRouter().
            call(['lolomo', 'pvAdd'], ['Thrillers'], null, [['length']]).
            doAction(function(jsongEnv) {
                expect(jsongEnv).to.deep.equals({
                    jsonGraph: {
                        lolomo: $ref('lolomos[123]'),
                        lolomos: {
                            123: {
                                0: $ref('listsById[0]'),
                                length: 1,
                                pvAdd: {
                                    $type: types.$atom,
                                    $expires: 0
                                }
                            },
                        }
                    },
                    paths: [
                        ['lolomo', 'length'],
                        ['lolomo', 'pvAdd']
                    ]
                });
                ++called;
            }).
            subscribe(noOp, done, function() {
                expect(called).to.equals(1);
                done();
            });
    });

    it('should pass the #30 base call test with both paths and suffixes.', function(done) {
        var called = 0;
        var routes = getExtendedRouter().
            call(['lolomo', 'pvAdd'], ['Thrillers'], [['name']], [['length']]).
            doAction(function(jsongEnv) {
                expect(jsongEnv).to.deep.equals({
                    jsonGraph: {
                        lolomo: $ref('lolomos[123]'),
                        lolomos: {
                            123: {
                                0: $ref('listsById[0]'),
                                length: 1,
                                pvAdd: {
                                    $type: types.$atom,
                                    $expires: 0
                                }
                            },
                        },
                        listsById: {
                            0: {
                                name: 'Thrillers'
                            }
                        }
                    },
                    paths: [
                        ['lolomo', 'length'],
                        ['lolomo', 0, 'name'],
                        ['lolomo', 'pvAdd']
                    ]
                });
                ++called;
            }).
            subscribe(noOp, done, function() {
                expect(called).to.equals(1);
                done();
            });
    });


    it('should completely onError when an error is thrown from call.', function(done) {
        getRouter(true, true).
            call(['videos', 1234, 'rating'], [5]).
            doAction(function() {
                throw 'Should not be called.  onNext';
            }, function(x) {
                expect(x.message).to.equal('Oops?');
            }, function() {
                throw 'Should not be called.  onCompleted';
            }).
            subscribe(noOp, function(e) {
                if (e.message === 'Oops?') {
                    done();
                    return;
                }
                done(e);
            });
    });

    it('should cause the router to on error only.', function(done) {
        getRouter(true).
            call(['videos', 1234, 'rating'], [5]).
            doAction(function() {
                throw 'Should not be called.  onNext';
            }, function(x) {
                expect(x.message).to.equal(errors.callJSONGraphWithouPaths);
            }, function() {
                throw 'Should not be called.  onCompleted';
            }).
            subscribe(noOp, function(e) {
                if (e.message === errors.callJSONGraphWithouPaths) {
                    done();
                    return;
                }
                done(e);
            });
    });


    function getRouter(noPaths, throwError) {
        return new R([{
            route: 'videos[{integers:id}].rating',
            call: function(callPath, args) {
                if (throwError) {
                    throw new Error('Oops?');
                }
                return {
                    jsonGraph: {
                        videos: {
                            1234: {
                                rating: args[0]
                            }
                        }
                    },
                    paths: !noPaths && [['videos', 1234, 'rating']] || undefined
                };
            }
        }]);
    }

    function getExtendedRouter() {
        var listsById = {};
        function listsLength() {
            return Object.keys(listsById).length;
        }

        function addToList(name) {
            var length = listsLength();
            listsById[length] = {
                name: name,
                rating: 5
            };

            return length;
        }
        return new R([{
            route: 'lolomo',
            get: function() {
                return {
                    path: ['lolomo'],
                    value: $ref('lolomos[123]')
                };
            }
        }, {
            route: 'lolomos[{keys:ids}][{integers:indices}]',
            get: function(alais) {
                var id = alais[0];
                return Observable.
                    from(alais.indices).
                    map(function(idx) {
                        if (listsById[idx]) {
                            return {
                                path: ['lolomos', id, idx],
                                value: $ref(['listsById', idx])
                            };
                        }
                        return {
                            path: ['lolomos', id],
                            value: $atom(undefined)
                        };
                    });
            }
        }, {
            route: 'lolomos[{keys:ids}].length',
            get: function(alias) {
                var id = alias.ids[0];
                return {
                    path: ['lolomos', id, 'length'],
                    value: listsLength()
                };
            }
        }, {
            route: 'listsById[{integers:idices}].name',
            get: function(alais) {
                return Observable.
                    from(alais.idices).
                    map(function(idx) {
                        if (listsById[idx]) {
                            return {
                                path: ['listsById', idx, 'name'],
                                value: listsById[idx].name
                            };
                        }
                        return {
                            path: ['listsById', idx],
                            value: $atom(undefined)
                        };
                    });
            }
        }, {
            route: 'listsById[{integers:idices}].rating',
            get: function(alais) {
                debugger
                return Observable.
                    from(alais.idices).
                    map(function(idx) {
                        if (listsById[idx]) {
                            return {
                                path: ['listsById', idx, 'rating'],
                                value: listsById[idx].rating
                            };
                        }
                        return {
                            path: ['listsById', idx],
                            value: $atom(undefined)
                        };
                    });
            }
        }, {
            route: 'lolomos[{keys:ids}].pvAdd',
            call: function(callPath, args) {
                var id = callPath.ids[0];
                var idx = addToList(args[0]);
                return {
                    path: ['lolomos', id, idx],
                    value: $ref(['listsById', idx])
                };
            }

        }, {
            route: 'lolomos[{keys:ids}].jsongAdd',
            call: function(callPath, args) {
                debugger
                var id = callPath.ids[0];
                var idx = addToList(args[0]);
                var lolomos = {};
                lolomos[id] = {};
                lolomos[id][idx] = $ref(['listsById', idx]);
                return {
                    jsonGraph: {
                        lolomos: lolomos
                    },
                    paths: [['lolomos', id, idx]]
                };
            }
        }]);
    }
});
