var VideoRoutes = require('./VideoRoutes');
var CacheRoutes = require('./CacheRoutes');
module.exports = function() {
    return {
        Videos: VideoRoutes(),
        Cache: CacheRoutes()
    };
};