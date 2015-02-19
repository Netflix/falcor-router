var Keys = require('../Keys');
function valueNode(node) {
    return !Object.keys(node).some(function(x) {
        return x === Keys.keys ||
            x === Keys.integers ||
            x === Keys.ranges ||
            x.indexOf('__') !== 0;
    });
}
module.exports = valueNode;
