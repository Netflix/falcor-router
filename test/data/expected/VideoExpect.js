var $atom = require('./../../../src/merge/util/types').$atom;
module.exports = function() {
    var retVal = {
        Summary: {
            jsong: {
                videos: {
                    summary: {
                        $type: $atom,
                        value: 75
                    }
                }
            }
        },
    };
    [0, 1, 2, 'someKey'].forEach(function(key) {
        retVal[key] = {
            summary: generateSummary(key)
        };
    });
    retVal.state = {};
    [0, 1, 2, 'specificKey'].forEach(function(key) {
        retVal.state[key] = generateState(key);
    });
    return retVal;
};

function generateSummary(id) {
    var videos = {};
    videos[id] = {
        summary: {
            $type: $atom,
            value: {
                title: 'Some Movie ' + id
            }
        }
    };

    return {
        jsong: {videos: videos}
    };
}

function generateState(id) {
    var videos = {state: {}};
    videos.state[id] = {
        $type: $atom,
        value: {
            title: 'Some State ' + id
        }
    };

    return {
        jsong: {videos: videos}
    };
}
