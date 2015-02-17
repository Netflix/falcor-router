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
        return executionResults;
    };
    //TODO: 'get' should just be passed in instead of creating objects
    this.get = function(paths) {
        var results = fn(paths.map(function(p) {
            return {
                path: p,
                action: 'get'
            }
        }));
        // Assumes falcor
        return accumulateValues(results);
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
            resu(results).
            flatMap(function(x) { return x.materialize(); });
    };
};

function accumulateValues(precedenceMatches) {
    var model = new falcor.JSONGModel();
    return Observable.
        // TODO: For time sake, this is equivalent to mergeDelayError().materialize()
        // TODO: This will need to be addressed for speed.
        from(precedenceMatches.results).
        flatMap(function(x) {
            debugger;
            return x.obs.
                materialize().
                map(function(jsongEnvNote) {
                    return {
                        note: jsongEnvNote,
                        path: x.path
                    };
                });
        }).
        reduce(function(acc, value) {
            // TODO: should be easy to accept all formats
            var note = value.note;
            var seed = [acc.jsong];
            var res = null;
            if (note.kind === 'N') {
                if (router_isJSONG(note.value)) {
                    res = model._setJSONGsAsJSONG(model, [note.value], seed);
                }
                acc.paths[acc.paths.length] = value.path;
            } else if (note.kind === 'E') {
                if (note.value && router_isJSONG(note.value)) {
                    res = model._setJSONGsAsJSONG(model, [note.value], seed);
                } else {
                    res = model._setPathsAsJSONG(model, [{path: value.path, value: note.exception.message}], seed);
                }
                acc.paths[acc.paths.length] = value.path;
            }
            
            return acc;
        }, {
            jsong: {},
            paths: [],
            errors: []
        });
}

function router_isJSONG(x) {
    return x.jsong && x.paths;
}

Router.ranges = Keys.ranges;
Router.integers = Keys.integers;
Router.keys = Keys.keys;


