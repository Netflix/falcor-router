var MESSAGE = 'function does not exist.';
var CallNotFoundError = module.exports = function CallNotFoundError() {
    this.message = MESSAGE;
    this.stack = (new Error()).stack;
};

CallNotFoundError.prototype = new Error();

