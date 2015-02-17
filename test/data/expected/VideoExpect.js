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
        },
        0: {
            Summary: {
                jsong: {
                    videos: {
                        0: {
                            summary: {
                                $type: 'leaf',
                                title: 'Some Movie 0'
                            }
                        }
                    }
                },
                paths: [['videos', 0, 'summary']]
            }
        },
        1: {
            Summary: {
                jsong: {
                    videos: {
                        1: {
                            summary: {
                                $type: 'leaf',
                                title: 'Some Movie 1'
                            }
                        }
                    }
                },
                paths: [['videos', 1, 'summary']]
            }
        },
        2: {
            Summary: {
                jsong: {
                    videos: {
                        2: {
                            summary: {
                                $type: 'leaf',
                                title: 'Some Movie 2'
                            }
                        }
                    }
                },
                paths: [['videos', 2, 'summary']]
            }
        }
    }
};
