var JSONGraphError = require('./../../errors/JSONGraphError');
module.exports = function errorToPathValue(error, path) {
    var typeValue = {
        $type: 'error',
        value: {}
    };

    if (error.throwToNext) {
        throw error;
    }

    // If it is a special JSONGraph error then pull all the data
    if (error instanceof JSONGraphError) {
        typeValue = error.typeValue;
    }

    else if (error instanceof Error) {
        typeValue.value.message = error.message;
    }

    return {
        path: path,
        value: typeValue
    };
};
