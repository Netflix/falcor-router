var Keys = require('./../Keys');
module.exports = function convertTypes(virtualPath) {
    virtualPath.route = virtualPath.route.map(function(key) {
        if (typeof key === 'object') {
            switch (key.type) {
                case 'keys':
                    key.type = Keys.keys;
                    break;
                case 'integers':
                    key.type = Keys.integers;
                    break;
                case 'ranges':
                    key.type = Keys.ranges;
                    break;
                default:
                    var err = new Error('Unknown route type.');
                    err.throwToNext = true;
                    break;
            }
        }
        return key;
    });
};
