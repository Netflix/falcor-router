function valueNode(node) {
    return !Object.keys(node).some(function(x) {
        return x === '__integers' ||
            x === '__integersOrRanges' ||
            x === '__keys' ||
            !~x.indexOf('__');
    });
}
