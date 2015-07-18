var Keys = require('../Keys');

/**
 * beautify the virtual path, meaning paths with virtual keys will
 * not be displayed as a stringified object but instead as a string.
 *
 * @param {Array} route -
 */
module.exports = function prettifyRoute(route) {
    var length = 0;
    var str = [];
    for (var i = 0, len = route.length; i < len; ++i, ++length) {
        var value = route[i];
        if (typeof value === 'object') {
            value = value.type;
        }

        if (value === Keys.integers) {
            str[length] = 'integers';
        }

        else if (value === Keys.ranges) {
            str[length] = 'ranges';
        }

        else if (value === Keys.keys) {
            str[length] = 'keys';
        }

        else {
            if (Array.isArray(value)) {
                str[length] = JSON.stringify(value);
            }

            else {
                str[length] = value;
            }
        }
    }

    return str;
}
