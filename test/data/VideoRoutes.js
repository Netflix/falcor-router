var Rx = require('../../src/RouterRx');
var Observable = Rx.Observable;
var R = require('../../src/Router');
var TestRunner = require('./../TestRunner');
var Model = require('falcor').Model;
var $atom = Model.atom;

module.exports = function() {
    return {
        Summary: function (fn) {
            return [{
                route: 'videos.summary',
                get: function(path) {
                    fn && fn(path);
                    return Observable.of({
                        jsonGraph: {
                            videos: {
                                summary: $atom(75)
                            }
                        },
                        paths: [['videos', 'summary']]
                    });
                }
            }];
        },
        Keys: {
            Summary: function (fn) {
                return [{
                    route: 'videos[{keys}].summary',
                    get: function (path) {
                        fn && fn(path);
                        return Observable.
                            from(path[1]).
                            map(function(id) {
                                return generateVideoJSONG(id);
                            });
                    }
                }];
            }
        },
        Integers: {
            Summary: function (fn) {
                return [{
                    route: ['videos', R.integers, 'summary'],
                    get: function (path) {
                        fn && fn(path);
                        return Observable.
                            from(path[1]).
                            map(function(id) {
                                return generateVideoJSONG(id);
                            });
                    }
                }];
            }
        },

        Ranges: {
            Summary: function (fn) {
                return [{
                    route: ['videos', R.ranges, 'summary'],
                    get: function (path) {
                        fn && fn(path);
                        return Observable.
                            from(TestRunner.rangeToArray(path[1])).
                            map(function(id) {
                                return generateVideoJSONG(id);
                            });
                    }
                }];
            }
        },
        State: {
            Keys: function (fn) {
                return [{
                    route: ['videos', 'state', R.keys],
                    get: function (path) {
                        fn && fn(path);
                        return Observable.
                            from(path[2]).
                            map(function(key) {
                                return generateVideoStateJSONG(key);
                            });
                    }
                }];
            },
            Integers: function (fn) {
                return [{
                    route: ['videos', 'state', R.integers],
                    get: function (path) {
                        fn && fn(path);
                        return Observable.
                            from(path[2]).
                            map(function(key) {
                                return generateVideoStateJSONG(key);
                            });
                    }
                }];
            },
            Ranges: function (fn) {
                return [{
                    route: ['videos', 'state', R.ranges],
                    get: function (path) {
                        fn && fn(path);
                        return Observable.
                            from(TestRunner.rangeToArray(path[2])).
                            map(function(key) {
                                return generateVideoStateJSONG(key);
                            });
                    }
                }];
            }
        }
    };
};

function generateVideoJSONG(id) {
    var videos;
    var jsongEnv = {
        jsonGraph: {videos: (videos = {})},
        paths: [['videos', id, 'summary']]
    };
    videos[id] = {summary: $atom({title: 'Some Movie ' + id})};

    return jsongEnv;
}

function generateVideoStateJSONG(id) {
    var videos;
    var jsongEnv = {
        jsonGraph: {videos: (videos = {state: {}})},
        paths: [['videos', 'state', id]]
    };
    videos.state[id] = $atom({title: 'Some State ' + id});

    return jsongEnv;
}
