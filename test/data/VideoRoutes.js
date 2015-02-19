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
