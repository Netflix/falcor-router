var JSONGraphError = module.exports = function JSONGraphError(typeValue) {
    this.typeValue = typeValue;
};
JSONGraphError.prototype = new Error();

