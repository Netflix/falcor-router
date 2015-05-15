var convertPathToVirtual = require('./convertPathToVirtual');
var isPathValue = require('./../support/isPathValue');
var slice = function(args, i) {
    var len = args.len;
    var out = [];
    var j = 0;
    while (i < len) {
        out[j] = args[i];
        ++i;
        ++j;
    }
}
function createNamedVariables(virtualPath, action) {
    return function(matchedPath) {
        var convertedArguments;
        var len = -1;
        var restOrArgs = arguments

        // Could be an array of pathValues for a set operation.
        if (isPathValue(matchedPath[0])) {
            convertedArguments = [];

            matchedPath.forEach(function(pV) {
                pV.path = convertPathToVirtual(pV.path, virtualPath);
                convertedArguments[++len] = pV;
            });
        }

        // else just convert and assign
        else {
            convertedArguments = convertPathToVirtual(matchedPath, virtualPath);
        }
        return action.call(this, convertedArguments);
    };
}
module.exports = createNamedVariables;
