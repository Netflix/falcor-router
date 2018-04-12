<a name="0.8.3"></a>
## 0.8.3 (2018-04-12)

* fix: use hooks.now if available ([3ff0df4](https://github.com/Netflix/falcor-router/commit/3ff0df4))



<a name="0.8.2"></a>
## 0.8.2 (2018-04-12)

* fix: process hooks after createClass to allow for request specific hooks. ([f3ac9df](https://github.com/Netflix/falcor-router/commit/f3ac9df))




<a name="0.8.1"></a>
## 0.8.1 (2017-06-01)


### Bug Fixes

* Handle Falcor style observables from unhandled path datasource. ([07ce5ff](https://github.com/Netflix/falcor-router/commit/07ce5ff))
* Make rxNewToRxNewAndOld work with old observers missing onNext. ([f407745](https://github.com/Netflix/falcor-router/commit/f407745))



<a name="0.8.0"></a>
# 0.8.0 (2017-02-14)

* refactor(methodSummary): rename `responses` to `results` and nest under `value` along with `time`. ([26bbe63](https://github.com/Netflix/falcor-router/commit/26bbe63))
* Update rxjs ([b8aab6c](https://github.com/Netflix/falcor-router/commit/b8aab6c))



<a name="0.7.0"></a>
# [0.7.0](https://github.com/Netflix/falcor-router/compare/0.6.1...v0.7.0) (2017-01-27)


### Features

* **methodSummary hooking:** add methodSummary hooking to get, set and call ([521fff3](https://github.com/Netflix/falcor-router/commit/521fff3))


### BREAKING CHANGES

* **routeSummary hook:** The `routeSummary` hook has been removed in favor of the `methodSummary` hook.



<a name="0.6.1"></a>
## [0.6.1](https://github.com/Netflix/falcor-router/compare/0.6.0...v0.6.1) (2017-01-26)


### Features

* **routeSummary:** add route summary hook for gathering metrics and meta data from `get` ([#205](https://github.com/Netflix/falcor-router/issues/205)) ([3ac8143](https://github.com/Netflix/falcor-router/commit/3ac8143))



<a name="0.6.0"></a>
# [0.6.0](https://github.com/Netflix/falcor-router/compare/0.5.2...v0.6.0) (2017-01-20)


### Bug Fixes

* **error hook:** Ensure error hook is called on MaxPathsExceededError ([2f6e65f](https://github.com/Netflix/falcor-router/commit/2f6e65f))
* **error hook:** Error hook will only pass error object ([8fd2182](https://github.com/Netflix/falcor-router/commit/8fd2182))


### Features

* **pathError hook:** add pathError hook for errors identified while ([816eccc](https://github.com/Netflix/falcor-router/commit/816eccc))


### BREAKING CHANGES

* error hook: error hook arguments have changes. Now only the error itself is passed, not the path information.



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



