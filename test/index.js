var Rx = require('rxjs');
Rx.Observable.return = Rx.Observable.of;

require('../src/Router');
require('./Router.spec');
