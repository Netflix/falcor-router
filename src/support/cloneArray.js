function cloneArray(arr, i) {
    var a = [];
    var len = arr.length;
    for (i = i || 0; i < len; i++) {
        a[i] = arr[i];
    }
    return a;
}

module.exports = cloneArray;
