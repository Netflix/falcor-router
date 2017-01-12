var RouterRx = {
  Observable: require('rxjs/Observable').Observable,
  Scheduler: {
    queue: require('rxjs/scheduler/queue').queue
  }
};

require('rxjs/add/observable/defer');
require('rxjs/add/observable/of');
require('rxjs/add/observable/from');
require('rxjs/add/observable/throw');
require('rxjs/add/observable/empty');

require('rxjs/add/operator/mergeMap');
require('rxjs/add/operator/do');
require('rxjs/add/operator/defaultIfEmpty');
require('rxjs/add/operator/materialize');
require('rxjs/add/operator/expand');
require('rxjs/add/operator/reduce');
require('rxjs/add/operator/toArray');
require('rxjs/add/operator/map');
require('rxjs/add/operator/filter');
require('rxjs/add/operator/catch');
require('rxjs/add/operator/concat');

module.exports = RouterRx;
