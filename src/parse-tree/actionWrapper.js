var convertPathToVirtual = require('./convertPathToVirtual');
var isPathValue = require('./../support/isPathValue');
var slice = require('./../support/slice');
var isArray = Array.isArray;

function createNamedVariables(virtualPath, action) {
    return function innerCreateNamedVariables(matchedPath) {
        var convertedArguments;
        var len = -1;
        var restOfArgs = slice(arguments, 1);
        var isJSONObject = !isArray(matchedPath);

        // A set uses a json object
        if (isJSONObject) {
            restOfArgs = [];
            convertedArguments = matchedPath;
        }

        // Could be an array of pathValues for a set operation.
        else if (isPathValue(matchedPath[0])) {
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
