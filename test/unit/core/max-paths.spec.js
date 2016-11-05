var chai = require('chai');
var expect = chai.expect;
var Router = require('../../../src/Router');
var MaxPathsExceededError = require('../../../src/errors/MaxPathsExceededError');
var pathCount = require('falcor-path-utils').pathCount;

describe('MaxPaths', function() {

    it('should fail if number of get paths is greater than maxPaths.', function(done) {

        var r = new Router([]);

        r.get([["lomo", {length: 9001}, "name"]]).
        subscribe({
            next: function(x) {},
            error: function(e) {
                expect(e).to.be.an.instanceof(MaxPathsExceededError);
                done();
            },
            complete: function() {}
        });

    });

    it('should fail if number of set paths is greater than maxPaths.', function(done) {

        var r = new Router([]);

        r.set({
            jsonGraph: {},
            paths: [["lomo", {length: 9001}, "name"]]
        }).
        subscribe({
            next: function(x) {},
            error: function(e) {
                expect(e).to.be.an.instanceof(MaxPathsExceededError);
                done();
            },
            complete: function() {}
        });
    });

    it('should fail if number of call paths is greater than maxPaths.', function(done) {

        var r = new Router([]);

        r.call(["lomo", {length: 9001}, "name"], [], [], []).
            subscribe({
                next: function(x) {},
                error: function(e) {
                    expect(e).to.be.an.instanceof(MaxPathsExceededError);
                    done();
                },
                complete: function() {}
            });
    });

    it('should fail number of refPaths is greater than maxPaths.', function(done) {

        var r = new Router([]);

        r.call(["lomo", 0, "name"], [], [[{ length: 9001 }]], []).
            subscribe({
                next: function(x) {},
                error: function(e) {
                    expect(e).to.be.an.instanceof(MaxPathsExceededError);
                    done();
                },
                complete: function() {}
            });
    });

    it('should fail number of thisPaths is greater than maxPaths.', function(done) {

        var r = new Router([]);

        r.call(["lomo", 0, "name"], [], [], [[{ length: 9001 }]]).
            subscribe({
                next: function(x) {},
                error: function(e) {
                    expect(e).to.be.an.instanceof(MaxPathsExceededError);
                    done();
                },
                complete: function() {}
            });
    });

    it('should fail if number of thisPaths + refPaths + callPaths is greater than maxPaths.', function(done) {

        var r = new Router([]);

        r.call(["lomo", { length: 3001 }, "name"], [], [[{ length: 3000 }]], [[{ length: 3000 }]]).
            subscribe({
                next: function(x) {},
                error: function(e) {
                    expect(e).to.be.an.instanceof(MaxPathsExceededError);
                    done();
                },
                complete: function() {}
            });
    });

    it('should rethrow MaxPathsExceededError on get.', function(done) {

        var r = new Router([{
            route: "titlesById[{integers:titleIds}].name",
            get: function(pathSet) {
                if (pathSet[1].length > 20) {
                    throw new MaxPathsExceededError();
                }
                return [];
            }
        }]);

        r.get([["titlesById", {length: 21}, "name"]]).
            subscribe({
                next: function(x) {},
                error: function(e) {
                    expect(e).to.be.an.instanceof(MaxPathsExceededError);
                    done();
                },
                complete: function() {}
            });
    });

    it('should rethrow MaxPathsExceededError on set.', function(done) {

        var r = new Router([{
            route: "titlesById[{integers:titleIds}].name",
            set: function(jsonGraphArg) {
                var ids = Object.keys(jsonGraphArg.titlesById);
                if (ids.length > 1) {
                    throw new MaxPathsExceededError();
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
        subscribe({
            next: function(x) {},
            error: function(e) {
                expect(e).to.be.an.instanceof(MaxPathsExceededError);
                done();
            },
            complete: function() {}
        });
    });

    it('should rethrow MaxPathsExceededError on call.', function(done) {

        var r = new Router([{
            route: 'genrelist[{integers:indices}].push',
            call: function(callPath, args, refPaths) {
                refPaths.forEach(function(pathSet) {
                    if (pathCount(pathSet) > 200) {
                        throw new MaxPathsExceededError("You requested too many refPaths from the new list.");
                    }
                });
            }
        }]);

        r.call(["genrelist", 23, "push"],
            [{ $type: "ref", value: ["genrelistsById", 296] }],
            [[{ to: 500 }, "name"]]).
            subscribe({
                next: function(x) {},
                error: function(e) {
                    expect(e).to.be.an.instanceof(MaxPathsExceededError);
                    done();
                },
                complete: function() {}
            });

    });


});
