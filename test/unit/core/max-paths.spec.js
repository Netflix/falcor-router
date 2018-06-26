var chai = require('chai');
var expect = chai.expect;
var Router = require('../../../src/Router');
var MaxPathsExceededError = require('../../../src/errors/MaxPathsExceededError');
var pathCount = require('falcor-path-utils').pathCount;
var Observable = require('falcor-observable').Observable;

function unreachable() {
    throw new Error("should no reach here");
}

describe('MaxPaths', function() {

    it('should fail if number of get paths is greater than maxPaths.', function(done) {
        var r = new Router([]);

        r.get([["lomo", {length: 9001}, "name"]]).
        subscribe(
            function(x) {},
            function(e) {
                expect(e).to.be.an.instanceof(MaxPathsExceededError);
                done();
            },
            unreachable
        );

    });

    it('should execute the error hook on MaxPathsExceededError during get', function(done) {
        var callCount = 0;
        var callArgs = null;
        var r = new Router([],
        {
            hooks: {
                error: function () {
                    callCount++;
                    callArgs = Array.prototype.slice.call(arguments);
                }
            }
        });

        r.get([["lomo", {length: 9001}, "name"]]).
        subscribe(
            function(x) {},
            function(e) {
                expect(callCount).to.equal(1);
                expect(callArgs).to.deep.equal([e]);
                done();
            },
            unreachable
        );

    });

    it('should fail if number of set paths is greater than maxPaths.', function(done) {

        var r = new Router([]);

        r.set({
            jsonGraph: {},
            paths: [["lomo", {length: 9001}, "name"]]
        }).
        subscribe(
            function(x) {},
            function(e) {
                expect(e).to.be.an.instanceof(MaxPathsExceededError);
                done();
            },
            unreachable
        );
    });

    it('should call error hook on MaxPathsExceededError in set.', function(done) {
        var callCount = 0;
        var callArgs = null;
        var r = new Router([], {
            hooks: {
                error: function () {
                    callCount++;
                    callArgs = Array.prototype.slice.call(arguments);
                }
            }
        });

        r.set({
            jsonGraph: {},
            paths: [["lomo", {length: 9001}, "name"]]
        }).
        subscribe(
            function(x) {},
            function(e) {
                expect(callCount).to.equal(1);
                expect(callArgs).to.deep.equal([e]);
                done();
            },
            unreachable
        );
    });

    it('should fail if number of call paths is greater than maxPaths.', function(done) {

        var r = new Router([]);

        r.call(["lomo", {length: 9001}, "name"], [], [], []).
            subscribe(
                function(x) {},
                function(e) {
                    expect(e).to.be.an.instanceof(MaxPathsExceededError);
                    done();
                },
                unreachable
            );
    });

    it('should call the error hook on MaxPathsExceededError during call.', function(done) {
        var callCount = 0;
        var callArgs = null;

        var r = new Router([], {
            hooks: {
                error: function () {
                    callCount++;
                    callArgs = Array.prototype.slice.call(arguments);
                }
            }
        });

        r.call(["lomo", {length: 9001}, "name"], [], [], []).
            subscribe(
                function(x) {},
                function(e) {
                    expect(callCount).to.equal(1);
                    expect(callArgs).to.deep.equal([e]);
                    done();
                },
                unreachable
            );
    });

    it('should fail number of refPaths is greater than maxPaths.', function(done) {

        var r = new Router([]);

        r.call(["lomo", 0, "name"], [], [[{ length: 9001 }]], []).
            subscribe(
                function(x) {},
                function(e) {
                    expect(e).to.be.an.instanceof(MaxPathsExceededError);
                    done();
                },
                unreachable
            );
    });

    it('should fail number of thisPaths is greater than maxPaths.', function(done) {

        var r = new Router([]);

        r.call(["lomo", 0, "name"], [], [], [[{ length: 9001 }]]).
            subscribe(
                function(x) {},
                function(e) {
                    expect(e).to.be.an.instanceof(MaxPathsExceededError);
                    done();
                },
                unreachable
            );
    });

    it('should fail if number of thisPaths + refPaths + callPaths is greater than maxPaths.', function(done) {

        var r = new Router([]);

        r.call(["lomo", { length: 3001 }, "name"], [], [[{ length: 3000 }]], [[{ length: 3000 }]]).
            subscribe(
                function(x) {},
                function(e) {
                    expect(e).to.be.an.instanceof(MaxPathsExceededError);
                    done();
                },
                unreachable
            );
    });

    it('should rethrow MaxPathsExceededError on get.', function(done) {

        var r = new Router([{
            route: "titlesById[{integers:titleIds}].name",
            get: function(pathSet) {
                if (pathSet[1].length > 20) {
                    return Observable.throw(new MaxPathsExceededError());
                }
                return [];
            }
        }]);

        r.get([["titlesById", {length: 21}, "name"]]).
            subscribe(
                function(x) {},
                function(e) {
                    expect(e).to.be.an.instanceof(MaxPathsExceededError);
                    done();
                },
                unreachable
            );
    });

    it('should rethrow MaxPathsExceededError on set.', function(done) {

        var r = new Router([{
            route: "titlesById[{integers:titleIds}].name",
            set: function(jsonGraphArg) {
                var ids = Object.keys(jsonGraphArg.titlesById);
                if (ids.length > 1) {
                    return Observable.throw(new MaxPathsExceededError());
                }
                return [];
            }
        }]);

        r.set({
            jsonGraph: {
                titlesById: {
                    0: {
                        name: "House of Cards"
                    },
                    1: {
                        name: "Daredevil"
                    }
                }
            },
            paths: [["titlesById", [0, 1], "name"]]
        }).
        subscribe(
            function(x) {},
            function(e) {
                expect(e).to.be.an.instanceof(MaxPathsExceededError);
                done();
            },
            unreachable
        );
    });

    it('should rethrow MaxPathsExceededError on call.', function(done) {

        var r = new Router([{
            route: 'genrelist[{integers:indices}].push',
            call: function(callPath, args, refPaths) {
                var total = refPaths.reduce(function(acc, pathSet) {
                    return acc + pathCount(pathSet);
                }, 0);
                return total > 200 ? Observable.throw(
                    new MaxPathsExceededError("You requested too many refPaths from the new list.")
                ) : Observable.empty();
            }
        }]);

        r.call(["genrelist", 23, "push"],
            [{ $type: "ref", value: ["genrelistsById", 296] }],
            [[{ to: 500 }, "name"]]).
            subscribe(
                function(x) {},
                function(e) {
                    expect(e).to.be.an.instanceof(MaxPathsExceededError);
                    done();
                },
                unreachable
            );

    });


});
