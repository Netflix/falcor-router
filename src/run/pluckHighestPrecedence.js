module.exports = function pluckHighestPrecedence(matches) {
    var highest = -1;
    var match = null;

    matches.forEach(function(m) {
        if (m.precedence > highest) {
            match = m;
            highest = match.highest;
        }
    });

    return match;
};
