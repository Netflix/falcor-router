<a name="0.5.2"></a>
## [0.5.2](https://github.com/Netflix/falcor-router/compare/0.5.1...v0.5.2) (2017-01-13)


### Bug Fixes

* **symbol-observable:** dependency added appropriately ([#202](https://github.com/Netflix/falcor-router/issues/202)) ([fbfa09b](https://github.com/Netflix/falcor-router/commit/fbfa09b))



<a name="0.5.1"></a>
## [0.5.1](https://github.com/Netflix/falcor-router/compare/v0.4.0...v0.5.1) (2017-01-12)


### Bug Fixes

* **Rx:** make sure all necessary operators are added for router internal use ([eab1145](https://github.com/Netflix/falcor-router/commit/eab1145))

<a name="0.5.0"></a>
# [0.5.0](https://github.com/blesh/falcor-router/compare/v0.4.0...v0.5.0) (2017-01-11)

### Features

* **routes:** support routes returning Rx5 and Rx4 observables, as well as observables implementing `Symbol.observable`, such as Most.js. ([d28d5b6](https://github.com/blesh/falcor-router/commit/d28d5b6))
* **get, set, call:** support both Rx4 and Rx5+ formats ([25cc985](https://github.com/blesh/falcor-router/commit/25cc985))
* **hooks:** add error hook to set, get and call ([b0222b3](https://github.com/blesh/falcor-router/commit/b0222b3))


### BREAKING CHANGES

* `get`, `set` and `call` now return RxJS 5 observables. They've been patched to support Rx4 subscription style, however, the methods and operators on them will be different. `flatMapLatest` will be `switchMap`, for example. For more information about operator changes, see [the RxJS migration docs](https://github.com/ReactiveX/rxjs/blob/master/MIGRATION.md)

<a name="0.3.0"></a>
# [0.3.0](https://github.com/Netflix/falcor-router/compare/v0.2.12...v0.3.0) (2016-01-28)


### Bug Fixes

* **empty-call:** Call could not return nothing ([ac3f206](https://github.com/Netflix/falcor-router/commit/ac3f206)), closes [#166](https://github.com/Netflix/falcor-router/issues/166)

### Features

* **onUnhandled*:** decided on the name of the API. ([0895ad5](https://github.com/Netflix/falcor-router/commit/0895ad5))
* **onUnhandled*:** The call feature for unhandled paths. ([2532999](https://github.com/Netflix/falcor-router/commit/2532999))
* **onUnhandled*:** The set feature for unhandled paths. ([d48bbb1](https://github.com/Netflix/falcor-router/commit/d48bbb1))
* **onUnhandled*:** UnhandledGet works as specced. ([ed15ff2](https://github.com/Netflix/falcor-router/commit/ed15ff2))



