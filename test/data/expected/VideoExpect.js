module.exports = function() {
    return {
        Summary: {
            jsong: {
                videos: {
                    summary: {
                        $type: 'leaf',
                        length: 45
                    }
                }
            },
            paths: [['videos', 'summary']]
        }
    }
};
