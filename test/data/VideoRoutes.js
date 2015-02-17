var Rx = require('rx');
var Observable = Rx.Observable;
var R = require('../../bin/Router');

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

        Integers: {
            Summary: function (fn) {
                return [{
                    route: ['videos', R.integers, 'summary'],
                    get: function (path) {
                        fn && fn(path);
                        return Observable.
                            from(path[1]).
                            map(function(id) {
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
                            });
                    }
                }];
            }
        }
    };
};
