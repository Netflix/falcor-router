var VideoRoutes = require('./VideoRoutes');
var GenrelistsRoutes = require('./GenrelistRoutes');
module.exports = function() {
    return {
        Videos: VideoRoutes(),
        Genrelists: GenrelistsRoutes()
    };
};
