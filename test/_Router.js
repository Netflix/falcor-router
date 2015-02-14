describe('#Router', function() {
    it('should be able to match simple key paths.', function(done) {
        var path = ['videos', 'summary'];
        execute(model, [{path: path, action: 'get'}]).
            subscribe(function(res) {
                expect(res[0]).to.deep.equal({path: path, value: 17});
            }, done, done);
    });

    it('should match specific keys via an array passed in.', function(done) {
        var path = ['videos', 'state', ['likes', 'friends']];
        execute(model, [{path: path, action: 'get'}]).
            subscribe(function(res) {
                expect(res[0]).to.deep.equal({path: ['videos', 'state', 'likes'], value: 'likes'});
                expect(res[1]).to.deep.equal({path: ['videos', 'state', 'friends'], value: 'friends'});
            }, done, done);
    });

    it('should match a range and return the results.', function(done) {
        var path = ['videos', {from:0, to:5}, 'summary'];
        execute(model, [{path: path, action: 'get'}]).
            subscribe(function(res) {
                for (var i = 0; i < res[0].length; i++) {
                    expect(res[0][i]).to.deep.equal({path: ['videos', i, 'summary'], value: 'Video Summary ' + i});
                }
            }, done, done);
    });

    it('should match a range with only from specified.', function(done) {
        var path = ['videos', {from:0}, 'summary'];
        execute(model, [{path: path, action: 'get'}]).
            subscribe(function(res) {
                expect(res[0][0]).to.deep.equal({path: ['videos', 0, 'summary'], value: 'Video Summary ' + 0});
                expect(res[0].length).to.equal(1);
            }, done, done);
    });

    it('should match a range with only to specified.', function(done) {
        var path = ['videos', {to:1}, 'summary'];
        execute(model, [{path: path, action: 'get'}]).
            subscribe(function(res) {
                for (var i = 0; i < res[0].length; i++) {
                    expect(res[0][i]).to.deep.equal({path: ['videos', i, 'summary'], value: 'Video Summary ' + i});
                }
                expect(res[0].length).to.equal(2);
            }, done, done);
    });

    it('should match a range with only length specified.', function(done) {
        var path = ['videos', {length:3}, 'summary'];
        execute(model, [{path: path, action: 'get'}]).
            subscribe(function(res) {
                for (var i = 0; i < res[0].length; i++) {
                    expect(res[0][i]).to.deep.equal({path: ['videos', i, 'summary'], value: 'Video Summary ' + i});
                }
                expect(res[0].length).to.equal(3);
            }, done, done);
    });

    it('should match a range with nothing specified.', function(done) {
        var path = ['videos', {}, 'summary'];
        execute(model, [{path: path, action: 'get'}]).
            subscribe(function(res) {
                expect(res[0][0]).to.deep.equal({path: ['videos', 0, 'summary'], value: 'Video Summary ' + 0});
                expect(res[0].length).to.equal(1);
            }, done, done);
    });

    it('should match a range with negative from', function(done) {
        var path = ['videos', {from: -2, to: 2}, 'summary'];
        execute(model, [{path: path, action: 'get'}]).
            subscribe(function(res) {
                var result = res[0];
                expect(result.length).to.equal(5);
                for (var j = 0, i = -2; j < result.length; i++, j++) {
                    expect(result[j]).to.deep.equal({path: ['videos', i, 'summary'], value: 'Video Summary ' + i});
                }
            }, done, done);
    });

    it('should match a range with array', function(done) {
        var path = ['videos', {from: -1, to: 1}, ['summary', 'state']];
        execute(model, [{path: path, action: 'get'}]).
            subscribe(function(res) {
                var resultSummary = res[0];
                var resultState = res[1];
                expect(resultSummary.length).to.equal(3);
                expect(resultState.length).to.equal(3);
                for (var j = 0, i = -1; j < resultSummary.length; i++, j++) {
                    expect(resultSummary[j]).to.deep.equal({path: ['videos', i, 'summary'], value: 'Video Summary ' + i});
                }
                for (var j = 0, i = -1; j < resultState.length; i++, j++) {
                    expect(resultState[j]).to.deep.equal({path: ['videos', i, 'state'], value: 'Video State ' + i});
                }
            }, done, done);
    });

    it('should match an ambiguous path.', function(done) {
        var path = ['videos', {from: -1, to: 1}, ['ambiguous']];
        execute(model, [{path: path, action: 'get'}]).
            subscribe(function(res) {
                var specific = res.filter(function(x) { return !Array.isArray(x); })[0];
                var ranged = res.
                    filter(function(x) { return Array.isArray(x); }).
                    sort(function(a, b) {
                        if (a[0].path[1] > b[0].path[1]) {
                            return 1;
                        } else if (b[0].path[1] > a[0].path[1]) {
                            return -1;
                        }
                        return 0;
                    }).
                    map(function(x) {
                        return x[0];
                    });
                expect(ranged.length).to.equal(2);
                expect(ranged[0]).to.deep.equal({path: ['videos', -1, 'ambiguous'], value: 'Video Ranged Ambiguous -1'});
                expect(ranged[1]).to.deep.equal({path: ['videos', 1, 'ambiguous'], value: 'Video Ranged Ambiguous 1'});
                expect(specific).to.deep.equal({path: ['videos', 0, 'ambiguous'], value: 'Video Specific Ambiguous 0'});
            }, done, done);
    });

    it('should match integers.', function(done) {
        var path = ['seasons', [1, 7], 'summary'];
        execute(model, [{path: path, action: 'get'}]).
            subscribe(function(res) {
                var seasons = res[0];
                expect(seasons.length).to.equal(2);
                expect(seasons[0]).to.deep.equal({path: ['seasons', 1, 'summary'], value: 'Seasons 1 Summary'});
                expect(seasons[1]).to.deep.equal({path: ['seasons', 7, 'summary'], value: 'Seasons 7 Summary'});
            }, done, done);
    });

    it('should match ambiguous integers.', function(done) {
        var path = ['seasons', [0, 7], 'summary'];
        execute(model, [{path: path, action: 'get'}]).
            subscribe(function(res) {
                var specific = res[0];
                var seasons = res[1];
                expect(seasons.length).to.equal(1);
                expect(seasons[0]).to.deep.equal({path: ['seasons', 7, 'summary'], value: 'Seasons 7 Summary'});
                expect(specific).to.deep.equal({path: ['seasons', 0, 'summary'], value: 'My Special Season Summary'});
            }, done, done);
    });

    it('should match some keys.', function(done) {
        var path = ['facebook', ['abc', 'def'], 'summary'];
        execute(model, [{path: path, action: 'get'}]).
            subscribe(function(res) {
                var friends = res[0];
                expect(friends.length).to.equal(2);
                expect(friends[0]).to.deep.equal({path: ['facebook', 'abc', 'summary'], value: 'Facebook Friend abc Summary'});
                expect(friends[1]).to.deep.equal({path: ['facebook', 'def', 'summary'], value: 'Facebook Friend def Summary'});
            }, done, done);
    });

    var routes = [
        {
            route: ['videos', 'summary'],
            get: function(path) {
                return {path: path, value: 17};
            }
        },
        {
            route: ['videos', 'state', 'likes'],
            get: function(path) {
            }
        },
        {
            route: ['videos', 'state', 'friends'],
            get: function(path) {
                return {path: path, value: 'friends'};
            }
        },
        {
            route: ['videos', falkor.VirtualPaths.integersOrRanges, 'summary'],
            get: function(path) {
                return asArray(path[1]).
                    map(function(x) {
                        return {path: ['videos', x, 'summary'], value: 'Video Summary ' + x};
                    });
            }
        },
        {
            route: ['videos', falkor.VirtualPaths.integersOrRanges, 'state'],
            get: function(path) {
                return asArray(path[1]).
                    map(function(x) {
                        return {path: ['videos', x, 'state'], value: 'Video State ' + x};
                    });
            }
        },
        {
            route: ['videos', falkor.VirtualPaths.integersOrRanges, 'ambiguous'],
            get: function(path) {
                return asArray(path[1]).
                    map(function(x) {
                        return {path: ['videos', x, 'ambiguous'], value: 'Video Ranged Ambiguous ' + x};
                    });
            }
        },
        {
            route: ['videos', 0, 'ambiguous'],
            get: function(path) {
                return {path: path, value: 'Video Specific Ambiguous ' + 0};
            }
        },
        {
            route: ['seasons', falkor.VirtualPaths.integers, 'summary'],
            get: function(path) {
                return path[1].map(function(p) {
                    return {path: ['seasons', p, 'summary'], value: 'Seasons ' + p + ' Summary'};
                });
            }
        },
        {
            path: ['seasons', 0, 'summary'],
            get: function(path) {
                return {path: ['seasons', 0, 'summary'], value: 'My Special Season Summary'};
            }
        },
        {
            route: ['facebook', falkor.VirtualPaths.keys, 'summary'],
            get: function (path) {
                return path[1].map(function (key) {
                    return {path: ['facebook', key, 'summary'], value: 'Facebook Friend ' + key + ' Summary'};
                });
            }
        },
        {
            route: ['deep', 'nested', 'path', 'with', 'many', 'keys', falkor.VirtualPaths.keys, 'summary'],
            get: function(path) {
                return path[6].map(function(key) {
                    var p = path.concat();
                    p[6] = key;
                    return {path: p, value: 'Deeply nested item!'};
                });
            }
        }
    ];
    var router = new Router(route);
});
function execute(model, pathActions) {
    return Observable.returnValue(model._virtualPaths(pathActions));
}

function objectify(path) {
    return path.reduce(function(val, k) {
        val[k] = {};
        return val;
    }, {});
}

