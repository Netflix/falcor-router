var Router = function(routes) {
    var router = {
        __virtualFns: null,
        get: null,
        set: null
    };
    
    var routeMatcher = SemanticAnalyzer.generate(ParseTree.generateParseTree(routes, router), router);
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
        var results = fn(paths.map(function(p) {
            return {
                path: p,
                action: 'get'
            }
        }));
        return Observable.
            // TODO: For time sake, this is equivalent to mergeDelayError().materialize()
            // TODO: This will need to be addressed for speed.
            from(results).
            flatMap(function(x) { return x.materialize(); });
    };
    this.set = function(paths) {
        var results = fn(paths.map(function(p) {
            return {
                path: p,
                action: 'set'
            }
        }));
        return Observable.
            // TODO: For time sake, this is equivalent to mergeDelayError().materialize()
            // TODO: This will need to be addressed for speed.
            from(results).
            flatMap(function(x) { return x.materialize(); });
    };
};

Router.integersOrRanges = Keys.integersOrRanges;
Router.integers = Keys.integers;
Router.keys = Keys.keys;


