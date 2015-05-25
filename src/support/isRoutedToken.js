/**
 * Determines if the object is a routed token by hasOwnProperty
 * of type and named
 */
module.exports = function isRoutedToken(obj) {
    return obj.hasOwnProperty('type') && obj.hasOwnProperty('named');
};
