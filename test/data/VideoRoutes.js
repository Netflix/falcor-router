var Rx = require('rx');
var Observable = Rx.Observable;

module.exports = function() {
    return {
        Summary: [{
            route: ['videos', 'summary'],
            get: function(path) {
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
        }],
        
    };
};
