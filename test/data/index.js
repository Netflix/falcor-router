var VideoRoutes = require('./VideoRoutes');
module.exports = function() {
    return {
        Videos: VideoRoutes()
    };
};