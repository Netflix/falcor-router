var MESSAGE = 'Any JSONG-Graph returned from call must have paths.';
var CallRequiresPathsError = function CallRequiresPathsError() {
    this.message = MESSAGE;
    this.stack = (new Error()).stack;
};

CallRequiresPathsError.prototype = new Error();

module.exports = CallRequiresPathsError;
