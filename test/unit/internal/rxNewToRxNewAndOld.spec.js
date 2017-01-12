var Observable = require('../../../../src/RouterRx').Observable;
var rxNewToRxNewAndOld =
    require('../../../../src/run/conversion/rxNewToRxNewAndOld');
var chai = require('chai');
var expect = chai.expect;

describe('rxNewToRxNewAndOld', function () {
    it('should work with "old" observers', function () {
        var source = Observable.of(1, 2, 3);
        var results = [];

        var sub = rxNewToRxNewAndOld(source).subscribe({
            onNext: function (x) {
                results.push(x);
            },
            onError: function (err) {
                throw err;
            },
            onCompleted: function () {
                results.push('done');
            }
        });

        expect(sub.dispose).to.be.a('function');
        expect(sub.unsubscribe).to.be.a('function');
        expect(results).to.deep.equal([1, 2, 3, 'done']);
    });

    it('should work with "new" observers', function () {
        var source = Observable.of(1, 2, 3);
        var results = [];

        var sub = rxNewToRxNewAndOld(source).subscribe({
            next: function (x) {
                results.push(x);
            },
            error: function (err) {
                throw err;
            },
            complete: function () {
                results.push('done');
            }
        });

        expect(sub.dispose).to.be.a('function');
        expect(sub.unsubscribe).to.be.a('function');
        expect(results).to.deep.equal([1, 2, 3, 'done']);
    });

    it('should work with three functions', function () {
        var source = Observable.of(1, 2, 3);
        var results = [];

        var sub = rxNewToRxNewAndOld(source).subscribe(
            function (x) {
                results.push(x);
            },
            function (err) {
                throw err;
            },
            function () {
                results.push('done');
            }
        );

        expect(sub.dispose).to.be.a('function');
        expect(sub.unsubscribe).to.be.a('function');
        expect(results).to.deep.equal([1, 2, 3, 'done']);
    });

    it('should work with no arguments', function () {
        var source = Observable.of(1, 2, 3);
        var results = [];

        var sub = rxNewToRxNewAndOld(source).subscribe();

        expect(sub.dispose).to.be.a('function');
        expect(sub.unsubscribe).to.be.a('function');
        expect(results).to.deep.equal([1, 2, 3, 'done']);
    });

    it('should unsubscribe with `dispose`', function () {
        var source = Observable.of('hello');
        var results = [];

        var sub = rxNewToRxNewAndOld(source).subscribe(
            function (x) {
                results.push(x);
            },
            function (err) {
                throw err;
            },
            function () {
                results.push('done');
            }
        );

        sub.dispose();

        expect(sub.closed).to.be(true);
        expect(sub.isDisposed).to.be(true);
        expect(results).to.deep.equal([]);
    });

    it('should unsubscribe with `unsubscribe`', function () {
        var source = Observable.of('hello');
        var results = [];

        var sub = rxNewToRxNewAndOld(source).subscribe(
            function (x) {
                results.push(x);
            },
            function (err) {
                throw err;
            },
            function () {
                results.push('done');
            }
        );

        sub.unsubscribe();

        expect(sub.closed).to.be(true);
        expect(sub.isDisposed).to.be(true);
        expect(results).to.deep.equal([]);
    });
})
