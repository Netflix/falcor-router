var MESSAGE = "Maximum number of paths exceeded.";

var MaxPathsExceededError = function MaxPathsExceededError(message) {
    this.message = message === undefined ? MESSAGE : message;
    this.stack = (new Error()).stack;
};

MaxPathsExceededError.prototype = new Error();
MaxPathsExceededError.prototype.throwToNext = true;

module.exports = MaxPathsExceededError;
