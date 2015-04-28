module.exports = function() {
    var retVal = {
        Summary: {
            jsong: {
                videos: {
                    summary: 75
                }
            },
            paths: [['videos', 'summary']]
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
            $type: 'sentinel',
            $size: 51,
            value: {
                title: 'Some Movie ' + id
            }
        }
    };

    return {
        jsong: {videos: videos},
        paths: [['videos', id, 'summary']]
    };
}

function generateState(id) {
    var videos = {state: {}};
    videos.state[id] = {
        $type: 'sentinel',
        $size: 51,
        value: {
            title: 'Some State ' + id
        }
    };

    return {
        jsong: {videos: videos},
        paths: [['videos', 'state', id]]
    };
}
