var Rx = require('rx');
var Observable = Rx.Observable;
var R = require('../../src/Router');

module.exports = function() {
    return {
        Summary: function (fn) {
            return [{
                route: ['videos', 'summary'],
                get: function(path) {
                    fn && fn(path);
                    return Observable.return({
                        jsong: {
                            videos: {
                                summary: {
                                    $type: 'leaf',
                                    length: 45
                                }
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
                    route: ['videos', R.keys, 'summary'],
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
                        debugger;
                        return Observable.
                            from(R.rangeToArray(path[1])).
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
                            from(R.rangeToArray(path[2])).
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
        jsong: {videos: (videos = {})},
        paths: [['videos', id, 'summary']]
    };
    videos[id] = {};
    videos[id].summary = {
        title: 'Some Movie ' + id,
        $type: 'leaf'
    };

    return jsongEnv;
}

function generateVideoStateJSONG(id) {
    var videos;
    var jsongEnv = {
        jsong: {videos: (videos = {state: {}})},
        paths: [['videos', 'state', id]]
    };
    videos.state[id] = {
        title: 'Some State ' + id,
        $type: 'leaf'
    };

    return jsongEnv;
}
