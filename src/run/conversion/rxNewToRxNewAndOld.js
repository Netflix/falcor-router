// WHY NOT BOTH?
module.exports = function rxNewToRxNewAndOld(rxNewObservable) {
  var _subscribe = rxNewObservable.subscribe;

  rxNewObservable.subscribe = function (observerOrNextFn, errFn, compFn) {
      var subscription;
      switch (typeof observerOrNextFn) {
          case 'function':
              subscription = _subscribe.call(this,
                  observerOrNextFn, errFn, compFn);
              break;
          case 'object':
              var observer = observerOrNextFn;
              if (typeof observerOrNextFn.onNext === 'function') {
                  // old observer!
                  observer = {
                      next: function (x) {
                          var destination = this.destination;
                          destination.onNext(x);
                      },
                      error: function (err) {
                          var destination = this.destination;
                          if (destination.onError) {
                              destination.onError(err);
                          }
                      },
                      complete: function () {
                          var destination = this.destination;
                          if (destination.onCompleted) {
                              destination.onCompleted();
                          }
                      },
                      destination: observerOrNextFn
                  }
                }
              subscription = _subscribe.call(this, observer);
              break;
          case 'undefined':
              subscription = _subscribe.call(this);
              break;
          default:
              throw new TypeError('cannot subscribe to observable with ' +
                  'type ' + typeof observerOrNextFn);
      }

      var _unsubscribe = subscription.unsubscribe;

      subscription.unsubscribe = subscription.dispose = function () {
          this.isDisposed = true;
          _unsubscribe.call(subscription);
      };

      return subscription;
    }

    return rxNewObservable;
}
