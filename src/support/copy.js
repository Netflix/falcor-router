function copy(arr) {
    var a = [];
    for (var i = 0; i < arr.length; i++) {
        a[i] = arr[i];
    }
    return a;
}

module.exports = copy;
