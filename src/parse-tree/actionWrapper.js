var convertPathToVirtual = require('./convertPathToVirtual');
var isPathValue = require('./../support/isPathValue');
var slice = require('./../support/slice');

function createNamedVariables(virtualPath, action) {
    return function(matchedPath) {
        var convertedArguments;
        var len = -1;
        var restOfArgs = slice(arguments, 1);

        // Could be an array of pathValues for a set operation.
        debugger
        if (isPathValue(matchedPath[0])) {
            convertedArguments = [];

            matchedPath.forEach(function(pV) {
                pV.path = convertPathToVirtual(pV.path, virtualPath);
                convertedArguments[++len] = pV;
            });
        }

        // else just convert and assign
        else {
            convertedArguments =
                convertPathToVirtual(matchedPath, virtualPath);
        }
        return action.apply(this, [convertedArguments].concat(restOfArgs));
    };
}
module.exports = createNamedVariables;
