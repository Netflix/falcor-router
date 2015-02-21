var Rx = require('rx');
var Observable = Rx.Observable;
var R = require('../../src/Router');
var cache = {
    comments: {
        abc: {
            $type: 'leaf',
            $size: 50,
            message: 'hello abc'
        },
        def: {
            $type: 'leaf',
            $size: 50,
            message: 'hello def'
        },
        ghi: {
            $type: 'leaf',
            $size: 50,
            message: 'hello ghi'
        },
        length: 3
    }
};
module.exports = function() {
    return {
        Comments: {
            Length: [{
                route: ['comments', 'length'],
                get: function() {
                    return Observable.returnValue({
                        path: ['comments', 'length'],
                        value: cache.comments.length
                    });
                }
            }],
            
            Message: [{
                route: ['comments', R.keys],
                set: function(pathSet) {
                    var modelContext = this;
                    return Observable.
                        from(pathSet[1]).
                        map(function(id) {
                            debugger;
                            cache.comments[id] = modelContext.getValueSync(['comments', id]);
                            return {
                                path: ['comments', id],
                                value: cache.comments[id]
                            };
                        });
                },
                get: function(pathSet) {
                    return Observable.
                        from(pathSet[1]).
                        map(function(id) {
                            return {
                                path: ['comments', id],
                                value: cache.comments[id]
                            };
                        });
                }
            }]
        }
    };
};

