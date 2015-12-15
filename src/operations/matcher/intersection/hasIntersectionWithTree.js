/**
 * @param {PathSet} path - A simple path
 * @param {Object} tree - The tree should have `null` leaves to denote a
 * leaf node.
 */
module.exports = function hasIntersectionWithTree(path, tree) {
    return _hasIntersection(path, tree, 0);
};

function _hasIntersection(path, node, depth) {

    // Exit / base condition.  We have reached the
    // length of our path and we are at a node of null.
    if (depth === path.length && node === null) {
        return true;
    }

    var key = path[depth];
    var next = node[key];

    // If its not undefined, then its a branch.
    if (node !== undefined) {
        return _hasIntersection(path, next, depth + 1);
    }

    return false;
}
