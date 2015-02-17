function valueNode(node) {
    return !Object.keys(node).some(function(x) {
        return x === Router.keys ||
            x === Router.integers ||
            x === Router.integersOrRanges ||
            x.indexOf('__') !== 0;
    });
}
