var SemanticAnalyzer = require('./operations/SemanticAnalyzer');
var ParseTree = require('./operations/ParseTree');
var Router = function(routes) {
    var router = {};
    var routeMatcher = SemanticAnalyzer.generate(ParseTree.generateParseTree(routes, router));
    var fn = function(pathActions) {
        var matched = routeMatcher(pathActions);
        var sorted = matched.
            map(function(a) {
                // Casts the precedence array into a number
                a.precedence = +a.virtualRunner.precedence.join('');
                return a;
            }).
            sort(function(a, b) {
                // reverse precedence ordering.
                if (a.precedence > b.precedence) {
                    return -1;
                } else if (b.precedence > a.precedence) {
                    return 1;
                }
                // can't happen?
                return 0;
            });

        var executionResults = PrecedenceProcessor.
            execute(
                pathActions.map(function(x) {
                    return x.path;
                }), sorted);
        return executionResults.results;
    };
    //TODO: 'get' should just be passed in instead of creating objects
    this.get = function(paths) {
        return fn(paths.map(function(p) {
            return {
                path: p,
                action: 'get'
            }
        }));
    };
    this.set = function(paths) {
        return fn(paths.map(function(p) {
            return {
                path: p,
                action: 'set'
            }
        }));
    };
};

Router.Precedence = require('./Precedence');
var Keys = require('./Keys');

Router.integersOrRanges = Keys.integersOrRanges;
Router.integers = Keys.integers;
Router.keys = Keys.keys;

module.exports = Router;


