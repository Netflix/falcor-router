module.exports = function isRange(range) {
    return range.hasOwnProperty('to') && range.hasOwnProperty('from');
};
