var RouterRx = {
  Observable: require('rxjs/Observable').Observable,
  Scheduler: {
    queue: require('rxjs/scheduler/queue').queue
  }
};

require('rxjs/add/observable/defer');
require('rxjs/add/observable/of');
require('rxjs/add/observable/from');

require('rxjs/add/operator/mergeMap');
require('rxjs/add/operator/do');
require('rxjs/add/operator/defaultIfEmpty');
require('rxjs/add/operator/materialize');

module.exports = RouterRx;
