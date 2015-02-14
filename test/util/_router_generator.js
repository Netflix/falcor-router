var falkor = require('../../bin/Falkor');
var VirtualPaths = falkor.VirtualPaths;

module.exports = {
    addGeneratedPaths: function(model) {
        var generated = {};
        // 'summary'; 'likes'; 'opinions'; 'ratings'; 'authors'; 'directors'; 'actors';
        model.addVirtualPaths([{
            path: ['videos', 'summary'],
            get: function(path) {
                return path;
            }
        }]);
        model.addVirtualPaths([{
            path: ['videos', VirtualPaths.integersOrRanges, 'summary'],
            get: function(path) {
                return path;
            }
        }]);
        model.addVirtualPaths([{
            path: ['videos', VirtualPaths.integersOrRanges, VirtualPaths.integersOrRanges,
                ['summary', 'likes' ,'opinions', 'ratings', 'authors', 'directors', 'actors']],
            get: function(path) {
                return path;
            }
        }]);
        // For non-stripping paths.
        model.addVirtualPaths([{
            path: ['movies', VirtualPaths.integersOrRanges, VirtualPaths.integersOrRanges,
                ['summary', 'likes' ,'opinions', 'ratings', 'authors', 'directors', 'actors']],
            get: function(path) {
                return path;
            }
        }]);

        var videosInts1 = [0, 3, 7, 9];
        var videosInts2 = [2, 3, 4, 5];
        var videosCombined = [[1, 4, 8, 2], [1, 6, 7, 8]];

        for (var i = 0; i < videosInts1.length; i++) {
            model.addVirtualPaths([{
                path: ['videos', videosInts1[i], VirtualPaths.integersOrRanges,
                    ['summary', 'likes' ,'opinions', 'ratings', 'authors', 'directors', 'actors']],
                get: function(path) {
                    return path;
                }
            }]);
            model.addVirtualPaths([{
                path: ['videos', VirtualPaths.integersOrRanges, videosInts2[i],
                    ['summary', 'likes' ,'opinions', 'ratings', 'authors', 'directors', 'actors']],
                get: function(path) {
                    return path;
                }
            }]);
            model.addVirtualPaths([{
                path: ['videos', videosCombined[0][i], videosCombined[1][i],
                    ['summary', 'likes' ,'opinions', 'ratings', 'authors', 'directors', 'actors']],
                get: function(path) {
                    return path;
                }
            }]);
        }
    },

    addVirtualPaths: function(model) {
    }
};

function asArray(range) {
    var start, stop;
    if (range.from || range.from === 0) {
        start = range.from;
    } else {
        start = 0;
    }

    if (range.length) {
        stop = start + (range.length - 1);
    } else if (range.to || range.to === 0) {
        stop = range.to;
    } else {
        stop = 0;
    }

    var res = [];
    for (var i = start; i <= stop; i++) {
        res.push(i);
    }

    return res;
}

