/*!
 * Copyright 2014 Netflix, Inc
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */
var falkor = {},
    falcor = falkor,
    __GENERATION_GENERATION = 0,
    __CONTAINER = "__reference_container",
    __CONTEXT = "__context",
    __GENERATION = "__generation",
    __GENERATION_UPDATED = "__generation_updated",
    __INVALIDATED = "__invalidated",
    __KEY = "__key",
    __KEYS = "__keys",
    __IS_KEY_SET = "__is_key_set",
    __NULL = "__null",
    __SELF = "./",
    __PARENT = "../",
    __REF = "__ref",
    __REF_INDEX = "__ref_index",
    __REFS_LENGTH = "__refs_length",
    __ROOT = "/",
    __OFFSET = "__offset",
    __FALKOR_EMPTY_OBJECT = '__FALKOR_EMPTY_OBJECT',
    __INTERNAL_KEYS = [
        __CONTAINER, __CONTEXT, __GENERATION, __GENERATION_UPDATED,
        __INVALIDATED, __KEY, __KEYS, __IS_KEY_SET, __NULL, __SELF,
        __PARENT, __REF, __REF_INDEX, __REFS_LENGTH, __OFFSET, __ROOT
    ];

var $TYPE = "$type",
    $SIZE = "$size",
    $EXPIRES = "$expires",
    $TIMESTAMP = "$timestamp";

var SENTINEL = "sentinel",
    ERROR = "error",
    VALUE = "value",
    EXPIRED = "expired",
    LEAF = "leaf";

function now() {
    return Date.now();
}

function NOOP() {
};

falkor.__Internals = {};
falkor.Observable = Rx.Observable;

var JSONGModelResponse = (function (falkor) {

    var Observable = falkor.Observable,
        valuesMixin = { format: { value: "AsValues"  } },
        jsonMixin = { format: { value: "AsPathMap" } },
        jsongMixin = { format: { value: "AsJSONG"   } };

    function JSONGModelResponse(forEach) {
        this._subscribe = forEach;
    }

    JSONGModelResponse.create = function (forEach) {
        return new JSONGModelResponse(forEach);
    };

    function noop() {
    };
    function mixin(self) {
        var mixins = Array.prototype.slice.call(arguments, 1);
        return new JSONGModelResponse(function (other) {
            return self.subscribe(mixins.reduce(function (proto, mixin) {
                return Object.create(proto, mixin);
            }, other));
        });
    };

    JSONGModelResponse.prototype = Observable.create(noop);
    JSONGModelResponse.prototype.format = "AsPathMap";
    JSONGModelResponse.prototype.toValues = function () {
        return mixin(this, valuesMixin);
    };
    JSONGModelResponse.prototype.toJSON = function () {
        return mixin(this, jsonMixin);
    };
    JSONGModelResponse.prototype.toJSONG = function () {
        return mixin(this, jsongMixin);
    };
    return JSONGModelResponse;
}(falkor));
function getContextSync() {
    var model = this,
        clone = model,
        context = model.__context,
        boundPath = model._path.slice(0),
        result, values, optimized, pathValue;

    if (context == null || context[__PARENT] == null) {
        clone = model.boxValues();
        clone._path = [];
        result = model._getPathsAsValues(clone, [boundPath.concat(null)], []);
        values = result.values;
        optimized = result.optimizedPaths;
        if (values && values.length && (pathValue = values.pop())) {
            model._path = pathValue.path = optimized.pop() || pathValue.path;
        } else {
            pathValue = {
                path: (model._path || (model._path = [])),
                value: null
            };
        }
    } else {
        pathValue = {
            path: (model._path || (model._path = [])),
            value: context
        };
    }
    return pathValue;
}

falkor.ImmediateScheduler = ImmediateScheduler;

function ImmediateScheduler() {
}

ImmediateScheduler.prototype = {
    schedule: function (action) {
        action();
    }
};

falkor.TimeoutScheduler = TimeoutScheduler;

function TimeoutScheduler(delay) {
    this.delay = delay;
}

TimeoutScheduler.prototype = {
    schedule: function (action) {
        setTimeout(action, this.delay);
    }
};


// Ties the requestQueue to a jsongModel.
// For dataSource purposes.
var RequestQueue2 = falkor.RequestQueue2 = function (jsongModel, scheduler) {
    this._scheduler = scheduler;
    this._jsongModel = jsongModel;

    this._scheduled = false;
    this._requests = [];
};

RequestQueue2.prototype = {
    _get: function () {
        var i = -1;
        var requests = this._requests;
        while (++i < requests.length) {
            if (!requests[i].pending) {
                return requests[i];
            }
        }
        return requests[requests.length] = new Request2(this._jsongModel, this);
    },

    remove: function (request) {
        for (var i = this._requests.length - 1; i > -1; i--) {
            if (this._requests[i].id === request.id && this._requests.splice(i, 1)) {
                break;
            }
        }
    },

    request: function (requestedPaths, optimizedPaths, observer) {
        var self = this;

        // TODO: A contains check.
        self._get().batch(requestedPaths, optimizedPaths, observer);

        if (!self._scheduled) {
            self._scheduled = true;
            self._scheduler.schedule(self._flush.bind(self));
        }

        return {
            dispose: function () {
                // TODO: 2 things to dispose of.
                // TODO: Current batched requests (if any).
            }
        };
    },

    _flush: function () {
        this._scheduled = false;

        var requests = this._requests, i = -1;
        var disposables = [];
        while (++i < requests.length) {
            if (!requests[i].pending) {
                disposables[disposables.length] = requests[i].flush();
            }
        }

        return {
            dispose: function () {
                // TODO: In-flight batched requests.  This is just a place holder.
                disposables.forEach(function (d) {
                    d.dispose();
                });
            }
        }
    }
};

var REQUEST_ID = 0;

var Request2 = function (jsongModel, queue) {
    var self = this;
    self._jsongModel = jsongModel;
    self._queue = queue;
    self.observers = [];
    self.optimizedPaths = [];
    self.requestedPaths = [];
    self.pending = false;
    self.id = ++REQUEST_ID;
};

Request2.prototype = {

    batch: function (requestedPaths, optimizedPaths, observer) {
        // TODO: Do we need to gap fill?
        var self = this;
        observer.onNext = observer.onNext || NOOP;
        observer.onError = observer.onError || NOOP;
        observer.onCompleted = observer.onCompleted || NOOP;
        var onNext = observer.onNext.bind(observer);

        observer.onNext = function (value) {
            // TODO: Do we need to do any intercepting?
            onNext(value);
        };

        if (!observer.__observerId) {
            observer.__observerId = ++REQUEST_ID;
        }
        observer._requestId = self.id;

        self.observers[self.observers.length] = observer;
        self.optimizedPaths[self.optimizedPaths.length] = optimizedPaths;
        self.requestedPaths[self.requestedPaths.length] = requestedPaths;

        return self;
    },

    flush: function () {
        var incomingValues, query, op, len;
        var self = this;
        var requested = self.requestedPaths;
        var optimized = self.optimizedPaths;
        var observers = self.observers;
        var disposables = [];
        var results = [];
        var model = self._jsongModel;
        self._scheduled = false;
        self.pending = true;

        function recurseGet(requested, optimized) {
            var optimizedMaps = {};
            var requestedMaps = {};
            var r, o, i, j, obs, resultIndex;
            for (i = 0, len = requested.length; i < len; i++) {
                r = requested[i];
                o = optimized[i];
                obs = observers[i];
                for (j = 0; j < r.length; j++) {
                    pathsToMapWithObservers(r[j], 0, readyNode(requestedMaps, null, obs), obs);
                    pathsToMapWithObservers(o[j], 0, readyNode(optimizedMaps, null, obs), obs);
                }
            }
            return model._dataSource.
                get(collapse(optimizedMaps)).
                subscribe(function (response) {
                    incomingValues = response;
                }, function (err) {
                    var i = -1;
                    var n = observers.length;
                    while (++i < n) {
                        obs = observers[i];
                        obs.onError && obs.onError(err);
                    }
                }, function () {
                    var i, n, obs;
                    self._queue.remove(self);
                    i = -1;
                    n = observers.length;
                    while (++i < n) {
                        obs = observers[i];
                        obs.onNext && obs.onNext({
                            jsong: incomingValues.jsong || incomingValues.values || incomingValues.value,
                            paths: incomingValues.paths
                        });
                        obs.onCompleted && obs.onCompleted();
                    }
                });
        }

        return recurseGet(requested, optimized);
    },
    // Returns the paths that are contained within this request.
    contains: function (requestedPaths, optimizedPaths) {
        // TODO: 
    }
};

function pathsToMapWithObservers(path, idx, branch, observer) {
    var curr = path[idx];

    // Object / Array
    if (typeof curr === 'object') {
        if (Array.isArray(curr)) {
            curr.forEach(function (v) {
                readyNode(branch, v, observer);
                if (path.length > idx + 1) {
                    pathsToMapWithObservers(path, idx + 1, branch[v], observer);
                }
            });
        } else {
            var from = curr.from || 0;
            var to = curr.to >= 0 ? curr.to : curr.length;
            for (var i = from; i <= to; i++) {
                readyNode(branch, i, observer);
                if (path.length > idx + 1) {
                    pathsToMapWithObservers(path, idx + 1, branch[i], observer);
                }
            }
        }
    } else {
        readyNode(branch, curr, observer);
        if (path.length > idx + 1) {
            pathsToMapWithObservers(path, idx + 1, branch[curr], observer);
        }
    }
}

/**
 * Builds the set of collapsed
 * queries by traversing the tree
 * once
 */
var charPattern = /\D/i;

function readyNode(branch, key, observer) {
    if (key === null) {
        branch.__observers = branch.__observers || [];
        !containsObserver(branch.__observers, observer) && branch.__observers.push(observer);
        return branch;
    }

    if (!branch[key]) {
        branch[key] = {__observers: []};
    }

    !containsObserver(branch[key].__observers, observer) && branch[key].__observers.push(observer);
    return branch;
}

function containsObserver(observers, observer) {
    if (!observer) {
        return;
    }
    return observers.reduce(function (acc, x) {
        return acc || x.__observerId === observer.__observerId;
    }, false);
}

function collapse(pathMap) {
    return rangeCollapse(buildQueries(pathMap));
}

/**
 * Collapse ranges, e.g. when there is a continuous range
 * in an array, turn it into an object instead
 *
 * [1,2,3,4,5,6] => {"from":1, "to":6}
 *
 */
function rangeCollapse(paths) {
    paths.forEach(function (path) {
        path.forEach(function (elt, index) {
            var range;
            if (Array.isArray(elt) && elt.every(isNumber) && allUnique(elt)) {
                elt.sort(function (a, b) {
                    return a - b;
                });
                if (elt[elt.length - 1] - elt[0] === elt.length - 1) {
                    // create range
                    range = {};
                    range.from = elt[0];
                    range.to = elt[elt.length - 1];
                    path[index] = range;
                }
            }
        });
    });
    return paths;
}

/* jshint forin: false */
function buildQueries(root) {

    if (root == null) {
        return [
            []
        ];
    }

    var children = Object.keys(root).filter(notPathMapInternalKeys),
        child, memo, paths, key, childIsNum,
        list, head, tail, clone, results,
        i = -1, n = children.length,
        j, k, x;

    if (n === 0 || Array.isArray(root) === true) {
        return [
            []
        ];
    }

    memo = {};
    while (++i < n) {
        child = children[i];
        paths = buildQueries(root[child]);
        key = createKey(paths);

        childIsNum = typeof child === 'string' && !charPattern.test(child);

        if ((list = memo[key]) && (head = list.head)) {
            head[head.length] = childIsNum ? parseInt(child, 10) : child;
        } else {
            memo[key] = {
                head: [childIsNum ? parseInt(child, 10) : child],
                tail: paths
            };
        }
    }

    results = [];
    for (x in memo) {
        head = (list = memo[x]).head;
        tail = list.tail;
        i = -1;
        n = tail.length;
        while (++i < n) {
            list = tail[i];
            j = -1;
            k = list.length;
            if (head[0] === '') {
                clone = [];
            } else {
                clone = [head.length === 1 ? head[0] : head];
                while (++j < k) {
                    clone[j + 1] = list[j];
                }
            }
            results[results.length] = clone;
        }
    }
    return results;
}

function notPathMapInternalKeys(key) {
    return (
        key !== "__observers" &&
        key !== "__pending" &&
        key !== "__batchID"
        );
}

/**
 * Return true if argument is a number
 */
function isNumber(val) {
    return typeof val === "number";
}

/**
 * allUnique
 * return true if every number in an array is unique
 */
function allUnique(arr) {
    var hash = {},
        index,
        len;

    for (index = 0, len = arr.length; index < len; index++) {
        if (hash[arr[index]]) {
            return false;
        }
        hash[arr[index]] = true;
    }
    return true;
}

/**
 * Sort a list-of-lists
 * Used for generating a unique hash
 * key for each subtree; used by the
 * memoization
 */
function sortLol(lol) {
    return lol.reduce(function (result, curr) {
        if (curr instanceof Array) {
            result.push(sortLol(curr).slice(0).sort());
            return result;
        }
        return result.concat(curr);
    }, []).slice(0).sort();
}

/**
 * Create a unique hash key for a set
 * of paths
 */
function createKey(list) {
    return JSON.stringify(sortLol(list));
}
// Note: For testing
falkor.__Internals.buildQueries = buildQueries;


falkor.JSONGModel = JSONGModel;

function JSONGModel(dataSource, maxSize, collectRatio, cache, errorSelector) {
    this._dataSource = dataSource;
    this._cache = cache || {};
    this._maxSize = maxSize || Math.pow(2, 53) - 1;
    this._collectRatio = collectRatio || 0.75;
    this._scheduler = new falkor.ImmediateScheduler();
    this._request = new RequestQueue2(this, this._scheduler);
    this._errorSelector = errorSelector || JSONGModel.prototype._errorSelector;
    this._retryCount = 3;
}

function jsongModelOperation(name) {
    return function () {

        var model = this, root = model._root,
            args = Array.prototype.slice.call(arguments),
            selector = args[args.length - 1];

        selector = typeof selector === "function" ? args.pop() : undefined;

        return JSONGModelResponse.create(function (options) {

            var onNext = options.onNext.bind(options),
                onError = options.onError.bind(options),
                onCompleted = options.onCompleted.bind(options),
                isProgressive = options.isProgressive,
                valuesCount = selector && selector.length || 0;
            var operationalName = name;
            var disposed = false;
            var hasSelector = !!selector;
            var format = hasSelector && 'AsJSON' || options.format || 'AsPathMap';
            var isJSONG = format === 'AsJSONG';
            var seedRequired = isSeedRequired(format);
            var isValues = format === 'AsValues';
            var requestExternalData = false;
            var pathSetValues = [];
            var errors = [];
            var indices = [];
            var undefineds = [];
            var jsongPaths = [];
            var errorSelector = options.errorSelector || model._errorSelector;
            var counter = -1;
            var atLeastOneValue = false;

            // TODO: Should be defined on the model.
            var retryMax = model._retryCount;

            if (hasSelector) {
                for (var i = 0; i < args.length; i++) {
                    if (i < valuesCount) {
                        pathSetValues[pathSetValues.length] = Object.create(null);
                    }
                    undefineds[undefineds.length] = false;
                    indices[indices.length] = i;
                }
            } else if (seedRequired) {
                pathSetValues[0] = Object.create(null);
                undefineds[0] = true;
            }

            function recurse(requested, relativePathSetValues) {
                counter++;
                var operations = getOperationArgGroups(requested, operationalName, format, relativePathSetValues, hasSelector, isValues && onNext, errorSelector);
                var results = processOperations(model, operations);

                errors = errors.concat(results.errors);
                atLeastOneValue = atLeastOneValue || results.valuesReceived;

                // from each of the operations, the results must be remerged back into the values array
                operations.forEach(function (op) {
                    if (hasSelector) {
                        var absoluteIndex;
                        var hasIndex;
                        op.values.forEach(function (valueObject, i) {
                            absoluteIndex = indices[i + op.valuesOffset];
                            hasIndex = typeof absoluteIndex === 'number';
                            if (hasIndex) {
                                if (valueObject) {
                                    if (valueObject.json !== undefined) {
                                        pathSetValues[absoluteIndex] = valueObject;
                                    } else {
                                        pathSetValues[absoluteIndex] = {json: valueObject};
                                    }
                                    undefineds[absoluteIndex] = false;
                                } else {
                                    undefineds[absoluteIndex] = undefineds[absoluteIndex] && true;
                                }
                            }
                        });
                    } else if (seedRequired) {
                        if (op.values[0]) {
                            pathSetValues = op.values;
                            undefineds[0] = false;
                            if (isJSONG) {
                                jsongPaths = jsongPaths.concat(op.values[0].paths);
                            }
                        } else {
                            undefineds[0] = true;
                        }
                    }
                });
                var nextRequest = results.requestedMissingPaths;
                var missingLength = nextRequest.length;
                var incomingValues;

                // no need to inform the user of the current state if in value mode
                if (isProgressive && missingLength && !isValues) {
                    emitValues();
                }

                if (missingLength &&
                    (operationalName !== 'set' || requestExternalData) &&
                    counter <= retryMax && !model._local && model._dataSource) {
                    model._request.request(nextRequest, results.optimizedMissingPaths, {
                        onNext: function (jsongEnvelop) {
                            incomingValues = jsongEnvelop;
                        },
                        onError: function (err) {
                            // When an error is thrown, all currently requested paths are
                            // inserted as errors and the output format is not needed.
                            // TODO: There must be a way to make this more efficient.
                            var out = model._setPathsAsValues.apply(null, [model].concat(
                                nextRequest.
                                    reduce(function (acc, r) {
                                        acc[0].push({
                                            path: r,
                                            value: err
                                        });
                                        return acc;
                                    }, [
                                        []
                                    ]),
                                undefined,
                                model._errorSelector
                            ));
                            errors = errors.concat(out.errors);

                            // there could still be values within the cache
                            emitValues();
                            executeOnErrorOrCompleted();
                        },
                        onCompleted: function () {
                            // Note: processing the requested missing paths
                            var newOperations = [];
                            var previousIndices = indices;
                            var newSelectorIndex = 0;
                            indices = [];

                            nextRequest.forEach(function (r) {
                                var op = newOperations[newOperations.length - 1];
                                var boundPath = r.boundPath;
                                if (!op) {
                                    op = newOperations[newOperations.length] = {jsong: incomingValues.jsong, paths: []};
                                }
                                if (hasSelector) {
                                    if (typeof r.pathSetIndex !== 'undefined') {
                                        var pathSetIndex = r.pathSetIndex;
                                        var absoluteIndex = previousIndices[pathSetIndex];
                                        var hasIndex = typeof absoluteIndex === 'number' && absoluteIndex < valuesCount;
                                        if (op && op.pathSetIndex !== pathSetIndex && typeof op.pathSetIndex !== 'undefined') {
                                            if (op && op.paths.length > 1) {
                                                op.paths = fastCollapse(op.paths);
                                            }
                                            op = newOperations[newOperations.length] = {jsong: incomingValues.jsong, paths: []};
                                            op.pathSetIndex = pathSetIndex;
                                            hasIndex && (indices[indices.length] = absoluteIndex);
                                        } else if (typeof op.pathSetIndex === 'undefined') {
                                            hasIndex && (op.pathSetIndex = pathSetIndex);
                                            hasIndex && (indices[indices.length] = absoluteIndex);
                                        }
                                    }
                                } else if (seedRequired) {
                                    // single seed white board
                                } else {
                                    // isValues
                                }
                                op.paths[op.paths.length] = r;
                                op.boundPath = op.boundPath || boundPath.length && boundPath || undefined;
                            });

                            // Note: We fast collapse all hasSelector ops.
                            if (hasSelector) {
                                var op = newOperations[newOperations.length - 1];
                                if (op && op.paths.length > 1) {
                                    op.paths = fastCollapse(op.paths);
                                }
                            }
                            // TODO: Error tracking

                            // recurse the new paths
                            // has to be set to a set since we are now merging in data
                            // TODO: external set could be triggered by this
                            operationalName = 'set';
                            requestExternalData = true;
                            if (hasSelector) {
                                var arr = [];
                                for (var i = 0; i < indices.length; i++) {
                                    arr[arr.length] = relativePathSetValues[indices[i]];
                                }
                                recurse(newOperations, arr);
                            } else if (seedRequired) {
                                recurse(newOperations, pathSetValues);
                            } else {
                                recurse(newOperations, []);
                            }
                        }
                    });
                } else {
                    emitValues();
                    executeOnErrorOrCompleted();
                }
            }

            recurse(args, pathSetValues);

            function emitValues() {
                if (disposed) {
                    return;
                }

                root.allowSync = true;
                if (atLeastOneValue) {
                    if (hasSelector) {
                        if (valuesCount > 0) {
                            // they should be wrapped in json items
                            onNext(selector.apply(model, pathSetValues.map(function (x, i) {
                                if (undefineds[i]) {
                                    return undefined;
                                }

                                return x && x.json;
                            })));
                        } else {
                            onNext(selector.call(model));
                        }
                    } else if (!isValues && !model._progressive) {
                        // this means there is an onNext function that is not AsValues or progressive,
                        // therefore there must only be one onNext call, which should only be the 0
                        // index of the values of the array
                        if (isJSONG) {
                            pathSetValues[0].paths = jsongPaths;
                        }
                        onNext(pathSetValues[0]);
                    }
                    root.allowSync = false;
                }
            }

            function executeOnErrorOrCompleted() {
                if (disposed) {
                    return;
                }

                root.allowSync = true;
                if (errors.length) {
                    onError(errors);
                } else {
                    onCompleted();
                }
                root.allowSync = false;
            }

            return {
                dispose: function () {
                    disposed = true;
                }
            };
        });
    }
}

function fastCollapse(paths) {
    return paths.reduce(function (acc, p) {
        var curr = acc[0];
        if (!curr) {
            acc[0] = p;
        } else {
            p.forEach(function (v, i) {
                // i think
                if (typeof v === 'object') {
                    curr[curr[i].length] = v[0];
                }
            });
        }
        return acc;
    }, []);
}

function getOperationArgGroups(ops, name, format, values, hasSelector, onNext, errorSelector) {
    var seedRequired = isSeedRequired(format);
    var isValues = !seedRequired;
    var valuesIndex = 0, valueEnvelope;
    return ops.
        map(cloneIfPathOrPathValue).
        reduce(function (groups, argument, index) {
            var group = groups[groups.length - 1],
                type = isPathOrPathValue(argument) ? "Paths" :
                    isJSONG(argument) ? "JSONGs" : "PathMaps",
                groupType = group && group.type,
                op = JSONGModel.prototype['_' + name + type + format];

            if (type !== groupType) {
                group = groups[groups.length] = [];
            }

            group.boundPath = type === "JSONGs" && argument.boundPath || undefined;

            if (groupType === null || type !== groupType) {
                group.type = type;
                group.op = op;
                group.isSeedRequired = seedRequired;
                group.isValues = isValues;
                group.values = [];
                group.onNext = onNext;
                group.valuesOffset = valuesIndex;
                group.errorSelector = errorSelector;
            }
            group[group.length] = argument;
            valueEnvelope = values[valuesIndex];
            if (seedRequired && hasSelector && valuesIndex < values.length && valueEnvelope) {
                // This is the relative offset into the values array
                group.values[group.values.length] = valueEnvelope.json || valueEnvelope.jsong || valueEnvelope;
                valuesIndex++;
            } else if (!hasSelector && seedRequired) {
                // no need to know the value index
                group.values[group.values.length] = valueEnvelope.json || valueEnvelope.jsong || valueEnvelope;
            }

            return groups;
        }, []);
}

function processOperations(model, operations) {
    // no value has to be kept track of since its all in the 'values' array that is attached
    // to each operation
    return operations.reduce(function (memo, operation) {
        var results = operation.isValues ?
            operation.op(model, operation, operation.onNext, operation.errorSelector, operation.boundPath) :
            operation.op(model, operation, operation.values, operation.errorSelector, operation.boundPath);
        var boundPath = model._path;
        var missing = results.requestedMissingPaths;
        var offset = operation.valuesOffset;

        for (var i = 0, len = missing.length; i < len; i++) {
            missing[i].boundPath = boundPath;
            missing[i].pathSetIndex += offset;
        }

        memo.requestedMissingPaths = memo.requestedMissingPaths.concat(missing);
        memo.optimizedMissingPaths = memo.optimizedMissingPaths.concat(results.optimizedMissingPaths);
        memo.errors = memo.errors.concat(results.errors);
        memo.valuesReceived = memo.valuesReceived || results.requestedPaths.length > 0;

        return memo;
    }, {
        errors: [],
        requestedMissingPaths: [],
        optimizedMissingPaths: [],
        valuesReceived: false
    });
}

function not() {
    var fns = Array.prototype.slice.call(arguments);
    return function () {
        var args = arguments;
        return !fns.every(function (fn) {
            return fn.apply(null, args);
        });
    }
}

function isPathOrPathValue(x) {
    return !!(Array.isArray(x)) || (
        x.hasOwnProperty("path") && x.hasOwnProperty("value"));
}

function isJSONG(x) {
    return x.hasOwnProperty("jsong");
}

function isSeedRequired(format) {
    return format === 'AsJSON' || format === 'AsJSONG' || format === 'AsPathMap';
}

function cloneIfPathOrPathValue(x) {
    return (Array.isArray(x) && x.concat()) || (
        x.hasOwnProperty("path") && x.hasOwnProperty("value") && (
        x.path = x.path.concat()) && x || x) || x;
}

JSONGModel.prototype = {
    _root: {
        expired: [],
        allowSync: false,
        unsafeMode: true
    },
    _path: [],
    _boxed: false,
    _local: false,
    _progressive: false,
    _request: new falkor.RequestQueue2(new falkor.ImmediateScheduler()),
    _errorSelector: function (x, y) {
        return y;
    },
    get: jsongModelOperation("get"),
    set: jsongModelOperation("set"),
    call: jsongModelOperation("call"),
    invalidate: function () {
        var pathValues = Array.prototype.slice.call(arguments).map(function (path) {
                return { path: path, value: undefined };
            }),
            model = this;
        return JSONGModelResponse.create(function (observer) {
            try {
                model._setPathsAsJSON(model, pathValues, undefined, model._errorSelector);
                observer.onNext(model);
                observer.onCompleted();
            } catch (e) {
                observer.onError(e);
            }
        });
    },
    setRetryCount: function (x) {
        return this.clone(["_retryMax", x]);
    },
    setCache: function (cache) {
        return this._setPathMapsAsValues(this, [cache], 0, this._errorSelector);
    },
    getBoundValue: function () {
        return this.syncCheck("getBoundValue") && this._getBoundValue(this);
    },
    getValueSync: function (path) {
        if (Array.isArray(path) === false) {
            throw new Error("JSONGModel#getValueSync must be called with an Array path.");
        }
        return this.syncCheck("getValueSync") && this._getValueSync(this, this._path.concat(path));
    },
    setValueSync: function (path, value, errorSelector) {
        if (Array.isArray(path) === false) {
            if (typeof errorSelector !== "function") {
                errorSelector = value || this._errorSelector;
            }
            value = path.value;
            path = path.path;
        }
        if (Array.isArray(path) === false) {
            throw new Error("JSONGModel#setValueSync must be called with an Array path.");
        }
        return this.syncCheck("setValueSync") && this._setValueSync(this, this._path.concat(path), value, errorSelector);
    },
    bindSync: function (path) {
        if (Array.isArray(path) === false) {
            throw new Error("JSONGModel#bindSync must be called with an Array path.");
        }
        return this.syncCheck("bindSync") && this.clone(
            ["_path", this._path.concat(path)],
            ["__context", undefined]
        );
    },
    clone: function () {
        var self = this;
        return Array.prototype.slice.call(arguments).reduce(function (model, tuple) {
            return (model[tuple[0]] = tuple[1]) && model || model;
        }, Object.keys(self).reduce(function (model, key) {
            return (model[key] = self[key]) && model || model;
        }, new JSONGModel(
            self._dataSource,
            self._cache,
            self._maxSize,
            self._collectRatio)));
    },
    batch: function (schedulerOrDelay) {
        if (typeof schedulerOrDelay === "number") {
            schedulerOrDelay = new falkor.TimeoutScheduler(Math.round(Math.abs(schedulerOrDelay)));
        } else if (!schedulerOrDelay || !schedulerOrDelay.schedule) {
            schedulerOrDelay = new falkor.ImmediateScheduler();
        }
        return this.clone(["_request", new falkor.RequestQueue2(this, schedulerOrDelay)]);
    },
    unbatch: function () {
        return this.clone(["_request", new falkor.RequestQueue2(this, new ImmediateScheduler())]);
    },
    boxValues: function () {
        return this.clone(["_boxed", true]);
    },
    unboxValues: function () {
        return this.clone(["_boxed", false]);
    },
    toLocal: function () {
        return this.clone(["_local", true]);
    },
    toRemote: function () {
        return this.clone(["_local", false]);
    },
    syncCheck: function (name) {
        if (this._root.allowSync === false && this._root.unsafeMode === false) {
            throw new Error("JSONGModel#" + name + " may only be called within the context of a request selector.");
        }
        return true;
    },
    addVirtualPaths: function (pathsAndActions) {
        this._virtualPaths = addVirtualPaths(pathsAndActions, this);
    },

    _getBoundValue: getBoundValue,
    _getValueSync: getValueSync,
    _setValueSync: setValueSync,
    _getPathsAsValues: getPathsAsValues,
    _getPathsAsJSON: getPathsAsJSON,
    _getPathsAsPathMap: getPathsAsPathMap,
    _getPathsAsJSONG: getPathsAsJSONG,
    _getPathMapsAsValues: getPathMapsAsValues,
    _getPathMapsAsJSON: getPathMapsAsJSON,
    _getPathMapsAsPathMap: getPathMapsAsPathMap,
    _getPathMapsAsJSONG: getPathMapsAsJSONG,
    _setPathsAsValues: setPathsAsValues,
    _setPathsAsJSON: setPathsAsJSON,
    _setPathsAsPathMap: setPathsAsPathMap,
    _setPathsAsJSONG: setPathsAsJSONG,
    _setPathMapsAsValues: setPathMapsAsValues,
    _setPathMapsAsJSON: setPathMapsAsJSON,
    _setPathMapsAsPathMap: setPathMapsAsPathMap,
    _setPathMapsAsJSONG: setPathMapsAsJSONG,
    _setJSONGsAsValues: setJSONGsAsValues,
    _setJSONGsAsJSON: setJSONGsAsJSON,
    _setJSONGsAsPathMap: setJSONGsAsPathMap,
    _setJSONGsAsJSONG: setJSONGsAsJSONG
};

function getBoundValue(model) {
    model || (model = this);
    var value = model._cache, path = model._path || [], boxed;
    if (path.length > 0) {
        model._boxed = (boxed = model._boxed) || true;
        value = getValueSync(model, path.concat(null));
        path = value.path;
        model._boxed = boxed;
        model._path = path[path.length - 1] == null ? path.slice(0, -1) : path;
        value = value.value;
    }
    return value;
}
function getPathMapsAsJSON(model, pathMaps, values, errorSelector, boundPath) {
    var boundLength = 0, nodeRoot = model._cache || {}, nodeParent, node;
    if (Array.isArray(boundPath)) {
        nodeParent = nodeRoot;
        boundLength = boundPath.length;
    } else {
        nodeParent = getBoundValue(model);
        boundPath = model._path || [];
    }
    var root = model._root || model, boxed = model._boxed || false, expired = root.expired || (root.expired = []), refreshing = model._refreshing || false, appendNullKey = false;
    typeof errorSelector === 'function' || (errorSelector = model._errorSelector) || (errorSelector = function (x$4, y$2) {
        return y$2;
    });
    var pathMapStack = pathMaps.pathMapStack || (pathMaps.pathMapStack = []);
    var jsonKeys = pathMaps.jsonKeys || (pathMaps.jsonKeys = []);
    var nodes = pathMaps.nodes || (pathMaps.nodes = []);
    var jsons = pathMaps.jsons || (pathMaps.jsons = []);
    var errors = pathMaps.errors || (pathMaps.errors = []);
    var refs = pathMaps.refs || (pathMaps.refs = []);
    var depth = pathMaps.depth || (pathMaps.depth = 0);
    var refIndex = pathMaps.refIndex || (pathMaps.refIndex = 0);
    var refDepth = pathMaps.refDepth || (pathMaps.refDepth = 0);
    var requestedPath = pathMaps.requestedPath || (pathMaps.requestedPath = []);
    var optimizedPath = pathMaps.optimizedPath || (pathMaps.optimizedPath = []);
    var requestedPaths = pathMaps.requestedPaths || (pathMaps.requestedPaths = []);
    var optimizedPaths = pathMaps.optimizedPaths || (pathMaps.optimizedPaths = []);
    var requestedMissingPaths = pathMaps.requestedMissingPaths || (pathMaps.requestedMissingPaths = []);
    var optimizedMissingPaths = pathMaps.optimizedMissingPaths || (pathMaps.optimizedMissingPaths = []);
    var hasValue = pathMaps.hasValue || (pathMaps.hasValue = false);
    var jsonRoot = pathMaps.jsonRoot || (pathMaps.jsonRoot = values && values[0]);
    var jsonParent = pathMaps.jsonParent || (pathMaps.jsonParent = jsonRoot);
    var jsonNode = pathMaps.jsonNode || (pathMaps.jsonNode = jsonParent);
    var pathMap, length = 0, height = 0, reference, refLength = 0, refHeight = 0, nodeType, nodeValue, nodeSize, nodeTimestamp, nodeExpires;
    refs[-1] = boundPath;
    nodes[-1] = nodeParent;
    jsons[-2] = jsons;
    jsonKeys[-1] = -1;
    var index = -1, count = pathMaps.length;
    while (++index < count) {
        pathMap = pathMaps[index];
        pathMapStack[0] = pathMap;
        hasValue = false;
        jsons.length = 0;
        jsons[-1] = jsonRoot = values && values[index] || void 0;
        jsonKeys.length = 0;
        jsonKeys[-1] = -1;
        depth = 0;
        length = pathMap.length;
        height = length - 1;
        var ref;
        refs.length = 0;
        while (depth > -1) {
            refIndex = depth;
            while (--refIndex >= -1) {
                if (!!(ref = refs[refIndex])) {
                    refLength = ref.length;
                    var i = -1, j = 0;
                    while (++i < refLength) {
                        optimizedPath[j++] = ref[i];
                    }
                    i = ++refIndex;
                    while (i < depth) {
                        optimizedPath[j++] = requestedPath[i++];
                    }
                    optimizedPath.length = j;
                    break;
                }
            }
            var offset, keys, index$2, key, isKeySet;
            pathMap = pathMap;
            height = (length = depth) - 1;
            nodeParent = node = nodes[depth - 1];
            jsonParent = jsonNode = jsons[depth - 1];
            depth = depth;
            follow_path_map_5758:
                do {
                    if ((pathMap = pathMapStack[offset = depth * 4]) != null && typeof pathMap === 'object' && (keys = pathMapStack[offset + 1] || (pathMapStack[offset + 1] = Object.keys(pathMap))) && ((index$2 = pathMapStack[offset + 2] || (pathMapStack[offset + 2] = 0)) || true) && ((key = pathMapStack[offset + 3]) || true) && ((isKeySet = keys.length > 1) || keys.length > 0)) {
                        key = keys[index$2];
                        if (key != null) {
                            depth >= boundLength && (requestedPath[requestedPath.length = depth] = key);
                            pathMapStack[offset = 4 * (depth + 1)] = pathMap = pathMap[key];
                            if (pathMap != null && typeof pathMap === 'object' && pathMap[$TYPE] === void 0 && Array.isArray(pathMap) === false && (keys = Object.keys(pathMap)) && keys.length > 0) {
                                optimizedPath[optimizedPath.length = depth + (refLength - refIndex)] = key;
                                node = nodeParent[key];
                                nodeType = node && node[$TYPE] || void 0;
                                nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                nodeTimestamp = node && node[$TIMESTAMP];
                                nodeExpires = node && node[$EXPIRES];
                                if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                    node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                }
                                if (depth >= boundLength) {
                                    jsonKeys[depth] = isKeySet ? key : void 0;
                                    if (node != null && jsonParent != null && isKeySet && (!(jsonNode = jsonParent[key]) || !(jsonNode != null && typeof jsonNode === 'object'))) {
                                        jsonNode = jsonParent[key] = Object.create(null);
                                    }
                                } else {
                                    jsonKeys[depth] = void 0;
                                }
                                if ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                                    do {
                                        if (nodeExpires !== 1) {
                                            var root$2 = root, head = root$2.__head, tail = root$2.__tail, next = node.__next, prev = node.__prev;
                                            if (node !== head) {
                                                next && (next != null && typeof next === 'object') && (next.__prev = prev);
                                                prev && (prev != null && typeof prev === 'object') && (prev.__next = next);
                                                (next = head) && (head != null && typeof head === 'object') && (head.__prev = node);
                                                root$2.__head = root$2.__next = head = node;
                                                head.__next = next;
                                                head.__prev = void 0;
                                            }
                                            if (tail == null || node === tail) {
                                                root$2.__tail = root$2.__prev = tail = prev || node;
                                            }
                                            root$2 = head = tail = next = prev = void 0;
                                        }
                                        refs[depth] = nodeValue;
                                        refIndex = depth + 1;
                                        refDepth = 0;
                                        var key$2, isKeySet$2;
                                        reference = nodeValue;
                                        refHeight = (refLength = reference.length) - 1;
                                        nodeParent = nodeRoot;
                                        jsonParent = jsonRoot;
                                        refDepth = refDepth;
                                        follow_path_5945:
                                            do {
                                                key$2 = reference[refDepth];
                                                isKeySet$2 = false;
                                                if (key$2 != null) {
                                                    if (refDepth < refHeight) {
                                                        optimizedPath[optimizedPath.length = refDepth] = key$2;
                                                        node = nodeParent[key$2];
                                                        nodeType = node && node[$TYPE] || void 0;
                                                        nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                                        nodeTimestamp = node && node[$TIMESTAMP];
                                                        nodeExpires = node && node[$EXPIRES];
                                                        if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                                            node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                                        }
                                                        if (appendNullKey = node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue)) {
                                                            nodeParent = node;
                                                            break follow_path_5945;
                                                        }
                                                        nodeParent = node;
                                                        jsonParent = jsonNode;
                                                        refDepth = refDepth + 1;
                                                        continue follow_path_5945;
                                                    } else if (refDepth === refHeight) {
                                                        optimizedPath[optimizedPath.length = refDepth] = key$2;
                                                        node = nodeParent[key$2];
                                                        nodeType = node && node[$TYPE] || void 0;
                                                        nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                                        nodeTimestamp = node && node[$TIMESTAMP];
                                                        nodeExpires = node && node[$EXPIRES];
                                                        if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                                            node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                                        }
                                                        appendNullKey = node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue);
                                                        nodeParent = node;
                                                        break follow_path_5945;
                                                    }
                                                } else if (refDepth < refHeight) {
                                                    nodeParent = node;
                                                    jsonParent = jsonNode;
                                                    refDepth = refDepth + 1;
                                                    continue follow_path_5945;
                                                }
                                                nodeParent = node;
                                                break follow_path_5945;
                                            } while (true);
                                        node = nodeParent;
                                    } while ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue));
                                    if (node == null) {
                                        while (refDepth <= refHeight) {
                                            optimizedPath[refDepth] = reference[refDepth++];
                                        }
                                    }
                                }
                                if (node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue)) {
                                    nodeParent = node;
                                    break follow_path_map_5758;
                                }
                                pathMapStack[offset + 1] = keys;
                                pathMapStack[offset + 3] = key;
                                nodeParent = nodes[depth] = node;
                                jsonParent = jsons[depth] = jsonNode;
                                depth = depth + 1;
                                continue follow_path_map_5758;
                            }
                        } else {
                            pathMapStack[offset = 3 * (depth + 1)] = pathMap[__NULL];
                            pathMapStack[offset + 1] = keys;
                            pathMapStack[offset + 2] = 0;
                            nodeParent = nodes[depth] = node;
                            jsonParent = jsons[depth] = jsonNode;
                            depth = depth + 1;
                            continue follow_path_map_5758;
                        }
                    }
                    if (key != null) {
                        optimizedPath[optimizedPath.length = depth + (refLength - refIndex)] = key;
                        node = nodeParent[key];
                        nodeType = node && node[$TYPE] || void 0;
                        nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                        nodeTimestamp = node && node[$TIMESTAMP];
                        nodeExpires = node && node[$EXPIRES];
                        if (node != null && typeof node === 'object') {
                            if (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true) {
                                node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                            } else {
                                if (nodeExpires !== 1) {
                                    var root$3 = root, head$2 = root$3.__head, tail$2 = root$3.__tail, next$2 = node.__next, prev$2 = node.__prev;
                                    if (node !== head$2) {
                                        next$2 && (next$2 != null && typeof next$2 === 'object') && (next$2.__prev = prev$2);
                                        prev$2 && (prev$2 != null && typeof prev$2 === 'object') && (prev$2.__next = next$2);
                                        (next$2 = head$2) && (head$2 != null && typeof head$2 === 'object') && (head$2.__prev = node);
                                        root$3.__head = root$3.__next = head$2 = node;
                                        head$2.__next = next$2;
                                        head$2.__prev = void 0;
                                    }
                                    if (tail$2 == null || node === tail$2) {
                                        root$3.__tail = root$3.__prev = tail$2 = prev$2 || node;
                                    }
                                    root$3 = head$2 = tail$2 = next$2 = prev$2 = void 0;
                                }
                            }
                        }
                        if (depth >= boundLength) {
                            jsonKeys[depth] = isKeySet ? key : void 0;
                        } else {
                            jsonKeys[depth] = void 0;
                        }
                        appendNullKey = false;
                    }
                    nodeParent = node;
                    break follow_path_map_5758;
                } while (true);
            node = nodeParent;
            if (node != null || boxed === true) {
                if (nodeType === ERROR) {
                    if (nodeExpires !== 1) {
                        var root$4 = root, head$3 = root$4.__head, tail$3 = root$4.__tail, next$3 = node.__next, prev$3 = node.__prev;
                        if (node !== head$3) {
                            next$3 && (next$3 != null && typeof next$3 === 'object') && (next$3.__prev = prev$3);
                            prev$3 && (prev$3 != null && typeof prev$3 === 'object') && (prev$3.__next = next$3);
                            (next$3 = head$3) && (head$3 != null && typeof head$3 === 'object') && (head$3.__prev = node);
                            root$4.__head = root$4.__next = head$3 = node;
                            head$3.__next = next$3;
                            head$3.__prev = void 0;
                        }
                        if (tail$3 == null || node === tail$3) {
                            root$4.__tail = root$4.__prev = tail$3 = prev$3 || node;
                        }
                        root$4 = head$3 = tail$3 = next$3 = prev$3 = void 0;
                    }
                    var pbv = Object.create(null);
                    var src = requestedPath, i$2 = -1, n = src.length, req = new Array(n);
                    while (++i$2 < n) {
                        req[i$2] = src[i$2];
                    }
                    if (appendNullKey === true) {
                        req[req.length] = null;
                    }
                    pbv.path = req;
                    if (boxed === true) {
                        pbv.value = node;
                    } else {
                        var dest = nodeValue, src$2 = dest, x;
                        if (dest != null && typeof dest === 'object') {
                            dest = Array.isArray(src$2) && [] || Object.create(null);
                            for (x in src$2) {
                                !(!(x[0] !== '_' || x[1] !== '_') || (x === __SELF || x === __PARENT || x === __ROOT) || x[0] === '$') && (dest[x] = src$2[x]);
                            }
                        }
                        pbv.value = dest;
                    }
                    errors[errors.length] = pbv;
                }
                if (jsonParent != null) {
                    hasValue = true;
                    var jsonKey, jsonDepth = depth;
                    do {
                        jsonKey = jsonKeys[jsonDepth];
                        jsonParent = jsons[--jsonDepth];
                    } while (jsonKey == null);
                    if (boxed === true) {
                        jsonParent[jsonKey] = node;
                    } else {
                        var dest$2 = nodeValue, src$3 = dest$2, x$2;
                        if (dest$2 != null && typeof dest$2 === 'object') {
                            dest$2 = Array.isArray(src$3) && [] || Object.create(null);
                            for (x$2 in src$3) {
                                !(!(x$2[0] !== '_' || x$2[1] !== '_') || (x$2 === __SELF || x$2 === __PARENT || x$2 === __ROOT) || x$2[0] === '$') && (dest$2[x$2] = src$3[x$2]);
                            }
                        }
                        jsonParent[jsonKey] = dest$2;
                    }
                }
                var src$4 = optimizedPath, i$3 = -1, n$2 = src$4.length, opt = new Array(n$2);
                while (++i$3 < n$2) {
                    opt[i$3] = src$4[i$3];
                }
                var src$5 = requestedPath, i$4 = -1, n$3 = src$5.length, req$2 = new Array(n$3);
                while (++i$4 < n$3) {
                    req$2[i$4] = src$5[i$4];
                }
                if (appendNullKey === true) {
                    req$2[req$2.length] = null;
                }
                requestedPaths[requestedPaths.length] = req$2;
                optimizedPaths[optimizedPaths.length] = opt;
            }
            if (boxed === false && node == null || refreshing === true) {
                var src$6 = boundPath, i$5 = -1, n$4 = src$6.length, req$3 = new Array(n$4);
                while (++i$5 < n$4) {
                    req$3[i$5] = src$6[i$5];
                }
                var src$7 = optimizedPath, i$6 = -1, n$5 = src$7.length, opt$2 = new Array(n$5);
                while (++i$6 < n$5) {
                    opt$2[i$6] = src$7[i$6];
                }
                var reqLen = req$3.length - 1, optLen = opt$2.length - 1, i$7 = -1, n$6 = requestedPath.length, map, offset$2, keys$2, index$3, reqKeys, optKeys, optKeysLen, x$3, y, z;
                while (++i$7 < n$6) {
                    req$3[++reqLen] = (reqKeys = pathMapStack[offset$2 = (i$7 + boundLength) * 4 + 1]) && reqKeys.length > 1 && [requestedPath[i$7]] || requestedPath[i$7];
                }
                var j$2 = depth, k = reqLen, l = optLen;
                i$7 = j$2++;
                while (j$2 > i$7) {
                    if ((map = pathMapStack[offset$2 = (j$2 + boundLength) * 4]) != null && typeof map === 'object' && map[$TYPE] === void 0 && Array.isArray(map) === false && (keys$2 = pathMapStack[offset$2 + 1] || (pathMapStack[offset$2 + 1] = Object.keys(map))) && ((index$3 = pathMapStack[offset$2 + 2] || (pathMapStack[offset$2 + 2] = 0)) || true) && keys$2.length > 0) {
                        if ((pathMapStack[offset$2 + 2] = ++index$3) - 1 < keys$2.length) {
                            if (reqLen - k < j$2 - i$7) {
                                var src$8 = keys$2, i$8 = -1, n$7 = src$8.length, dest$3 = new Array(n$7);
                                while (++i$8 < n$7) {
                                    dest$3[i$8] = src$8[i$8];
                                }
                                reqKeys = dest$3;
                                x$3 = -1;
                                y = reqKeys.length;
                                while (++x$3 < y) {
                                    reqKeys[x$3] = (z = reqKeys[x$3]) == __NULL ? null : z;
                                }
                                req$3[++reqLen] = y === 1 ? reqKeys[0] : reqKeys;
                            }
                            if (optLen - l < j$2 - i$7) {
                                var src$9 = keys$2, i$9 = -1, n$8 = src$9.length, dest$4 = new Array(n$8);
                                while (++i$9 < n$8) {
                                    dest$4[i$9] = src$9[i$9];
                                }
                                reqKeys = dest$4;
                                optKeys = [];
                                optKeysLen = 0;
                                x$3 = -1;
                                y = reqKeys.length;
                                while (++x$3 < y) {
                                    (z = reqKeys[x$3]) !== __NULL && (optKeys[optKeysLen++] = z);
                                }
                                if (optKeysLen > 0) {
                                    opt$2[++optLen] = optKeysLen === 1 ? optKeys[0] : optKeys;
                                }
                            }
                            pathMapStack[offset$2 = 4 * (++j$2 + boundLength)] = map[keys$2[index$3 - 1]];
                            continue;
                        }
                    }
                    delete pathMapStack[offset$2 = 4 * (j$2-- + boundLength)];
                    delete pathMapStack[offset$2 + 1];
                    delete pathMapStack[offset$2 + 2];
                    delete pathMapStack[offset$2 + 3];
                }
                req$3.pathSetIndex = index;
                requestedMissingPaths[requestedMissingPaths.length] = req$3;
                optimizedMissingPaths[optimizedMissingPaths.length] = opt$2;
            }
            appendNullKey = false;
            jsonRoot != null && (values[index] = hasValue && { json: jsons[-1] } || void 0);
            var offset$3, keys$3, index$4;
            while (depth > -1 && (keys$3 = pathMapStack[(offset$3 = 4 * depth--) + 1]) && ((index$4 = pathMapStack[offset$3 + 2]) || true) && (pathMapStack[offset$3 + 2] = ++index$4) >= keys$3.length) {
                delete pathMapStack[offset$3 + 0];
                delete pathMapStack[offset$3 + 1];
                delete pathMapStack[offset$3 + 2];
                delete pathMapStack[offset$3 + 3];
            }
        }
    }
    return {
        'values': values,
        'errors': errors,
        'requestedPaths': requestedPaths,
        'optimizedPaths': optimizedPaths,
        'requestedMissingPaths': requestedMissingPaths,
        'optimizedMissingPaths': optimizedMissingPaths
    };
}
function getPathMapsAsJSONG(model, pathMaps, values, errorSelector, boundPath) {
    var boundLength = 0, nodeRoot = model._cache || {}, nodeParent, node;
    if (Array.isArray(boundPath)) {
        nodeParent = nodeRoot;
        boundLength = boundPath.length;
    } else {
        nodeParent = getBoundValue(model);
        boundPath = model._path || [];
    }
    var root = model._root || model, boxed = model._boxed || false, expired = root.expired || (root.expired = []), refreshing = model._refreshing || false, appendNullKey = false;
    typeof errorSelector === 'function' || (errorSelector = model._errorSelector) || (errorSelector = function (x$7, y$2) {
        return y$2;
    });
    var pathMapStack = pathMaps.pathMapStack || (pathMaps.pathMapStack = []);
    var nodes = pathMaps.nodes || (pathMaps.nodes = []);
    var jsons = pathMaps.jsons || (pathMaps.jsons = []);
    var errors = pathMaps.errors || (pathMaps.errors = []);
    var refs = pathMaps.refs || (pathMaps.refs = []);
    var depth = pathMaps.depth || (pathMaps.depth = 0);
    var refIndex = pathMaps.refIndex || (pathMaps.refIndex = 0);
    var refDepth = pathMaps.refDepth || (pathMaps.refDepth = 0);
    var requestedPath = pathMaps.requestedPath || (pathMaps.requestedPath = []);
    var optimizedPath = pathMaps.optimizedPath || (pathMaps.optimizedPath = []);
    var requestedPaths = pathMaps.requestedPaths || (pathMaps.requestedPaths = []);
    var optimizedPaths = pathMaps.optimizedPaths || (pathMaps.optimizedPaths = []);
    var requestedMissingPaths = pathMaps.requestedMissingPaths || (pathMaps.requestedMissingPaths = []);
    var optimizedMissingPaths = pathMaps.optimizedMissingPaths || (pathMaps.optimizedMissingPaths = []);
    var hasValue = pathMaps.hasValue || (pathMaps.hasValue = false);
    var jsonRoot = pathMaps.jsonRoot || (pathMaps.jsonRoot = values && values[0]);
    var jsonParent = pathMaps.jsonParent || (pathMaps.jsonParent = jsonRoot);
    var jsonNode = pathMaps.jsonNode || (pathMaps.jsonNode = jsonParent);
    var pathMap, length = 0, height = 0, reference, refLength = 0, refHeight = 0, nodeType, nodeValue, nodeSize, nodeTimestamp, nodeExpires;
    refs[-1] = boundPath;
    nodes[-1] = nodeParent;
    jsons[-1] = jsonParent;
    jsons[-2] = jsons;
    var index = -1, count = pathMaps.length;
    while (++index < count) {
        pathMap = pathMaps[index];
        pathMapStack[0] = pathMap;
        depth = 0;
        length = pathMap.length;
        height = length - 1;
        var ref;
        refs.length = 0;
        while (depth > -1) {
            refIndex = depth;
            while (--refIndex >= -1) {
                if (!!(ref = refs[refIndex])) {
                    refLength = ref.length;
                    var i = -1, j = 0;
                    while (++i < refLength) {
                        optimizedPath[j++] = ref[i];
                    }
                    i = ++refIndex;
                    while (i < depth) {
                        optimizedPath[j++] = requestedPath[i++];
                    }
                    optimizedPath.length = j;
                    break;
                }
            }
            var offset, keys, index$2, key, isKeySet;
            pathMap = pathMap;
            height = (length = depth) - 1;
            nodeParent = node = nodes[depth - 1];
            jsonParent = jsonNode = jsons[depth - 1];
            depth = depth;
            follow_path_map_8073:
                do {
                    if ((pathMap = pathMapStack[offset = depth * 4]) != null && typeof pathMap === 'object' && (keys = pathMapStack[offset + 1] || (pathMapStack[offset + 1] = Object.keys(pathMap))) && ((index$2 = pathMapStack[offset + 2] || (pathMapStack[offset + 2] = 0)) || true) && ((key = pathMapStack[offset + 3]) || true) && ((isKeySet = keys.length > 1) || keys.length > 0)) {
                        key = keys[index$2];
                        if (key != null) {
                            depth >= boundLength && (requestedPath[requestedPath.length = depth] = key);
                            pathMapStack[offset = 4 * (depth + 1)] = pathMap = pathMap[key];
                            if (pathMap != null && typeof pathMap === 'object' && pathMap[$TYPE] === void 0 && Array.isArray(pathMap) === false && (keys = Object.keys(pathMap)) && keys.length > 0) {
                                optimizedPath[optimizedPath.length = depth + (refLength - refIndex)] = key;
                                node = nodeParent[key];
                                nodeType = node && node[$TYPE] || void 0;
                                nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                nodeTimestamp = node && node[$TIMESTAMP];
                                nodeExpires = node && node[$EXPIRES];
                                if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                    node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                }
                                if (node != null && jsonParent != null) {
                                    if (!nodeType && (node != null && typeof node === 'object') && !Array.isArray(nodeValue)) {
                                        if (!(jsonNode = jsonParent[key]) || !(jsonNode != null && typeof jsonNode === 'object')) {
                                            jsonNode = jsonParent[key] = Object.create(null);
                                        }
                                    } else {
                                        if (boxed === true) {
                                            jsonParent[key] = node;
                                        } else {
                                            var val = nodeValue;
                                            if (val != null && typeof val === 'object') {
                                                var src = val, keys$2 = Object.keys(src), x, i$2 = -1, n = keys$2.length;
                                                val = Array.isArray(src) && new Array(src.length) || Object.create(null);
                                                while (++i$2 < n) {
                                                    x = keys$2[i$2];
                                                    !(!(x[0] !== '_' || x[1] !== '_') || (x === __SELF || x === __PARENT || x === __ROOT)) && (val[x] = src[x]);
                                                }
                                            }
                                            if (!nodeType && (val != null && typeof val === 'object') && !Array.isArray(val)) {
                                                val[$TYPE] = LEAF;
                                            }
                                            jsonParent[key] = val;
                                        }
                                    }
                                }
                                if ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                                    do {
                                        if (nodeExpires !== 1) {
                                            var root$2 = root, head = root$2.__head, tail = root$2.__tail, next = node.__next, prev = node.__prev;
                                            if (node !== head) {
                                                next && (next != null && typeof next === 'object') && (next.__prev = prev);
                                                prev && (prev != null && typeof prev === 'object') && (prev.__next = next);
                                                (next = head) && (head != null && typeof head === 'object') && (head.__prev = node);
                                                root$2.__head = root$2.__next = head = node;
                                                head.__next = next;
                                                head.__prev = void 0;
                                            }
                                            if (tail == null || node === tail) {
                                                root$2.__tail = root$2.__prev = tail = prev || node;
                                            }
                                            root$2 = head = tail = next = prev = void 0;
                                        }
                                        refs[depth] = nodeValue;
                                        refIndex = depth + 1;
                                        refDepth = 0;
                                        var key$2, isKeySet$2;
                                        reference = nodeValue;
                                        refHeight = (refLength = reference.length) - 1;
                                        nodeParent = nodeRoot;
                                        jsonParent = jsonRoot;
                                        refDepth = refDepth;
                                        follow_path_8275:
                                            do {
                                                key$2 = reference[refDepth];
                                                isKeySet$2 = false;
                                                if (key$2 != null) {
                                                    if (refDepth < refHeight) {
                                                        optimizedPath[optimizedPath.length = refDepth] = key$2;
                                                        node = nodeParent[key$2];
                                                        nodeType = node && node[$TYPE] || void 0;
                                                        nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                                        nodeTimestamp = node && node[$TIMESTAMP];
                                                        nodeExpires = node && node[$EXPIRES];
                                                        if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                                            node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                                        }
                                                        if (node != null && jsonParent != null) {
                                                            if (!nodeType && (node != null && typeof node === 'object') && !Array.isArray(nodeValue)) {
                                                                if (!(jsonNode = jsonParent[key$2]) || !(jsonNode != null && typeof jsonNode === 'object')) {
                                                                    jsonNode = jsonParent[key$2] = Object.create(null);
                                                                }
                                                            } else {
                                                                if (boxed === true) {
                                                                    jsonParent[key$2] = node;
                                                                } else {
                                                                    var val$2 = nodeValue;
                                                                    if (val$2 != null && typeof val$2 === 'object') {
                                                                        var src$2 = val$2, keys$3 = Object.keys(src$2), x$2, i$3 = -1, n$2 = keys$3.length;
                                                                        val$2 = Array.isArray(src$2) && new Array(src$2.length) || Object.create(null);
                                                                        while (++i$3 < n$2) {
                                                                            x$2 = keys$3[i$3];
                                                                            !(!(x$2[0] !== '_' || x$2[1] !== '_') || (x$2 === __SELF || x$2 === __PARENT || x$2 === __ROOT)) && (val$2[x$2] = src$2[x$2]);
                                                                        }
                                                                    }
                                                                    if (!nodeType && (val$2 != null && typeof val$2 === 'object') && !Array.isArray(val$2)) {
                                                                        val$2[$TYPE] = LEAF;
                                                                    }
                                                                    jsonParent[key$2] = val$2;
                                                                }
                                                            }
                                                        }
                                                        if (appendNullKey = node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue)) {
                                                            nodeParent = node;
                                                            break follow_path_8275;
                                                        }
                                                        nodeParent = node;
                                                        jsonParent = jsonNode;
                                                        refDepth = refDepth + 1;
                                                        continue follow_path_8275;
                                                    } else if (refDepth === refHeight) {
                                                        optimizedPath[optimizedPath.length = refDepth] = key$2;
                                                        node = nodeParent[key$2];
                                                        nodeType = node && node[$TYPE] || void 0;
                                                        nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                                        nodeTimestamp = node && node[$TIMESTAMP];
                                                        nodeExpires = node && node[$EXPIRES];
                                                        if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                                            node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                                        }
                                                        if (node != null && jsonParent != null) {
                                                            if (!nodeType && (node != null && typeof node === 'object') && !Array.isArray(nodeValue)) {
                                                                if (!(jsonNode = jsonParent[key$2]) || !(jsonNode != null && typeof jsonNode === 'object')) {
                                                                    jsonNode = jsonParent[key$2] = Object.create(null);
                                                                }
                                                            } else {
                                                                if (boxed === true) {
                                                                    jsonParent[key$2] = node;
                                                                } else {
                                                                    var val$3 = nodeValue;
                                                                    if (val$3 != null && typeof val$3 === 'object') {
                                                                        var src$3 = val$3, keys$4 = Object.keys(src$3), x$3, i$4 = -1, n$3 = keys$4.length;
                                                                        val$3 = Array.isArray(src$3) && new Array(src$3.length) || Object.create(null);
                                                                        while (++i$4 < n$3) {
                                                                            x$3 = keys$4[i$4];
                                                                            !(!(x$3[0] !== '_' || x$3[1] !== '_') || (x$3 === __SELF || x$3 === __PARENT || x$3 === __ROOT)) && (val$3[x$3] = src$3[x$3]);
                                                                        }
                                                                    }
                                                                    if (!nodeType && (val$3 != null && typeof val$3 === 'object') && !Array.isArray(val$3)) {
                                                                        val$3[$TYPE] = LEAF;
                                                                    }
                                                                    jsonParent[key$2] = val$3;
                                                                }
                                                            }
                                                        }
                                                        appendNullKey = node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue);
                                                        nodeParent = node;
                                                        break follow_path_8275;
                                                    }
                                                } else if (refDepth < refHeight) {
                                                    nodeParent = node;
                                                    jsonParent = jsonNode;
                                                    refDepth = refDepth + 1;
                                                    continue follow_path_8275;
                                                }
                                                nodeParent = node;
                                                break follow_path_8275;
                                            } while (true);
                                        node = nodeParent;
                                    } while ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue));
                                    if (node == null) {
                                        while (refDepth <= refHeight) {
                                            optimizedPath[refDepth] = reference[refDepth++];
                                        }
                                    }
                                }
                                if (node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue)) {
                                    nodeParent = node;
                                    break follow_path_map_8073;
                                }
                                pathMapStack[offset + 1] = keys;
                                pathMapStack[offset + 3] = key;
                                nodeParent = nodes[depth] = node;
                                jsonParent = jsons[depth] = jsonNode;
                                depth = depth + 1;
                                continue follow_path_map_8073;
                            }
                        } else {
                            pathMapStack[offset = 3 * (depth + 1)] = pathMap[__NULL];
                            pathMapStack[offset + 1] = keys;
                            pathMapStack[offset + 2] = 0;
                            nodeParent = nodes[depth] = node;
                            jsonParent = jsons[depth] = jsonNode;
                            depth = depth + 1;
                            continue follow_path_map_8073;
                        }
                    }
                    if (key != null) {
                        optimizedPath[optimizedPath.length = depth + (refLength - refIndex)] = key;
                        node = nodeParent[key];
                        nodeType = node && node[$TYPE] || void 0;
                        nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                        nodeTimestamp = node && node[$TIMESTAMP];
                        nodeExpires = node && node[$EXPIRES];
                        if (node != null && typeof node === 'object') {
                            if (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true) {
                                node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                            } else {
                                if (nodeExpires !== 1) {
                                    var root$3 = root, head$2 = root$3.__head, tail$2 = root$3.__tail, next$2 = node.__next, prev$2 = node.__prev;
                                    if (node !== head$2) {
                                        next$2 && (next$2 != null && typeof next$2 === 'object') && (next$2.__prev = prev$2);
                                        prev$2 && (prev$2 != null && typeof prev$2 === 'object') && (prev$2.__next = next$2);
                                        (next$2 = head$2) && (head$2 != null && typeof head$2 === 'object') && (head$2.__prev = node);
                                        root$3.__head = root$3.__next = head$2 = node;
                                        head$2.__next = next$2;
                                        head$2.__prev = void 0;
                                    }
                                    if (tail$2 == null || node === tail$2) {
                                        root$3.__tail = root$3.__prev = tail$2 = prev$2 || node;
                                    }
                                    root$3 = head$2 = tail$2 = next$2 = prev$2 = void 0;
                                }
                            }
                        }
                        if (node != null && jsonParent != null) {
                            if (boxed === true) {
                                jsonParent[key] = node;
                            } else {
                                var val$4 = nodeValue;
                                if (val$4 != null && typeof val$4 === 'object') {
                                    var src$4 = val$4, keys$5 = Object.keys(src$4), x$4, i$5 = -1, n$4 = keys$5.length;
                                    val$4 = Array.isArray(src$4) && new Array(src$4.length) || Object.create(null);
                                    while (++i$5 < n$4) {
                                        x$4 = keys$5[i$5];
                                        !(!(x$4[0] !== '_' || x$4[1] !== '_') || (x$4 === __SELF || x$4 === __PARENT || x$4 === __ROOT)) && (val$4[x$4] = src$4[x$4]);
                                    }
                                }
                                if (!nodeType && (val$4 != null && typeof val$4 === 'object') && !Array.isArray(val$4)) {
                                    val$4[$TYPE] = LEAF;
                                }
                                jsonParent[key] = val$4;
                            }
                        }
                        appendNullKey = false;
                    }
                    nodeParent = node;
                    break follow_path_map_8073;
                } while (true);
            node = nodeParent;
            if (node != null || boxed === true) {
                if (nodeType === ERROR) {
                    if (nodeExpires !== 1) {
                        var root$4 = root, head$3 = root$4.__head, tail$3 = root$4.__tail, next$3 = node.__next, prev$3 = node.__prev;
                        if (node !== head$3) {
                            next$3 && (next$3 != null && typeof next$3 === 'object') && (next$3.__prev = prev$3);
                            prev$3 && (prev$3 != null && typeof prev$3 === 'object') && (prev$3.__next = next$3);
                            (next$3 = head$3) && (head$3 != null && typeof head$3 === 'object') && (head$3.__prev = node);
                            root$4.__head = root$4.__next = head$3 = node;
                            head$3.__next = next$3;
                            head$3.__prev = void 0;
                        }
                        if (tail$3 == null || node === tail$3) {
                            root$4.__tail = root$4.__prev = tail$3 = prev$3 || node;
                        }
                        root$4 = head$3 = tail$3 = next$3 = prev$3 = void 0;
                    }
                    var pbv = Object.create(null);
                    var src$5 = requestedPath, i$6 = -1, n$5 = src$5.length, req = new Array(n$5);
                    while (++i$6 < n$5) {
                        req[i$6] = src$5[i$6];
                    }
                    if (appendNullKey === true) {
                        req[req.length] = null;
                    }
                    pbv.path = req;
                    if (boxed === true) {
                        pbv.value = node;
                    } else {
                        var dest = nodeValue, src$6 = dest, x$5;
                        if (dest != null && typeof dest === 'object') {
                            dest = Array.isArray(src$6) && [] || Object.create(null);
                            for (x$5 in src$6) {
                                !(!(x$5[0] !== '_' || x$5[1] !== '_') || (x$5 === __SELF || x$5 === __PARENT || x$5 === __ROOT)) && (dest[x$5] = src$6[x$5]);
                            }
                        }
                        pbv.value = dest;
                    }
                    errors[errors.length] = pbv;
                }
                hasValue || (hasValue = jsonParent != null);
                var src$7 = optimizedPath, i$7 = -1, n$6 = src$7.length, opt = new Array(n$6);
                while (++i$7 < n$6) {
                    opt[i$7] = src$7[i$7];
                }
                var src$8 = requestedPath, i$8 = -1, n$7 = src$8.length, req$2 = new Array(n$7);
                while (++i$8 < n$7) {
                    req$2[i$8] = src$8[i$8];
                }
                if (appendNullKey === true) {
                    req$2[req$2.length] = null;
                }
                requestedPaths[requestedPaths.length] = req$2;
                optimizedPaths[optimizedPaths.length] = opt;
            }
            if (boxed === false && node == null || refreshing === true) {
                var src$9 = boundPath, i$9 = -1, n$8 = src$9.length, req$3 = new Array(n$8);
                while (++i$9 < n$8) {
                    req$3[i$9] = src$9[i$9];
                }
                var src$10 = optimizedPath, i$10 = -1, n$9 = src$10.length, opt$2 = new Array(n$9);
                while (++i$10 < n$9) {
                    opt$2[i$10] = src$10[i$10];
                }
                var reqLen = req$3.length - 1, optLen = opt$2.length - 1, i$11 = -1, n$10 = requestedPath.length, map, offset$2, keys$6, index$3, reqKeys, optKeys, optKeysLen, x$6, y, z;
                while (++i$11 < n$10) {
                    req$3[++reqLen] = (reqKeys = pathMapStack[offset$2 = (i$11 + boundLength) * 4 + 1]) && reqKeys.length > 1 && [requestedPath[i$11]] || requestedPath[i$11];
                }
                var j$2 = depth, k = reqLen, l = optLen;
                i$11 = j$2++;
                while (j$2 > i$11) {
                    if ((map = pathMapStack[offset$2 = (j$2 + boundLength) * 4]) != null && typeof map === 'object' && map[$TYPE] === void 0 && Array.isArray(map) === false && (keys$6 = pathMapStack[offset$2 + 1] || (pathMapStack[offset$2 + 1] = Object.keys(map))) && ((index$3 = pathMapStack[offset$2 + 2] || (pathMapStack[offset$2 + 2] = 0)) || true) && keys$6.length > 0) {
                        if ((pathMapStack[offset$2 + 2] = ++index$3) - 1 < keys$6.length) {
                            if (reqLen - k < j$2 - i$11) {
                                var src$11 = keys$6, i$12 = -1, n$11 = src$11.length, dest$2 = new Array(n$11);
                                while (++i$12 < n$11) {
                                    dest$2[i$12] = src$11[i$12];
                                }
                                reqKeys = dest$2;
                                x$6 = -1;
                                y = reqKeys.length;
                                while (++x$6 < y) {
                                    reqKeys[x$6] = (z = reqKeys[x$6]) == __NULL ? null : z;
                                }
                                req$3[++reqLen] = y === 1 ? reqKeys[0] : reqKeys;
                            }
                            if (optLen - l < j$2 - i$11) {
                                var src$12 = keys$6, i$13 = -1, n$12 = src$12.length, dest$3 = new Array(n$12);
                                while (++i$13 < n$12) {
                                    dest$3[i$13] = src$12[i$13];
                                }
                                reqKeys = dest$3;
                                optKeys = [];
                                optKeysLen = 0;
                                x$6 = -1;
                                y = reqKeys.length;
                                while (++x$6 < y) {
                                    (z = reqKeys[x$6]) !== __NULL && (optKeys[optKeysLen++] = z);
                                }
                                if (optKeysLen > 0) {
                                    opt$2[++optLen] = optKeysLen === 1 ? optKeys[0] : optKeys;
                                }
                            }
                            pathMapStack[offset$2 = 4 * (++j$2 + boundLength)] = map[keys$6[index$3 - 1]];
                            continue;
                        }
                    }
                    delete pathMapStack[offset$2 = 4 * (j$2-- + boundLength)];
                    delete pathMapStack[offset$2 + 1];
                    delete pathMapStack[offset$2 + 2];
                    delete pathMapStack[offset$2 + 3];
                }
                req$3.pathSetIndex = index;
                requestedMissingPaths[requestedMissingPaths.length] = req$3;
                optimizedMissingPaths[optimizedMissingPaths.length] = opt$2;
            }
            appendNullKey = false;
            var offset$3, keys$7, index$4;
            while (depth > -1 && (keys$7 = pathMapStack[(offset$3 = 4 * depth--) + 1]) && ((index$4 = pathMapStack[offset$3 + 2]) || true) && (pathMapStack[offset$3 + 2] = ++index$4) >= keys$7.length) {
                delete pathMapStack[offset$3 + 0];
                delete pathMapStack[offset$3 + 1];
                delete pathMapStack[offset$3 + 2];
                delete pathMapStack[offset$3 + 3];
            }
        }
    }
    values && (values[0] = hasValue && {
        paths: requestedPaths,
        jsong: jsons[-1]
    } || undefined);
    return {
        'values': values,
        'errors': errors,
        'requestedPaths': requestedPaths,
        'optimizedPaths': optimizedPaths,
        'requestedMissingPaths': requestedMissingPaths,
        'optimizedMissingPaths': optimizedMissingPaths
    };
}
function getPathMapsAsPathMap(model, pathMaps, values, errorSelector, boundPath) {
    var boundLength = 0, nodeRoot = model._cache || {}, nodeParent, node;
    if (Array.isArray(boundPath)) {
        nodeParent = nodeRoot;
        boundLength = boundPath.length;
    } else {
        nodeParent = getBoundValue(model);
        boundPath = model._path || [];
    }
    var root = model._root || model, boxed = model._boxed || false, expired = root.expired || (root.expired = []), refreshing = model._refreshing || false, appendNullKey = false;
    typeof errorSelector === 'function' || (errorSelector = model._errorSelector) || (errorSelector = function (x$5, y$2) {
        return y$2;
    });
    var pathMapStack = pathMaps.pathMapStack || (pathMaps.pathMapStack = []);
    var nodes = pathMaps.nodes || (pathMaps.nodes = []);
    var jsons = pathMaps.jsons || (pathMaps.jsons = []);
    var errors = pathMaps.errors || (pathMaps.errors = []);
    var refs = pathMaps.refs || (pathMaps.refs = []);
    var depth = pathMaps.depth || (pathMaps.depth = 0);
    var refIndex = pathMaps.refIndex || (pathMaps.refIndex = 0);
    var refDepth = pathMaps.refDepth || (pathMaps.refDepth = 0);
    var requestedPath = pathMaps.requestedPath || (pathMaps.requestedPath = []);
    var optimizedPath = pathMaps.optimizedPath || (pathMaps.optimizedPath = []);
    var requestedPaths = pathMaps.requestedPaths || (pathMaps.requestedPaths = []);
    var optimizedPaths = pathMaps.optimizedPaths || (pathMaps.optimizedPaths = []);
    var requestedMissingPaths = pathMaps.requestedMissingPaths || (pathMaps.requestedMissingPaths = []);
    var optimizedMissingPaths = pathMaps.optimizedMissingPaths || (pathMaps.optimizedMissingPaths = []);
    var hasValue = pathMaps.hasValue || (pathMaps.hasValue = false);
    var jsonRoot = pathMaps.jsonRoot || (pathMaps.jsonRoot = values && values[0]);
    var jsonParent = pathMaps.jsonParent || (pathMaps.jsonParent = jsonRoot);
    var jsonNode = pathMaps.jsonNode || (pathMaps.jsonNode = jsonParent);
    var pathMap, length = 0, height = 0, reference, refLength = 0, refHeight = 0, nodeType, nodeValue, nodeSize, nodeTimestamp, nodeExpires;
    refs[-1] = boundPath;
    nodes[-1] = nodeParent;
    jsons[-1] = jsonParent;
    jsons[-2] = jsons;
    var index = -1, count = pathMaps.length;
    while (++index < count) {
        pathMap = pathMaps[index];
        pathMapStack[0] = pathMap;
        depth = 0;
        length = pathMap.length;
        height = length - 1;
        var ref;
        refs.length = 0;
        while (depth > -1) {
            refIndex = depth;
            while (--refIndex >= -1) {
                if (!!(ref = refs[refIndex])) {
                    refLength = ref.length;
                    var i = -1, j = 0;
                    while (++i < refLength) {
                        optimizedPath[j++] = ref[i];
                    }
                    i = ++refIndex;
                    while (i < depth) {
                        optimizedPath[j++] = requestedPath[i++];
                    }
                    optimizedPath.length = j;
                    break;
                }
            }
            var offset, keys, index$2, key, isKeySet;
            pathMap = pathMap;
            height = (length = depth) - 1;
            nodeParent = node = nodes[depth - 1];
            jsonParent = jsonNode = jsons[depth - 1];
            depth = depth;
            follow_path_map_5473:
                do {
                    if ((pathMap = pathMapStack[offset = depth * 4]) != null && typeof pathMap === 'object' && (keys = pathMapStack[offset + 1] || (pathMapStack[offset + 1] = Object.keys(pathMap))) && ((index$2 = pathMapStack[offset + 2] || (pathMapStack[offset + 2] = 0)) || true) && ((key = pathMapStack[offset + 3]) || true) && ((isKeySet = keys.length > 1) || keys.length > 0)) {
                        key = keys[index$2];
                        if (key != null) {
                            depth >= boundLength && (requestedPath[requestedPath.length = depth] = key);
                            pathMapStack[offset = 4 * (depth + 1)] = pathMap = pathMap[key];
                            if (pathMap != null && typeof pathMap === 'object' && pathMap[$TYPE] === void 0 && Array.isArray(pathMap) === false && (keys = Object.keys(pathMap)) && keys.length > 0) {
                                optimizedPath[optimizedPath.length = depth + (refLength - refIndex)] = key;
                                node = nodeParent[key];
                                nodeType = node && node[$TYPE] || void 0;
                                nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                nodeTimestamp = node && node[$TIMESTAMP];
                                nodeExpires = node && node[$EXPIRES];
                                if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                    node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                }
                                if ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                                    do {
                                        if (nodeExpires !== 1) {
                                            var root$2 = root, head = root$2.__head, tail = root$2.__tail, next = node.__next, prev = node.__prev;
                                            if (node !== head) {
                                                next && (next != null && typeof next === 'object') && (next.__prev = prev);
                                                prev && (prev != null && typeof prev === 'object') && (prev.__next = next);
                                                (next = head) && (head != null && typeof head === 'object') && (head.__prev = node);
                                                root$2.__head = root$2.__next = head = node;
                                                head.__next = next;
                                                head.__prev = void 0;
                                            }
                                            if (tail == null || node === tail) {
                                                root$2.__tail = root$2.__prev = tail = prev || node;
                                            }
                                            root$2 = head = tail = next = prev = void 0;
                                        }
                                        refs[depth] = nodeValue;
                                        refIndex = depth + 1;
                                        refDepth = 0;
                                        var key$2, isKeySet$2;
                                        reference = nodeValue;
                                        refHeight = (refLength = reference.length) - 1;
                                        nodeParent = nodeRoot;
                                        jsonParent = jsonRoot;
                                        refDepth = refDepth;
                                        follow_path_5643:
                                            do {
                                                key$2 = reference[refDepth];
                                                isKeySet$2 = false;
                                                if (key$2 != null) {
                                                    if (refDepth < refHeight) {
                                                        optimizedPath[optimizedPath.length = refDepth] = key$2;
                                                        node = nodeParent[key$2];
                                                        nodeType = node && node[$TYPE] || void 0;
                                                        nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                                        nodeTimestamp = node && node[$TIMESTAMP];
                                                        nodeExpires = node && node[$EXPIRES];
                                                        if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                                            node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                                        }
                                                        if (appendNullKey = node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue)) {
                                                            nodeParent = node;
                                                            break follow_path_5643;
                                                        }
                                                        nodeParent = node;
                                                        jsonParent = jsonNode;
                                                        refDepth = refDepth + 1;
                                                        continue follow_path_5643;
                                                    } else if (refDepth === refHeight) {
                                                        optimizedPath[optimizedPath.length = refDepth] = key$2;
                                                        node = nodeParent[key$2];
                                                        nodeType = node && node[$TYPE] || void 0;
                                                        nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                                        nodeTimestamp = node && node[$TIMESTAMP];
                                                        nodeExpires = node && node[$EXPIRES];
                                                        if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                                            node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                                        }
                                                        appendNullKey = node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue);
                                                        nodeParent = node;
                                                        break follow_path_5643;
                                                    }
                                                } else if (refDepth < refHeight) {
                                                    nodeParent = node;
                                                    jsonParent = jsonNode;
                                                    refDepth = refDepth + 1;
                                                    continue follow_path_5643;
                                                }
                                                nodeParent = node;
                                                break follow_path_5643;
                                            } while (true);
                                        node = nodeParent;
                                    } while ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue));
                                    if (node == null) {
                                        while (refDepth <= refHeight) {
                                            optimizedPath[refDepth] = reference[refDepth++];
                                        }
                                    }
                                }
                                if (depth >= boundLength) {
                                    if (node != null && jsonParent != null) {
                                        if (!nodeType && (node != null && typeof node === 'object') && !Array.isArray(nodeValue)) {
                                            if (!(jsonNode = jsonParent[key]) || !(jsonNode != null && typeof jsonNode === 'object')) {
                                                jsonNode = jsonParent[key] = Object.create(null);
                                            }
                                            jsonNode[__KEY] = key;
                                            jsonNode[__GENERATION] = node[__GENERATION] || 0;
                                        } else {
                                            if (boxed === true) {
                                                jsonParent[key] = node;
                                            } else {
                                                var val = nodeValue;
                                                if (val != null && typeof val === 'object') {
                                                    var src = val, keys$2 = Object.keys(src), x, i$2 = -1, n = keys$2.length;
                                                    val = Array.isArray(src) && new Array(src.length) || Object.create(null);
                                                    while (++i$2 < n) {
                                                        x = keys$2[i$2];
                                                        !(!(x[0] !== '_' || x[1] !== '_') || (x === __SELF || x === __PARENT || x === __ROOT) || x[0] === '$') && (val[x] = src[x]);
                                                    }
                                                }
                                                if (val != null && typeof val === 'object' && !Array.isArray(val)) {
                                                    val[$TYPE] = LEAF;
                                                }
                                                jsonParent[key] = val;
                                            }
                                        }
                                    }
                                }
                                if (node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue)) {
                                    nodeParent = node;
                                    break follow_path_map_5473;
                                }
                                pathMapStack[offset + 1] = keys;
                                pathMapStack[offset + 3] = key;
                                nodeParent = nodes[depth] = node;
                                jsonParent = jsons[depth] = jsonNode;
                                depth = depth + 1;
                                continue follow_path_map_5473;
                            }
                        } else {
                            pathMapStack[offset = 3 * (depth + 1)] = pathMap[__NULL];
                            pathMapStack[offset + 1] = keys;
                            pathMapStack[offset + 2] = 0;
                            nodeParent = nodes[depth] = node;
                            jsonParent = jsons[depth] = jsonNode;
                            depth = depth + 1;
                            continue follow_path_map_5473;
                        }
                    }
                    if (key != null) {
                        optimizedPath[optimizedPath.length = depth + (refLength - refIndex)] = key;
                        node = nodeParent[key];
                        nodeType = node && node[$TYPE] || void 0;
                        nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                        nodeTimestamp = node && node[$TIMESTAMP];
                        nodeExpires = node && node[$EXPIRES];
                        if (node != null && typeof node === 'object') {
                            if (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true) {
                                node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                            } else {
                                if (nodeExpires !== 1) {
                                    var root$3 = root, head$2 = root$3.__head, tail$2 = root$3.__tail, next$2 = node.__next, prev$2 = node.__prev;
                                    if (node !== head$2) {
                                        next$2 && (next$2 != null && typeof next$2 === 'object') && (next$2.__prev = prev$2);
                                        prev$2 && (prev$2 != null && typeof prev$2 === 'object') && (prev$2.__next = next$2);
                                        (next$2 = head$2) && (head$2 != null && typeof head$2 === 'object') && (head$2.__prev = node);
                                        root$3.__head = root$3.__next = head$2 = node;
                                        head$2.__next = next$2;
                                        head$2.__prev = void 0;
                                    }
                                    if (tail$2 == null || node === tail$2) {
                                        root$3.__tail = root$3.__prev = tail$2 = prev$2 || node;
                                    }
                                    root$3 = head$2 = tail$2 = next$2 = prev$2 = void 0;
                                }
                            }
                        }
                        if (depth >= boundLength) {
                            if (node != null && jsonParent != null) {
                                if (boxed === true) {
                                    jsonParent[key] = node;
                                } else {
                                    var val$2 = nodeValue;
                                    if (val$2 != null && typeof val$2 === 'object') {
                                        var src$2 = val$2, keys$3 = Object.keys(src$2), x$2, i$3 = -1, n$2 = keys$3.length;
                                        val$2 = Array.isArray(src$2) && new Array(src$2.length) || Object.create(null);
                                        while (++i$3 < n$2) {
                                            x$2 = keys$3[i$3];
                                            !(!(x$2[0] !== '_' || x$2[1] !== '_') || (x$2 === __SELF || x$2 === __PARENT || x$2 === __ROOT) || x$2[0] === '$') && (val$2[x$2] = src$2[x$2]);
                                        }
                                    }
                                    if (val$2 != null && typeof val$2 === 'object' && !Array.isArray(val$2)) {
                                        val$2[$TYPE] = LEAF;
                                    }
                                    jsonParent[key] = val$2;
                                }
                            }
                        }
                        appendNullKey = false;
                    }
                    nodeParent = node;
                    break follow_path_map_5473;
                } while (true);
            node = nodeParent;
            if (node != null || boxed === true) {
                if (nodeType === ERROR) {
                    if (nodeExpires !== 1) {
                        var root$4 = root, head$3 = root$4.__head, tail$3 = root$4.__tail, next$3 = node.__next, prev$3 = node.__prev;
                        if (node !== head$3) {
                            next$3 && (next$3 != null && typeof next$3 === 'object') && (next$3.__prev = prev$3);
                            prev$3 && (prev$3 != null && typeof prev$3 === 'object') && (prev$3.__next = next$3);
                            (next$3 = head$3) && (head$3 != null && typeof head$3 === 'object') && (head$3.__prev = node);
                            root$4.__head = root$4.__next = head$3 = node;
                            head$3.__next = next$3;
                            head$3.__prev = void 0;
                        }
                        if (tail$3 == null || node === tail$3) {
                            root$4.__tail = root$4.__prev = tail$3 = prev$3 || node;
                        }
                        root$4 = head$3 = tail$3 = next$3 = prev$3 = void 0;
                    }
                    var pbv = Object.create(null);
                    var src$3 = requestedPath, i$4 = -1, n$3 = src$3.length, req = new Array(n$3);
                    while (++i$4 < n$3) {
                        req[i$4] = src$3[i$4];
                    }
                    if (appendNullKey === true) {
                        req[req.length] = null;
                    }
                    pbv.path = req;
                    if (boxed === true) {
                        pbv.value = node;
                    } else {
                        var dest = nodeValue, src$4 = dest, x$3;
                        if (dest != null && typeof dest === 'object') {
                            dest = Array.isArray(src$4) && [] || Object.create(null);
                            for (x$3 in src$4) {
                                !(!(x$3[0] !== '_' || x$3[1] !== '_') || (x$3 === __SELF || x$3 === __PARENT || x$3 === __ROOT) || x$3[0] === '$') && (dest[x$3] = src$4[x$3]);
                            }
                        }
                        pbv.value = dest;
                    }
                    errors[errors.length] = pbv;
                }
                hasValue || (hasValue = jsonParent != null);
                var src$5 = optimizedPath, i$5 = -1, n$4 = src$5.length, opt = new Array(n$4);
                while (++i$5 < n$4) {
                    opt[i$5] = src$5[i$5];
                }
                var src$6 = requestedPath, i$6 = -1, n$5 = src$6.length, req$2 = new Array(n$5);
                while (++i$6 < n$5) {
                    req$2[i$6] = src$6[i$6];
                }
                if (appendNullKey === true) {
                    req$2[req$2.length] = null;
                }
                requestedPaths[requestedPaths.length] = req$2;
                optimizedPaths[optimizedPaths.length] = opt;
            }
            if (boxed === false && node == null || refreshing === true) {
                var src$7 = boundPath, i$7 = -1, n$6 = src$7.length, req$3 = new Array(n$6);
                while (++i$7 < n$6) {
                    req$3[i$7] = src$7[i$7];
                }
                var src$8 = optimizedPath, i$8 = -1, n$7 = src$8.length, opt$2 = new Array(n$7);
                while (++i$8 < n$7) {
                    opt$2[i$8] = src$8[i$8];
                }
                var reqLen = req$3.length - 1, optLen = opt$2.length - 1, i$9 = -1, n$8 = requestedPath.length, map, offset$2, keys$4, index$3, reqKeys, optKeys, optKeysLen, x$4, y, z;
                while (++i$9 < n$8) {
                    req$3[++reqLen] = (reqKeys = pathMapStack[offset$2 = (i$9 + boundLength) * 4 + 1]) && reqKeys.length > 1 && [requestedPath[i$9]] || requestedPath[i$9];
                }
                var j$2 = depth, k = reqLen, l = optLen;
                i$9 = j$2++;
                while (j$2 > i$9) {
                    if ((map = pathMapStack[offset$2 = (j$2 + boundLength) * 4]) != null && typeof map === 'object' && map[$TYPE] === void 0 && Array.isArray(map) === false && (keys$4 = pathMapStack[offset$2 + 1] || (pathMapStack[offset$2 + 1] = Object.keys(map))) && ((index$3 = pathMapStack[offset$2 + 2] || (pathMapStack[offset$2 + 2] = 0)) || true) && keys$4.length > 0) {
                        if ((pathMapStack[offset$2 + 2] = ++index$3) - 1 < keys$4.length) {
                            if (reqLen - k < j$2 - i$9) {
                                var src$9 = keys$4, i$10 = -1, n$9 = src$9.length, dest$2 = new Array(n$9);
                                while (++i$10 < n$9) {
                                    dest$2[i$10] = src$9[i$10];
                                }
                                reqKeys = dest$2;
                                x$4 = -1;
                                y = reqKeys.length;
                                while (++x$4 < y) {
                                    reqKeys[x$4] = (z = reqKeys[x$4]) == __NULL ? null : z;
                                }
                                req$3[++reqLen] = y === 1 ? reqKeys[0] : reqKeys;
                            }
                            if (optLen - l < j$2 - i$9) {
                                var src$10 = keys$4, i$11 = -1, n$10 = src$10.length, dest$3 = new Array(n$10);
                                while (++i$11 < n$10) {
                                    dest$3[i$11] = src$10[i$11];
                                }
                                reqKeys = dest$3;
                                optKeys = [];
                                optKeysLen = 0;
                                x$4 = -1;
                                y = reqKeys.length;
                                while (++x$4 < y) {
                                    (z = reqKeys[x$4]) !== __NULL && (optKeys[optKeysLen++] = z);
                                }
                                if (optKeysLen > 0) {
                                    opt$2[++optLen] = optKeysLen === 1 ? optKeys[0] : optKeys;
                                }
                            }
                            pathMapStack[offset$2 = 4 * (++j$2 + boundLength)] = map[keys$4[index$3 - 1]];
                            continue;
                        }
                    }
                    delete pathMapStack[offset$2 = 4 * (j$2-- + boundLength)];
                    delete pathMapStack[offset$2 + 1];
                    delete pathMapStack[offset$2 + 2];
                    delete pathMapStack[offset$2 + 3];
                }
                req$3.pathSetIndex = index;
                requestedMissingPaths[requestedMissingPaths.length] = req$3;
                optimizedMissingPaths[optimizedMissingPaths.length] = opt$2;
            }
            appendNullKey = false;
            var offset$3, keys$5, index$4;
            while (depth > -1 && (keys$5 = pathMapStack[(offset$3 = 4 * depth--) + 1]) && ((index$4 = pathMapStack[offset$3 + 2]) || true) && (pathMapStack[offset$3 + 2] = ++index$4) >= keys$5.length) {
                delete pathMapStack[offset$3 + 0];
                delete pathMapStack[offset$3 + 1];
                delete pathMapStack[offset$3 + 2];
                delete pathMapStack[offset$3 + 3];
            }
        }
    }
    values && (values[0] = hasValue && { json: jsons[-1] } || undefined);
    return {
        'values': values,
        'errors': errors,
        'requestedPaths': requestedPaths,
        'optimizedPaths': optimizedPaths,
        'requestedMissingPaths': requestedMissingPaths,
        'optimizedMissingPaths': optimizedMissingPaths
    };
}
function getPathMapsAsValues(model, pathMaps, values, errorSelector, boundPath) {
    Array.isArray(values) && (values.length = 0);
    var boundLength = 0, nodeRoot = model._cache || {}, nodeParent, node;
    if (Array.isArray(boundPath)) {
        nodeParent = nodeRoot;
        boundLength = boundPath.length;
    } else {
        nodeParent = getBoundValue(model);
        boundPath = model._path || [];
    }
    var root = model._root || model, boxed = model._boxed || false, expired = root.expired || (root.expired = []), refreshing = model._refreshing || false, appendNullKey = false;
    typeof errorSelector === 'function' || (errorSelector = model._errorSelector) || (errorSelector = function (x$4, y$2) {
        return y$2;
    });
    var pathMapStack = pathMaps.pathMapStack || (pathMaps.pathMapStack = []);
    var nodes = pathMaps.nodes || (pathMaps.nodes = []);
    var errors = pathMaps.errors || (pathMaps.errors = []);
    var refs = pathMaps.refs || (pathMaps.refs = []);
    var depth = pathMaps.depth || (pathMaps.depth = 0);
    var refIndex = pathMaps.refIndex || (pathMaps.refIndex = 0);
    var refDepth = pathMaps.refDepth || (pathMaps.refDepth = 0);
    var requestedPath = pathMaps.requestedPath || (pathMaps.requestedPath = []);
    var optimizedPath = pathMaps.optimizedPath || (pathMaps.optimizedPath = []);
    var requestedPaths = pathMaps.requestedPaths || (pathMaps.requestedPaths = []);
    var optimizedPaths = pathMaps.optimizedPaths || (pathMaps.optimizedPaths = []);
    var requestedMissingPaths = pathMaps.requestedMissingPaths || (pathMaps.requestedMissingPaths = []);
    var optimizedMissingPaths = pathMaps.optimizedMissingPaths || (pathMaps.optimizedMissingPaths = []);
    var pathMap, length = 0, height = 0, reference, refLength = 0, refHeight = 0, nodeType, nodeValue, nodeSize, nodeTimestamp, nodeExpires;
    refs[-1] = boundPath;
    nodes[-1] = nodeParent;
    var index = -1, count = pathMaps.length;
    while (++index < count) {
        pathMap = pathMaps[index];
        pathMapStack[0] = pathMap;
        depth = 0;
        length = pathMap.length;
        height = length - 1;
        var ref;
        refs.length = 0;
        while (depth > -1) {
            refIndex = depth;
            while (--refIndex >= -1) {
                if (!!(ref = refs[refIndex])) {
                    refLength = ref.length;
                    var i = -1, j = 0;
                    while (++i < refLength) {
                        optimizedPath[j++] = ref[i];
                    }
                    i = ++refIndex;
                    while (i < depth) {
                        optimizedPath[j++] = requestedPath[i++];
                    }
                    optimizedPath.length = j;
                    break;
                }
            }
            var offset, keys, index$2, key, isKeySet;
            pathMap = pathMap;
            height = (length = depth) - 1;
            nodeParent = node = nodes[depth - 1];
            depth = depth;
            follow_path_map_7218:
                do {
                    if ((pathMap = pathMapStack[offset = depth * 4]) != null && typeof pathMap === 'object' && (keys = pathMapStack[offset + 1] || (pathMapStack[offset + 1] = Object.keys(pathMap))) && ((index$2 = pathMapStack[offset + 2] || (pathMapStack[offset + 2] = 0)) || true) && ((key = pathMapStack[offset + 3]) || true) && ((isKeySet = keys.length > 1) || keys.length > 0)) {
                        key = keys[index$2];
                        if (key != null) {
                            depth >= boundLength && (requestedPath[requestedPath.length = depth] = key);
                            pathMapStack[offset = 4 * (depth + 1)] = pathMap = pathMap[key];
                            if (pathMap != null && typeof pathMap === 'object' && pathMap[$TYPE] === void 0 && Array.isArray(pathMap) === false && (keys = Object.keys(pathMap)) && keys.length > 0) {
                                optimizedPath[optimizedPath.length = depth + (refLength - refIndex)] = key;
                                node = nodeParent[key];
                                nodeType = node && node[$TYPE] || void 0;
                                nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                nodeTimestamp = node && node[$TIMESTAMP];
                                nodeExpires = node && node[$EXPIRES];
                                if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                    node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                }
                                if ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                                    do {
                                        if (nodeExpires !== 1) {
                                            var root$2 = root, head = root$2.__head, tail = root$2.__tail, next = node.__next, prev = node.__prev;
                                            if (node !== head) {
                                                next && (next != null && typeof next === 'object') && (next.__prev = prev);
                                                prev && (prev != null && typeof prev === 'object') && (prev.__next = next);
                                                (next = head) && (head != null && typeof head === 'object') && (head.__prev = node);
                                                root$2.__head = root$2.__next = head = node;
                                                head.__next = next;
                                                head.__prev = void 0;
                                            }
                                            if (tail == null || node === tail) {
                                                root$2.__tail = root$2.__prev = tail = prev || node;
                                            }
                                            root$2 = head = tail = next = prev = void 0;
                                        }
                                        refs[depth] = nodeValue;
                                        refIndex = depth + 1;
                                        refDepth = 0;
                                        var key$2, isKeySet$2;
                                        reference = nodeValue;
                                        refHeight = (refLength = reference.length) - 1;
                                        nodeParent = nodeRoot;
                                        refDepth = refDepth;
                                        follow_path_7382:
                                            do {
                                                key$2 = reference[refDepth];
                                                isKeySet$2 = false;
                                                if (key$2 != null) {
                                                    if (refDepth < refHeight) {
                                                        optimizedPath[optimizedPath.length = refDepth] = key$2;
                                                        node = nodeParent[key$2];
                                                        nodeType = node && node[$TYPE] || void 0;
                                                        nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                                        nodeTimestamp = node && node[$TIMESTAMP];
                                                        nodeExpires = node && node[$EXPIRES];
                                                        if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                                            node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                                        }
                                                        if (appendNullKey = node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue)) {
                                                            nodeParent = node;
                                                            break follow_path_7382;
                                                        }
                                                        nodeParent = node;
                                                        refDepth = refDepth + 1;
                                                        continue follow_path_7382;
                                                    } else if (refDepth === refHeight) {
                                                        optimizedPath[optimizedPath.length = refDepth] = key$2;
                                                        node = nodeParent[key$2];
                                                        nodeType = node && node[$TYPE] || void 0;
                                                        nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                                        nodeTimestamp = node && node[$TIMESTAMP];
                                                        nodeExpires = node && node[$EXPIRES];
                                                        if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                                            node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                                        }
                                                        appendNullKey = node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue);
                                                        nodeParent = node;
                                                        break follow_path_7382;
                                                    }
                                                } else if (refDepth < refHeight) {
                                                    nodeParent = node;
                                                    refDepth = refDepth + 1;
                                                    continue follow_path_7382;
                                                }
                                                nodeParent = node;
                                                break follow_path_7382;
                                            } while (true);
                                        node = nodeParent;
                                    } while ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue));
                                    if (node == null) {
                                        while (refDepth <= refHeight) {
                                            optimizedPath[refDepth] = reference[refDepth++];
                                        }
                                    }
                                }
                                if (node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue)) {
                                    nodeParent = node;
                                    break follow_path_map_7218;
                                }
                                pathMapStack[offset + 1] = keys;
                                pathMapStack[offset + 3] = key;
                                nodeParent = nodes[depth] = node;
                                depth = depth + 1;
                                continue follow_path_map_7218;
                            }
                        } else {
                            pathMapStack[offset = 3 * (depth + 1)] = pathMap[__NULL];
                            pathMapStack[offset + 1] = keys;
                            pathMapStack[offset + 2] = 0;
                            nodeParent = nodes[depth] = node;
                            depth = depth + 1;
                            continue follow_path_map_7218;
                        }
                    }
                    if (key != null) {
                        optimizedPath[optimizedPath.length = depth + (refLength - refIndex)] = key;
                        node = nodeParent[key];
                        nodeType = node && node[$TYPE] || void 0;
                        nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                        nodeTimestamp = node && node[$TIMESTAMP];
                        nodeExpires = node && node[$EXPIRES];
                        if (node != null && typeof node === 'object') {
                            if (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true) {
                                node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                            } else {
                                if (nodeExpires !== 1) {
                                    var root$3 = root, head$2 = root$3.__head, tail$2 = root$3.__tail, next$2 = node.__next, prev$2 = node.__prev;
                                    if (node !== head$2) {
                                        next$2 && (next$2 != null && typeof next$2 === 'object') && (next$2.__prev = prev$2);
                                        prev$2 && (prev$2 != null && typeof prev$2 === 'object') && (prev$2.__next = next$2);
                                        (next$2 = head$2) && (head$2 != null && typeof head$2 === 'object') && (head$2.__prev = node);
                                        root$3.__head = root$3.__next = head$2 = node;
                                        head$2.__next = next$2;
                                        head$2.__prev = void 0;
                                    }
                                    if (tail$2 == null || node === tail$2) {
                                        root$3.__tail = root$3.__prev = tail$2 = prev$2 || node;
                                    }
                                    root$3 = head$2 = tail$2 = next$2 = prev$2 = void 0;
                                }
                            }
                        }
                        appendNullKey = false;
                    }
                    nodeParent = node;
                    break follow_path_map_7218;
                } while (true);
            node = nodeParent;
            if (node != null || boxed === true) {
                if (nodeType === ERROR) {
                    if (nodeExpires !== 1) {
                        var root$4 = root, head$3 = root$4.__head, tail$3 = root$4.__tail, next$3 = node.__next, prev$3 = node.__prev;
                        if (node !== head$3) {
                            next$3 && (next$3 != null && typeof next$3 === 'object') && (next$3.__prev = prev$3);
                            prev$3 && (prev$3 != null && typeof prev$3 === 'object') && (prev$3.__next = next$3);
                            (next$3 = head$3) && (head$3 != null && typeof head$3 === 'object') && (head$3.__prev = node);
                            root$4.__head = root$4.__next = head$3 = node;
                            head$3.__next = next$3;
                            head$3.__prev = void 0;
                        }
                        if (tail$3 == null || node === tail$3) {
                            root$4.__tail = root$4.__prev = tail$3 = prev$3 || node;
                        }
                        root$4 = head$3 = tail$3 = next$3 = prev$3 = void 0;
                    }
                    var pbv = Object.create(null);
                    var src = requestedPath, i$2 = -1, n = src.length, req = new Array(n);
                    while (++i$2 < n) {
                        req[i$2] = src[i$2];
                    }
                    if (appendNullKey === true) {
                        req[req.length] = null;
                    }
                    pbv.path = req;
                    if (boxed === true) {
                        pbv.value = node;
                    } else {
                        var dest = nodeValue, src$2 = dest, x;
                        if (dest != null && typeof dest === 'object') {
                            dest = Array.isArray(src$2) && [] || Object.create(null);
                            for (x in src$2) {
                                !(!(x[0] !== '_' || x[1] !== '_') || (x === __SELF || x === __PARENT || x === __ROOT) || x[0] === '$') && (dest[x] = src$2[x]);
                            }
                        }
                        pbv.value = dest;
                    }
                    errors[errors.length] = pbv;
                }
                var src$3 = optimizedPath, i$3 = -1, n$2 = src$3.length, opt = new Array(n$2);
                while (++i$3 < n$2) {
                    opt[i$3] = src$3[i$3];
                }
                var src$4 = requestedPath, i$4 = -1, n$3 = src$4.length, req$2 = new Array(n$3);
                while (++i$4 < n$3) {
                    req$2[i$4] = src$4[i$4];
                }
                if (appendNullKey === true) {
                    req$2[req$2.length] = null;
                }
                requestedPaths[requestedPaths.length] = req$2;
                optimizedPaths[optimizedPaths.length] = opt;
                var pbv$2 = Object.create(null);
                var src$5 = requestedPath, i$5 = -1, n$4 = src$5.length, req$3 = new Array(n$4);
                while (++i$5 < n$4) {
                    req$3[i$5] = src$5[i$5];
                }
                if (appendNullKey === true) {
                    req$3[req$3.length] = null;
                }
                pbv$2.path = req$3;
                if (boxed === true) {
                    pbv$2.value = node;
                } else {
                    var dest$2 = nodeValue, src$6 = dest$2, x$2;
                    if (dest$2 != null && typeof dest$2 === 'object') {
                        dest$2 = Array.isArray(src$6) && [] || Object.create(null);
                        for (x$2 in src$6) {
                            !(!(x$2[0] !== '_' || x$2[1] !== '_') || (x$2 === __SELF || x$2 === __PARENT || x$2 === __ROOT) || x$2[0] === '$') && (dest$2[x$2] = src$6[x$2]);
                        }
                    }
                    pbv$2.value = dest$2;
                }
                typeof values === 'function' && (values(pbv$2) || true) || Array.isArray(values) && (values[values.length] = pbv$2);
            }
            if (boxed === false && node == null || refreshing === true) {
                var src$7 = boundPath, i$6 = -1, n$5 = src$7.length, req$4 = new Array(n$5);
                while (++i$6 < n$5) {
                    req$4[i$6] = src$7[i$6];
                }
                var src$8 = optimizedPath, i$7 = -1, n$6 = src$8.length, opt$2 = new Array(n$6);
                while (++i$7 < n$6) {
                    opt$2[i$7] = src$8[i$7];
                }
                var reqLen = req$4.length - 1, optLen = opt$2.length - 1, i$8 = -1, n$7 = requestedPath.length, map, offset$2, keys$2, index$3, reqKeys, optKeys, optKeysLen, x$3, y, z;
                while (++i$8 < n$7) {
                    req$4[++reqLen] = (reqKeys = pathMapStack[offset$2 = (i$8 + boundLength) * 4 + 1]) && reqKeys.length > 1 && [requestedPath[i$8]] || requestedPath[i$8];
                }
                var j$2 = depth, k = reqLen, l = optLen;
                i$8 = j$2++;
                while (j$2 > i$8) {
                    if ((map = pathMapStack[offset$2 = (j$2 + boundLength) * 4]) != null && typeof map === 'object' && map[$TYPE] === void 0 && Array.isArray(map) === false && (keys$2 = pathMapStack[offset$2 + 1] || (pathMapStack[offset$2 + 1] = Object.keys(map))) && ((index$3 = pathMapStack[offset$2 + 2] || (pathMapStack[offset$2 + 2] = 0)) || true) && keys$2.length > 0) {
                        if ((pathMapStack[offset$2 + 2] = ++index$3) - 1 < keys$2.length) {
                            if (reqLen - k < j$2 - i$8) {
                                var src$9 = keys$2, i$9 = -1, n$8 = src$9.length, dest$3 = new Array(n$8);
                                while (++i$9 < n$8) {
                                    dest$3[i$9] = src$9[i$9];
                                }
                                reqKeys = dest$3;
                                x$3 = -1;
                                y = reqKeys.length;
                                while (++x$3 < y) {
                                    reqKeys[x$3] = (z = reqKeys[x$3]) == __NULL ? null : z;
                                }
                                req$4[++reqLen] = y === 1 ? reqKeys[0] : reqKeys;
                            }
                            if (optLen - l < j$2 - i$8) {
                                var src$10 = keys$2, i$10 = -1, n$9 = src$10.length, dest$4 = new Array(n$9);
                                while (++i$10 < n$9) {
                                    dest$4[i$10] = src$10[i$10];
                                }
                                reqKeys = dest$4;
                                optKeys = [];
                                optKeysLen = 0;
                                x$3 = -1;
                                y = reqKeys.length;
                                while (++x$3 < y) {
                                    (z = reqKeys[x$3]) !== __NULL && (optKeys[optKeysLen++] = z);
                                }
                                if (optKeysLen > 0) {
                                    opt$2[++optLen] = optKeysLen === 1 ? optKeys[0] : optKeys;
                                }
                            }
                            pathMapStack[offset$2 = 4 * (++j$2 + boundLength)] = map[keys$2[index$3 - 1]];
                            continue;
                        }
                    }
                    delete pathMapStack[offset$2 = 4 * (j$2-- + boundLength)];
                    delete pathMapStack[offset$2 + 1];
                    delete pathMapStack[offset$2 + 2];
                    delete pathMapStack[offset$2 + 3];
                }
                req$4.pathSetIndex = index;
                requestedMissingPaths[requestedMissingPaths.length] = req$4;
                optimizedMissingPaths[optimizedMissingPaths.length] = opt$2;
            }
            appendNullKey = false;
            var offset$3, keys$3, index$4;
            while (depth > -1 && (keys$3 = pathMapStack[(offset$3 = 4 * depth--) + 1]) && ((index$4 = pathMapStack[offset$3 + 2]) || true) && (pathMapStack[offset$3 + 2] = ++index$4) >= keys$3.length) {
                delete pathMapStack[offset$3 + 0];
                delete pathMapStack[offset$3 + 1];
                delete pathMapStack[offset$3 + 2];
                delete pathMapStack[offset$3 + 3];
            }
        }
    }
    return {
        'values': values,
        'errors': errors,
        'requestedPaths': requestedPaths,
        'optimizedPaths': optimizedPaths,
        'requestedMissingPaths': requestedMissingPaths,
        'optimizedMissingPaths': optimizedMissingPaths
    };
}
function getPathsAsJSON(model, pathSets, values, errorSelector, boundPath) {
    var boundLength = 0, nodeRoot = model._cache || {}, nodeParent, node;
    if (Array.isArray(boundPath)) {
        nodeParent = nodeRoot;
        boundLength = boundPath.length;
    } else {
        nodeParent = getBoundValue(model);
        boundPath = model._path || [];
    }
    var root = model._root || model, boxed = model._boxed || false, expired = root.expired || (root.expired = []), refreshing = model._refreshing || false, appendNullKey = false;
    typeof errorSelector === 'function' || (errorSelector = model._errorSelector) || (errorSelector = function (x$4, y) {
        return y;
    });
    var jsonKeys = pathSets.jsonKeys || (pathSets.jsonKeys = []);
    var nodes = pathSets.nodes || (pathSets.nodes = []);
    var jsons = pathSets.jsons || (pathSets.jsons = []);
    var errors = pathSets.errors || (pathSets.errors = []);
    var refs = pathSets.refs || (pathSets.refs = []);
    var depth = pathSets.depth || (pathSets.depth = 0);
    var refIndex = pathSets.refIndex || (pathSets.refIndex = 0);
    var refDepth = pathSets.refDepth || (pathSets.refDepth = 0);
    var requestedPath = pathSets.requestedPath || (pathSets.requestedPath = []);
    var optimizedPath = pathSets.optimizedPath || (pathSets.optimizedPath = []);
    var requestedPaths = pathSets.requestedPaths || (pathSets.requestedPaths = []);
    var optimizedPaths = pathSets.optimizedPaths || (pathSets.optimizedPaths = []);
    var requestedMissingPaths = pathSets.requestedMissingPaths || (pathSets.requestedMissingPaths = []);
    var optimizedMissingPaths = pathSets.optimizedMissingPaths || (pathSets.optimizedMissingPaths = []);
    var hasValue = pathSets.hasValue || (pathSets.hasValue = false);
    var jsonRoot = pathSets.jsonRoot || (pathSets.jsonRoot = values && values[0]);
    var jsonParent = pathSets.jsonParent || (pathSets.jsonParent = jsonRoot);
    var jsonNode = pathSets.jsonNode || (pathSets.jsonNode = jsonParent);
    var path, length = 0, height = 0, reference, refLength = 0, refHeight = 0, nodeType, nodeValue, nodeSize, nodeTimestamp, nodeExpires;
    refs[-1] = boundPath;
    nodes[-1] = nodeParent;
    jsons[-2] = jsons;
    jsonKeys[-1] = -1;
    var index = -1, count = pathSets.length;
    while (++index < count) {
        path = pathSets[index];
        hasValue = false;
        jsons.length = 0;
        jsons[-1] = jsonRoot = values && values[index] || void 0;
        jsonKeys.length = 0;
        jsonKeys[-1] = -1;
        depth = 0;
        length = path.length;
        height = length - 1;
        var ref;
        refs.length = 0;
        while (depth > -1) {
            refIndex = depth;
            while (--refIndex >= -1) {
                if (!!(ref = refs[refIndex])) {
                    refLength = ref.length;
                    var i = -1, j = 0;
                    while (++i < refLength) {
                        optimizedPath[j++] = ref[i];
                    }
                    i = ++refIndex;
                    while (i < depth) {
                        optimizedPath[j++] = requestedPath[i++];
                    }
                    optimizedPath.length = j;
                    break;
                }
            }
            var key, isKeySet;
            path = path;
            height = (length = path.length) - 1;
            nodeParent = node = nodes[depth - 1];
            jsonParent = jsonNode = jsons[depth - 1];
            depth = depth;
            follow_path_9304:
                do {
                    key = path[depth];
                    if (isKeySet = key != null && typeof key === 'object') {
                        if (Array.isArray(key)) {
                            if ((key = key[key.index || (key.index = 0)]) != null && typeof key === 'object') {
                                key = key[__OFFSET] === void 0 && (key[__OFFSET] = key.from || (key.from = 0)) || key[__OFFSET];
                            }
                        } else {
                            key = key[__OFFSET] === void 0 && (key[__OFFSET] = key.from || (key.from = 0)) || key[__OFFSET];
                        }
                    }
                    if (key === __NULL) {
                        key = null;
                    }
                    depth >= boundLength && (requestedPath[requestedPath.length = depth] = key);
                    if (key != null) {
                        if (depth < height) {
                            optimizedPath[optimizedPath.length = depth + (refLength - refIndex)] = key;
                            node = nodeParent[key];
                            nodeType = node && node[$TYPE] || void 0;
                            nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                            nodeTimestamp = node && node[$TIMESTAMP];
                            nodeExpires = node && node[$EXPIRES];
                            if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                            }
                            if (depth >= boundLength) {
                                jsonKeys[depth] = isKeySet ? key : void 0;
                                if (node != null && jsonParent != null && isKeySet && (!(jsonNode = jsonParent[key]) || !(jsonNode != null && typeof jsonNode === 'object'))) {
                                    jsonNode = jsonParent[key] = Object.create(null);
                                }
                            } else {
                                jsonKeys[depth] = void 0;
                            }
                            if ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                                do {
                                    if (nodeExpires !== 1) {
                                        var root$2 = root, head = root$2.__head, tail = root$2.__tail, next = node.__next, prev = node.__prev;
                                        if (node !== head) {
                                            next && (next != null && typeof next === 'object') && (next.__prev = prev);
                                            prev && (prev != null && typeof prev === 'object') && (prev.__next = next);
                                            (next = head) && (head != null && typeof head === 'object') && (head.__prev = node);
                                            root$2.__head = root$2.__next = head = node;
                                            head.__next = next;
                                            head.__prev = void 0;
                                        }
                                        if (tail == null || node === tail) {
                                            root$2.__tail = root$2.__prev = tail = prev || node;
                                        }
                                        root$2 = head = tail = next = prev = void 0;
                                    }
                                    refs[depth] = nodeValue;
                                    refIndex = depth + 1;
                                    refDepth = 0;
                                    var key$2, isKeySet$2;
                                    reference = nodeValue;
                                    refHeight = (refLength = reference.length) - 1;
                                    nodeParent = nodeRoot;
                                    jsonParent = jsonRoot;
                                    refDepth = refDepth;
                                    follow_path_9564:
                                        do {
                                            key$2 = reference[refDepth];
                                            isKeySet$2 = false;
                                            if (key$2 != null) {
                                                if (refDepth < refHeight) {
                                                    optimizedPath[optimizedPath.length = refDepth] = key$2;
                                                    node = nodeParent[key$2];
                                                    nodeType = node && node[$TYPE] || void 0;
                                                    nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                                    nodeTimestamp = node && node[$TIMESTAMP];
                                                    nodeExpires = node && node[$EXPIRES];
                                                    if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                                        node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                                    }
                                                    if (appendNullKey = node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue)) {
                                                        nodeParent = node;
                                                        break follow_path_9564;
                                                    }
                                                    nodeParent = node;
                                                    jsonParent = jsonNode;
                                                    refDepth = refDepth + 1;
                                                    continue follow_path_9564;
                                                } else if (refDepth === refHeight) {
                                                    optimizedPath[optimizedPath.length = refDepth] = key$2;
                                                    node = nodeParent[key$2];
                                                    nodeType = node && node[$TYPE] || void 0;
                                                    nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                                    nodeTimestamp = node && node[$TIMESTAMP];
                                                    nodeExpires = node && node[$EXPIRES];
                                                    if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                                        node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                                    }
                                                    appendNullKey = node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue);
                                                    nodeParent = node;
                                                    break follow_path_9564;
                                                }
                                            } else if (refDepth < refHeight) {
                                                nodeParent = node;
                                                jsonParent = jsonNode;
                                                refDepth = refDepth + 1;
                                                continue follow_path_9564;
                                            }
                                            nodeParent = node;
                                            break follow_path_9564;
                                        } while (true);
                                    node = nodeParent;
                                } while ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue));
                                if (node == null) {
                                    while (refDepth <= refHeight) {
                                        optimizedPath[refDepth] = reference[refDepth++];
                                    }
                                }
                            }
                            if (node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue)) {
                                nodeParent = node;
                                break follow_path_9304;
                            }
                            nodeParent = nodes[depth] = node;
                            jsonParent = jsons[depth] = jsonNode;
                            depth = depth + 1;
                            continue follow_path_9304;
                        } else if (depth === height) {
                            optimizedPath[optimizedPath.length = depth + (refLength - refIndex)] = key;
                            node = nodeParent[key];
                            nodeType = node && node[$TYPE] || void 0;
                            nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                            nodeTimestamp = node && node[$TIMESTAMP];
                            nodeExpires = node && node[$EXPIRES];
                            if (node != null && typeof node === 'object') {
                                if (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true) {
                                    node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                } else {
                                    if (nodeExpires !== 1) {
                                        var root$3 = root, head$2 = root$3.__head, tail$2 = root$3.__tail, next$2 = node.__next, prev$2 = node.__prev;
                                        if (node !== head$2) {
                                            next$2 && (next$2 != null && typeof next$2 === 'object') && (next$2.__prev = prev$2);
                                            prev$2 && (prev$2 != null && typeof prev$2 === 'object') && (prev$2.__next = next$2);
                                            (next$2 = head$2) && (head$2 != null && typeof head$2 === 'object') && (head$2.__prev = node);
                                            root$3.__head = root$3.__next = head$2 = node;
                                            head$2.__next = next$2;
                                            head$2.__prev = void 0;
                                        }
                                        if (tail$2 == null || node === tail$2) {
                                            root$3.__tail = root$3.__prev = tail$2 = prev$2 || node;
                                        }
                                        root$3 = head$2 = tail$2 = next$2 = prev$2 = void 0;
                                    }
                                }
                            }
                            if (depth >= boundLength) {
                                jsonKeys[depth] = isKeySet ? key : void 0;
                            } else {
                                jsonKeys[depth] = void 0;
                            }
                            appendNullKey = false;
                            nodeParent = node;
                            break follow_path_9304;
                        }
                    } else if (depth < height) {
                        nodeParent = nodeParent;
                        jsonParent = jsonParent;
                        depth = depth + 1;
                        continue follow_path_9304;
                    }
                    nodeParent = node;
                    break follow_path_9304;
                } while (true);
            node = nodeParent;
            if (node != null || boxed === true) {
                if (nodeType === ERROR) {
                    if (nodeExpires !== 1) {
                        var root$4 = root, head$3 = root$4.__head, tail$3 = root$4.__tail, next$3 = node.__next, prev$3 = node.__prev;
                        if (node !== head$3) {
                            next$3 && (next$3 != null && typeof next$3 === 'object') && (next$3.__prev = prev$3);
                            prev$3 && (prev$3 != null && typeof prev$3 === 'object') && (prev$3.__next = next$3);
                            (next$3 = head$3) && (head$3 != null && typeof head$3 === 'object') && (head$3.__prev = node);
                            root$4.__head = root$4.__next = head$3 = node;
                            head$3.__next = next$3;
                            head$3.__prev = void 0;
                        }
                        if (tail$3 == null || node === tail$3) {
                            root$4.__tail = root$4.__prev = tail$3 = prev$3 || node;
                        }
                        root$4 = head$3 = tail$3 = next$3 = prev$3 = void 0;
                    }
                    var pbv = Object.create(null);
                    var src = requestedPath, i$2 = -1, n = src.length, req = new Array(n);
                    while (++i$2 < n) {
                        req[i$2] = src[i$2];
                    }
                    if (appendNullKey === true) {
                        req[req.length] = null;
                    }
                    pbv.path = req;
                    if (boxed === true) {
                        pbv.value = node;
                    } else {
                        var dest = nodeValue, src$2 = dest, x;
                        if (dest != null && typeof dest === 'object') {
                            dest = Array.isArray(src$2) && [] || Object.create(null);
                            for (x in src$2) {
                                !(!(x[0] !== '_' || x[1] !== '_') || (x === __SELF || x === __PARENT || x === __ROOT) || x[0] === '$') && (dest[x] = src$2[x]);
                            }
                        }
                        pbv.value = dest;
                    }
                    errors[errors.length] = pbv;
                }
                if (jsonParent != null) {
                    hasValue = true;
                    var jsonKey, jsonDepth = depth;
                    do {
                        jsonKey = jsonKeys[jsonDepth];
                        jsonParent = jsons[--jsonDepth];
                    } while (jsonKey == null);
                    if (boxed === true) {
                        jsonParent[jsonKey] = node;
                    } else {
                        var dest$2 = nodeValue, src$3 = dest$2, x$2;
                        if (dest$2 != null && typeof dest$2 === 'object') {
                            dest$2 = Array.isArray(src$3) && [] || Object.create(null);
                            for (x$2 in src$3) {
                                !(!(x$2[0] !== '_' || x$2[1] !== '_') || (x$2 === __SELF || x$2 === __PARENT || x$2 === __ROOT) || x$2[0] === '$') && (dest$2[x$2] = src$3[x$2]);
                            }
                        }
                        jsonParent[jsonKey] = dest$2;
                    }
                }
                var src$4 = optimizedPath, i$3 = -1, n$2 = src$4.length, opt = new Array(n$2);
                while (++i$3 < n$2) {
                    opt[i$3] = src$4[i$3];
                }
                var src$5 = requestedPath, i$4 = -1, n$3 = src$5.length, req$2 = new Array(n$3);
                while (++i$4 < n$3) {
                    req$2[i$4] = src$5[i$4];
                }
                if (appendNullKey === true) {
                    req$2[req$2.length] = null;
                }
                requestedPaths[requestedPaths.length] = req$2;
                optimizedPaths[optimizedPaths.length] = opt;
            }
            if (boxed === false && node == null || refreshing === true) {
                var src$6 = boundPath, i$5 = -1, n$4 = src$6.length, req$3 = new Array(n$4);
                while (++i$5 < n$4) {
                    req$3[i$5] = src$6[i$5];
                }
                var src$7 = optimizedPath, i$6 = -1, n$5 = src$7.length, opt$2 = new Array(n$5);
                while (++i$6 < n$5) {
                    opt$2[i$6] = src$7[i$6];
                }
                var reqLen = req$3.length - 1, optLen = opt$2.length - 1, i$7 = -1, n$6 = requestedPath.length, j$2 = depth, k = height, x$3;
                while (++i$7 < n$6) {
                    req$3[++reqLen] = path[i$7 + boundLength] != null && typeof path[i$7 + boundLength] === 'object' && [requestedPath[i$7]] || requestedPath[i$7];
                }
                i$7 = -1;
                n$6 = height - depth;
                while (++i$7 < n$6) {
                    x$3 = req$3[++reqLen] = path[++j$2 + boundLength];
                    x$3 != null && (opt$2[++optLen] = x$3);
                }
                req$3.pathSetIndex = index;
                requestedMissingPaths[requestedMissingPaths.length] = req$3;
                optimizedMissingPaths[optimizedMissingPaths.length] = opt$2;
            }
            appendNullKey = false;
            jsonRoot != null && (values[index] = hasValue && { json: jsons[-1] } || void 0);
            var key$3;
            depth = depth;
            unroll_9400:
                do {
                    if (depth < 0) {
                        depth = (path.depth = 0) - 1;
                        break unroll_9400;
                    }
                    if (!((key$3 = path[depth]) != null && typeof key$3 === 'object')) {
                        depth = path.depth = depth - 1;
                        continue unroll_9400;
                    }
                    if (Array.isArray(key$3)) {
                        if (++key$3.index === key$3.length) {
                            if (!((key$3 = key$3[key$3.index = 0]) != null && typeof key$3 === 'object')) {
                                depth = path.depth = depth - 1;
                                continue unroll_9400;
                            }
                        } else {
                            depth = path.depth = depth;
                            break unroll_9400;
                        }
                    }
                    if (++key$3[__OFFSET] > (key$3.to || (key$3.to = key$3.from + (key$3.length || 1) - 1))) {
                        key$3[__OFFSET] = key$3.from;
                        depth = path.depth = depth - 1;
                        continue unroll_9400;
                    }
                    depth = path.depth = depth;
                    break unroll_9400;
                } while (true);
            depth = depth;
        }
    }
    return {
        'values': values,
        'errors': errors,
        'requestedPaths': requestedPaths,
        'optimizedPaths': optimizedPaths,
        'requestedMissingPaths': requestedMissingPaths,
        'optimizedMissingPaths': optimizedMissingPaths
    };
}
function getPathsAsJSONG(model, pathSets, values, errorSelector, boundPath) {
    var boundLength = 0, nodeRoot = model._cache || {}, nodeParent, node;
    if (Array.isArray(boundPath)) {
        nodeParent = nodeRoot;
        boundLength = boundPath.length;
    } else {
        nodeParent = getBoundValue(model);
        boundPath = model._path || [];
    }
    var root = model._root || model, boxed = model._boxed || false, expired = root.expired || (root.expired = []), refreshing = model._refreshing || false, appendNullKey = false;
    typeof errorSelector === 'function' || (errorSelector = model._errorSelector) || (errorSelector = function (x$7, y) {
        return y;
    });
    var nodes = pathSets.nodes || (pathSets.nodes = []);
    var jsons = pathSets.jsons || (pathSets.jsons = []);
    var errors = pathSets.errors || (pathSets.errors = []);
    var refs = pathSets.refs || (pathSets.refs = []);
    var depth = pathSets.depth || (pathSets.depth = 0);
    var refIndex = pathSets.refIndex || (pathSets.refIndex = 0);
    var refDepth = pathSets.refDepth || (pathSets.refDepth = 0);
    var requestedPath = pathSets.requestedPath || (pathSets.requestedPath = []);
    var optimizedPath = pathSets.optimizedPath || (pathSets.optimizedPath = []);
    var requestedPaths = pathSets.requestedPaths || (pathSets.requestedPaths = []);
    var optimizedPaths = pathSets.optimizedPaths || (pathSets.optimizedPaths = []);
    var requestedMissingPaths = pathSets.requestedMissingPaths || (pathSets.requestedMissingPaths = []);
    var optimizedMissingPaths = pathSets.optimizedMissingPaths || (pathSets.optimizedMissingPaths = []);
    var hasValue = pathSets.hasValue || (pathSets.hasValue = false);
    var jsonRoot = pathSets.jsonRoot || (pathSets.jsonRoot = values && values[0]);
    var jsonParent = pathSets.jsonParent || (pathSets.jsonParent = jsonRoot);
    var jsonNode = pathSets.jsonNode || (pathSets.jsonNode = jsonParent);
    var path, length = 0, height = 0, reference, refLength = 0, refHeight = 0, nodeType, nodeValue, nodeSize, nodeTimestamp, nodeExpires;
    refs[-1] = boundPath;
    nodes[-1] = nodeParent;
    jsons[-1] = jsonParent;
    jsons[-2] = jsons;
    var index = -1, count = pathSets.length;
    while (++index < count) {
        path = pathSets[index];
        depth = 0;
        length = path.length;
        height = length - 1;
        var ref;
        refs.length = 0;
        while (depth > -1) {
            refIndex = depth;
            while (--refIndex >= -1) {
                if (!!(ref = refs[refIndex])) {
                    refLength = ref.length;
                    var i = -1, j = 0;
                    while (++i < refLength) {
                        optimizedPath[j++] = ref[i];
                    }
                    i = ++refIndex;
                    while (i < depth) {
                        optimizedPath[j++] = requestedPath[i++];
                    }
                    optimizedPath.length = j;
                    break;
                }
            }
            var key, isKeySet;
            path = path;
            height = (length = path.length) - 1;
            nodeParent = node = nodes[depth - 1];
            jsonParent = jsonNode = jsons[depth - 1];
            depth = depth;
            follow_path_11449:
                do {
                    key = path[depth];
                    if (isKeySet = key != null && typeof key === 'object') {
                        if (Array.isArray(key)) {
                            if ((key = key[key.index || (key.index = 0)]) != null && typeof key === 'object') {
                                key = key[__OFFSET] === void 0 && (key[__OFFSET] = key.from || (key.from = 0)) || key[__OFFSET];
                            }
                        } else {
                            key = key[__OFFSET] === void 0 && (key[__OFFSET] = key.from || (key.from = 0)) || key[__OFFSET];
                        }
                    }
                    if (key === __NULL) {
                        key = null;
                    }
                    depth >= boundLength && (requestedPath[requestedPath.length = depth] = key);
                    if (key != null) {
                        if (depth < height) {
                            optimizedPath[optimizedPath.length = depth + (refLength - refIndex)] = key;
                            node = nodeParent[key];
                            nodeType = node && node[$TYPE] || void 0;
                            nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                            nodeTimestamp = node && node[$TIMESTAMP];
                            nodeExpires = node && node[$EXPIRES];
                            if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                            }
                            if (node != null && jsonParent != null) {
                                if (!nodeType && (node != null && typeof node === 'object') && !Array.isArray(nodeValue)) {
                                    if (!(jsonNode = jsonParent[key]) || !(jsonNode != null && typeof jsonNode === 'object')) {
                                        jsonNode = jsonParent[key] = Object.create(null);
                                    }
                                } else {
                                    if (boxed === true) {
                                        jsonParent[key] = node;
                                    } else {
                                        var val = nodeValue;
                                        if (val != null && typeof val === 'object') {
                                            var src = val, keys = Object.keys(src), x, i$2 = -1, n = keys.length;
                                            val = Array.isArray(src) && new Array(src.length) || Object.create(null);
                                            while (++i$2 < n) {
                                                x = keys[i$2];
                                                !(!(x[0] !== '_' || x[1] !== '_') || (x === __SELF || x === __PARENT || x === __ROOT)) && (val[x] = src[x]);
                                            }
                                        }
                                        if (!nodeType && (val != null && typeof val === 'object') && !Array.isArray(val)) {
                                            val[$TYPE] = LEAF;
                                        }
                                        jsonParent[key] = val;
                                    }
                                }
                            }
                            if ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                                do {
                                    if (nodeExpires !== 1) {
                                        var root$2 = root, head = root$2.__head, tail = root$2.__tail, next = node.__next, prev = node.__prev;
                                        if (node !== head) {
                                            next && (next != null && typeof next === 'object') && (next.__prev = prev);
                                            prev && (prev != null && typeof prev === 'object') && (prev.__next = next);
                                            (next = head) && (head != null && typeof head === 'object') && (head.__prev = node);
                                            root$2.__head = root$2.__next = head = node;
                                            head.__next = next;
                                            head.__prev = void 0;
                                        }
                                        if (tail == null || node === tail) {
                                            root$2.__tail = root$2.__prev = tail = prev || node;
                                        }
                                        root$2 = head = tail = next = prev = void 0;
                                    }
                                    refs[depth] = nodeValue;
                                    refIndex = depth + 1;
                                    refDepth = 0;
                                    var key$2, isKeySet$2;
                                    reference = nodeValue;
                                    refHeight = (refLength = reference.length) - 1;
                                    nodeParent = nodeRoot;
                                    jsonParent = jsonRoot;
                                    refDepth = refDepth;
                                    follow_path_11724:
                                        do {
                                            key$2 = reference[refDepth];
                                            isKeySet$2 = false;
                                            if (key$2 != null) {
                                                if (refDepth < refHeight) {
                                                    optimizedPath[optimizedPath.length = refDepth] = key$2;
                                                    node = nodeParent[key$2];
                                                    nodeType = node && node[$TYPE] || void 0;
                                                    nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                                    nodeTimestamp = node && node[$TIMESTAMP];
                                                    nodeExpires = node && node[$EXPIRES];
                                                    if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                                        node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                                    }
                                                    if (node != null && jsonParent != null) {
                                                        if (!nodeType && (node != null && typeof node === 'object') && !Array.isArray(nodeValue)) {
                                                            if (!(jsonNode = jsonParent[key$2]) || !(jsonNode != null && typeof jsonNode === 'object')) {
                                                                jsonNode = jsonParent[key$2] = Object.create(null);
                                                            }
                                                        } else {
                                                            if (boxed === true) {
                                                                jsonParent[key$2] = node;
                                                            } else {
                                                                var val$2 = nodeValue;
                                                                if (val$2 != null && typeof val$2 === 'object') {
                                                                    var src$2 = val$2, keys$2 = Object.keys(src$2), x$2, i$3 = -1, n$2 = keys$2.length;
                                                                    val$2 = Array.isArray(src$2) && new Array(src$2.length) || Object.create(null);
                                                                    while (++i$3 < n$2) {
                                                                        x$2 = keys$2[i$3];
                                                                        !(!(x$2[0] !== '_' || x$2[1] !== '_') || (x$2 === __SELF || x$2 === __PARENT || x$2 === __ROOT)) && (val$2[x$2] = src$2[x$2]);
                                                                    }
                                                                }
                                                                if (!nodeType && (val$2 != null && typeof val$2 === 'object') && !Array.isArray(val$2)) {
                                                                    val$2[$TYPE] = LEAF;
                                                                }
                                                                jsonParent[key$2] = val$2;
                                                            }
                                                        }
                                                    }
                                                    if (appendNullKey = node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue)) {
                                                        nodeParent = node;
                                                        break follow_path_11724;
                                                    }
                                                    nodeParent = node;
                                                    jsonParent = jsonNode;
                                                    refDepth = refDepth + 1;
                                                    continue follow_path_11724;
                                                } else if (refDepth === refHeight) {
                                                    optimizedPath[optimizedPath.length = refDepth] = key$2;
                                                    node = nodeParent[key$2];
                                                    nodeType = node && node[$TYPE] || void 0;
                                                    nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                                    nodeTimestamp = node && node[$TIMESTAMP];
                                                    nodeExpires = node && node[$EXPIRES];
                                                    if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                                        node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                                    }
                                                    if (node != null && jsonParent != null) {
                                                        if (!nodeType && (node != null && typeof node === 'object') && !Array.isArray(nodeValue)) {
                                                            if (!(jsonNode = jsonParent[key$2]) || !(jsonNode != null && typeof jsonNode === 'object')) {
                                                                jsonNode = jsonParent[key$2] = Object.create(null);
                                                            }
                                                        } else {
                                                            if (boxed === true) {
                                                                jsonParent[key$2] = node;
                                                            } else {
                                                                var val$3 = nodeValue;
                                                                if (val$3 != null && typeof val$3 === 'object') {
                                                                    var src$3 = val$3, keys$3 = Object.keys(src$3), x$3, i$4 = -1, n$3 = keys$3.length;
                                                                    val$3 = Array.isArray(src$3) && new Array(src$3.length) || Object.create(null);
                                                                    while (++i$4 < n$3) {
                                                                        x$3 = keys$3[i$4];
                                                                        !(!(x$3[0] !== '_' || x$3[1] !== '_') || (x$3 === __SELF || x$3 === __PARENT || x$3 === __ROOT)) && (val$3[x$3] = src$3[x$3]);
                                                                    }
                                                                }
                                                                if (!nodeType && (val$3 != null && typeof val$3 === 'object') && !Array.isArray(val$3)) {
                                                                    val$3[$TYPE] = LEAF;
                                                                }
                                                                jsonParent[key$2] = val$3;
                                                            }
                                                        }
                                                    }
                                                    appendNullKey = node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue);
                                                    nodeParent = node;
                                                    break follow_path_11724;
                                                }
                                            } else if (refDepth < refHeight) {
                                                nodeParent = node;
                                                jsonParent = jsonNode;
                                                refDepth = refDepth + 1;
                                                continue follow_path_11724;
                                            }
                                            nodeParent = node;
                                            break follow_path_11724;
                                        } while (true);
                                    node = nodeParent;
                                } while ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue));
                                if (node == null) {
                                    while (refDepth <= refHeight) {
                                        optimizedPath[refDepth] = reference[refDepth++];
                                    }
                                }
                            }
                            if (node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue)) {
                                nodeParent = node;
                                break follow_path_11449;
                            }
                            nodeParent = nodes[depth] = node;
                            jsonParent = jsons[depth] = jsonNode;
                            depth = depth + 1;
                            continue follow_path_11449;
                        } else if (depth === height) {
                            optimizedPath[optimizedPath.length = depth + (refLength - refIndex)] = key;
                            node = nodeParent[key];
                            nodeType = node && node[$TYPE] || void 0;
                            nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                            nodeTimestamp = node && node[$TIMESTAMP];
                            nodeExpires = node && node[$EXPIRES];
                            if (node != null && typeof node === 'object') {
                                if (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true) {
                                    node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                } else {
                                    if (nodeExpires !== 1) {
                                        var root$3 = root, head$2 = root$3.__head, tail$2 = root$3.__tail, next$2 = node.__next, prev$2 = node.__prev;
                                        if (node !== head$2) {
                                            next$2 && (next$2 != null && typeof next$2 === 'object') && (next$2.__prev = prev$2);
                                            prev$2 && (prev$2 != null && typeof prev$2 === 'object') && (prev$2.__next = next$2);
                                            (next$2 = head$2) && (head$2 != null && typeof head$2 === 'object') && (head$2.__prev = node);
                                            root$3.__head = root$3.__next = head$2 = node;
                                            head$2.__next = next$2;
                                            head$2.__prev = void 0;
                                        }
                                        if (tail$2 == null || node === tail$2) {
                                            root$3.__tail = root$3.__prev = tail$2 = prev$2 || node;
                                        }
                                        root$3 = head$2 = tail$2 = next$2 = prev$2 = void 0;
                                    }
                                }
                            }
                            if (node != null && jsonParent != null) {
                                if (boxed === true) {
                                    jsonParent[key] = node;
                                } else {
                                    var val$4 = nodeValue;
                                    if (val$4 != null && typeof val$4 === 'object') {
                                        var src$4 = val$4, keys$4 = Object.keys(src$4), x$4, i$5 = -1, n$4 = keys$4.length;
                                        val$4 = Array.isArray(src$4) && new Array(src$4.length) || Object.create(null);
                                        while (++i$5 < n$4) {
                                            x$4 = keys$4[i$5];
                                            !(!(x$4[0] !== '_' || x$4[1] !== '_') || (x$4 === __SELF || x$4 === __PARENT || x$4 === __ROOT)) && (val$4[x$4] = src$4[x$4]);
                                        }
                                    }
                                    if (!nodeType && (val$4 != null && typeof val$4 === 'object') && !Array.isArray(val$4)) {
                                        val$4[$TYPE] = LEAF;
                                    }
                                    jsonParent[key] = val$4;
                                }
                            }
                            appendNullKey = false;
                            nodeParent = node;
                            break follow_path_11449;
                        }
                    } else if (depth < height) {
                        nodeParent = nodeParent;
                        jsonParent = jsonParent;
                        depth = depth + 1;
                        continue follow_path_11449;
                    }
                    nodeParent = node;
                    break follow_path_11449;
                } while (true);
            node = nodeParent;
            if (node != null || boxed === true) {
                if (nodeType === ERROR) {
                    if (nodeExpires !== 1) {
                        var root$4 = root, head$3 = root$4.__head, tail$3 = root$4.__tail, next$3 = node.__next, prev$3 = node.__prev;
                        if (node !== head$3) {
                            next$3 && (next$3 != null && typeof next$3 === 'object') && (next$3.__prev = prev$3);
                            prev$3 && (prev$3 != null && typeof prev$3 === 'object') && (prev$3.__next = next$3);
                            (next$3 = head$3) && (head$3 != null && typeof head$3 === 'object') && (head$3.__prev = node);
                            root$4.__head = root$4.__next = head$3 = node;
                            head$3.__next = next$3;
                            head$3.__prev = void 0;
                        }
                        if (tail$3 == null || node === tail$3) {
                            root$4.__tail = root$4.__prev = tail$3 = prev$3 || node;
                        }
                        root$4 = head$3 = tail$3 = next$3 = prev$3 = void 0;
                    }
                    var pbv = Object.create(null);
                    var src$5 = requestedPath, i$6 = -1, n$5 = src$5.length, req = new Array(n$5);
                    while (++i$6 < n$5) {
                        req[i$6] = src$5[i$6];
                    }
                    if (appendNullKey === true) {
                        req[req.length] = null;
                    }
                    pbv.path = req;
                    if (boxed === true) {
                        pbv.value = node;
                    } else {
                        var dest = nodeValue, src$6 = dest, x$5;
                        if (dest != null && typeof dest === 'object') {
                            dest = Array.isArray(src$6) && [] || Object.create(null);
                            for (x$5 in src$6) {
                                !(!(x$5[0] !== '_' || x$5[1] !== '_') || (x$5 === __SELF || x$5 === __PARENT || x$5 === __ROOT)) && (dest[x$5] = src$6[x$5]);
                            }
                        }
                        pbv.value = dest;
                    }
                    errors[errors.length] = pbv;
                }
                hasValue || (hasValue = jsonParent != null);
                var src$7 = optimizedPath, i$7 = -1, n$6 = src$7.length, opt = new Array(n$6);
                while (++i$7 < n$6) {
                    opt[i$7] = src$7[i$7];
                }
                var src$8 = requestedPath, i$8 = -1, n$7 = src$8.length, req$2 = new Array(n$7);
                while (++i$8 < n$7) {
                    req$2[i$8] = src$8[i$8];
                }
                if (appendNullKey === true) {
                    req$2[req$2.length] = null;
                }
                requestedPaths[requestedPaths.length] = req$2;
                optimizedPaths[optimizedPaths.length] = opt;
            }
            if (boxed === false && node == null || refreshing === true) {
                var src$9 = boundPath, i$9 = -1, n$8 = src$9.length, req$3 = new Array(n$8);
                while (++i$9 < n$8) {
                    req$3[i$9] = src$9[i$9];
                }
                var src$10 = optimizedPath, i$10 = -1, n$9 = src$10.length, opt$2 = new Array(n$9);
                while (++i$10 < n$9) {
                    opt$2[i$10] = src$10[i$10];
                }
                var reqLen = req$3.length - 1, optLen = opt$2.length - 1, i$11 = -1, n$10 = requestedPath.length, j$2 = depth, k = height, x$6;
                while (++i$11 < n$10) {
                    req$3[++reqLen] = path[i$11 + boundLength] != null && typeof path[i$11 + boundLength] === 'object' && [requestedPath[i$11]] || requestedPath[i$11];
                }
                i$11 = -1;
                n$10 = height - depth;
                while (++i$11 < n$10) {
                    x$6 = req$3[++reqLen] = path[++j$2 + boundLength];
                    x$6 != null && (opt$2[++optLen] = x$6);
                }
                req$3.pathSetIndex = index;
                requestedMissingPaths[requestedMissingPaths.length] = req$3;
                optimizedMissingPaths[optimizedMissingPaths.length] = opt$2;
            }
            appendNullKey = false;
            var key$3;
            depth = depth;
            unroll_11540:
                do {
                    if (depth < 0) {
                        depth = (path.depth = 0) - 1;
                        break unroll_11540;
                    }
                    if (!((key$3 = path[depth]) != null && typeof key$3 === 'object')) {
                        depth = path.depth = depth - 1;
                        continue unroll_11540;
                    }
                    if (Array.isArray(key$3)) {
                        if (++key$3.index === key$3.length) {
                            if (!((key$3 = key$3[key$3.index = 0]) != null && typeof key$3 === 'object')) {
                                depth = path.depth = depth - 1;
                                continue unroll_11540;
                            }
                        } else {
                            depth = path.depth = depth;
                            break unroll_11540;
                        }
                    }
                    if (++key$3[__OFFSET] > (key$3.to || (key$3.to = key$3.from + (key$3.length || 1) - 1))) {
                        key$3[__OFFSET] = key$3.from;
                        depth = path.depth = depth - 1;
                        continue unroll_11540;
                    }
                    depth = path.depth = depth;
                    break unroll_11540;
                } while (true);
            depth = depth;
        }
    }
    values && (values[0] = hasValue && {
        paths: requestedPaths,
        jsong: jsons[-1]
    } || undefined);
    return {
        'values': values,
        'errors': errors,
        'requestedPaths': requestedPaths,
        'optimizedPaths': optimizedPaths,
        'requestedMissingPaths': requestedMissingPaths,
        'optimizedMissingPaths': optimizedMissingPaths
    };
}
function getPathsAsPathMap(model, pathSets, values, errorSelector, boundPath) {
    var boundLength = 0, nodeRoot = model._cache || {}, nodeParent, node;
    if (Array.isArray(boundPath)) {
        nodeParent = nodeRoot;
        boundLength = boundPath.length;
    } else {
        nodeParent = getBoundValue(model);
        boundPath = model._path || [];
    }
    var root = model._root || model, boxed = model._boxed || false, expired = root.expired || (root.expired = []), refreshing = model._refreshing || false, appendNullKey = false;
    typeof errorSelector === 'function' || (errorSelector = model._errorSelector) || (errorSelector = function (x$5, y) {
        return y;
    });
    var nodes = pathSets.nodes || (pathSets.nodes = []);
    var jsons = pathSets.jsons || (pathSets.jsons = []);
    var errors = pathSets.errors || (pathSets.errors = []);
    var refs = pathSets.refs || (pathSets.refs = []);
    var depth = pathSets.depth || (pathSets.depth = 0);
    var refIndex = pathSets.refIndex || (pathSets.refIndex = 0);
    var refDepth = pathSets.refDepth || (pathSets.refDepth = 0);
    var requestedPath = pathSets.requestedPath || (pathSets.requestedPath = []);
    var optimizedPath = pathSets.optimizedPath || (pathSets.optimizedPath = []);
    var requestedPaths = pathSets.requestedPaths || (pathSets.requestedPaths = []);
    var optimizedPaths = pathSets.optimizedPaths || (pathSets.optimizedPaths = []);
    var requestedMissingPaths = pathSets.requestedMissingPaths || (pathSets.requestedMissingPaths = []);
    var optimizedMissingPaths = pathSets.optimizedMissingPaths || (pathSets.optimizedMissingPaths = []);
    var hasValue = pathSets.hasValue || (pathSets.hasValue = false);
    var jsonRoot = pathSets.jsonRoot || (pathSets.jsonRoot = values && values[0]);
    var jsonParent = pathSets.jsonParent || (pathSets.jsonParent = jsonRoot);
    var jsonNode = pathSets.jsonNode || (pathSets.jsonNode = jsonParent);
    var path, length = 0, height = 0, reference, refLength = 0, refHeight = 0, nodeType, nodeValue, nodeSize, nodeTimestamp, nodeExpires;
    refs[-1] = boundPath;
    nodes[-1] = nodeParent;
    jsons[-1] = jsonParent;
    jsons[-2] = jsons;
    var index = -1, count = pathSets.length;
    while (++index < count) {
        path = pathSets[index];
        depth = 0;
        length = path.length;
        height = length - 1;
        var ref;
        refs.length = 0;
        while (depth > -1) {
            refIndex = depth;
            while (--refIndex >= -1) {
                if (!!(ref = refs[refIndex])) {
                    refLength = ref.length;
                    var i = -1, j = 0;
                    while (++i < refLength) {
                        optimizedPath[j++] = ref[i];
                    }
                    i = ++refIndex;
                    while (i < depth) {
                        optimizedPath[j++] = requestedPath[i++];
                    }
                    optimizedPath.length = j;
                    break;
                }
            }
            var key, isKeySet;
            path = path;
            height = (length = path.length) - 1;
            nodeParent = node = nodes[depth - 1];
            jsonParent = jsonNode = jsons[depth - 1];
            depth = depth;
            follow_path_5240:
                do {
                    key = path[depth];
                    if (isKeySet = key != null && typeof key === 'object') {
                        if (Array.isArray(key)) {
                            if ((key = key[key.index || (key.index = 0)]) != null && typeof key === 'object') {
                                key = key[__OFFSET] === void 0 && (key[__OFFSET] = key.from || (key.from = 0)) || key[__OFFSET];
                            }
                        } else {
                            key = key[__OFFSET] === void 0 && (key[__OFFSET] = key.from || (key.from = 0)) || key[__OFFSET];
                        }
                    }
                    if (key === __NULL) {
                        key = null;
                    }
                    depth >= boundLength && (requestedPath[requestedPath.length = depth] = key);
                    if (key != null) {
                        if (depth < height) {
                            optimizedPath[optimizedPath.length = depth + (refLength - refIndex)] = key;
                            node = nodeParent[key];
                            nodeType = node && node[$TYPE] || void 0;
                            nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                            nodeTimestamp = node && node[$TIMESTAMP];
                            nodeExpires = node && node[$EXPIRES];
                            if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                            }
                            if ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                                do {
                                    if (nodeExpires !== 1) {
                                        var root$2 = root, head = root$2.__head, tail = root$2.__tail, next = node.__next, prev = node.__prev;
                                        if (node !== head) {
                                            next && (next != null && typeof next === 'object') && (next.__prev = prev);
                                            prev && (prev != null && typeof prev === 'object') && (prev.__next = next);
                                            (next = head) && (head != null && typeof head === 'object') && (head.__prev = node);
                                            root$2.__head = root$2.__next = head = node;
                                            head.__next = next;
                                            head.__prev = void 0;
                                        }
                                        if (tail == null || node === tail) {
                                            root$2.__tail = root$2.__prev = tail = prev || node;
                                        }
                                        root$2 = head = tail = next = prev = void 0;
                                    }
                                    refs[depth] = nodeValue;
                                    refIndex = depth + 1;
                                    refDepth = 0;
                                    var key$2, isKeySet$2;
                                    reference = nodeValue;
                                    refHeight = (refLength = reference.length) - 1;
                                    nodeParent = nodeRoot;
                                    jsonParent = jsonRoot;
                                    refDepth = refDepth;
                                    follow_path_5483:
                                        do {
                                            key$2 = reference[refDepth];
                                            isKeySet$2 = false;
                                            if (key$2 != null) {
                                                if (refDepth < refHeight) {
                                                    optimizedPath[optimizedPath.length = refDepth] = key$2;
                                                    node = nodeParent[key$2];
                                                    nodeType = node && node[$TYPE] || void 0;
                                                    nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                                    nodeTimestamp = node && node[$TIMESTAMP];
                                                    nodeExpires = node && node[$EXPIRES];
                                                    if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                                        node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                                    }
                                                    if (appendNullKey = node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue)) {
                                                        nodeParent = node;
                                                        break follow_path_5483;
                                                    }
                                                    nodeParent = node;
                                                    jsonParent = jsonNode;
                                                    refDepth = refDepth + 1;
                                                    continue follow_path_5483;
                                                } else if (refDepth === refHeight) {
                                                    optimizedPath[optimizedPath.length = refDepth] = key$2;
                                                    node = nodeParent[key$2];
                                                    nodeType = node && node[$TYPE] || void 0;
                                                    nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                                    nodeTimestamp = node && node[$TIMESTAMP];
                                                    nodeExpires = node && node[$EXPIRES];
                                                    if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                                        node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                                    }
                                                    appendNullKey = node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue);
                                                    nodeParent = node;
                                                    break follow_path_5483;
                                                }
                                            } else if (refDepth < refHeight) {
                                                nodeParent = node;
                                                jsonParent = jsonNode;
                                                refDepth = refDepth + 1;
                                                continue follow_path_5483;
                                            }
                                            nodeParent = node;
                                            break follow_path_5483;
                                        } while (true);
                                    node = nodeParent;
                                } while ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue));
                                if (node == null) {
                                    while (refDepth <= refHeight) {
                                        optimizedPath[refDepth] = reference[refDepth++];
                                    }
                                }
                            }
                            if (depth >= boundLength) {
                                if (node != null && jsonParent != null) {
                                    if (!nodeType && (node != null && typeof node === 'object') && !Array.isArray(nodeValue)) {
                                        if (!(jsonNode = jsonParent[key]) || !(jsonNode != null && typeof jsonNode === 'object')) {
                                            jsonNode = jsonParent[key] = Object.create(null);
                                        }
                                        jsonNode[__KEY] = key;
                                        jsonNode[__GENERATION] = node[__GENERATION] || 0;
                                    } else {
                                        if (boxed === true) {
                                            jsonParent[key] = node;
                                        } else {
                                            var val = nodeValue;
                                            if (val != null && typeof val === 'object') {
                                                var src = val, keys = Object.keys(src), x, i$2 = -1, n = keys.length;
                                                val = Array.isArray(src) && new Array(src.length) || Object.create(null);
                                                while (++i$2 < n) {
                                                    x = keys[i$2];
                                                    !(!(x[0] !== '_' || x[1] !== '_') || (x === __SELF || x === __PARENT || x === __ROOT) || x[0] === '$') && (val[x] = src[x]);
                                                }
                                            }
                                            if (val != null && typeof val === 'object' && !Array.isArray(val)) {
                                                val[$TYPE] = LEAF;
                                            }
                                            jsonParent[key] = val;
                                        }
                                    }
                                }
                            }
                            if (node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue)) {
                                nodeParent = node;
                                break follow_path_5240;
                            }
                            nodeParent = nodes[depth] = node;
                            jsonParent = jsons[depth] = jsonNode;
                            depth = depth + 1;
                            continue follow_path_5240;
                        } else if (depth === height) {
                            optimizedPath[optimizedPath.length = depth + (refLength - refIndex)] = key;
                            node = nodeParent[key];
                            nodeType = node && node[$TYPE] || void 0;
                            nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                            nodeTimestamp = node && node[$TIMESTAMP];
                            nodeExpires = node && node[$EXPIRES];
                            if (node != null && typeof node === 'object') {
                                if (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true) {
                                    node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                } else {
                                    if (nodeExpires !== 1) {
                                        var root$3 = root, head$2 = root$3.__head, tail$2 = root$3.__tail, next$2 = node.__next, prev$2 = node.__prev;
                                        if (node !== head$2) {
                                            next$2 && (next$2 != null && typeof next$2 === 'object') && (next$2.__prev = prev$2);
                                            prev$2 && (prev$2 != null && typeof prev$2 === 'object') && (prev$2.__next = next$2);
                                            (next$2 = head$2) && (head$2 != null && typeof head$2 === 'object') && (head$2.__prev = node);
                                            root$3.__head = root$3.__next = head$2 = node;
                                            head$2.__next = next$2;
                                            head$2.__prev = void 0;
                                        }
                                        if (tail$2 == null || node === tail$2) {
                                            root$3.__tail = root$3.__prev = tail$2 = prev$2 || node;
                                        }
                                        root$3 = head$2 = tail$2 = next$2 = prev$2 = void 0;
                                    }
                                }
                            }
                            if (depth >= boundLength) {
                                if (node != null && jsonParent != null) {
                                    if (boxed === true) {
                                        jsonParent[key] = node;
                                    } else {
                                        var val$2 = nodeValue;
                                        if (val$2 != null && typeof val$2 === 'object') {
                                            var src$2 = val$2, keys$2 = Object.keys(src$2), x$2, i$3 = -1, n$2 = keys$2.length;
                                            val$2 = Array.isArray(src$2) && new Array(src$2.length) || Object.create(null);
                                            while (++i$3 < n$2) {
                                                x$2 = keys$2[i$3];
                                                !(!(x$2[0] !== '_' || x$2[1] !== '_') || (x$2 === __SELF || x$2 === __PARENT || x$2 === __ROOT) || x$2[0] === '$') && (val$2[x$2] = src$2[x$2]);
                                            }
                                        }
                                        if (val$2 != null && typeof val$2 === 'object' && !Array.isArray(val$2)) {
                                            val$2[$TYPE] = LEAF;
                                        }
                                        jsonParent[key] = val$2;
                                    }
                                }
                            }
                            appendNullKey = false;
                            nodeParent = node;
                            break follow_path_5240;
                        }
                    } else if (depth < height) {
                        nodeParent = nodeParent;
                        jsonParent = jsonParent;
                        depth = depth + 1;
                        continue follow_path_5240;
                    }
                    nodeParent = node;
                    break follow_path_5240;
                } while (true);
            node = nodeParent;
            if (node != null || boxed === true) {
                if (nodeType === ERROR) {
                    if (nodeExpires !== 1) {
                        var root$4 = root, head$3 = root$4.__head, tail$3 = root$4.__tail, next$3 = node.__next, prev$3 = node.__prev;
                        if (node !== head$3) {
                            next$3 && (next$3 != null && typeof next$3 === 'object') && (next$3.__prev = prev$3);
                            prev$3 && (prev$3 != null && typeof prev$3 === 'object') && (prev$3.__next = next$3);
                            (next$3 = head$3) && (head$3 != null && typeof head$3 === 'object') && (head$3.__prev = node);
                            root$4.__head = root$4.__next = head$3 = node;
                            head$3.__next = next$3;
                            head$3.__prev = void 0;
                        }
                        if (tail$3 == null || node === tail$3) {
                            root$4.__tail = root$4.__prev = tail$3 = prev$3 || node;
                        }
                        root$4 = head$3 = tail$3 = next$3 = prev$3 = void 0;
                    }
                    var pbv = Object.create(null);
                    var src$3 = requestedPath, i$4 = -1, n$3 = src$3.length, req = new Array(n$3);
                    while (++i$4 < n$3) {
                        req[i$4] = src$3[i$4];
                    }
                    if (appendNullKey === true) {
                        req[req.length] = null;
                    }
                    pbv.path = req;
                    if (boxed === true) {
                        pbv.value = node;
                    } else {
                        var dest = nodeValue, src$4 = dest, x$3;
                        if (dest != null && typeof dest === 'object') {
                            dest = Array.isArray(src$4) && [] || Object.create(null);
                            for (x$3 in src$4) {
                                !(!(x$3[0] !== '_' || x$3[1] !== '_') || (x$3 === __SELF || x$3 === __PARENT || x$3 === __ROOT) || x$3[0] === '$') && (dest[x$3] = src$4[x$3]);
                            }
                        }
                        pbv.value = dest;
                    }
                    errors[errors.length] = pbv;
                }
                hasValue || (hasValue = jsonParent != null);
                var src$5 = optimizedPath, i$5 = -1, n$4 = src$5.length, opt = new Array(n$4);
                while (++i$5 < n$4) {
                    opt[i$5] = src$5[i$5];
                }
                var src$6 = requestedPath, i$6 = -1, n$5 = src$6.length, req$2 = new Array(n$5);
                while (++i$6 < n$5) {
                    req$2[i$6] = src$6[i$6];
                }
                if (appendNullKey === true) {
                    req$2[req$2.length] = null;
                }
                requestedPaths[requestedPaths.length] = req$2;
                optimizedPaths[optimizedPaths.length] = opt;
            }
            if (boxed === false && node == null || refreshing === true) {
                var src$7 = boundPath, i$7 = -1, n$6 = src$7.length, req$3 = new Array(n$6);
                while (++i$7 < n$6) {
                    req$3[i$7] = src$7[i$7];
                }
                var src$8 = optimizedPath, i$8 = -1, n$7 = src$8.length, opt$2 = new Array(n$7);
                while (++i$8 < n$7) {
                    opt$2[i$8] = src$8[i$8];
                }
                var reqLen = req$3.length - 1, optLen = opt$2.length - 1, i$9 = -1, n$8 = requestedPath.length, j$2 = depth, k = height, x$4;
                while (++i$9 < n$8) {
                    req$3[++reqLen] = path[i$9 + boundLength] != null && typeof path[i$9 + boundLength] === 'object' && [requestedPath[i$9]] || requestedPath[i$9];
                }
                i$9 = -1;
                n$8 = height - depth;
                while (++i$9 < n$8) {
                    x$4 = req$3[++reqLen] = path[++j$2 + boundLength];
                    x$4 != null && (opt$2[++optLen] = x$4);
                }
                req$3.pathSetIndex = index;
                requestedMissingPaths[requestedMissingPaths.length] = req$3;
                optimizedMissingPaths[optimizedMissingPaths.length] = opt$2;
            }
            appendNullKey = false;
            var key$3;
            depth = depth;
            unroll_5331:
                do {
                    if (depth < 0) {
                        depth = (path.depth = 0) - 1;
                        break unroll_5331;
                    }
                    if (!((key$3 = path[depth]) != null && typeof key$3 === 'object')) {
                        depth = path.depth = depth - 1;
                        continue unroll_5331;
                    }
                    if (Array.isArray(key$3)) {
                        if (++key$3.index === key$3.length) {
                            if (!((key$3 = key$3[key$3.index = 0]) != null && typeof key$3 === 'object')) {
                                depth = path.depth = depth - 1;
                                continue unroll_5331;
                            }
                        } else {
                            depth = path.depth = depth;
                            break unroll_5331;
                        }
                    }
                    if (++key$3[__OFFSET] > (key$3.to || (key$3.to = key$3.from + (key$3.length || 1) - 1))) {
                        key$3[__OFFSET] = key$3.from;
                        depth = path.depth = depth - 1;
                        continue unroll_5331;
                    }
                    depth = path.depth = depth;
                    break unroll_5331;
                } while (true);
            depth = depth;
        }
    }
    values && (values[0] = hasValue && { json: jsons[-1] } || undefined);
    return {
        'values': values,
        'errors': errors,
        'requestedPaths': requestedPaths,
        'optimizedPaths': optimizedPaths,
        'requestedMissingPaths': requestedMissingPaths,
        'optimizedMissingPaths': optimizedMissingPaths
    };
}
function getPathsAsValues(model, pathSets, values, errorSelector, boundPath) {
    Array.isArray(values) && (values.length = 0);
    var boundLength = 0, nodeRoot = model._cache || {}, nodeParent, node;
    if (Array.isArray(boundPath)) {
        nodeParent = nodeRoot;
        boundLength = boundPath.length;
    } else {
        nodeParent = getBoundValue(model);
        boundPath = model._path || [];
    }
    var root = model._root || model, boxed = model._boxed || false, expired = root.expired || (root.expired = []), refreshing = model._refreshing || false, appendNullKey = false;
    typeof errorSelector === 'function' || (errorSelector = model._errorSelector) || (errorSelector = function (x$4, y) {
        return y;
    });
    var nodes = pathSets.nodes || (pathSets.nodes = []);
    var errors = pathSets.errors || (pathSets.errors = []);
    var refs = pathSets.refs || (pathSets.refs = []);
    var depth = pathSets.depth || (pathSets.depth = 0);
    var refIndex = pathSets.refIndex || (pathSets.refIndex = 0);
    var refDepth = pathSets.refDepth || (pathSets.refDepth = 0);
    var requestedPath = pathSets.requestedPath || (pathSets.requestedPath = []);
    var optimizedPath = pathSets.optimizedPath || (pathSets.optimizedPath = []);
    var requestedPaths = pathSets.requestedPaths || (pathSets.requestedPaths = []);
    var optimizedPaths = pathSets.optimizedPaths || (pathSets.optimizedPaths = []);
    var requestedMissingPaths = pathSets.requestedMissingPaths || (pathSets.requestedMissingPaths = []);
    var optimizedMissingPaths = pathSets.optimizedMissingPaths || (pathSets.optimizedMissingPaths = []);
    var path, length = 0, height = 0, reference, refLength = 0, refHeight = 0, nodeType, nodeValue, nodeSize, nodeTimestamp, nodeExpires;
    refs[-1] = boundPath;
    nodes[-1] = nodeParent;
    var index = -1, count = pathSets.length;
    while (++index < count) {
        path = pathSets[index];
        depth = 0;
        length = path.length;
        height = length - 1;
        var ref;
        refs.length = 0;
        while (depth > -1) {
            refIndex = depth;
            while (--refIndex >= -1) {
                if (!!(ref = refs[refIndex])) {
                    refLength = ref.length;
                    var i = -1, j = 0;
                    while (++i < refLength) {
                        optimizedPath[j++] = ref[i];
                    }
                    i = ++refIndex;
                    while (i < depth) {
                        optimizedPath[j++] = requestedPath[i++];
                    }
                    optimizedPath.length = j;
                    break;
                }
            }
            var key, isKeySet;
            path = path;
            height = (length = path.length) - 1;
            nodeParent = node = nodes[depth - 1];
            depth = depth;
            follow_path_6815:
                do {
                    key = path[depth];
                    if (isKeySet = key != null && typeof key === 'object') {
                        if (Array.isArray(key)) {
                            if ((key = key[key.index || (key.index = 0)]) != null && typeof key === 'object') {
                                key = key[__OFFSET] === void 0 && (key[__OFFSET] = key.from || (key.from = 0)) || key[__OFFSET];
                            }
                        } else {
                            key = key[__OFFSET] === void 0 && (key[__OFFSET] = key.from || (key.from = 0)) || key[__OFFSET];
                        }
                    }
                    if (key === __NULL) {
                        key = null;
                    }
                    depth >= boundLength && (requestedPath[requestedPath.length = depth] = key);
                    if (key != null) {
                        if (depth < height) {
                            optimizedPath[optimizedPath.length = depth + (refLength - refIndex)] = key;
                            node = nodeParent[key];
                            nodeType = node && node[$TYPE] || void 0;
                            nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                            nodeTimestamp = node && node[$TIMESTAMP];
                            nodeExpires = node && node[$EXPIRES];
                            if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                            }
                            if ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                                do {
                                    if (nodeExpires !== 1) {
                                        var root$2 = root, head = root$2.__head, tail = root$2.__tail, next = node.__next, prev = node.__prev;
                                        if (node !== head) {
                                            next && (next != null && typeof next === 'object') && (next.__prev = prev);
                                            prev && (prev != null && typeof prev === 'object') && (prev.__next = next);
                                            (next = head) && (head != null && typeof head === 'object') && (head.__prev = node);
                                            root$2.__head = root$2.__next = head = node;
                                            head.__next = next;
                                            head.__prev = void 0;
                                        }
                                        if (tail == null || node === tail) {
                                            root$2.__tail = root$2.__prev = tail = prev || node;
                                        }
                                        root$2 = head = tail = next = prev = void 0;
                                    }
                                    refs[depth] = nodeValue;
                                    refIndex = depth + 1;
                                    refDepth = 0;
                                    var key$2, isKeySet$2;
                                    reference = nodeValue;
                                    refHeight = (refLength = reference.length) - 1;
                                    nodeParent = nodeRoot;
                                    refDepth = refDepth;
                                    follow_path_7052:
                                        do {
                                            key$2 = reference[refDepth];
                                            isKeySet$2 = false;
                                            if (key$2 != null) {
                                                if (refDepth < refHeight) {
                                                    optimizedPath[optimizedPath.length = refDepth] = key$2;
                                                    node = nodeParent[key$2];
                                                    nodeType = node && node[$TYPE] || void 0;
                                                    nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                                    nodeTimestamp = node && node[$TIMESTAMP];
                                                    nodeExpires = node && node[$EXPIRES];
                                                    if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                                        node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                                    }
                                                    if (appendNullKey = node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue)) {
                                                        nodeParent = node;
                                                        break follow_path_7052;
                                                    }
                                                    nodeParent = node;
                                                    refDepth = refDepth + 1;
                                                    continue follow_path_7052;
                                                } else if (refDepth === refHeight) {
                                                    optimizedPath[optimizedPath.length = refDepth] = key$2;
                                                    node = nodeParent[key$2];
                                                    nodeType = node && node[$TYPE] || void 0;
                                                    nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                                    nodeTimestamp = node && node[$TIMESTAMP];
                                                    nodeExpires = node && node[$EXPIRES];
                                                    if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                                        node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                                    }
                                                    appendNullKey = node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue);
                                                    nodeParent = node;
                                                    break follow_path_7052;
                                                }
                                            } else if (refDepth < refHeight) {
                                                nodeParent = node;
                                                refDepth = refDepth + 1;
                                                continue follow_path_7052;
                                            }
                                            nodeParent = node;
                                            break follow_path_7052;
                                        } while (true);
                                    node = nodeParent;
                                } while ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue));
                                if (node == null) {
                                    while (refDepth <= refHeight) {
                                        optimizedPath[refDepth] = reference[refDepth++];
                                    }
                                }
                            }
                            if (node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue)) {
                                nodeParent = node;
                                break follow_path_6815;
                            }
                            nodeParent = nodes[depth] = node;
                            depth = depth + 1;
                            continue follow_path_6815;
                        } else if (depth === height) {
                            optimizedPath[optimizedPath.length = depth + (refLength - refIndex)] = key;
                            node = nodeParent[key];
                            nodeType = node && node[$TYPE] || void 0;
                            nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                            nodeTimestamp = node && node[$TIMESTAMP];
                            nodeExpires = node && node[$EXPIRES];
                            if (node != null && typeof node === 'object') {
                                if (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true) {
                                    node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                } else {
                                    if (nodeExpires !== 1) {
                                        var root$3 = root, head$2 = root$3.__head, tail$2 = root$3.__tail, next$2 = node.__next, prev$2 = node.__prev;
                                        if (node !== head$2) {
                                            next$2 && (next$2 != null && typeof next$2 === 'object') && (next$2.__prev = prev$2);
                                            prev$2 && (prev$2 != null && typeof prev$2 === 'object') && (prev$2.__next = next$2);
                                            (next$2 = head$2) && (head$2 != null && typeof head$2 === 'object') && (head$2.__prev = node);
                                            root$3.__head = root$3.__next = head$2 = node;
                                            head$2.__next = next$2;
                                            head$2.__prev = void 0;
                                        }
                                        if (tail$2 == null || node === tail$2) {
                                            root$3.__tail = root$3.__prev = tail$2 = prev$2 || node;
                                        }
                                        root$3 = head$2 = tail$2 = next$2 = prev$2 = void 0;
                                    }
                                }
                            }
                            appendNullKey = false;
                            nodeParent = node;
                            break follow_path_6815;
                        }
                    } else if (depth < height) {
                        nodeParent = nodeParent;
                        depth = depth + 1;
                        continue follow_path_6815;
                    }
                    nodeParent = node;
                    break follow_path_6815;
                } while (true);
            node = nodeParent;
            if (node != null || boxed === true) {
                if (nodeType === ERROR) {
                    if (nodeExpires !== 1) {
                        var root$4 = root, head$3 = root$4.__head, tail$3 = root$4.__tail, next$3 = node.__next, prev$3 = node.__prev;
                        if (node !== head$3) {
                            next$3 && (next$3 != null && typeof next$3 === 'object') && (next$3.__prev = prev$3);
                            prev$3 && (prev$3 != null && typeof prev$3 === 'object') && (prev$3.__next = next$3);
                            (next$3 = head$3) && (head$3 != null && typeof head$3 === 'object') && (head$3.__prev = node);
                            root$4.__head = root$4.__next = head$3 = node;
                            head$3.__next = next$3;
                            head$3.__prev = void 0;
                        }
                        if (tail$3 == null || node === tail$3) {
                            root$4.__tail = root$4.__prev = tail$3 = prev$3 || node;
                        }
                        root$4 = head$3 = tail$3 = next$3 = prev$3 = void 0;
                    }
                    var pbv = Object.create(null);
                    var src = requestedPath, i$2 = -1, n = src.length, req = new Array(n);
                    while (++i$2 < n) {
                        req[i$2] = src[i$2];
                    }
                    if (appendNullKey === true) {
                        req[req.length] = null;
                    }
                    pbv.path = req;
                    if (boxed === true) {
                        pbv.value = node;
                    } else {
                        var dest = nodeValue, src$2 = dest, x;
                        if (dest != null && typeof dest === 'object') {
                            dest = Array.isArray(src$2) && [] || Object.create(null);
                            for (x in src$2) {
                                !(!(x[0] !== '_' || x[1] !== '_') || (x === __SELF || x === __PARENT || x === __ROOT) || x[0] === '$') && (dest[x] = src$2[x]);
                            }
                        }
                        pbv.value = dest;
                    }
                    errors[errors.length] = pbv;
                }
                var src$3 = optimizedPath, i$3 = -1, n$2 = src$3.length, opt = new Array(n$2);
                while (++i$3 < n$2) {
                    opt[i$3] = src$3[i$3];
                }
                var src$4 = requestedPath, i$4 = -1, n$3 = src$4.length, req$2 = new Array(n$3);
                while (++i$4 < n$3) {
                    req$2[i$4] = src$4[i$4];
                }
                if (appendNullKey === true) {
                    req$2[req$2.length] = null;
                }
                requestedPaths[requestedPaths.length] = req$2;
                optimizedPaths[optimizedPaths.length] = opt;
                var pbv$2 = Object.create(null);
                var src$5 = requestedPath, i$5 = -1, n$4 = src$5.length, req$3 = new Array(n$4);
                while (++i$5 < n$4) {
                    req$3[i$5] = src$5[i$5];
                }
                if (appendNullKey === true) {
                    req$3[req$3.length] = null;
                }
                pbv$2.path = req$3;
                if (boxed === true) {
                    pbv$2.value = node;
                } else {
                    var dest$2 = nodeValue, src$6 = dest$2, x$2;
                    if (dest$2 != null && typeof dest$2 === 'object') {
                        dest$2 = Array.isArray(src$6) && [] || Object.create(null);
                        for (x$2 in src$6) {
                            !(!(x$2[0] !== '_' || x$2[1] !== '_') || (x$2 === __SELF || x$2 === __PARENT || x$2 === __ROOT) || x$2[0] === '$') && (dest$2[x$2] = src$6[x$2]);
                        }
                    }
                    pbv$2.value = dest$2;
                }
                typeof values === 'function' && (values(pbv$2) || true) || Array.isArray(values) && (values[values.length] = pbv$2);
            }
            if (boxed === false && node == null || refreshing === true) {
                var src$7 = boundPath, i$6 = -1, n$5 = src$7.length, req$4 = new Array(n$5);
                while (++i$6 < n$5) {
                    req$4[i$6] = src$7[i$6];
                }
                var src$8 = optimizedPath, i$7 = -1, n$6 = src$8.length, opt$2 = new Array(n$6);
                while (++i$7 < n$6) {
                    opt$2[i$7] = src$8[i$7];
                }
                var reqLen = req$4.length - 1, optLen = opt$2.length - 1, i$8 = -1, n$7 = requestedPath.length, j$2 = depth, k = height, x$3;
                while (++i$8 < n$7) {
                    req$4[++reqLen] = path[i$8 + boundLength] != null && typeof path[i$8 + boundLength] === 'object' && [requestedPath[i$8]] || requestedPath[i$8];
                }
                i$8 = -1;
                n$7 = height - depth;
                while (++i$8 < n$7) {
                    x$3 = req$4[++reqLen] = path[++j$2 + boundLength];
                    x$3 != null && (opt$2[++optLen] = x$3);
                }
                req$4.pathSetIndex = index;
                requestedMissingPaths[requestedMissingPaths.length] = req$4;
                optimizedMissingPaths[optimizedMissingPaths.length] = opt$2;
            }
            appendNullKey = false;
            var key$3;
            depth = depth;
            unroll_6906:
                do {
                    if (depth < 0) {
                        depth = (path.depth = 0) - 1;
                        break unroll_6906;
                    }
                    if (!((key$3 = path[depth]) != null && typeof key$3 === 'object')) {
                        depth = path.depth = depth - 1;
                        continue unroll_6906;
                    }
                    if (Array.isArray(key$3)) {
                        if (++key$3.index === key$3.length) {
                            if (!((key$3 = key$3[key$3.index = 0]) != null && typeof key$3 === 'object')) {
                                depth = path.depth = depth - 1;
                                continue unroll_6906;
                            }
                        } else {
                            depth = path.depth = depth;
                            break unroll_6906;
                        }
                    }
                    if (++key$3[__OFFSET] > (key$3.to || (key$3.to = key$3.from + (key$3.length || 1) - 1))) {
                        key$3[__OFFSET] = key$3.from;
                        depth = path.depth = depth - 1;
                        continue unroll_6906;
                    }
                    depth = path.depth = depth;
                    break unroll_6906;
                } while (true);
            depth = depth;
        }
    }
    return {
        'values': values,
        'errors': errors,
        'requestedPaths': requestedPaths,
        'optimizedPaths': optimizedPaths,
        'requestedMissingPaths': requestedMissingPaths,
        'optimizedMissingPaths': optimizedMissingPaths
    };
}
function getValueSync(model, path) {
    var root = model._root || model, boxed = model._boxed || false, expired = root.expired || (root.expired = []), _cache = model._cache || {}, errorSelector = model._errorSelector || function (x$2, y) {
        return y;
    }, optimizedPath = [], depth = 0, length = 0, height = 0, reference, refIndex = 0, refDepth = 0, refLength = 0, refHeight = 0, nodeRoot = _cache, nodeParent = nodeRoot, node = nodeParent, nodeType, nodeValue, nodeSize, nodeTimestamp, nodeExpires;
    var key, isKeySet;
    path = path;
    length = (height = path.length) - 1;
    nodeParent = nodeRoot;
    depth = depth;
    follow_path_8109:
        do {
            key = path[depth];
            if (isKeySet = key != null && typeof key === 'object') {
                if (Array.isArray(key)) {
                    if ((key = key[key.index || (key.index = 0)]) != null && typeof key === 'object') {
                        key = key[__OFFSET] === void 0 && (key[__OFFSET] = key.from || (key.from = 0)) || key[__OFFSET];
                    }
                } else {
                    key = key[__OFFSET] === void 0 && (key[__OFFSET] = key.from || (key.from = 0)) || key[__OFFSET];
                }
            }
            if (key === __NULL) {
                key = null;
            }
            if (key != null) {
                if (depth < length) {
                    optimizedPath[optimizedPath.length = depth + (refLength - refIndex)] = key;
                    node = nodeParent[key];
                    nodeType = node && node[$TYPE] || void 0;
                    nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(optimizedPath, node) : node;
                    nodeTimestamp = node && node[$TIMESTAMP];
                    nodeExpires = node && node[$EXPIRES];
                    if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                        node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                    }
                    if ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                        do {
                            if (nodeExpires !== 1) {
                                var root$2 = root, head = root$2.__head, tail = root$2.__tail, next = node.__next, prev = node.__prev;
                                if (node !== head) {
                                    next && (next != null && typeof next === 'object') && (next.__prev = prev);
                                    prev && (prev != null && typeof prev === 'object') && (prev.__next = next);
                                    (next = head) && (head != null && typeof head === 'object') && (head.__prev = node);
                                    root$2.__head = root$2.__next = head = node;
                                    head.__next = next;
                                    head.__prev = void 0;
                                }
                                if (tail == null || node === tail) {
                                    root$2.__tail = root$2.__prev = tail = prev || node;
                                }
                                root$2 = head = tail = next = prev = void 0;
                            }
                            refIndex = depth + 1;
                            refDepth = 0;
                            var key$2, isKeySet$2;
                            reference = nodeValue;
                            refHeight = (refLength = reference.length) - 1;
                            nodeParent = nodeRoot;
                            refDepth = refDepth;
                            follow_path_8252:
                                do {
                                    key$2 = reference[refDepth];
                                    isKeySet$2 = false;
                                    if (key$2 != null) {
                                        if (refDepth < refHeight) {
                                            optimizedPath[optimizedPath.length = refDepth] = key$2;
                                            node = nodeParent[key$2];
                                            nodeType = node && node[$TYPE] || void 0;
                                            nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(optimizedPath, node) : node;
                                            nodeTimestamp = node && node[$TIMESTAMP];
                                            nodeExpires = node && node[$EXPIRES];
                                            if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                                node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                            }
                                            if (node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue)) {
                                                nodeParent = node;
                                                break follow_path_8252;
                                            }
                                            nodeParent = node;
                                            refDepth = refDepth + 1;
                                            continue follow_path_8252;
                                        } else if (refDepth === refHeight) {
                                            optimizedPath[optimizedPath.length = refDepth] = key$2;
                                            node = nodeParent[key$2];
                                            nodeType = node && node[$TYPE] || void 0;
                                            nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(optimizedPath, node) : node;
                                            nodeTimestamp = node && node[$TIMESTAMP];
                                            nodeExpires = node && node[$EXPIRES];
                                            if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                                node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                            }
                                            nodeParent = node;
                                            break follow_path_8252;
                                        }
                                    } else if (refDepth < refHeight) {
                                        nodeParent = node;
                                        refDepth = refDepth + 1;
                                        continue follow_path_8252;
                                    }
                                    nodeParent = node;
                                    break follow_path_8252;
                                } while (true);
                            node = nodeParent;
                        } while ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue));
                        if (node == null) {
                            while (refDepth <= refHeight) {
                                optimizedPath[refDepth] = reference[refDepth++];
                            }
                        }
                    }
                    if (node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue)) {
                        nodeParent = node;
                        break follow_path_8109;
                    }
                    nodeParent = node;
                    depth = depth + 1;
                    continue follow_path_8109;
                } else if (depth === length) {
                    optimizedPath[optimizedPath.length = depth + (refLength - refIndex)] = key;
                    node = nodeParent[key];
                    nodeType = node && node[$TYPE] || void 0;
                    nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(optimizedPath, node) : node;
                    nodeTimestamp = node && node[$TIMESTAMP];
                    nodeExpires = node && node[$EXPIRES];
                    if (node != null && typeof node === 'object') {
                        if (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true) {
                            node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                        } else {
                            if (nodeExpires !== 1) {
                                var root$3 = root, head$2 = root$3.__head, tail$2 = root$3.__tail, next$2 = node.__next, prev$2 = node.__prev;
                                if (node !== head$2) {
                                    next$2 && (next$2 != null && typeof next$2 === 'object') && (next$2.__prev = prev$2);
                                    prev$2 && (prev$2 != null && typeof prev$2 === 'object') && (prev$2.__next = next$2);
                                    (next$2 = head$2) && (head$2 != null && typeof head$2 === 'object') && (head$2.__prev = node);
                                    root$3.__head = root$3.__next = head$2 = node;
                                    head$2.__next = next$2;
                                    head$2.__prev = void 0;
                                }
                                if (tail$2 == null || node === tail$2) {
                                    root$3.__tail = root$3.__prev = tail$2 = prev$2 || node;
                                }
                                root$3 = head$2 = tail$2 = next$2 = prev$2 = void 0;
                            }
                        }
                    }
                    nodeParent = node;
                    break follow_path_8109;
                }
            } else if (depth < length) {
                nodeParent = node;
                depth = depth + 1;
                continue follow_path_8109;
            }
            nodeParent = node;
            break follow_path_8109;
        } while (true);
    node = nodeParent;
    optimizedPath.length = depth + (refLength - refIndex) + 1;
    if (boxed === false) {
        var dest = nodeValue, src = dest, x;
        if (dest != null && typeof dest === 'object') {
            dest = Array.isArray(src) && [] || Object.create(null);
            for (x in src) {
                !(!(x[0] !== '_' || x[1] !== '_') || (x === __SELF || x === __PARENT || x === __ROOT) || x[0] === '$') && (dest[x] = src[x]);
            }
        }
        node = dest;
    }
    return {
        path: optimizedPath,
        value: node
    };
}
function setJSONGsAsJSON(model, envelopes, values, errorSelector, boundPath) {
    var boundLength = 0, nodeRoot = model._cache || {}, nodeParent, node;
    if (Array.isArray(boundPath)) {
        nodeParent = nodeRoot;
        boundLength = boundPath.length;
    } else {
        nodeParent = getBoundValue(model);
        boundPath = model._path || [];
    }
    var root = model._root || model, boxed = model._boxed || false, expired = root.expired || (root.expired = []), refreshing = model._refreshing || false, appendNullKey = false;
    typeof errorSelector === 'function' || (errorSelector = model._errorSelector) || (errorSelector = function (x$4, y) {
        return y;
    });
    var jsonKeys = envelopes.jsonKeys || (envelopes.jsonKeys = []);
    var nodes = envelopes.nodes || (envelopes.nodes = []);
    var messages = envelopes.messages || (envelopes.messages = []);
    var jsons = envelopes.jsons || (envelopes.jsons = []);
    var errors = envelopes.errors || (envelopes.errors = []);
    var refs = envelopes.refs || (envelopes.refs = []);
    var depth = envelopes.depth || (envelopes.depth = 0);
    var refIndex = envelopes.refIndex || (envelopes.refIndex = 0);
    var refDepth = envelopes.refDepth || (envelopes.refDepth = 0);
    var requestedPath = envelopes.requestedPath || (envelopes.requestedPath = []);
    var optimizedPath = envelopes.optimizedPath || (envelopes.optimizedPath = []);
    var requestedPaths = envelopes.requestedPaths || (envelopes.requestedPaths = []);
    var optimizedPaths = envelopes.optimizedPaths || (envelopes.optimizedPaths = []);
    var requestedMissingPaths = envelopes.requestedMissingPaths || (envelopes.requestedMissingPaths = []);
    var optimizedMissingPaths = envelopes.optimizedMissingPaths || (envelopes.optimizedMissingPaths = []);
    var hasValue = envelopes.hasValue || (envelopes.hasValue = false);
    var jsonRoot = envelopes.jsonRoot || (envelopes.jsonRoot = values && values[0]);
    var jsonParent = envelopes.jsonParent || (envelopes.jsonParent = jsonRoot);
    var jsonNode = envelopes.jsonNode || (envelopes.jsonNode = jsonParent);
    var path, length = 0, height = 0, reference, refLength = 0, refHeight = 0, jsonValueOffset = 0, messageRoot, messageParent, message, nodeType, nodeValue, nodeSize, nodeTimestamp, nodeExpires, messageType, messageValue, messageSize, messageTimestamp, messageExpires;
    refs[-1] = boundPath;
    nodes[-1] = nodeParent;
    jsons[-1] = jsonParent;
    jsons[-2] = jsons;
    jsonKeys[-1] = -1;
    var envelope, pathSets, index = -1, count = envelopes.length;
    while (++index < count) {
        envelope = envelopes[index];
        pathSets = envelope.paths;
        messages[-1] = messageRoot = envelope.jsong || envelope.values || envelope.value || Object.create(null);
        var index$2 = -1, count$2 = pathSets.length;
        while (++index$2 < count$2) {
            path = pathSets[index$2];
            hasValue = false;
            jsons.length = 0;
            jsons[-1] = jsonRoot = values && values[jsonValueOffset + index$2] || void 0;
            jsonKeys.length = 0;
            jsonKeys[-1] = -1;
            depth = 0;
            length = path.length;
            height = length - 1;
            var ref;
            refs.length = 0;
            while (depth > -1) {
                refIndex = depth;
                while (--refIndex >= -1) {
                    if (!!(ref = refs[refIndex])) {
                        refLength = ref.length;
                        var i = -1, j = 0;
                        while (++i < refLength) {
                            optimizedPath[j++] = ref[i];
                        }
                        i = ++refIndex;
                        while (i < depth) {
                            optimizedPath[j++] = requestedPath[i++];
                        }
                        optimizedPath.length = j;
                        break;
                    }
                }
                var key, isKeySet;
                path = path;
                height = (length = path.length) - 1;
                nodeParent = node = nodes[depth - 1];
                messageParent = message = messages[depth - 1];
                jsonParent = jsonNode = jsons[depth - 1];
                depth = depth;
                follow_path_10463:
                    do {
                        key = path[depth];
                        if (isKeySet = key != null && typeof key === 'object') {
                            if (Array.isArray(key)) {
                                if ((key = key[key.index || (key.index = 0)]) != null && typeof key === 'object') {
                                    key = key[__OFFSET] === void 0 && (key[__OFFSET] = key.from || (key.from = 0)) || key[__OFFSET];
                                }
                            } else {
                                key = key[__OFFSET] === void 0 && (key[__OFFSET] = key.from || (key.from = 0)) || key[__OFFSET];
                            }
                        }
                        if (key === __NULL) {
                            key = null;
                        }
                        depth >= boundLength && (requestedPath[requestedPath.length = depth] = key);
                        if (key != null) {
                            if (depth < height) {
                                optimizedPath[optimizedPath.length = depth + (refLength - refIndex)] = key;
                                node = nodeParent[key];
                                nodeType = node && node[$TYPE] || void 0;
                                nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                nodeTimestamp = node && node[$TIMESTAMP];
                                nodeExpires = node && node[$EXPIRES];
                                if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                    node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                }
                                message = messageParent[key];
                                messageType = message && message[$TYPE] || void 0;
                                messageValue = messageType === SENTINEL ? message[VALUE] : messageType === ERROR ? message = errorSelector(requestedPath, message) : message;
                                messageTimestamp = message && message[$TIMESTAMP];
                                messageExpires = message && message[$EXPIRES];
                                if (message != null && typeof message === 'object' && (messageExpires != null && messageExpires !== 1 && (messageExpires === 0 || messageExpires < Date.now()) || message[__INVALIDATED] === true)) {
                                    message = messageValue = (expired[expired.length] = message) && (message[__INVALIDATED] = true) && void 0;
                                }
                                node = node;
                                message = message;
                                merge_node_10708:
                                    do {
                                        if (node === message) {
                                            node = node;
                                            break merge_node_10708;
                                        }
                                        if (node != null) {
                                            if (message != null) {
                                                if ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                                                    if ((!messageType || messageType === SENTINEL) && Array.isArray(messageValue)) {
                                                        if ((messageTimestamp < nodeTimestamp || messageExpires === 0 && ((node = message) || true)) === false) {
                                                            message = message;
                                                            node = node;
                                                            nodeValue = nodeValue;
                                                            messageValue = messageValue;
                                                            replace_cache_reference_10879:
                                                                do {
                                                                    // compare the cache and message references.
                                                                    // if they're the same, break early so we don't insert.
                                                                    // if they're different, replace the cache reference.
                                                                    var i$2 = nodeValue.length;
                                                                    // If the reference lengths are equal, we have to check their keys
                                                                    // for equality.
                                                                    // If their lengths aren't the equal, the references aren't equal.
                                                                    // Insert the reference from the message.
                                                                    if (i$2 === messageValue.length) {
                                                                        while (--i$2 > -1) {
                                                                            // If any of their keys are different, replace the reference
                                                                            // in the cache with the reference in the message.
                                                                            if (nodeValue[i$2] !== messageValue[i$2]) {
                                                                                message = message;
                                                                                break replace_cache_reference_10879;
                                                                            }
                                                                        }
                                                                        if (i$2 === -1) {
                                                                            message = node;
                                                                            break replace_cache_reference_10879;
                                                                        }
                                                                    }
                                                                    message = message;
                                                                    break replace_cache_reference_10879;
                                                                } while (true);
                                                            message = message;
                                                        }
                                                    }
                                                }
                                                if (node === message || !nodeType && (node != null && typeof node === 'object') && !Array.isArray(nodeValue) && (!messageType && (message != null && typeof message === 'object') && !Array.isArray(messageValue))) {
                                                    node = node;
                                                    break merge_node_10708;
                                                }
                                            } else if (!nodeType && (node != null && typeof node === 'object') || (!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                                                node = message = node;
                                                break merge_node_10708;
                                            }
                                        }
                                        if (message == null || messageType !== void 0 || typeof message !== 'object' || Array.isArray(messageValue)) {
                                            message = message;
                                            if ((!messageType || messageType === SENTINEL) && Array.isArray(messageValue)) {
                                                messageType = 'array';
                                                message[$SIZE] = messageSize = (messageType === SENTINEL && 50 || 0) + (messageValue.length || 1);
                                                delete messageValue[$SIZE];
                                                messageValue[__CONTAINER] = message;
                                            } else if (messageType === SENTINEL) {
                                                message[$SIZE] = messageSize = 50 + (typeof messageValue === 'string' && messageValue.length || 1);
                                            } else if (messageType === ERROR) {
                                                message[$SIZE] = messageSize = 50 + (message[$SIZE] || 0 || 1);
                                            } else if (!(message != null && typeof message === 'object')) {
                                                messageSize = 50 + (typeof messageValue === 'string' && messageValue.length || 1);
                                                messageType = 'sentinel';
                                                message = { 'value': messageValue };
                                                message[$TYPE] = messageType;
                                                message[$SIZE] = messageSize;
                                            } else {
                                                messageType = message[$TYPE] = messageType || 'leaf';
                                                message[$SIZE] = messageSize = message[$SIZE] || 0 || 50 + 1;
                                            }
                                            ;
                                        }
                                        if (node != null && node !== message) {
                                            var nodeRefsLength = node.__refsLength || 0, destRefsLength = message.__refsLength || 0, i$3 = -1, ref$2;
                                            while (++i$3 < nodeRefsLength) {
                                                if ((ref$2 = node[__REF + i$3]) !== void 0) {
                                                    ref$2[__CONTEXT] = message;
                                                    message[__REF + (destRefsLength + i$3)] = ref$2;
                                                    node[__REF + i$3] = void 0;
                                                }
                                            }
                                            message[__REFS_LENGTH] = nodeRefsLength + destRefsLength;
                                            node[__REFS_LENGTH] = ref$2 = void 0;
                                            if (node != null && typeof node === 'object') {
                                                var root$2 = root, head = root$2.__head, tail = root$2.__tail, next, prev;
                                                (next = node.__next) && (next != null && typeof next === 'object') && (next.__prev = prev);
                                                (prev = node.__prev) && (prev != null && typeof prev === 'object') && (prev.__next = next);
                                                node === head && (root$2.__head = root$2.__next = head = next);
                                                node === tail && (root$2.__tail = root$2.__prev = tail = prev);
                                                node.__next = node.__prev = void 0;
                                                head = tail = next = prev = void 0;
                                            }
                                        }
                                        nodeParent[key] = node = message;
                                        nodeType = node && node[$TYPE] || void 0;
                                        nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                        nodeTimestamp = node && node[$TIMESTAMP];
                                        nodeExpires = node && node[$EXPIRES];
                                        node = node;
                                        break merge_node_10708;
                                    } while (true);
                                node = node;
                                node != null && (node = !node[__SELF] && ((node[__SELF] = node) || true) && ((node[__KEY] = key) || true) && ((node[__PARENT] = nodeParent) || true) && ((node[__ROOT] = nodeRoot) || true) && (node[__GENERATION] || (node[__GENERATION] = 0) || node) && ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue) && (nodeValue[__CONTAINER] = node)) || node);
                                if (depth >= boundLength) {
                                    jsonKeys[depth] = isKeySet ? key : void 0;
                                    if (node != null && jsonParent != null && isKeySet && (!(jsonNode = jsonParent[key]) || !(jsonNode != null && typeof jsonNode === 'object'))) {
                                        jsonNode = jsonParent[key] = Object.create(null);
                                    }
                                } else {
                                    jsonKeys[depth] = void 0;
                                }
                                if ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                                    do {
                                        if (nodeExpires !== 1) {
                                            var root$3 = root, head$2 = root$3.__head, tail$2 = root$3.__tail, next$2 = node.__next, prev$2 = node.__prev;
                                            if (node !== head$2) {
                                                next$2 && (next$2 != null && typeof next$2 === 'object') && (next$2.__prev = prev$2);
                                                prev$2 && (prev$2 != null && typeof prev$2 === 'object') && (prev$2.__next = next$2);
                                                (next$2 = head$2) && (head$2 != null && typeof head$2 === 'object') && (head$2.__prev = node);
                                                root$3.__head = root$3.__next = head$2 = node;
                                                head$2.__next = next$2;
                                                head$2.__prev = void 0;
                                            }
                                            if (tail$2 == null || node === tail$2) {
                                                root$3.__tail = root$3.__prev = tail$2 = prev$2 || node;
                                            }
                                            root$3 = head$2 = tail$2 = next$2 = prev$2 = void 0;
                                        }
                                        refs[depth] = nodeValue;
                                        refIndex = depth + 1;
                                        refDepth = 0;
                                        var key$2, isKeySet$2;
                                        reference = nodeValue;
                                        refHeight = (refLength = reference.length) - 1;
                                        nodeParent = nodeRoot;
                                        messageParent = messageRoot;
                                        jsonParent = jsonRoot;
                                        refDepth = refDepth;
                                        follow_path_11062:
                                            do {
                                                key$2 = reference[refDepth];
                                                isKeySet$2 = false;
                                                if (key$2 != null) {
                                                    if (refDepth < refHeight) {
                                                        optimizedPath[optimizedPath.length = refDepth] = key$2;
                                                        node = nodeParent[key$2];
                                                        nodeType = node && node[$TYPE] || void 0;
                                                        nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                                        nodeTimestamp = node && node[$TIMESTAMP];
                                                        nodeExpires = node && node[$EXPIRES];
                                                        if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                                            node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                                        }
                                                        message = messageParent[key$2];
                                                        messageType = message && message[$TYPE] || void 0;
                                                        messageValue = messageType === SENTINEL ? message[VALUE] : messageType === ERROR ? message = errorSelector(requestedPath, message) : message;
                                                        messageTimestamp = message && message[$TIMESTAMP];
                                                        messageExpires = message && message[$EXPIRES];
                                                        if (message != null && typeof message === 'object' && (messageExpires != null && messageExpires !== 1 && (messageExpires === 0 || messageExpires < Date.now()) || message[__INVALIDATED] === true)) {
                                                            message = messageValue = (expired[expired.length] = message) && (message[__INVALIDATED] = true) && void 0;
                                                        }
                                                        node = node;
                                                        message = message;
                                                        merge_node_11206:
                                                            do {
                                                                if (node === message) {
                                                                    node = node;
                                                                    break merge_node_11206;
                                                                }
                                                                if (node != null) {
                                                                    if (message != null) {
                                                                        if ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                                                                            if ((!messageType || messageType === SENTINEL) && Array.isArray(messageValue)) {
                                                                                if ((messageTimestamp < nodeTimestamp || messageExpires === 0 && ((node = message) || true)) === false) {
                                                                                    message = message;
                                                                                    node = node;
                                                                                    nodeValue = nodeValue;
                                                                                    messageValue = messageValue;
                                                                                    replace_cache_reference_11376:
                                                                                        do {
                                                                                            // compare the cache and message references.
                                                                                            // if they're the same, break early so we don't insert.
                                                                                            // if they're different, replace the cache reference.
                                                                                            var i$4 = nodeValue.length;
                                                                                            // If the reference lengths are equal, we have to check their keys
                                                                                            // for equality.
                                                                                            // If their lengths aren't the equal, the references aren't equal.
                                                                                            // Insert the reference from the message.
                                                                                            if (i$4 === messageValue.length) {
                                                                                                while (--i$4 > -1) {
                                                                                                    // If any of their keys are different, replace the reference
                                                                                                    // in the cache with the reference in the message.
                                                                                                    if (nodeValue[i$4] !== messageValue[i$4]) {
                                                                                                        message = message;
                                                                                                        break replace_cache_reference_11376;
                                                                                                    }
                                                                                                }
                                                                                                if (i$4 === -1) {
                                                                                                    message = node;
                                                                                                    break replace_cache_reference_11376;
                                                                                                }
                                                                                            }
                                                                                            message = message;
                                                                                            break replace_cache_reference_11376;
                                                                                        } while (true);
                                                                                    message = message;
                                                                                }
                                                                            }
                                                                        }
                                                                        if (node === message || !nodeType && (node != null && typeof node === 'object') && !Array.isArray(nodeValue) && (!messageType && (message != null && typeof message === 'object') && !Array.isArray(messageValue))) {
                                                                            node = node;
                                                                            break merge_node_11206;
                                                                        }
                                                                    } else if (!nodeType && (node != null && typeof node === 'object') || (!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                                                                        node = message = node;
                                                                        break merge_node_11206;
                                                                    }
                                                                }
                                                                if (message == null || messageType !== void 0 || typeof message !== 'object' || Array.isArray(messageValue)) {
                                                                    message = message;
                                                                    if ((!messageType || messageType === SENTINEL) && Array.isArray(messageValue)) {
                                                                        messageType = 'array';
                                                                        message[$SIZE] = messageSize = (messageType === SENTINEL && 50 || 0) + (messageValue.length || 1);
                                                                        delete messageValue[$SIZE];
                                                                        messageValue[__CONTAINER] = message;
                                                                    } else if (messageType === SENTINEL) {
                                                                        message[$SIZE] = messageSize = 50 + (typeof messageValue === 'string' && messageValue.length || 1);
                                                                    } else if (messageType === ERROR) {
                                                                        message[$SIZE] = messageSize = 50 + (message[$SIZE] || 0 || 1);
                                                                    } else if (!(message != null && typeof message === 'object')) {
                                                                        messageSize = 50 + (typeof messageValue === 'string' && messageValue.length || 1);
                                                                        messageType = 'sentinel';
                                                                        message = { 'value': messageValue };
                                                                        message[$TYPE] = messageType;
                                                                        message[$SIZE] = messageSize;
                                                                    } else {
                                                                        messageType = message[$TYPE] = messageType || 'leaf';
                                                                        message[$SIZE] = messageSize = message[$SIZE] || 0 || 50 + 1;
                                                                    }
                                                                    ;
                                                                }
                                                                if (node != null && node !== message) {
                                                                    var nodeRefsLength$2 = node.__refsLength || 0, destRefsLength$2 = message.__refsLength || 0, i$5 = -1, ref$3;
                                                                    while (++i$5 < nodeRefsLength$2) {
                                                                        if ((ref$3 = node[__REF + i$5]) !== void 0) {
                                                                            ref$3[__CONTEXT] = message;
                                                                            message[__REF + (destRefsLength$2 + i$5)] = ref$3;
                                                                            node[__REF + i$5] = void 0;
                                                                        }
                                                                    }
                                                                    message[__REFS_LENGTH] = nodeRefsLength$2 + destRefsLength$2;
                                                                    node[__REFS_LENGTH] = ref$3 = void 0;
                                                                    if (node != null && typeof node === 'object') {
                                                                        var root$4 = root, head$3 = root$4.__head, tail$3 = root$4.__tail, next$3, prev$3;
                                                                        (next$3 = node.__next) && (next$3 != null && typeof next$3 === 'object') && (next$3.__prev = prev$3);
                                                                        (prev$3 = node.__prev) && (prev$3 != null && typeof prev$3 === 'object') && (prev$3.__next = next$3);
                                                                        node === head$3 && (root$4.__head = root$4.__next = head$3 = next$3);
                                                                        node === tail$3 && (root$4.__tail = root$4.__prev = tail$3 = prev$3);
                                                                        node.__next = node.__prev = void 0;
                                                                        head$3 = tail$3 = next$3 = prev$3 = void 0;
                                                                    }
                                                                }
                                                                nodeParent[key$2] = node = message;
                                                                nodeType = node && node[$TYPE] || void 0;
                                                                nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                                                nodeTimestamp = node && node[$TIMESTAMP];
                                                                nodeExpires = node && node[$EXPIRES];
                                                                node = node;
                                                                break merge_node_11206;
                                                            } while (true);
                                                        node = node;
                                                        node != null && (node = !node[__SELF] && ((node[__SELF] = node) || true) && ((node[__KEY] = key$2) || true) && ((node[__PARENT] = nodeParent) || true) && ((node[__ROOT] = nodeRoot) || true) && (node[__GENERATION] || (node[__GENERATION] = 0) || node) && ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue) && (nodeValue[__CONTAINER] = node)) || node);
                                                        if (appendNullKey = node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue)) {
                                                            nodeParent = node;
                                                            break follow_path_11062;
                                                        }
                                                        nodeParent = node;
                                                        messageParent = message;
                                                        jsonParent = jsonNode;
                                                        refDepth = refDepth + 1;
                                                        continue follow_path_11062;
                                                    } else if (refDepth === refHeight) {
                                                        optimizedPath[optimizedPath.length = refDepth] = key$2;
                                                        node = nodeParent[key$2];
                                                        nodeType = node && node[$TYPE] || void 0;
                                                        nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                                        nodeTimestamp = node && node[$TIMESTAMP];
                                                        nodeExpires = node && node[$EXPIRES];
                                                        if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                                            node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                                        }
                                                        message = messageParent[key$2];
                                                        messageType = message && message[$TYPE] || void 0;
                                                        messageValue = messageType === SENTINEL ? message[VALUE] : messageType === ERROR ? message = errorSelector(requestedPath, message) : message;
                                                        messageTimestamp = message && message[$TIMESTAMP];
                                                        messageExpires = message && message[$EXPIRES];
                                                        if (message != null && typeof message === 'object' && (messageExpires != null && messageExpires !== 1 && (messageExpires === 0 || messageExpires < Date.now()) || message[__INVALIDATED] === true)) {
                                                            message = messageValue = (expired[expired.length] = message) && (message[__INVALIDATED] = true) && void 0;
                                                        }
                                                        node = node;
                                                        message = message;
                                                        merge_node_11581:
                                                            do {
                                                                if (node === message) {
                                                                    node = node;
                                                                    break merge_node_11581;
                                                                }
                                                                if (node != null) {
                                                                    if (message != null) {
                                                                        if ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                                                                            if ((!messageType || messageType === SENTINEL) && Array.isArray(messageValue)) {
                                                                                if ((messageTimestamp < nodeTimestamp || messageExpires === 0 && ((node = message) || true)) === false) {
                                                                                    message = message;
                                                                                    node = node;
                                                                                    nodeValue = nodeValue;
                                                                                    messageValue = messageValue;
                                                                                    replace_cache_reference_11748:
                                                                                        do {
                                                                                            // compare the cache and message references.
                                                                                            // if they're the same, break early so we don't insert.
                                                                                            // if they're different, replace the cache reference.
                                                                                            var i$6 = nodeValue.length;
                                                                                            // If the reference lengths are equal, we have to check their keys
                                                                                            // for equality.
                                                                                            // If their lengths aren't the equal, the references aren't equal.
                                                                                            // Insert the reference from the message.
                                                                                            if (i$6 === messageValue.length) {
                                                                                                while (--i$6 > -1) {
                                                                                                    // If any of their keys are different, replace the reference
                                                                                                    // in the cache with the reference in the message.
                                                                                                    if (nodeValue[i$6] !== messageValue[i$6]) {
                                                                                                        message = message;
                                                                                                        break replace_cache_reference_11748;
                                                                                                    }
                                                                                                }
                                                                                                if (i$6 === -1) {
                                                                                                    message = node;
                                                                                                    break replace_cache_reference_11748;
                                                                                                }
                                                                                            }
                                                                                            message = message;
                                                                                            break replace_cache_reference_11748;
                                                                                        } while (true);
                                                                                    message = message;
                                                                                }
                                                                            }
                                                                        }
                                                                        if (node === message || !nodeType && (node != null && typeof node === 'object') && !Array.isArray(nodeValue) && (!messageType && (message != null && typeof message === 'object') && !Array.isArray(messageValue))) {
                                                                            node = node;
                                                                            break merge_node_11581;
                                                                        }
                                                                    } else if (!nodeType && (node != null && typeof node === 'object') || (!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                                                                        node = message = node;
                                                                        break merge_node_11581;
                                                                    }
                                                                }
                                                                if (message == null || messageType !== void 0 || typeof message !== 'object' || Array.isArray(messageValue)) {
                                                                    message = message;
                                                                    if ((!messageType || messageType === SENTINEL) && Array.isArray(messageValue)) {
                                                                        messageType = 'array';
                                                                        message[$SIZE] = messageSize = (messageType === SENTINEL && 50 || 0) + (messageValue.length || 1);
                                                                        delete messageValue[$SIZE];
                                                                        messageValue[__CONTAINER] = message;
                                                                    } else if (messageType === SENTINEL) {
                                                                        message[$SIZE] = messageSize = 50 + (typeof messageValue === 'string' && messageValue.length || 1);
                                                                    } else if (messageType === ERROR) {
                                                                        message[$SIZE] = messageSize = 50 + (message[$SIZE] || 0 || 1);
                                                                    } else if (!(message != null && typeof message === 'object')) {
                                                                        messageSize = 50 + (typeof messageValue === 'string' && messageValue.length || 1);
                                                                        messageType = 'sentinel';
                                                                        message = { 'value': messageValue };
                                                                        message[$TYPE] = messageType;
                                                                        message[$SIZE] = messageSize;
                                                                    } else {
                                                                        messageType = message[$TYPE] = messageType || 'leaf';
                                                                        message[$SIZE] = messageSize = message[$SIZE] || 0 || 50 + 1;
                                                                    }
                                                                    ;
                                                                }
                                                                if (node != null && node !== message) {
                                                                    var nodeRefsLength$3 = node.__refsLength || 0, destRefsLength$3 = message.__refsLength || 0, i$7 = -1, ref$4;
                                                                    while (++i$7 < nodeRefsLength$3) {
                                                                        if ((ref$4 = node[__REF + i$7]) !== void 0) {
                                                                            ref$4[__CONTEXT] = message;
                                                                            message[__REF + (destRefsLength$3 + i$7)] = ref$4;
                                                                            node[__REF + i$7] = void 0;
                                                                        }
                                                                    }
                                                                    message[__REFS_LENGTH] = nodeRefsLength$3 + destRefsLength$3;
                                                                    node[__REFS_LENGTH] = ref$4 = void 0;
                                                                    if (node != null && typeof node === 'object') {
                                                                        var root$5 = root, head$4 = root$5.__head, tail$4 = root$5.__tail, next$4, prev$4;
                                                                        (next$4 = node.__next) && (next$4 != null && typeof next$4 === 'object') && (next$4.__prev = prev$4);
                                                                        (prev$4 = node.__prev) && (prev$4 != null && typeof prev$4 === 'object') && (prev$4.__next = next$4);
                                                                        node === head$4 && (root$5.__head = root$5.__next = head$4 = next$4);
                                                                        node === tail$4 && (root$5.__tail = root$5.__prev = tail$4 = prev$4);
                                                                        node.__next = node.__prev = void 0;
                                                                        head$4 = tail$4 = next$4 = prev$4 = void 0;
                                                                    }
                                                                }
                                                                nodeParent[key$2] = node = message;
                                                                nodeType = node && node[$TYPE] || void 0;
                                                                nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                                                nodeTimestamp = node && node[$TIMESTAMP];
                                                                nodeExpires = node && node[$EXPIRES];
                                                                node = node;
                                                                break merge_node_11581;
                                                            } while (true);
                                                        node = node;
                                                        node != null && (node = !node[__SELF] && ((node[__SELF] = node) || true) && ((node[__KEY] = key$2) || true) && ((node[__PARENT] = nodeParent) || true) && ((node[__ROOT] = nodeRoot) || true) && (node[__GENERATION] || (node[__GENERATION] = 0) || node) && ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue) && (nodeValue[__CONTAINER] = node)) || node);
                                                        appendNullKey = node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue);
                                                        nodeParent = node;
                                                        break follow_path_11062;
                                                    }
                                                } else if (refDepth < refHeight) {
                                                    nodeParent = node;
                                                    messageParent = message;
                                                    jsonParent = jsonNode;
                                                    refDepth = refDepth + 1;
                                                    continue follow_path_11062;
                                                }
                                                nodeParent = node;
                                                break follow_path_11062;
                                            } while (true);
                                        node = nodeParent;
                                    } while ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue));
                                    if (node == null) {
                                        while (refDepth <= refHeight) {
                                            optimizedPath[refDepth] = reference[refDepth++];
                                        }
                                    }
                                }
                                if (node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue)) {
                                    nodeParent = node;
                                    break follow_path_10463;
                                }
                                nodeParent = nodes[depth] = node;
                                messageParent = messages[depth] = message;
                                jsonParent = jsons[depth] = jsonNode;
                                depth = depth + 1;
                                continue follow_path_10463;
                            } else if (depth === height) {
                                optimizedPath[optimizedPath.length = depth + (refLength - refIndex)] = key;
                                node = nodeParent[key];
                                nodeType = node && node[$TYPE] || void 0;
                                nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                nodeTimestamp = node && node[$TIMESTAMP];
                                nodeExpires = node && node[$EXPIRES];
                                if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                    node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                }
                                message = messageParent[key];
                                messageType = message && message[$TYPE] || void 0;
                                messageValue = messageType === SENTINEL ? message[VALUE] : messageType === ERROR ? message = errorSelector(requestedPath, message) : message;
                                messageTimestamp = message && message[$TIMESTAMP];
                                messageExpires = message && message[$EXPIRES];
                                if (message != null && typeof message === 'object' && (messageExpires != null && messageExpires !== 1 && (messageExpires === 0 || messageExpires < Date.now()) || message[__INVALIDATED] === true)) {
                                    message = messageValue = (expired[expired.length] = message) && (message[__INVALIDATED] = true) && void 0;
                                }
                                if ((messageTimestamp < nodeTimestamp || messageExpires === 0 && ((node = message) || true)) === false) {
                                    message = message;
                                    if ((!messageType || messageType === SENTINEL) && Array.isArray(messageValue)) {
                                        messageType = 'array';
                                        message[$SIZE] = messageSize = (messageType === SENTINEL && 50 || 0) + (messageValue.length || 1);
                                        delete messageValue[$SIZE];
                                        messageValue[__CONTAINER] = message;
                                    } else if (messageType === SENTINEL) {
                                        message[$SIZE] = messageSize = 50 + (typeof messageValue === 'string' && messageValue.length || 1);
                                    } else if (messageType === ERROR) {
                                        message[$SIZE] = messageSize = 50 + (message[$SIZE] || 0 || 1);
                                    } else if (!(message != null && typeof message === 'object')) {
                                        messageSize = 50 + (typeof messageValue === 'string' && messageValue.length || 1);
                                        messageType = 'sentinel';
                                        message = { 'value': messageValue };
                                        message[$TYPE] = messageType;
                                        message[$SIZE] = messageSize;
                                    } else {
                                        messageType = message[$TYPE] = messageType || 'leaf';
                                        message[$SIZE] = messageSize = message[$SIZE] || 0 || 50 + 1;
                                    }
                                    ;
                                    if (node != null && node !== message) {
                                        var nodeRefsLength$4 = node.__refsLength || 0, destRefsLength$4 = message.__refsLength || 0, i$8 = -1, ref$5;
                                        while (++i$8 < nodeRefsLength$4) {
                                            if ((ref$5 = node[__REF + i$8]) !== void 0) {
                                                ref$5[__CONTEXT] = message;
                                                message[__REF + (destRefsLength$4 + i$8)] = ref$5;
                                                node[__REF + i$8] = void 0;
                                            }
                                        }
                                        message[__REFS_LENGTH] = nodeRefsLength$4 + destRefsLength$4;
                                        node[__REFS_LENGTH] = ref$5 = void 0;
                                        if (node != null && typeof node === 'object') {
                                            var root$6 = root, head$5 = root$6.__head, tail$5 = root$6.__tail, next$5, prev$5;
                                            (next$5 = node.__next) && (next$5 != null && typeof next$5 === 'object') && (next$5.__prev = prev$5);
                                            (prev$5 = node.__prev) && (prev$5 != null && typeof prev$5 === 'object') && (prev$5.__next = next$5);
                                            node === head$5 && (root$6.__head = root$6.__next = head$5 = next$5);
                                            node === tail$5 && (root$6.__tail = root$6.__prev = tail$5 = prev$5);
                                            node.__next = node.__prev = void 0;
                                            head$5 = tail$5 = next$5 = prev$5 = void 0;
                                        }
                                    }
                                    nodeParent[key] = node = message;
                                    nodeType = node && node[$TYPE] || void 0;
                                    nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                    node = !node[__SELF] && ((node[__SELF] = node) || true) && ((node[__KEY] = key) || true) && ((node[__PARENT] = nodeParent) || true) && ((node[__ROOT] = nodeRoot) || true) && (node[__GENERATION] || (node[__GENERATION] = 0) || node) && ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue) && (nodeValue[__CONTAINER] = node)) || node;
                                }
                                if (depth >= boundLength) {
                                    jsonKeys[depth] = isKeySet ? key : void 0;
                                } else {
                                    jsonKeys[depth] = void 0;
                                }
                                appendNullKey = false;
                                nodeParent = node;
                                break follow_path_10463;
                            }
                        } else if (depth < height) {
                            nodeParent = nodeParent;
                            messageParent = messageParent;
                            jsonParent = jsonParent;
                            depth = depth + 1;
                            continue follow_path_10463;
                        }
                        nodeParent = node;
                        break follow_path_10463;
                    } while (true);
                node = nodeParent;
                if (node != null || boxed === true) {
                    if (nodeType === ERROR) {
                        if (nodeExpires !== 1) {
                            var root$7 = root, head$6 = root$7.__head, tail$6 = root$7.__tail, next$6 = node.__next, prev$6 = node.__prev;
                            if (node !== head$6) {
                                next$6 && (next$6 != null && typeof next$6 === 'object') && (next$6.__prev = prev$6);
                                prev$6 && (prev$6 != null && typeof prev$6 === 'object') && (prev$6.__next = next$6);
                                (next$6 = head$6) && (head$6 != null && typeof head$6 === 'object') && (head$6.__prev = node);
                                root$7.__head = root$7.__next = head$6 = node;
                                head$6.__next = next$6;
                                head$6.__prev = void 0;
                            }
                            if (tail$6 == null || node === tail$6) {
                                root$7.__tail = root$7.__prev = tail$6 = prev$6 || node;
                            }
                            root$7 = head$6 = tail$6 = next$6 = prev$6 = void 0;
                        }
                        var pbv = Object.create(null);
                        var src = requestedPath, i$9 = -1, n = src.length, req = new Array(n);
                        while (++i$9 < n) {
                            req[i$9] = src[i$9];
                        }
                        if (appendNullKey === true) {
                            req[req.length] = null;
                        }
                        pbv.path = req;
                        if (boxed === true) {
                            pbv.value = node;
                        } else {
                            var dest = nodeValue, src$2 = dest, x;
                            if (dest != null && typeof dest === 'object') {
                                dest = Array.isArray(src$2) && [] || Object.create(null);
                                for (x in src$2) {
                                    !(!(x[0] !== '_' || x[1] !== '_') || (x === __SELF || x === __PARENT || x === __ROOT) || x[0] === '$') && (dest[x] = src$2[x]);
                                }
                            }
                            pbv.value = dest;
                        }
                        errors[errors.length] = pbv;
                    }
                    if (jsonParent != null) {
                        hasValue = true;
                        var jsonKey, jsonDepth = depth;
                        do {
                            jsonKey = jsonKeys[jsonDepth];
                            jsonParent = jsons[--jsonDepth];
                        } while (jsonKey == null);
                        if (boxed === true) {
                            jsonParent[jsonKey] = node;
                        } else {
                            var dest$2 = nodeValue, src$3 = dest$2, x$2;
                            if (dest$2 != null && typeof dest$2 === 'object') {
                                dest$2 = Array.isArray(src$3) && [] || Object.create(null);
                                for (x$2 in src$3) {
                                    !(!(x$2[0] !== '_' || x$2[1] !== '_') || (x$2 === __SELF || x$2 === __PARENT || x$2 === __ROOT) || x$2[0] === '$') && (dest$2[x$2] = src$3[x$2]);
                                }
                            }
                            jsonParent[jsonKey] = dest$2;
                        }
                    }
                    var src$4 = optimizedPath, i$10 = -1, n$2 = src$4.length, opt = new Array(n$2);
                    while (++i$10 < n$2) {
                        opt[i$10] = src$4[i$10];
                    }
                    var src$5 = requestedPath, i$11 = -1, n$3 = src$5.length, req$2 = new Array(n$3);
                    while (++i$11 < n$3) {
                        req$2[i$11] = src$5[i$11];
                    }
                    if (appendNullKey === true) {
                        req$2[req$2.length] = null;
                    }
                    requestedPaths[requestedPaths.length] = req$2;
                    optimizedPaths[optimizedPaths.length] = opt;
                }
                if (boxed === false && node == null || refreshing === true) {
                    var src$6 = boundPath, i$12 = -1, n$4 = src$6.length, req$3 = new Array(n$4);
                    while (++i$12 < n$4) {
                        req$3[i$12] = src$6[i$12];
                    }
                    var src$7 = optimizedPath, i$13 = -1, n$5 = src$7.length, opt$2 = new Array(n$5);
                    while (++i$13 < n$5) {
                        opt$2[i$13] = src$7[i$13];
                    }
                    var reqLen = req$3.length - 1, optLen = opt$2.length - 1, i$14 = -1, n$6 = requestedPath.length, j$2 = depth, k = height, x$3;
                    while (++i$14 < n$6) {
                        req$3[++reqLen] = path[i$14 + boundLength] != null && typeof path[i$14 + boundLength] === 'object' && [requestedPath[i$14]] || requestedPath[i$14];
                    }
                    i$14 = -1;
                    n$6 = height - depth;
                    while (++i$14 < n$6) {
                        x$3 = req$3[++reqLen] = path[++j$2 + boundLength];
                        x$3 != null && (opt$2[++optLen] = x$3);
                    }
                    req$3.pathSetIndex = index$2;
                    requestedMissingPaths[requestedMissingPaths.length] = req$3;
                    optimizedMissingPaths[optimizedMissingPaths.length] = opt$2;
                }
                appendNullKey = false;
                jsonRoot != null && (values[jsonValueOffset + index$2] = hasValue && { json: jsons[-1] } || void 0);
                var key$3;
                depth = depth;
                unroll_10559:
                    do {
                        if (depth < 0) {
                            depth = (path.depth = 0) - 1;
                            break unroll_10559;
                        }
                        if (!((key$3 = path[depth]) != null && typeof key$3 === 'object')) {
                            depth = path.depth = depth - 1;
                            continue unroll_10559;
                        }
                        if (Array.isArray(key$3)) {
                            if (++key$3.index === key$3.length) {
                                if (!((key$3 = key$3[key$3.index = 0]) != null && typeof key$3 === 'object')) {
                                    depth = path.depth = depth - 1;
                                    continue unroll_10559;
                                }
                            } else {
                                depth = path.depth = depth;
                                break unroll_10559;
                            }
                        }
                        if (++key$3[__OFFSET] > (key$3.to || (key$3.to = key$3.from + (key$3.length || 1) - 1))) {
                            key$3[__OFFSET] = key$3.from;
                            depth = path.depth = depth - 1;
                            continue unroll_10559;
                        }
                        depth = path.depth = depth;
                        break unroll_10559;
                    } while (true);
                depth = depth;
            }
        }
        jsonValueOffset += pathSets.length;
    }
    return {
        'values': values,
        'errors': errors,
        'requestedPaths': requestedPaths,
        'optimizedPaths': optimizedPaths,
        'requestedMissingPaths': requestedMissingPaths,
        'optimizedMissingPaths': optimizedMissingPaths
    };
}
function setJSONGsAsJSONG(model, envelopes, values, errorSelector, boundPath) {
    var boundLength = 0, nodeRoot = model._cache || {}, nodeParent, node;
    if (Array.isArray(boundPath)) {
        nodeParent = nodeRoot;
        boundLength = boundPath.length;
    } else {
        nodeParent = getBoundValue(model);
        boundPath = model._path || [];
    }
    var root = model._root || model, boxed = model._boxed || false, expired = root.expired || (root.expired = []), refreshing = model._refreshing || false, appendNullKey = false;
    typeof errorSelector === 'function' || (errorSelector = model._errorSelector) || (errorSelector = function (x$7, y) {
        return y;
    });
    var nodes = envelopes.nodes || (envelopes.nodes = []);
    var messages = envelopes.messages || (envelopes.messages = []);
    var jsons = envelopes.jsons || (envelopes.jsons = []);
    var errors = envelopes.errors || (envelopes.errors = []);
    var refs = envelopes.refs || (envelopes.refs = []);
    var depth = envelopes.depth || (envelopes.depth = 0);
    var refIndex = envelopes.refIndex || (envelopes.refIndex = 0);
    var refDepth = envelopes.refDepth || (envelopes.refDepth = 0);
    var requestedPath = envelopes.requestedPath || (envelopes.requestedPath = []);
    var optimizedPath = envelopes.optimizedPath || (envelopes.optimizedPath = []);
    var requestedPaths = envelopes.requestedPaths || (envelopes.requestedPaths = []);
    var optimizedPaths = envelopes.optimizedPaths || (envelopes.optimizedPaths = []);
    var requestedMissingPaths = envelopes.requestedMissingPaths || (envelopes.requestedMissingPaths = []);
    var optimizedMissingPaths = envelopes.optimizedMissingPaths || (envelopes.optimizedMissingPaths = []);
    var hasValue = envelopes.hasValue || (envelopes.hasValue = false);
    var jsonRoot = envelopes.jsonRoot || (envelopes.jsonRoot = values && values[0]);
    var jsonParent = envelopes.jsonParent || (envelopes.jsonParent = jsonRoot);
    var jsonNode = envelopes.jsonNode || (envelopes.jsonNode = jsonParent);
    var path, length = 0, height = 0, reference, refLength = 0, refHeight = 0, messageRoot, messageParent, message, nodeType, nodeValue, nodeSize, nodeTimestamp, nodeExpires, messageType, messageValue, messageSize, messageTimestamp, messageExpires;
    refs[-1] = boundPath;
    nodes[-1] = nodeParent;
    jsons[-1] = jsonParent;
    jsons[-2] = jsons;
    var envelope, pathSets, index = -1, count = envelopes.length;
    while (++index < count) {
        envelope = envelopes[index];
        pathSets = envelope.paths;
        messages[-1] = messageRoot = envelope.jsong || envelope.values || envelope.value || Object.create(null);
        var index$2 = -1, count$2 = pathSets.length;
        while (++index$2 < count$2) {
            path = pathSets[index$2];
            depth = 0;
            length = path.length;
            height = length - 1;
            var ref;
            refs.length = 0;
            while (depth > -1) {
                refIndex = depth;
                while (--refIndex >= -1) {
                    if (!!(ref = refs[refIndex])) {
                        refLength = ref.length;
                        var i = -1, j = 0;
                        while (++i < refLength) {
                            optimizedPath[j++] = ref[i];
                        }
                        i = ++refIndex;
                        while (i < depth) {
                            optimizedPath[j++] = requestedPath[i++];
                        }
                        optimizedPath.length = j;
                        break;
                    }
                }
                var key, isKeySet;
                path = path;
                height = (length = path.length) - 1;
                nodeParent = node = nodes[depth - 1];
                messageParent = message = messages[depth - 1];
                jsonParent = jsonNode = jsons[depth - 1];
                depth = depth;
                follow_path_5642:
                    do {
                        key = path[depth];
                        if (isKeySet = key != null && typeof key === 'object') {
                            if (Array.isArray(key)) {
                                if ((key = key[key.index || (key.index = 0)]) != null && typeof key === 'object') {
                                    key = key[__OFFSET] === void 0 && (key[__OFFSET] = key.from || (key.from = 0)) || key[__OFFSET];
                                }
                            } else {
                                key = key[__OFFSET] === void 0 && (key[__OFFSET] = key.from || (key.from = 0)) || key[__OFFSET];
                            }
                        }
                        if (key === __NULL) {
                            key = null;
                        }
                        depth >= boundLength && (requestedPath[requestedPath.length = depth] = key);
                        if (key != null) {
                            if (depth < height) {
                                optimizedPath[optimizedPath.length = depth + (refLength - refIndex)] = key;
                                node = nodeParent[key];
                                nodeType = node && node[$TYPE] || void 0;
                                nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                nodeTimestamp = node && node[$TIMESTAMP];
                                nodeExpires = node && node[$EXPIRES];
                                if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                    node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                }
                                message = messageParent[key];
                                messageType = message && message[$TYPE] || void 0;
                                messageValue = messageType === SENTINEL ? message[VALUE] : messageType === ERROR ? message = errorSelector(requestedPath, message) : message;
                                messageTimestamp = message && message[$TIMESTAMP];
                                messageExpires = message && message[$EXPIRES];
                                if (message != null && typeof message === 'object' && (messageExpires != null && messageExpires !== 1 && (messageExpires === 0 || messageExpires < Date.now()) || message[__INVALIDATED] === true)) {
                                    message = messageValue = (expired[expired.length] = message) && (message[__INVALIDATED] = true) && void 0;
                                }
                                node = node;
                                message = message;
                                merge_node_5882:
                                    do {
                                        if (node === message) {
                                            node = node;
                                            break merge_node_5882;
                                        }
                                        if (node != null) {
                                            if (message != null) {
                                                if ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                                                    if ((!messageType || messageType === SENTINEL) && Array.isArray(messageValue)) {
                                                        if ((messageTimestamp < nodeTimestamp || messageExpires === 0 && ((node = message) || true)) === false) {
                                                            message = message;
                                                            node = node;
                                                            nodeValue = nodeValue;
                                                            messageValue = messageValue;
                                                            replace_cache_reference_6057:
                                                                do {
                                                                    // compare the cache and message references.
                                                                    // if they're the same, break early so we don't insert.
                                                                    // if they're different, replace the cache reference.
                                                                    var i$2 = nodeValue.length;
                                                                    // If the reference lengths are equal, we have to check their keys
                                                                    // for equality.
                                                                    // If their lengths aren't the equal, the references aren't equal.
                                                                    // Insert the reference from the message.
                                                                    if (i$2 === messageValue.length) {
                                                                        while (--i$2 > -1) {
                                                                            // If any of their keys are different, replace the reference
                                                                            // in the cache with the reference in the message.
                                                                            if (nodeValue[i$2] !== messageValue[i$2]) {
                                                                                message = message;
                                                                                break replace_cache_reference_6057;
                                                                            }
                                                                        }
                                                                        if (i$2 === -1) {
                                                                            message = node;
                                                                            break replace_cache_reference_6057;
                                                                        }
                                                                    }
                                                                    message = message;
                                                                    break replace_cache_reference_6057;
                                                                } while (true);
                                                            message = message;
                                                        }
                                                    }
                                                }
                                                if (node === message || !nodeType && (node != null && typeof node === 'object') && !Array.isArray(nodeValue) && (!messageType && (message != null && typeof message === 'object') && !Array.isArray(messageValue))) {
                                                    node = node;
                                                    break merge_node_5882;
                                                }
                                            } else if (!nodeType && (node != null && typeof node === 'object') || (!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                                                node = message = node;
                                                break merge_node_5882;
                                            }
                                        }
                                        if (message == null || messageType !== void 0 || typeof message !== 'object' || Array.isArray(messageValue)) {
                                            message = message;
                                            if ((!messageType || messageType === SENTINEL) && Array.isArray(messageValue)) {
                                                messageType = 'array';
                                                message[$SIZE] = messageSize = (messageType === SENTINEL && 50 || 0) + (messageValue.length || 1);
                                                delete messageValue[$SIZE];
                                                messageValue[__CONTAINER] = message;
                                            } else if (messageType === SENTINEL) {
                                                message[$SIZE] = messageSize = 50 + (typeof messageValue === 'string' && messageValue.length || 1);
                                            } else if (messageType === ERROR) {
                                                message[$SIZE] = messageSize = 50 + (message[$SIZE] || 0 || 1);
                                            } else if (!(message != null && typeof message === 'object')) {
                                                messageSize = 50 + (typeof messageValue === 'string' && messageValue.length || 1);
                                                messageType = 'sentinel';
                                                message = { 'value': messageValue };
                                                message[$TYPE] = messageType;
                                                message[$SIZE] = messageSize;
                                            } else {
                                                messageType = message[$TYPE] = messageType || 'leaf';
                                                message[$SIZE] = messageSize = message[$SIZE] || 0 || 50 + 1;
                                            }
                                            ;
                                        }
                                        if (node != null && node !== message) {
                                            var nodeRefsLength = node.__refsLength || 0, destRefsLength = message.__refsLength || 0, i$3 = -1, ref$2;
                                            while (++i$3 < nodeRefsLength) {
                                                if ((ref$2 = node[__REF + i$3]) !== void 0) {
                                                    ref$2[__CONTEXT] = message;
                                                    message[__REF + (destRefsLength + i$3)] = ref$2;
                                                    node[__REF + i$3] = void 0;
                                                }
                                            }
                                            message[__REFS_LENGTH] = nodeRefsLength + destRefsLength;
                                            node[__REFS_LENGTH] = ref$2 = void 0;
                                            if (node != null && typeof node === 'object') {
                                                var root$2 = root, head = root$2.__head, tail = root$2.__tail, next, prev;
                                                (next = node.__next) && (next != null && typeof next === 'object') && (next.__prev = prev);
                                                (prev = node.__prev) && (prev != null && typeof prev === 'object') && (prev.__next = next);
                                                node === head && (root$2.__head = root$2.__next = head = next);
                                                node === tail && (root$2.__tail = root$2.__prev = tail = prev);
                                                node.__next = node.__prev = void 0;
                                                head = tail = next = prev = void 0;
                                            }
                                        }
                                        nodeParent[key] = node = message;
                                        nodeType = node && node[$TYPE] || void 0;
                                        nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                        nodeTimestamp = node && node[$TIMESTAMP];
                                        nodeExpires = node && node[$EXPIRES];
                                        node = node;
                                        break merge_node_5882;
                                    } while (true);
                                node = node;
                                node != null && (node = !node[__SELF] && ((node[__SELF] = node) || true) && ((node[__KEY] = key) || true) && ((node[__PARENT] = nodeParent) || true) && ((node[__ROOT] = nodeRoot) || true) && (node[__GENERATION] || (node[__GENERATION] = 0) || node) && ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue) && (nodeValue[__CONTAINER] = node)) || node);
                                if (node != null && jsonParent != null) {
                                    if (!nodeType && (node != null && typeof node === 'object') && !Array.isArray(nodeValue)) {
                                        if (!(jsonNode = jsonParent[key]) || !(jsonNode != null && typeof jsonNode === 'object')) {
                                            jsonNode = jsonParent[key] = Object.create(null);
                                        }
                                    } else {
                                        if (boxed === true) {
                                            jsonParent[key] = node;
                                        } else {
                                            var val = nodeValue;
                                            if (val != null && typeof val === 'object') {
                                                var src = val, keys = Object.keys(src), x, i$4 = -1, n = keys.length;
                                                val = Array.isArray(src) && new Array(src.length) || Object.create(null);
                                                while (++i$4 < n) {
                                                    x = keys[i$4];
                                                    !(!(x[0] !== '_' || x[1] !== '_') || (x === __SELF || x === __PARENT || x === __ROOT)) && (val[x] = src[x]);
                                                }
                                            }
                                            if (!nodeType && (val != null && typeof val === 'object') && !Array.isArray(val)) {
                                                val[$TYPE] = LEAF;
                                            }
                                            jsonParent[key] = val;
                                        }
                                    }
                                }
                                if ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                                    do {
                                        if (nodeExpires !== 1) {
                                            var root$3 = root, head$2 = root$3.__head, tail$2 = root$3.__tail, next$2 = node.__next, prev$2 = node.__prev;
                                            if (node !== head$2) {
                                                next$2 && (next$2 != null && typeof next$2 === 'object') && (next$2.__prev = prev$2);
                                                prev$2 && (prev$2 != null && typeof prev$2 === 'object') && (prev$2.__next = next$2);
                                                (next$2 = head$2) && (head$2 != null && typeof head$2 === 'object') && (head$2.__prev = node);
                                                root$3.__head = root$3.__next = head$2 = node;
                                                head$2.__next = next$2;
                                                head$2.__prev = void 0;
                                            }
                                            if (tail$2 == null || node === tail$2) {
                                                root$3.__tail = root$3.__prev = tail$2 = prev$2 || node;
                                            }
                                            root$3 = head$2 = tail$2 = next$2 = prev$2 = void 0;
                                        }
                                        refs[depth] = nodeValue;
                                        refIndex = depth + 1;
                                        refDepth = 0;
                                        var key$2, isKeySet$2;
                                        reference = nodeValue;
                                        refHeight = (refLength = reference.length) - 1;
                                        nodeParent = nodeRoot;
                                        messageParent = messageRoot;
                                        jsonParent = jsonRoot;
                                        refDepth = refDepth;
                                        follow_path_6256:
                                            do {
                                                key$2 = reference[refDepth];
                                                isKeySet$2 = false;
                                                if (key$2 != null) {
                                                    if (refDepth < refHeight) {
                                                        optimizedPath[optimizedPath.length = refDepth] = key$2;
                                                        node = nodeParent[key$2];
                                                        nodeType = node && node[$TYPE] || void 0;
                                                        nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                                        nodeTimestamp = node && node[$TIMESTAMP];
                                                        nodeExpires = node && node[$EXPIRES];
                                                        if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                                            node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                                        }
                                                        message = messageParent[key$2];
                                                        messageType = message && message[$TYPE] || void 0;
                                                        messageValue = messageType === SENTINEL ? message[VALUE] : messageType === ERROR ? message = errorSelector(requestedPath, message) : message;
                                                        messageTimestamp = message && message[$TIMESTAMP];
                                                        messageExpires = message && message[$EXPIRES];
                                                        if (message != null && typeof message === 'object' && (messageExpires != null && messageExpires !== 1 && (messageExpires === 0 || messageExpires < Date.now()) || message[__INVALIDATED] === true)) {
                                                            message = messageValue = (expired[expired.length] = message) && (message[__INVALIDATED] = true) && void 0;
                                                        }
                                                        node = node;
                                                        message = message;
                                                        merge_node_6402:
                                                            do {
                                                                if (node === message) {
                                                                    node = node;
                                                                    break merge_node_6402;
                                                                }
                                                                if (node != null) {
                                                                    if (message != null) {
                                                                        if ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                                                                            if ((!messageType || messageType === SENTINEL) && Array.isArray(messageValue)) {
                                                                                if ((messageTimestamp < nodeTimestamp || messageExpires === 0 && ((node = message) || true)) === false) {
                                                                                    message = message;
                                                                                    node = node;
                                                                                    nodeValue = nodeValue;
                                                                                    messageValue = messageValue;
                                                                                    replace_cache_reference_6576:
                                                                                        do {
                                                                                            // compare the cache and message references.
                                                                                            // if they're the same, break early so we don't insert.
                                                                                            // if they're different, replace the cache reference.
                                                                                            var i$5 = nodeValue.length;
                                                                                            // If the reference lengths are equal, we have to check their keys
                                                                                            // for equality.
                                                                                            // If their lengths aren't the equal, the references aren't equal.
                                                                                            // Insert the reference from the message.
                                                                                            if (i$5 === messageValue.length) {
                                                                                                while (--i$5 > -1) {
                                                                                                    // If any of their keys are different, replace the reference
                                                                                                    // in the cache with the reference in the message.
                                                                                                    if (nodeValue[i$5] !== messageValue[i$5]) {
                                                                                                        message = message;
                                                                                                        break replace_cache_reference_6576;
                                                                                                    }
                                                                                                }
                                                                                                if (i$5 === -1) {
                                                                                                    message = node;
                                                                                                    break replace_cache_reference_6576;
                                                                                                }
                                                                                            }
                                                                                            message = message;
                                                                                            break replace_cache_reference_6576;
                                                                                        } while (true);
                                                                                    message = message;
                                                                                }
                                                                            }
                                                                        }
                                                                        if (node === message || !nodeType && (node != null && typeof node === 'object') && !Array.isArray(nodeValue) && (!messageType && (message != null && typeof message === 'object') && !Array.isArray(messageValue))) {
                                                                            node = node;
                                                                            break merge_node_6402;
                                                                        }
                                                                    } else if (!nodeType && (node != null && typeof node === 'object') || (!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                                                                        node = message = node;
                                                                        break merge_node_6402;
                                                                    }
                                                                }
                                                                if (message == null || messageType !== void 0 || typeof message !== 'object' || Array.isArray(messageValue)) {
                                                                    message = message;
                                                                    if ((!messageType || messageType === SENTINEL) && Array.isArray(messageValue)) {
                                                                        messageType = 'array';
                                                                        message[$SIZE] = messageSize = (messageType === SENTINEL && 50 || 0) + (messageValue.length || 1);
                                                                        delete messageValue[$SIZE];
                                                                        messageValue[__CONTAINER] = message;
                                                                    } else if (messageType === SENTINEL) {
                                                                        message[$SIZE] = messageSize = 50 + (typeof messageValue === 'string' && messageValue.length || 1);
                                                                    } else if (messageType === ERROR) {
                                                                        message[$SIZE] = messageSize = 50 + (message[$SIZE] || 0 || 1);
                                                                    } else if (!(message != null && typeof message === 'object')) {
                                                                        messageSize = 50 + (typeof messageValue === 'string' && messageValue.length || 1);
                                                                        messageType = 'sentinel';
                                                                        message = { 'value': messageValue };
                                                                        message[$TYPE] = messageType;
                                                                        message[$SIZE] = messageSize;
                                                                    } else {
                                                                        messageType = message[$TYPE] = messageType || 'leaf';
                                                                        message[$SIZE] = messageSize = message[$SIZE] || 0 || 50 + 1;
                                                                    }
                                                                    ;
                                                                }
                                                                if (node != null && node !== message) {
                                                                    var nodeRefsLength$2 = node.__refsLength || 0, destRefsLength$2 = message.__refsLength || 0, i$6 = -1, ref$3;
                                                                    while (++i$6 < nodeRefsLength$2) {
                                                                        if ((ref$3 = node[__REF + i$6]) !== void 0) {
                                                                            ref$3[__CONTEXT] = message;
                                                                            message[__REF + (destRefsLength$2 + i$6)] = ref$3;
                                                                            node[__REF + i$6] = void 0;
                                                                        }
                                                                    }
                                                                    message[__REFS_LENGTH] = nodeRefsLength$2 + destRefsLength$2;
                                                                    node[__REFS_LENGTH] = ref$3 = void 0;
                                                                    if (node != null && typeof node === 'object') {
                                                                        var root$4 = root, head$3 = root$4.__head, tail$3 = root$4.__tail, next$3, prev$3;
                                                                        (next$3 = node.__next) && (next$3 != null && typeof next$3 === 'object') && (next$3.__prev = prev$3);
                                                                        (prev$3 = node.__prev) && (prev$3 != null && typeof prev$3 === 'object') && (prev$3.__next = next$3);
                                                                        node === head$3 && (root$4.__head = root$4.__next = head$3 = next$3);
                                                                        node === tail$3 && (root$4.__tail = root$4.__prev = tail$3 = prev$3);
                                                                        node.__next = node.__prev = void 0;
                                                                        head$3 = tail$3 = next$3 = prev$3 = void 0;
                                                                    }
                                                                }
                                                                nodeParent[key$2] = node = message;
                                                                nodeType = node && node[$TYPE] || void 0;
                                                                nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                                                nodeTimestamp = node && node[$TIMESTAMP];
                                                                nodeExpires = node && node[$EXPIRES];
                                                                node = node;
                                                                break merge_node_6402;
                                                            } while (true);
                                                        node = node;
                                                        node != null && (node = !node[__SELF] && ((node[__SELF] = node) || true) && ((node[__KEY] = key$2) || true) && ((node[__PARENT] = nodeParent) || true) && ((node[__ROOT] = nodeRoot) || true) && (node[__GENERATION] || (node[__GENERATION] = 0) || node) && ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue) && (nodeValue[__CONTAINER] = node)) || node);
                                                        if (node != null && jsonParent != null) {
                                                            if (!nodeType && (node != null && typeof node === 'object') && !Array.isArray(nodeValue)) {
                                                                if (!(jsonNode = jsonParent[key$2]) || !(jsonNode != null && typeof jsonNode === 'object')) {
                                                                    jsonNode = jsonParent[key$2] = Object.create(null);
                                                                }
                                                            } else {
                                                                if (boxed === true) {
                                                                    jsonParent[key$2] = node;
                                                                } else {
                                                                    var val$2 = nodeValue;
                                                                    if (val$2 != null && typeof val$2 === 'object') {
                                                                        var src$2 = val$2, keys$2 = Object.keys(src$2), x$2, i$7 = -1, n$2 = keys$2.length;
                                                                        val$2 = Array.isArray(src$2) && new Array(src$2.length) || Object.create(null);
                                                                        while (++i$7 < n$2) {
                                                                            x$2 = keys$2[i$7];
                                                                            !(!(x$2[0] !== '_' || x$2[1] !== '_') || (x$2 === __SELF || x$2 === __PARENT || x$2 === __ROOT)) && (val$2[x$2] = src$2[x$2]);
                                                                        }
                                                                    }
                                                                    if (!nodeType && (val$2 != null && typeof val$2 === 'object') && !Array.isArray(val$2)) {
                                                                        val$2[$TYPE] = LEAF;
                                                                    }
                                                                    jsonParent[key$2] = val$2;
                                                                }
                                                            }
                                                        }
                                                        if (appendNullKey = node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue)) {
                                                            nodeParent = node;
                                                            break follow_path_6256;
                                                        }
                                                        nodeParent = node;
                                                        messageParent = message;
                                                        jsonParent = jsonNode;
                                                        refDepth = refDepth + 1;
                                                        continue follow_path_6256;
                                                    } else if (refDepth === refHeight) {
                                                        optimizedPath[optimizedPath.length = refDepth] = key$2;
                                                        node = nodeParent[key$2];
                                                        nodeType = node && node[$TYPE] || void 0;
                                                        nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                                        nodeTimestamp = node && node[$TIMESTAMP];
                                                        nodeExpires = node && node[$EXPIRES];
                                                        if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                                            node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                                        }
                                                        message = messageParent[key$2];
                                                        messageType = message && message[$TYPE] || void 0;
                                                        messageValue = messageType === SENTINEL ? message[VALUE] : messageType === ERROR ? message = errorSelector(requestedPath, message) : message;
                                                        messageTimestamp = message && message[$TIMESTAMP];
                                                        messageExpires = message && message[$EXPIRES];
                                                        if (message != null && typeof message === 'object' && (messageExpires != null && messageExpires !== 1 && (messageExpires === 0 || messageExpires < Date.now()) || message[__INVALIDATED] === true)) {
                                                            message = messageValue = (expired[expired.length] = message) && (message[__INVALIDATED] = true) && void 0;
                                                        }
                                                        node = node;
                                                        message = message;
                                                        merge_node_6811:
                                                            do {
                                                                if (node === message) {
                                                                    node = node;
                                                                    break merge_node_6811;
                                                                }
                                                                if (node != null) {
                                                                    if (message != null) {
                                                                        if ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                                                                            if ((!messageType || messageType === SENTINEL) && Array.isArray(messageValue)) {
                                                                                if ((messageTimestamp < nodeTimestamp || messageExpires === 0 && ((node = message) || true)) === false) {
                                                                                    message = message;
                                                                                    node = node;
                                                                                    nodeValue = nodeValue;
                                                                                    messageValue = messageValue;
                                                                                    replace_cache_reference_6982:
                                                                                        do {
                                                                                            // compare the cache and message references.
                                                                                            // if they're the same, break early so we don't insert.
                                                                                            // if they're different, replace the cache reference.
                                                                                            var i$8 = nodeValue.length;
                                                                                            // If the reference lengths are equal, we have to check their keys
                                                                                            // for equality.
                                                                                            // If their lengths aren't the equal, the references aren't equal.
                                                                                            // Insert the reference from the message.
                                                                                            if (i$8 === messageValue.length) {
                                                                                                while (--i$8 > -1) {
                                                                                                    // If any of their keys are different, replace the reference
                                                                                                    // in the cache with the reference in the message.
                                                                                                    if (nodeValue[i$8] !== messageValue[i$8]) {
                                                                                                        message = message;
                                                                                                        break replace_cache_reference_6982;
                                                                                                    }
                                                                                                }
                                                                                                if (i$8 === -1) {
                                                                                                    message = node;
                                                                                                    break replace_cache_reference_6982;
                                                                                                }
                                                                                            }
                                                                                            message = message;
                                                                                            break replace_cache_reference_6982;
                                                                                        } while (true);
                                                                                    message = message;
                                                                                }
                                                                            }
                                                                        }
                                                                        if (node === message || !nodeType && (node != null && typeof node === 'object') && !Array.isArray(nodeValue) && (!messageType && (message != null && typeof message === 'object') && !Array.isArray(messageValue))) {
                                                                            node = node;
                                                                            break merge_node_6811;
                                                                        }
                                                                    } else if (!nodeType && (node != null && typeof node === 'object') || (!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                                                                        node = message = node;
                                                                        break merge_node_6811;
                                                                    }
                                                                }
                                                                if (message == null || messageType !== void 0 || typeof message !== 'object' || Array.isArray(messageValue)) {
                                                                    message = message;
                                                                    if ((!messageType || messageType === SENTINEL) && Array.isArray(messageValue)) {
                                                                        messageType = 'array';
                                                                        message[$SIZE] = messageSize = (messageType === SENTINEL && 50 || 0) + (messageValue.length || 1);
                                                                        delete messageValue[$SIZE];
                                                                        messageValue[__CONTAINER] = message;
                                                                    } else if (messageType === SENTINEL) {
                                                                        message[$SIZE] = messageSize = 50 + (typeof messageValue === 'string' && messageValue.length || 1);
                                                                    } else if (messageType === ERROR) {
                                                                        message[$SIZE] = messageSize = 50 + (message[$SIZE] || 0 || 1);
                                                                    } else if (!(message != null && typeof message === 'object')) {
                                                                        messageSize = 50 + (typeof messageValue === 'string' && messageValue.length || 1);
                                                                        messageType = 'sentinel';
                                                                        message = { 'value': messageValue };
                                                                        message[$TYPE] = messageType;
                                                                        message[$SIZE] = messageSize;
                                                                    } else {
                                                                        messageType = message[$TYPE] = messageType || 'leaf';
                                                                        message[$SIZE] = messageSize = message[$SIZE] || 0 || 50 + 1;
                                                                    }
                                                                    ;
                                                                }
                                                                if (node != null && node !== message) {
                                                                    var nodeRefsLength$3 = node.__refsLength || 0, destRefsLength$3 = message.__refsLength || 0, i$9 = -1, ref$4;
                                                                    while (++i$9 < nodeRefsLength$3) {
                                                                        if ((ref$4 = node[__REF + i$9]) !== void 0) {
                                                                            ref$4[__CONTEXT] = message;
                                                                            message[__REF + (destRefsLength$3 + i$9)] = ref$4;
                                                                            node[__REF + i$9] = void 0;
                                                                        }
                                                                    }
                                                                    message[__REFS_LENGTH] = nodeRefsLength$3 + destRefsLength$3;
                                                                    node[__REFS_LENGTH] = ref$4 = void 0;
                                                                    if (node != null && typeof node === 'object') {
                                                                        var root$5 = root, head$4 = root$5.__head, tail$4 = root$5.__tail, next$4, prev$4;
                                                                        (next$4 = node.__next) && (next$4 != null && typeof next$4 === 'object') && (next$4.__prev = prev$4);
                                                                        (prev$4 = node.__prev) && (prev$4 != null && typeof prev$4 === 'object') && (prev$4.__next = next$4);
                                                                        node === head$4 && (root$5.__head = root$5.__next = head$4 = next$4);
                                                                        node === tail$4 && (root$5.__tail = root$5.__prev = tail$4 = prev$4);
                                                                        node.__next = node.__prev = void 0;
                                                                        head$4 = tail$4 = next$4 = prev$4 = void 0;
                                                                    }
                                                                }
                                                                nodeParent[key$2] = node = message;
                                                                nodeType = node && node[$TYPE] || void 0;
                                                                nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                                                nodeTimestamp = node && node[$TIMESTAMP];
                                                                nodeExpires = node && node[$EXPIRES];
                                                                node = node;
                                                                break merge_node_6811;
                                                            } while (true);
                                                        node = node;
                                                        node != null && (node = !node[__SELF] && ((node[__SELF] = node) || true) && ((node[__KEY] = key$2) || true) && ((node[__PARENT] = nodeParent) || true) && ((node[__ROOT] = nodeRoot) || true) && (node[__GENERATION] || (node[__GENERATION] = 0) || node) && ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue) && (nodeValue[__CONTAINER] = node)) || node);
                                                        if (node != null && jsonParent != null) {
                                                            if (!nodeType && (node != null && typeof node === 'object') && !Array.isArray(nodeValue)) {
                                                                if (!(jsonNode = jsonParent[key$2]) || !(jsonNode != null && typeof jsonNode === 'object')) {
                                                                    jsonNode = jsonParent[key$2] = Object.create(null);
                                                                }
                                                            } else {
                                                                if (boxed === true) {
                                                                    jsonParent[key$2] = node;
                                                                } else {
                                                                    var val$3 = nodeValue;
                                                                    if (val$3 != null && typeof val$3 === 'object') {
                                                                        var src$3 = val$3, keys$3 = Object.keys(src$3), x$3, i$10 = -1, n$3 = keys$3.length;
                                                                        val$3 = Array.isArray(src$3) && new Array(src$3.length) || Object.create(null);
                                                                        while (++i$10 < n$3) {
                                                                            x$3 = keys$3[i$10];
                                                                            !(!(x$3[0] !== '_' || x$3[1] !== '_') || (x$3 === __SELF || x$3 === __PARENT || x$3 === __ROOT)) && (val$3[x$3] = src$3[x$3]);
                                                                        }
                                                                    }
                                                                    if (!nodeType && (val$3 != null && typeof val$3 === 'object') && !Array.isArray(val$3)) {
                                                                        val$3[$TYPE] = LEAF;
                                                                    }
                                                                    jsonParent[key$2] = val$3;
                                                                }
                                                            }
                                                        }
                                                        appendNullKey = node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue);
                                                        nodeParent = node;
                                                        break follow_path_6256;
                                                    }
                                                } else if (refDepth < refHeight) {
                                                    nodeParent = node;
                                                    messageParent = message;
                                                    jsonParent = jsonNode;
                                                    refDepth = refDepth + 1;
                                                    continue follow_path_6256;
                                                }
                                                nodeParent = node;
                                                break follow_path_6256;
                                            } while (true);
                                        node = nodeParent;
                                    } while ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue));
                                    if (node == null) {
                                        while (refDepth <= refHeight) {
                                            optimizedPath[refDepth] = reference[refDepth++];
                                        }
                                    }
                                }
                                if (node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue)) {
                                    nodeParent = node;
                                    break follow_path_5642;
                                }
                                nodeParent = nodes[depth] = node;
                                messageParent = messages[depth] = message;
                                jsonParent = jsons[depth] = jsonNode;
                                depth = depth + 1;
                                continue follow_path_5642;
                            } else if (depth === height) {
                                optimizedPath[optimizedPath.length = depth + (refLength - refIndex)] = key;
                                node = nodeParent[key];
                                nodeType = node && node[$TYPE] || void 0;
                                nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                nodeTimestamp = node && node[$TIMESTAMP];
                                nodeExpires = node && node[$EXPIRES];
                                if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                    node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                }
                                message = messageParent[key];
                                messageType = message && message[$TYPE] || void 0;
                                messageValue = messageType === SENTINEL ? message[VALUE] : messageType === ERROR ? message = errorSelector(requestedPath, message) : message;
                                messageTimestamp = message && message[$TIMESTAMP];
                                messageExpires = message && message[$EXPIRES];
                                if (message != null && typeof message === 'object' && (messageExpires != null && messageExpires !== 1 && (messageExpires === 0 || messageExpires < Date.now()) || message[__INVALIDATED] === true)) {
                                    message = messageValue = (expired[expired.length] = message) && (message[__INVALIDATED] = true) && void 0;
                                }
                                if ((messageTimestamp < nodeTimestamp || messageExpires === 0 && ((node = message) || true)) === false) {
                                    message = message;
                                    if ((!messageType || messageType === SENTINEL) && Array.isArray(messageValue)) {
                                        messageType = 'array';
                                        message[$SIZE] = messageSize = (messageType === SENTINEL && 50 || 0) + (messageValue.length || 1);
                                        delete messageValue[$SIZE];
                                        messageValue[__CONTAINER] = message;
                                    } else if (messageType === SENTINEL) {
                                        message[$SIZE] = messageSize = 50 + (typeof messageValue === 'string' && messageValue.length || 1);
                                    } else if (messageType === ERROR) {
                                        message[$SIZE] = messageSize = 50 + (message[$SIZE] || 0 || 1);
                                    } else if (!(message != null && typeof message === 'object')) {
                                        messageSize = 50 + (typeof messageValue === 'string' && messageValue.length || 1);
                                        messageType = 'sentinel';
                                        message = { 'value': messageValue };
                                        message[$TYPE] = messageType;
                                        message[$SIZE] = messageSize;
                                    } else {
                                        messageType = message[$TYPE] = messageType || 'leaf';
                                        message[$SIZE] = messageSize = message[$SIZE] || 0 || 50 + 1;
                                    }
                                    ;
                                    if (node != null && node !== message) {
                                        var nodeRefsLength$4 = node.__refsLength || 0, destRefsLength$4 = message.__refsLength || 0, i$11 = -1, ref$5;
                                        while (++i$11 < nodeRefsLength$4) {
                                            if ((ref$5 = node[__REF + i$11]) !== void 0) {
                                                ref$5[__CONTEXT] = message;
                                                message[__REF + (destRefsLength$4 + i$11)] = ref$5;
                                                node[__REF + i$11] = void 0;
                                            }
                                        }
                                        message[__REFS_LENGTH] = nodeRefsLength$4 + destRefsLength$4;
                                        node[__REFS_LENGTH] = ref$5 = void 0;
                                        if (node != null && typeof node === 'object') {
                                            var root$6 = root, head$5 = root$6.__head, tail$5 = root$6.__tail, next$5, prev$5;
                                            (next$5 = node.__next) && (next$5 != null && typeof next$5 === 'object') && (next$5.__prev = prev$5);
                                            (prev$5 = node.__prev) && (prev$5 != null && typeof prev$5 === 'object') && (prev$5.__next = next$5);
                                            node === head$5 && (root$6.__head = root$6.__next = head$5 = next$5);
                                            node === tail$5 && (root$6.__tail = root$6.__prev = tail$5 = prev$5);
                                            node.__next = node.__prev = void 0;
                                            head$5 = tail$5 = next$5 = prev$5 = void 0;
                                        }
                                    }
                                    nodeParent[key] = node = message;
                                    nodeType = node && node[$TYPE] || void 0;
                                    nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                    node = !node[__SELF] && ((node[__SELF] = node) || true) && ((node[__KEY] = key) || true) && ((node[__PARENT] = nodeParent) || true) && ((node[__ROOT] = nodeRoot) || true) && (node[__GENERATION] || (node[__GENERATION] = 0) || node) && ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue) && (nodeValue[__CONTAINER] = node)) || node;
                                }
                                if (node != null && jsonParent != null) {
                                    if (boxed === true) {
                                        jsonParent[key] = node;
                                    } else {
                                        var val$4 = nodeValue;
                                        if (val$4 != null && typeof val$4 === 'object') {
                                            var src$4 = val$4, keys$4 = Object.keys(src$4), x$4, i$12 = -1, n$4 = keys$4.length;
                                            val$4 = Array.isArray(src$4) && new Array(src$4.length) || Object.create(null);
                                            while (++i$12 < n$4) {
                                                x$4 = keys$4[i$12];
                                                !(!(x$4[0] !== '_' || x$4[1] !== '_') || (x$4 === __SELF || x$4 === __PARENT || x$4 === __ROOT)) && (val$4[x$4] = src$4[x$4]);
                                            }
                                        }
                                        if (!nodeType && (val$4 != null && typeof val$4 === 'object') && !Array.isArray(val$4)) {
                                            val$4[$TYPE] = LEAF;
                                        }
                                        jsonParent[key] = val$4;
                                    }
                                }
                                appendNullKey = false;
                                nodeParent = node;
                                break follow_path_5642;
                            }
                        } else if (depth < height) {
                            nodeParent = nodeParent;
                            messageParent = messageParent;
                            jsonParent = jsonParent;
                            depth = depth + 1;
                            continue follow_path_5642;
                        }
                        nodeParent = node;
                        break follow_path_5642;
                    } while (true);
                node = nodeParent;
                if (node != null || boxed === true) {
                    if (nodeType === ERROR) {
                        if (nodeExpires !== 1) {
                            var root$7 = root, head$6 = root$7.__head, tail$6 = root$7.__tail, next$6 = node.__next, prev$6 = node.__prev;
                            if (node !== head$6) {
                                next$6 && (next$6 != null && typeof next$6 === 'object') && (next$6.__prev = prev$6);
                                prev$6 && (prev$6 != null && typeof prev$6 === 'object') && (prev$6.__next = next$6);
                                (next$6 = head$6) && (head$6 != null && typeof head$6 === 'object') && (head$6.__prev = node);
                                root$7.__head = root$7.__next = head$6 = node;
                                head$6.__next = next$6;
                                head$6.__prev = void 0;
                            }
                            if (tail$6 == null || node === tail$6) {
                                root$7.__tail = root$7.__prev = tail$6 = prev$6 || node;
                            }
                            root$7 = head$6 = tail$6 = next$6 = prev$6 = void 0;
                        }
                        var pbv = Object.create(null);
                        var src$5 = requestedPath, i$13 = -1, n$5 = src$5.length, req = new Array(n$5);
                        while (++i$13 < n$5) {
                            req[i$13] = src$5[i$13];
                        }
                        if (appendNullKey === true) {
                            req[req.length] = null;
                        }
                        pbv.path = req;
                        if (boxed === true) {
                            pbv.value = node;
                        } else {
                            var dest = nodeValue, src$6 = dest, x$5;
                            if (dest != null && typeof dest === 'object') {
                                dest = Array.isArray(src$6) && [] || Object.create(null);
                                for (x$5 in src$6) {
                                    !(!(x$5[0] !== '_' || x$5[1] !== '_') || (x$5 === __SELF || x$5 === __PARENT || x$5 === __ROOT)) && (dest[x$5] = src$6[x$5]);
                                }
                            }
                            pbv.value = dest;
                        }
                        errors[errors.length] = pbv;
                    }
                    hasValue || (hasValue = jsonParent != null);
                    var src$7 = optimizedPath, i$14 = -1, n$6 = src$7.length, opt = new Array(n$6);
                    while (++i$14 < n$6) {
                        opt[i$14] = src$7[i$14];
                    }
                    var src$8 = requestedPath, i$15 = -1, n$7 = src$8.length, req$2 = new Array(n$7);
                    while (++i$15 < n$7) {
                        req$2[i$15] = src$8[i$15];
                    }
                    if (appendNullKey === true) {
                        req$2[req$2.length] = null;
                    }
                    requestedPaths[requestedPaths.length] = req$2;
                    optimizedPaths[optimizedPaths.length] = opt;
                }
                if (boxed === false && node == null || refreshing === true) {
                    var src$9 = boundPath, i$16 = -1, n$8 = src$9.length, req$3 = new Array(n$8);
                    while (++i$16 < n$8) {
                        req$3[i$16] = src$9[i$16];
                    }
                    var src$10 = optimizedPath, i$17 = -1, n$9 = src$10.length, opt$2 = new Array(n$9);
                    while (++i$17 < n$9) {
                        opt$2[i$17] = src$10[i$17];
                    }
                    var reqLen = req$3.length - 1, optLen = opt$2.length - 1, i$18 = -1, n$10 = requestedPath.length, j$2 = depth, k = height, x$6;
                    while (++i$18 < n$10) {
                        req$3[++reqLen] = path[i$18 + boundLength] != null && typeof path[i$18 + boundLength] === 'object' && [requestedPath[i$18]] || requestedPath[i$18];
                    }
                    i$18 = -1;
                    n$10 = height - depth;
                    while (++i$18 < n$10) {
                        x$6 = req$3[++reqLen] = path[++j$2 + boundLength];
                        x$6 != null && (opt$2[++optLen] = x$6);
                    }
                    req$3.pathSetIndex = index$2;
                    requestedMissingPaths[requestedMissingPaths.length] = req$3;
                    optimizedMissingPaths[optimizedMissingPaths.length] = opt$2;
                }
                appendNullKey = false;
                var key$3;
                depth = depth;
                unroll_5733:
                    do {
                        if (depth < 0) {
                            depth = (path.depth = 0) - 1;
                            break unroll_5733;
                        }
                        if (!((key$3 = path[depth]) != null && typeof key$3 === 'object')) {
                            depth = path.depth = depth - 1;
                            continue unroll_5733;
                        }
                        if (Array.isArray(key$3)) {
                            if (++key$3.index === key$3.length) {
                                if (!((key$3 = key$3[key$3.index = 0]) != null && typeof key$3 === 'object')) {
                                    depth = path.depth = depth - 1;
                                    continue unroll_5733;
                                }
                            } else {
                                depth = path.depth = depth;
                                break unroll_5733;
                            }
                        }
                        if (++key$3[__OFFSET] > (key$3.to || (key$3.to = key$3.from + (key$3.length || 1) - 1))) {
                            key$3[__OFFSET] = key$3.from;
                            depth = path.depth = depth - 1;
                            continue unroll_5733;
                        }
                        depth = path.depth = depth;
                        break unroll_5733;
                    } while (true);
                depth = depth;
            }
        }
    }
    values && (values[0] = hasValue && {
        paths: requestedPaths,
        jsong: jsons[-1]
    } || undefined);
    return {
        'values': values,
        'errors': errors,
        'requestedPaths': requestedPaths,
        'optimizedPaths': optimizedPaths,
        'requestedMissingPaths': requestedMissingPaths,
        'optimizedMissingPaths': optimizedMissingPaths
    };
}
function setJSONGsAsPathMap(model, envelopes, values, errorSelector, boundPath) {
    var boundLength = 0, nodeRoot = model._cache || {}, nodeParent, node;
    if (Array.isArray(boundPath)) {
        nodeParent = nodeRoot;
        boundLength = boundPath.length;
    } else {
        nodeParent = getBoundValue(model);
        boundPath = model._path || [];
    }
    var root = model._root || model, boxed = model._boxed || false, expired = root.expired || (root.expired = []), refreshing = model._refreshing || false, appendNullKey = false;
    typeof errorSelector === 'function' || (errorSelector = model._errorSelector) || (errorSelector = function (x$5, y) {
        return y;
    });
    var nodes = envelopes.nodes || (envelopes.nodes = []);
    var messages = envelopes.messages || (envelopes.messages = []);
    var jsons = envelopes.jsons || (envelopes.jsons = []);
    var errors = envelopes.errors || (envelopes.errors = []);
    var refs = envelopes.refs || (envelopes.refs = []);
    var depth = envelopes.depth || (envelopes.depth = 0);
    var refIndex = envelopes.refIndex || (envelopes.refIndex = 0);
    var refDepth = envelopes.refDepth || (envelopes.refDepth = 0);
    var requestedPath = envelopes.requestedPath || (envelopes.requestedPath = []);
    var optimizedPath = envelopes.optimizedPath || (envelopes.optimizedPath = []);
    var requestedPaths = envelopes.requestedPaths || (envelopes.requestedPaths = []);
    var optimizedPaths = envelopes.optimizedPaths || (envelopes.optimizedPaths = []);
    var requestedMissingPaths = envelopes.requestedMissingPaths || (envelopes.requestedMissingPaths = []);
    var optimizedMissingPaths = envelopes.optimizedMissingPaths || (envelopes.optimizedMissingPaths = []);
    var hasValue = envelopes.hasValue || (envelopes.hasValue = false);
    var jsonRoot = envelopes.jsonRoot || (envelopes.jsonRoot = values && values[0]);
    var jsonParent = envelopes.jsonParent || (envelopes.jsonParent = jsonRoot);
    var jsonNode = envelopes.jsonNode || (envelopes.jsonNode = jsonParent);
    var path, length = 0, height = 0, reference, refLength = 0, refHeight = 0, messageRoot, messageParent, message, nodeType, nodeValue, nodeSize, nodeTimestamp, nodeExpires, messageType, messageValue, messageSize, messageTimestamp, messageExpires;
    refs[-1] = boundPath;
    nodes[-1] = nodeParent;
    jsons[-1] = jsonParent;
    jsons[-2] = jsons;
    var envelope, pathSets, index = -1, count = envelopes.length;
    while (++index < count) {
        envelope = envelopes[index];
        pathSets = envelope.paths;
        messages[-1] = messageRoot = envelope.jsong || envelope.values || envelope.value || Object.create(null);
        var index$2 = -1, count$2 = pathSets.length;
        while (++index$2 < count$2) {
            path = pathSets[index$2];
            depth = 0;
            length = path.length;
            height = length - 1;
            var ref;
            refs.length = 0;
            while (depth > -1) {
                refIndex = depth;
                while (--refIndex >= -1) {
                    if (!!(ref = refs[refIndex])) {
                        refLength = ref.length;
                        var i = -1, j = 0;
                        while (++i < refLength) {
                            optimizedPath[j++] = ref[i];
                        }
                        i = ++refIndex;
                        while (i < depth) {
                            optimizedPath[j++] = requestedPath[i++];
                        }
                        optimizedPath.length = j;
                        break;
                    }
                }
                var key, isKeySet;
                path = path;
                height = (length = path.length) - 1;
                nodeParent = node = nodes[depth - 1];
                messageParent = message = messages[depth - 1];
                jsonParent = jsonNode = jsons[depth - 1];
                depth = depth;
                follow_path_9312:
                    do {
                        key = path[depth];
                        if (isKeySet = key != null && typeof key === 'object') {
                            if (Array.isArray(key)) {
                                if ((key = key[key.index || (key.index = 0)]) != null && typeof key === 'object') {
                                    key = key[__OFFSET] === void 0 && (key[__OFFSET] = key.from || (key.from = 0)) || key[__OFFSET];
                                }
                            } else {
                                key = key[__OFFSET] === void 0 && (key[__OFFSET] = key.from || (key.from = 0)) || key[__OFFSET];
                            }
                        }
                        if (key === __NULL) {
                            key = null;
                        }
                        depth >= boundLength && (requestedPath[requestedPath.length = depth] = key);
                        if (key != null) {
                            if (depth < height) {
                                optimizedPath[optimizedPath.length = depth + (refLength - refIndex)] = key;
                                node = nodeParent[key];
                                nodeType = node && node[$TYPE] || void 0;
                                nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                nodeTimestamp = node && node[$TIMESTAMP];
                                nodeExpires = node && node[$EXPIRES];
                                if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                    node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                }
                                message = messageParent[key];
                                messageType = message && message[$TYPE] || void 0;
                                messageValue = messageType === SENTINEL ? message[VALUE] : messageType === ERROR ? message = errorSelector(requestedPath, message) : message;
                                messageTimestamp = message && message[$TIMESTAMP];
                                messageExpires = message && message[$EXPIRES];
                                if (message != null && typeof message === 'object' && (messageExpires != null && messageExpires !== 1 && (messageExpires === 0 || messageExpires < Date.now()) || message[__INVALIDATED] === true)) {
                                    message = messageValue = (expired[expired.length] = message) && (message[__INVALIDATED] = true) && void 0;
                                }
                                node = node;
                                message = message;
                                merge_node_9552:
                                    do {
                                        if (node === message) {
                                            node = node;
                                            break merge_node_9552;
                                        }
                                        if (node != null) {
                                            if (message != null) {
                                                if ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                                                    if ((!messageType || messageType === SENTINEL) && Array.isArray(messageValue)) {
                                                        if ((messageTimestamp < nodeTimestamp || messageExpires === 0 && ((node = message) || true)) === false) {
                                                            message = message;
                                                            node = node;
                                                            nodeValue = nodeValue;
                                                            messageValue = messageValue;
                                                            replace_cache_reference_9723:
                                                                do {
                                                                    // compare the cache and message references.
                                                                    // if they're the same, break early so we don't insert.
                                                                    // if they're different, replace the cache reference.
                                                                    var i$2 = nodeValue.length;
                                                                    // If the reference lengths are equal, we have to check their keys
                                                                    // for equality.
                                                                    // If their lengths aren't the equal, the references aren't equal.
                                                                    // Insert the reference from the message.
                                                                    if (i$2 === messageValue.length) {
                                                                        while (--i$2 > -1) {
                                                                            // If any of their keys are different, replace the reference
                                                                            // in the cache with the reference in the message.
                                                                            if (nodeValue[i$2] !== messageValue[i$2]) {
                                                                                message = message;
                                                                                break replace_cache_reference_9723;
                                                                            }
                                                                        }
                                                                        if (i$2 === -1) {
                                                                            message = node;
                                                                            break replace_cache_reference_9723;
                                                                        }
                                                                    }
                                                                    message = message;
                                                                    break replace_cache_reference_9723;
                                                                } while (true);
                                                            message = message;
                                                        }
                                                    }
                                                }
                                                if (node === message || !nodeType && (node != null && typeof node === 'object') && !Array.isArray(nodeValue) && (!messageType && (message != null && typeof message === 'object') && !Array.isArray(messageValue))) {
                                                    node = node;
                                                    break merge_node_9552;
                                                }
                                            } else if (!nodeType && (node != null && typeof node === 'object') || (!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                                                node = message = node;
                                                break merge_node_9552;
                                            }
                                        }
                                        if (message == null || messageType !== void 0 || typeof message !== 'object' || Array.isArray(messageValue)) {
                                            message = message;
                                            if ((!messageType || messageType === SENTINEL) && Array.isArray(messageValue)) {
                                                messageType = 'array';
                                                message[$SIZE] = messageSize = (messageType === SENTINEL && 50 || 0) + (messageValue.length || 1);
                                                delete messageValue[$SIZE];
                                                messageValue[__CONTAINER] = message;
                                            } else if (messageType === SENTINEL) {
                                                message[$SIZE] = messageSize = 50 + (typeof messageValue === 'string' && messageValue.length || 1);
                                            } else if (messageType === ERROR) {
                                                message[$SIZE] = messageSize = 50 + (message[$SIZE] || 0 || 1);
                                            } else if (!(message != null && typeof message === 'object')) {
                                                messageSize = 50 + (typeof messageValue === 'string' && messageValue.length || 1);
                                                messageType = 'sentinel';
                                                message = { 'value': messageValue };
                                                message[$TYPE] = messageType;
                                                message[$SIZE] = messageSize;
                                            } else {
                                                messageType = message[$TYPE] = messageType || 'leaf';
                                                message[$SIZE] = messageSize = message[$SIZE] || 0 || 50 + 1;
                                            }
                                            ;
                                        }
                                        if (node != null && node !== message) {
                                            var nodeRefsLength = node.__refsLength || 0, destRefsLength = message.__refsLength || 0, i$3 = -1, ref$2;
                                            while (++i$3 < nodeRefsLength) {
                                                if ((ref$2 = node[__REF + i$3]) !== void 0) {
                                                    ref$2[__CONTEXT] = message;
                                                    message[__REF + (destRefsLength + i$3)] = ref$2;
                                                    node[__REF + i$3] = void 0;
                                                }
                                            }
                                            message[__REFS_LENGTH] = nodeRefsLength + destRefsLength;
                                            node[__REFS_LENGTH] = ref$2 = void 0;
                                            if (node != null && typeof node === 'object') {
                                                var root$2 = root, head = root$2.__head, tail = root$2.__tail, next, prev;
                                                (next = node.__next) && (next != null && typeof next === 'object') && (next.__prev = prev);
                                                (prev = node.__prev) && (prev != null && typeof prev === 'object') && (prev.__next = next);
                                                node === head && (root$2.__head = root$2.__next = head = next);
                                                node === tail && (root$2.__tail = root$2.__prev = tail = prev);
                                                node.__next = node.__prev = void 0;
                                                head = tail = next = prev = void 0;
                                            }
                                        }
                                        nodeParent[key] = node = message;
                                        nodeType = node && node[$TYPE] || void 0;
                                        nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                        nodeTimestamp = node && node[$TIMESTAMP];
                                        nodeExpires = node && node[$EXPIRES];
                                        node = node;
                                        break merge_node_9552;
                                    } while (true);
                                node = node;
                                node != null && (node = !node[__SELF] && ((node[__SELF] = node) || true) && ((node[__KEY] = key) || true) && ((node[__PARENT] = nodeParent) || true) && ((node[__ROOT] = nodeRoot) || true) && (node[__GENERATION] || (node[__GENERATION] = 0) || node) && ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue) && (nodeValue[__CONTAINER] = node)) || node);
                                if ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                                    do {
                                        if (nodeExpires !== 1) {
                                            var root$3 = root, head$2 = root$3.__head, tail$2 = root$3.__tail, next$2 = node.__next, prev$2 = node.__prev;
                                            if (node !== head$2) {
                                                next$2 && (next$2 != null && typeof next$2 === 'object') && (next$2.__prev = prev$2);
                                                prev$2 && (prev$2 != null && typeof prev$2 === 'object') && (prev$2.__next = next$2);
                                                (next$2 = head$2) && (head$2 != null && typeof head$2 === 'object') && (head$2.__prev = node);
                                                root$3.__head = root$3.__next = head$2 = node;
                                                head$2.__next = next$2;
                                                head$2.__prev = void 0;
                                            }
                                            if (tail$2 == null || node === tail$2) {
                                                root$3.__tail = root$3.__prev = tail$2 = prev$2 || node;
                                            }
                                            root$3 = head$2 = tail$2 = next$2 = prev$2 = void 0;
                                        }
                                        refs[depth] = nodeValue;
                                        refIndex = depth + 1;
                                        refDepth = 0;
                                        var key$2, isKeySet$2;
                                        reference = nodeValue;
                                        refHeight = (refLength = reference.length) - 1;
                                        nodeParent = nodeRoot;
                                        messageParent = messageRoot;
                                        jsonParent = jsonRoot;
                                        refDepth = refDepth;
                                        follow_path_9894:
                                            do {
                                                key$2 = reference[refDepth];
                                                isKeySet$2 = false;
                                                if (key$2 != null) {
                                                    if (refDepth < refHeight) {
                                                        optimizedPath[optimizedPath.length = refDepth] = key$2;
                                                        node = nodeParent[key$2];
                                                        nodeType = node && node[$TYPE] || void 0;
                                                        nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                                        nodeTimestamp = node && node[$TIMESTAMP];
                                                        nodeExpires = node && node[$EXPIRES];
                                                        if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                                            node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                                        }
                                                        message = messageParent[key$2];
                                                        messageType = message && message[$TYPE] || void 0;
                                                        messageValue = messageType === SENTINEL ? message[VALUE] : messageType === ERROR ? message = errorSelector(requestedPath, message) : message;
                                                        messageTimestamp = message && message[$TIMESTAMP];
                                                        messageExpires = message && message[$EXPIRES];
                                                        if (message != null && typeof message === 'object' && (messageExpires != null && messageExpires !== 1 && (messageExpires === 0 || messageExpires < Date.now()) || message[__INVALIDATED] === true)) {
                                                            message = messageValue = (expired[expired.length] = message) && (message[__INVALIDATED] = true) && void 0;
                                                        }
                                                        node = node;
                                                        message = message;
                                                        merge_node_10038:
                                                            do {
                                                                if (node === message) {
                                                                    node = node;
                                                                    break merge_node_10038;
                                                                }
                                                                if (node != null) {
                                                                    if (message != null) {
                                                                        if ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                                                                            if ((!messageType || messageType === SENTINEL) && Array.isArray(messageValue)) {
                                                                                if ((messageTimestamp < nodeTimestamp || messageExpires === 0 && ((node = message) || true)) === false) {
                                                                                    message = message;
                                                                                    node = node;
                                                                                    nodeValue = nodeValue;
                                                                                    messageValue = messageValue;
                                                                                    replace_cache_reference_10208:
                                                                                        do {
                                                                                            // compare the cache and message references.
                                                                                            // if they're the same, break early so we don't insert.
                                                                                            // if they're different, replace the cache reference.
                                                                                            var i$4 = nodeValue.length;
                                                                                            // If the reference lengths are equal, we have to check their keys
                                                                                            // for equality.
                                                                                            // If their lengths aren't the equal, the references aren't equal.
                                                                                            // Insert the reference from the message.
                                                                                            if (i$4 === messageValue.length) {
                                                                                                while (--i$4 > -1) {
                                                                                                    // If any of their keys are different, replace the reference
                                                                                                    // in the cache with the reference in the message.
                                                                                                    if (nodeValue[i$4] !== messageValue[i$4]) {
                                                                                                        message = message;
                                                                                                        break replace_cache_reference_10208;
                                                                                                    }
                                                                                                }
                                                                                                if (i$4 === -1) {
                                                                                                    message = node;
                                                                                                    break replace_cache_reference_10208;
                                                                                                }
                                                                                            }
                                                                                            message = message;
                                                                                            break replace_cache_reference_10208;
                                                                                        } while (true);
                                                                                    message = message;
                                                                                }
                                                                            }
                                                                        }
                                                                        if (node === message || !nodeType && (node != null && typeof node === 'object') && !Array.isArray(nodeValue) && (!messageType && (message != null && typeof message === 'object') && !Array.isArray(messageValue))) {
                                                                            node = node;
                                                                            break merge_node_10038;
                                                                        }
                                                                    } else if (!nodeType && (node != null && typeof node === 'object') || (!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                                                                        node = message = node;
                                                                        break merge_node_10038;
                                                                    }
                                                                }
                                                                if (message == null || messageType !== void 0 || typeof message !== 'object' || Array.isArray(messageValue)) {
                                                                    message = message;
                                                                    if ((!messageType || messageType === SENTINEL) && Array.isArray(messageValue)) {
                                                                        messageType = 'array';
                                                                        message[$SIZE] = messageSize = (messageType === SENTINEL && 50 || 0) + (messageValue.length || 1);
                                                                        delete messageValue[$SIZE];
                                                                        messageValue[__CONTAINER] = message;
                                                                    } else if (messageType === SENTINEL) {
                                                                        message[$SIZE] = messageSize = 50 + (typeof messageValue === 'string' && messageValue.length || 1);
                                                                    } else if (messageType === ERROR) {
                                                                        message[$SIZE] = messageSize = 50 + (message[$SIZE] || 0 || 1);
                                                                    } else if (!(message != null && typeof message === 'object')) {
                                                                        messageSize = 50 + (typeof messageValue === 'string' && messageValue.length || 1);
                                                                        messageType = 'sentinel';
                                                                        message = { 'value': messageValue };
                                                                        message[$TYPE] = messageType;
                                                                        message[$SIZE] = messageSize;
                                                                    } else {
                                                                        messageType = message[$TYPE] = messageType || 'leaf';
                                                                        message[$SIZE] = messageSize = message[$SIZE] || 0 || 50 + 1;
                                                                    }
                                                                    ;
                                                                }
                                                                if (node != null && node !== message) {
                                                                    var nodeRefsLength$2 = node.__refsLength || 0, destRefsLength$2 = message.__refsLength || 0, i$5 = -1, ref$3;
                                                                    while (++i$5 < nodeRefsLength$2) {
                                                                        if ((ref$3 = node[__REF + i$5]) !== void 0) {
                                                                            ref$3[__CONTEXT] = message;
                                                                            message[__REF + (destRefsLength$2 + i$5)] = ref$3;
                                                                            node[__REF + i$5] = void 0;
                                                                        }
                                                                    }
                                                                    message[__REFS_LENGTH] = nodeRefsLength$2 + destRefsLength$2;
                                                                    node[__REFS_LENGTH] = ref$3 = void 0;
                                                                    if (node != null && typeof node === 'object') {
                                                                        var root$4 = root, head$3 = root$4.__head, tail$3 = root$4.__tail, next$3, prev$3;
                                                                        (next$3 = node.__next) && (next$3 != null && typeof next$3 === 'object') && (next$3.__prev = prev$3);
                                                                        (prev$3 = node.__prev) && (prev$3 != null && typeof prev$3 === 'object') && (prev$3.__next = next$3);
                                                                        node === head$3 && (root$4.__head = root$4.__next = head$3 = next$3);
                                                                        node === tail$3 && (root$4.__tail = root$4.__prev = tail$3 = prev$3);
                                                                        node.__next = node.__prev = void 0;
                                                                        head$3 = tail$3 = next$3 = prev$3 = void 0;
                                                                    }
                                                                }
                                                                nodeParent[key$2] = node = message;
                                                                nodeType = node && node[$TYPE] || void 0;
                                                                nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                                                nodeTimestamp = node && node[$TIMESTAMP];
                                                                nodeExpires = node && node[$EXPIRES];
                                                                node = node;
                                                                break merge_node_10038;
                                                            } while (true);
                                                        node = node;
                                                        node != null && (node = !node[__SELF] && ((node[__SELF] = node) || true) && ((node[__KEY] = key$2) || true) && ((node[__PARENT] = nodeParent) || true) && ((node[__ROOT] = nodeRoot) || true) && (node[__GENERATION] || (node[__GENERATION] = 0) || node) && ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue) && (nodeValue[__CONTAINER] = node)) || node);
                                                        if (appendNullKey = node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue)) {
                                                            nodeParent = node;
                                                            break follow_path_9894;
                                                        }
                                                        nodeParent = node;
                                                        messageParent = message;
                                                        jsonParent = jsonNode;
                                                        refDepth = refDepth + 1;
                                                        continue follow_path_9894;
                                                    } else if (refDepth === refHeight) {
                                                        optimizedPath[optimizedPath.length = refDepth] = key$2;
                                                        node = nodeParent[key$2];
                                                        nodeType = node && node[$TYPE] || void 0;
                                                        nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                                        nodeTimestamp = node && node[$TIMESTAMP];
                                                        nodeExpires = node && node[$EXPIRES];
                                                        if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                                            node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                                        }
                                                        message = messageParent[key$2];
                                                        messageType = message && message[$TYPE] || void 0;
                                                        messageValue = messageType === SENTINEL ? message[VALUE] : messageType === ERROR ? message = errorSelector(requestedPath, message) : message;
                                                        messageTimestamp = message && message[$TIMESTAMP];
                                                        messageExpires = message && message[$EXPIRES];
                                                        if (message != null && typeof message === 'object' && (messageExpires != null && messageExpires !== 1 && (messageExpires === 0 || messageExpires < Date.now()) || message[__INVALIDATED] === true)) {
                                                            message = messageValue = (expired[expired.length] = message) && (message[__INVALIDATED] = true) && void 0;
                                                        }
                                                        node = node;
                                                        message = message;
                                                        merge_node_10413:
                                                            do {
                                                                if (node === message) {
                                                                    node = node;
                                                                    break merge_node_10413;
                                                                }
                                                                if (node != null) {
                                                                    if (message != null) {
                                                                        if ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                                                                            if ((!messageType || messageType === SENTINEL) && Array.isArray(messageValue)) {
                                                                                if ((messageTimestamp < nodeTimestamp || messageExpires === 0 && ((node = message) || true)) === false) {
                                                                                    message = message;
                                                                                    node = node;
                                                                                    nodeValue = nodeValue;
                                                                                    messageValue = messageValue;
                                                                                    replace_cache_reference_10580:
                                                                                        do {
                                                                                            // compare the cache and message references.
                                                                                            // if they're the same, break early so we don't insert.
                                                                                            // if they're different, replace the cache reference.
                                                                                            var i$6 = nodeValue.length;
                                                                                            // If the reference lengths are equal, we have to check their keys
                                                                                            // for equality.
                                                                                            // If their lengths aren't the equal, the references aren't equal.
                                                                                            // Insert the reference from the message.
                                                                                            if (i$6 === messageValue.length) {
                                                                                                while (--i$6 > -1) {
                                                                                                    // If any of their keys are different, replace the reference
                                                                                                    // in the cache with the reference in the message.
                                                                                                    if (nodeValue[i$6] !== messageValue[i$6]) {
                                                                                                        message = message;
                                                                                                        break replace_cache_reference_10580;
                                                                                                    }
                                                                                                }
                                                                                                if (i$6 === -1) {
                                                                                                    message = node;
                                                                                                    break replace_cache_reference_10580;
                                                                                                }
                                                                                            }
                                                                                            message = message;
                                                                                            break replace_cache_reference_10580;
                                                                                        } while (true);
                                                                                    message = message;
                                                                                }
                                                                            }
                                                                        }
                                                                        if (node === message || !nodeType && (node != null && typeof node === 'object') && !Array.isArray(nodeValue) && (!messageType && (message != null && typeof message === 'object') && !Array.isArray(messageValue))) {
                                                                            node = node;
                                                                            break merge_node_10413;
                                                                        }
                                                                    } else if (!nodeType && (node != null && typeof node === 'object') || (!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                                                                        node = message = node;
                                                                        break merge_node_10413;
                                                                    }
                                                                }
                                                                if (message == null || messageType !== void 0 || typeof message !== 'object' || Array.isArray(messageValue)) {
                                                                    message = message;
                                                                    if ((!messageType || messageType === SENTINEL) && Array.isArray(messageValue)) {
                                                                        messageType = 'array';
                                                                        message[$SIZE] = messageSize = (messageType === SENTINEL && 50 || 0) + (messageValue.length || 1);
                                                                        delete messageValue[$SIZE];
                                                                        messageValue[__CONTAINER] = message;
                                                                    } else if (messageType === SENTINEL) {
                                                                        message[$SIZE] = messageSize = 50 + (typeof messageValue === 'string' && messageValue.length || 1);
                                                                    } else if (messageType === ERROR) {
                                                                        message[$SIZE] = messageSize = 50 + (message[$SIZE] || 0 || 1);
                                                                    } else if (!(message != null && typeof message === 'object')) {
                                                                        messageSize = 50 + (typeof messageValue === 'string' && messageValue.length || 1);
                                                                        messageType = 'sentinel';
                                                                        message = { 'value': messageValue };
                                                                        message[$TYPE] = messageType;
                                                                        message[$SIZE] = messageSize;
                                                                    } else {
                                                                        messageType = message[$TYPE] = messageType || 'leaf';
                                                                        message[$SIZE] = messageSize = message[$SIZE] || 0 || 50 + 1;
                                                                    }
                                                                    ;
                                                                }
                                                                if (node != null && node !== message) {
                                                                    var nodeRefsLength$3 = node.__refsLength || 0, destRefsLength$3 = message.__refsLength || 0, i$7 = -1, ref$4;
                                                                    while (++i$7 < nodeRefsLength$3) {
                                                                        if ((ref$4 = node[__REF + i$7]) !== void 0) {
                                                                            ref$4[__CONTEXT] = message;
                                                                            message[__REF + (destRefsLength$3 + i$7)] = ref$4;
                                                                            node[__REF + i$7] = void 0;
                                                                        }
                                                                    }
                                                                    message[__REFS_LENGTH] = nodeRefsLength$3 + destRefsLength$3;
                                                                    node[__REFS_LENGTH] = ref$4 = void 0;
                                                                    if (node != null && typeof node === 'object') {
                                                                        var root$5 = root, head$4 = root$5.__head, tail$4 = root$5.__tail, next$4, prev$4;
                                                                        (next$4 = node.__next) && (next$4 != null && typeof next$4 === 'object') && (next$4.__prev = prev$4);
                                                                        (prev$4 = node.__prev) && (prev$4 != null && typeof prev$4 === 'object') && (prev$4.__next = next$4);
                                                                        node === head$4 && (root$5.__head = root$5.__next = head$4 = next$4);
                                                                        node === tail$4 && (root$5.__tail = root$5.__prev = tail$4 = prev$4);
                                                                        node.__next = node.__prev = void 0;
                                                                        head$4 = tail$4 = next$4 = prev$4 = void 0;
                                                                    }
                                                                }
                                                                nodeParent[key$2] = node = message;
                                                                nodeType = node && node[$TYPE] || void 0;
                                                                nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                                                nodeTimestamp = node && node[$TIMESTAMP];
                                                                nodeExpires = node && node[$EXPIRES];
                                                                node = node;
                                                                break merge_node_10413;
                                                            } while (true);
                                                        node = node;
                                                        node != null && (node = !node[__SELF] && ((node[__SELF] = node) || true) && ((node[__KEY] = key$2) || true) && ((node[__PARENT] = nodeParent) || true) && ((node[__ROOT] = nodeRoot) || true) && (node[__GENERATION] || (node[__GENERATION] = 0) || node) && ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue) && (nodeValue[__CONTAINER] = node)) || node);
                                                        appendNullKey = node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue);
                                                        nodeParent = node;
                                                        break follow_path_9894;
                                                    }
                                                } else if (refDepth < refHeight) {
                                                    nodeParent = node;
                                                    messageParent = message;
                                                    jsonParent = jsonNode;
                                                    refDepth = refDepth + 1;
                                                    continue follow_path_9894;
                                                }
                                                nodeParent = node;
                                                break follow_path_9894;
                                            } while (true);
                                        node = nodeParent;
                                    } while ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue));
                                    if (node == null) {
                                        while (refDepth <= refHeight) {
                                            optimizedPath[refDepth] = reference[refDepth++];
                                        }
                                    }
                                }
                                if (depth >= boundLength) {
                                    if (node != null && jsonParent != null) {
                                        if (!nodeType && (node != null && typeof node === 'object') && !Array.isArray(nodeValue)) {
                                            if (!(jsonNode = jsonParent[key]) || !(jsonNode != null && typeof jsonNode === 'object')) {
                                                jsonNode = jsonParent[key] = Object.create(null);
                                            }
                                            jsonNode[__KEY] = key;
                                            jsonNode[__GENERATION] = node[__GENERATION] || 0;
                                        } else {
                                            if (boxed === true) {
                                                jsonParent[key] = node;
                                            } else {
                                                var val = nodeValue;
                                                if (val != null && typeof val === 'object') {
                                                    var src = val, keys = Object.keys(src), x, i$8 = -1, n = keys.length;
                                                    val = Array.isArray(src) && new Array(src.length) || Object.create(null);
                                                    while (++i$8 < n) {
                                                        x = keys[i$8];
                                                        !(!(x[0] !== '_' || x[1] !== '_') || (x === __SELF || x === __PARENT || x === __ROOT) || x[0] === '$') && (val[x] = src[x]);
                                                    }
                                                }
                                                if (val != null && typeof val === 'object' && !Array.isArray(val)) {
                                                    val[$TYPE] = LEAF;
                                                }
                                                jsonParent[key] = val;
                                            }
                                        }
                                    }
                                }
                                if (node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue)) {
                                    nodeParent = node;
                                    break follow_path_9312;
                                }
                                nodeParent = nodes[depth] = node;
                                messageParent = messages[depth] = message;
                                jsonParent = jsons[depth] = jsonNode;
                                depth = depth + 1;
                                continue follow_path_9312;
                            } else if (depth === height) {
                                optimizedPath[optimizedPath.length = depth + (refLength - refIndex)] = key;
                                node = nodeParent[key];
                                nodeType = node && node[$TYPE] || void 0;
                                nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                nodeTimestamp = node && node[$TIMESTAMP];
                                nodeExpires = node && node[$EXPIRES];
                                if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                    node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                }
                                message = messageParent[key];
                                messageType = message && message[$TYPE] || void 0;
                                messageValue = messageType === SENTINEL ? message[VALUE] : messageType === ERROR ? message = errorSelector(requestedPath, message) : message;
                                messageTimestamp = message && message[$TIMESTAMP];
                                messageExpires = message && message[$EXPIRES];
                                if (message != null && typeof message === 'object' && (messageExpires != null && messageExpires !== 1 && (messageExpires === 0 || messageExpires < Date.now()) || message[__INVALIDATED] === true)) {
                                    message = messageValue = (expired[expired.length] = message) && (message[__INVALIDATED] = true) && void 0;
                                }
                                if ((messageTimestamp < nodeTimestamp || messageExpires === 0 && ((node = message) || true)) === false) {
                                    message = message;
                                    if ((!messageType || messageType === SENTINEL) && Array.isArray(messageValue)) {
                                        messageType = 'array';
                                        message[$SIZE] = messageSize = (messageType === SENTINEL && 50 || 0) + (messageValue.length || 1);
                                        delete messageValue[$SIZE];
                                        messageValue[__CONTAINER] = message;
                                    } else if (messageType === SENTINEL) {
                                        message[$SIZE] = messageSize = 50 + (typeof messageValue === 'string' && messageValue.length || 1);
                                    } else if (messageType === ERROR) {
                                        message[$SIZE] = messageSize = 50 + (message[$SIZE] || 0 || 1);
                                    } else if (!(message != null && typeof message === 'object')) {
                                        messageSize = 50 + (typeof messageValue === 'string' && messageValue.length || 1);
                                        messageType = 'sentinel';
                                        message = { 'value': messageValue };
                                        message[$TYPE] = messageType;
                                        message[$SIZE] = messageSize;
                                    } else {
                                        messageType = message[$TYPE] = messageType || 'leaf';
                                        message[$SIZE] = messageSize = message[$SIZE] || 0 || 50 + 1;
                                    }
                                    ;
                                    if (node != null && node !== message) {
                                        var nodeRefsLength$4 = node.__refsLength || 0, destRefsLength$4 = message.__refsLength || 0, i$9 = -1, ref$5;
                                        while (++i$9 < nodeRefsLength$4) {
                                            if ((ref$5 = node[__REF + i$9]) !== void 0) {
                                                ref$5[__CONTEXT] = message;
                                                message[__REF + (destRefsLength$4 + i$9)] = ref$5;
                                                node[__REF + i$9] = void 0;
                                            }
                                        }
                                        message[__REFS_LENGTH] = nodeRefsLength$4 + destRefsLength$4;
                                        node[__REFS_LENGTH] = ref$5 = void 0;
                                        if (node != null && typeof node === 'object') {
                                            var root$6 = root, head$5 = root$6.__head, tail$5 = root$6.__tail, next$5, prev$5;
                                            (next$5 = node.__next) && (next$5 != null && typeof next$5 === 'object') && (next$5.__prev = prev$5);
                                            (prev$5 = node.__prev) && (prev$5 != null && typeof prev$5 === 'object') && (prev$5.__next = next$5);
                                            node === head$5 && (root$6.__head = root$6.__next = head$5 = next$5);
                                            node === tail$5 && (root$6.__tail = root$6.__prev = tail$5 = prev$5);
                                            node.__next = node.__prev = void 0;
                                            head$5 = tail$5 = next$5 = prev$5 = void 0;
                                        }
                                    }
                                    nodeParent[key] = node = message;
                                    nodeType = node && node[$TYPE] || void 0;
                                    nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                    node = !node[__SELF] && ((node[__SELF] = node) || true) && ((node[__KEY] = key) || true) && ((node[__PARENT] = nodeParent) || true) && ((node[__ROOT] = nodeRoot) || true) && (node[__GENERATION] || (node[__GENERATION] = 0) || node) && ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue) && (nodeValue[__CONTAINER] = node)) || node;
                                }
                                if (depth >= boundLength) {
                                    if (node != null && jsonParent != null) {
                                        if (boxed === true) {
                                            jsonParent[key] = node;
                                        } else {
                                            var val$2 = nodeValue;
                                            if (val$2 != null && typeof val$2 === 'object') {
                                                var src$2 = val$2, keys$2 = Object.keys(src$2), x$2, i$10 = -1, n$2 = keys$2.length;
                                                val$2 = Array.isArray(src$2) && new Array(src$2.length) || Object.create(null);
                                                while (++i$10 < n$2) {
                                                    x$2 = keys$2[i$10];
                                                    !(!(x$2[0] !== '_' || x$2[1] !== '_') || (x$2 === __SELF || x$2 === __PARENT || x$2 === __ROOT) || x$2[0] === '$') && (val$2[x$2] = src$2[x$2]);
                                                }
                                            }
                                            if (val$2 != null && typeof val$2 === 'object' && !Array.isArray(val$2)) {
                                                val$2[$TYPE] = LEAF;
                                            }
                                            jsonParent[key] = val$2;
                                        }
                                    }
                                }
                                appendNullKey = false;
                                nodeParent = node;
                                break follow_path_9312;
                            }
                        } else if (depth < height) {
                            nodeParent = nodeParent;
                            messageParent = messageParent;
                            jsonParent = jsonParent;
                            depth = depth + 1;
                            continue follow_path_9312;
                        }
                        nodeParent = node;
                        break follow_path_9312;
                    } while (true);
                node = nodeParent;
                if (node != null || boxed === true) {
                    if (nodeType === ERROR) {
                        if (nodeExpires !== 1) {
                            var root$7 = root, head$6 = root$7.__head, tail$6 = root$7.__tail, next$6 = node.__next, prev$6 = node.__prev;
                            if (node !== head$6) {
                                next$6 && (next$6 != null && typeof next$6 === 'object') && (next$6.__prev = prev$6);
                                prev$6 && (prev$6 != null && typeof prev$6 === 'object') && (prev$6.__next = next$6);
                                (next$6 = head$6) && (head$6 != null && typeof head$6 === 'object') && (head$6.__prev = node);
                                root$7.__head = root$7.__next = head$6 = node;
                                head$6.__next = next$6;
                                head$6.__prev = void 0;
                            }
                            if (tail$6 == null || node === tail$6) {
                                root$7.__tail = root$7.__prev = tail$6 = prev$6 || node;
                            }
                            root$7 = head$6 = tail$6 = next$6 = prev$6 = void 0;
                        }
                        var pbv = Object.create(null);
                        var src$3 = requestedPath, i$11 = -1, n$3 = src$3.length, req = new Array(n$3);
                        while (++i$11 < n$3) {
                            req[i$11] = src$3[i$11];
                        }
                        if (appendNullKey === true) {
                            req[req.length] = null;
                        }
                        pbv.path = req;
                        if (boxed === true) {
                            pbv.value = node;
                        } else {
                            var dest = nodeValue, src$4 = dest, x$3;
                            if (dest != null && typeof dest === 'object') {
                                dest = Array.isArray(src$4) && [] || Object.create(null);
                                for (x$3 in src$4) {
                                    !(!(x$3[0] !== '_' || x$3[1] !== '_') || (x$3 === __SELF || x$3 === __PARENT || x$3 === __ROOT) || x$3[0] === '$') && (dest[x$3] = src$4[x$3]);
                                }
                            }
                            pbv.value = dest;
                        }
                        errors[errors.length] = pbv;
                    }
                    hasValue || (hasValue = jsonParent != null);
                    var src$5 = optimizedPath, i$12 = -1, n$4 = src$5.length, opt = new Array(n$4);
                    while (++i$12 < n$4) {
                        opt[i$12] = src$5[i$12];
                    }
                    var src$6 = requestedPath, i$13 = -1, n$5 = src$6.length, req$2 = new Array(n$5);
                    while (++i$13 < n$5) {
                        req$2[i$13] = src$6[i$13];
                    }
                    if (appendNullKey === true) {
                        req$2[req$2.length] = null;
                    }
                    requestedPaths[requestedPaths.length] = req$2;
                    optimizedPaths[optimizedPaths.length] = opt;
                }
                if (boxed === false && node == null || refreshing === true) {
                    var src$7 = boundPath, i$14 = -1, n$6 = src$7.length, req$3 = new Array(n$6);
                    while (++i$14 < n$6) {
                        req$3[i$14] = src$7[i$14];
                    }
                    var src$8 = optimizedPath, i$15 = -1, n$7 = src$8.length, opt$2 = new Array(n$7);
                    while (++i$15 < n$7) {
                        opt$2[i$15] = src$8[i$15];
                    }
                    var reqLen = req$3.length - 1, optLen = opt$2.length - 1, i$16 = -1, n$8 = requestedPath.length, j$2 = depth, k = height, x$4;
                    while (++i$16 < n$8) {
                        req$3[++reqLen] = path[i$16 + boundLength] != null && typeof path[i$16 + boundLength] === 'object' && [requestedPath[i$16]] || requestedPath[i$16];
                    }
                    i$16 = -1;
                    n$8 = height - depth;
                    while (++i$16 < n$8) {
                        x$4 = req$3[++reqLen] = path[++j$2 + boundLength];
                        x$4 != null && (opt$2[++optLen] = x$4);
                    }
                    req$3.pathSetIndex = index$2;
                    requestedMissingPaths[requestedMissingPaths.length] = req$3;
                    optimizedMissingPaths[optimizedMissingPaths.length] = opt$2;
                }
                appendNullKey = false;
                var key$3;
                depth = depth;
                unroll_9403:
                    do {
                        if (depth < 0) {
                            depth = (path.depth = 0) - 1;
                            break unroll_9403;
                        }
                        if (!((key$3 = path[depth]) != null && typeof key$3 === 'object')) {
                            depth = path.depth = depth - 1;
                            continue unroll_9403;
                        }
                        if (Array.isArray(key$3)) {
                            if (++key$3.index === key$3.length) {
                                if (!((key$3 = key$3[key$3.index = 0]) != null && typeof key$3 === 'object')) {
                                    depth = path.depth = depth - 1;
                                    continue unroll_9403;
                                }
                            } else {
                                depth = path.depth = depth;
                                break unroll_9403;
                            }
                        }
                        if (++key$3[__OFFSET] > (key$3.to || (key$3.to = key$3.from + (key$3.length || 1) - 1))) {
                            key$3[__OFFSET] = key$3.from;
                            depth = path.depth = depth - 1;
                            continue unroll_9403;
                        }
                        depth = path.depth = depth;
                        break unroll_9403;
                    } while (true);
                depth = depth;
            }
        }
    }
    values && (values[0] = hasValue && { json: jsons[-1] } || undefined);
    return {
        'values': values,
        'errors': errors,
        'requestedPaths': requestedPaths,
        'optimizedPaths': optimizedPaths,
        'requestedMissingPaths': requestedMissingPaths,
        'optimizedMissingPaths': optimizedMissingPaths
    };
}
function setJSONGsAsValues(model, envelopes, values, errorSelector, boundPath) {
    Array.isArray(values) && (values.length = 0);
    var boundLength = 0, nodeRoot = model._cache || {}, nodeParent, node;
    if (Array.isArray(boundPath)) {
        nodeParent = nodeRoot;
        boundLength = boundPath.length;
    } else {
        nodeParent = getBoundValue(model);
        boundPath = model._path || [];
    }
    var root = model._root || model, boxed = model._boxed || false, expired = root.expired || (root.expired = []), refreshing = model._refreshing || false, appendNullKey = false;
    typeof errorSelector === 'function' || (errorSelector = model._errorSelector) || (errorSelector = function (x$4, y) {
        return y;
    });
    var nodes = envelopes.nodes || (envelopes.nodes = []);
    var messages = envelopes.messages || (envelopes.messages = []);
    var errors = envelopes.errors || (envelopes.errors = []);
    var refs = envelopes.refs || (envelopes.refs = []);
    var depth = envelopes.depth || (envelopes.depth = 0);
    var refIndex = envelopes.refIndex || (envelopes.refIndex = 0);
    var refDepth = envelopes.refDepth || (envelopes.refDepth = 0);
    var requestedPath = envelopes.requestedPath || (envelopes.requestedPath = []);
    var optimizedPath = envelopes.optimizedPath || (envelopes.optimizedPath = []);
    var requestedPaths = envelopes.requestedPaths || (envelopes.requestedPaths = []);
    var optimizedPaths = envelopes.optimizedPaths || (envelopes.optimizedPaths = []);
    var requestedMissingPaths = envelopes.requestedMissingPaths || (envelopes.requestedMissingPaths = []);
    var optimizedMissingPaths = envelopes.optimizedMissingPaths || (envelopes.optimizedMissingPaths = []);
    var hasValue = envelopes.hasValue || (envelopes.hasValue = false);
    var path, length = 0, height = 0, reference, refLength = 0, refHeight = 0, messageRoot, messageParent, message, nodeType, nodeValue, nodeSize, nodeTimestamp, nodeExpires, messageType, messageValue, messageSize, messageTimestamp, messageExpires;
    refs[-1] = boundPath;
    nodes[-1] = nodeParent;
    var envelope, pathSets, index = -1, count = envelopes.length;
    while (++index < count) {
        envelope = envelopes[index];
        pathSets = envelope.paths;
        messages[-1] = messageRoot = envelope.jsong || envelope.values || envelope.value || Object.create(null);
        var index$2 = -1, count$2 = pathSets.length;
        while (++index$2 < count$2) {
            path = pathSets[index$2];
            depth = 0;
            length = path.length;
            height = length - 1;
            var ref;
            refs.length = 0;
            while (depth > -1) {
                refIndex = depth;
                while (--refIndex >= -1) {
                    if (!!(ref = refs[refIndex])) {
                        refLength = ref.length;
                        var i = -1, j = 0;
                        while (++i < refLength) {
                            optimizedPath[j++] = ref[i];
                        }
                        i = ++refIndex;
                        while (i < depth) {
                            optimizedPath[j++] = requestedPath[i++];
                        }
                        optimizedPath.length = j;
                        break;
                    }
                }
                var key, isKeySet;
                path = path;
                height = (length = path.length) - 1;
                nodeParent = node = nodes[depth - 1];
                messageParent = message = messages[depth - 1];
                depth = depth;
                follow_path_12359:
                    do {
                        key = path[depth];
                        if (isKeySet = key != null && typeof key === 'object') {
                            if (Array.isArray(key)) {
                                if ((key = key[key.index || (key.index = 0)]) != null && typeof key === 'object') {
                                    key = key[__OFFSET] === void 0 && (key[__OFFSET] = key.from || (key.from = 0)) || key[__OFFSET];
                                }
                            } else {
                                key = key[__OFFSET] === void 0 && (key[__OFFSET] = key.from || (key.from = 0)) || key[__OFFSET];
                            }
                        }
                        if (key === __NULL) {
                            key = null;
                        }
                        depth >= boundLength && (requestedPath[requestedPath.length = depth] = key);
                        if (key != null) {
                            if (depth < height) {
                                optimizedPath[optimizedPath.length = depth + (refLength - refIndex)] = key;
                                node = nodeParent[key];
                                nodeType = node && node[$TYPE] || void 0;
                                nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                nodeTimestamp = node && node[$TIMESTAMP];
                                nodeExpires = node && node[$EXPIRES];
                                if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                    node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                }
                                message = messageParent[key];
                                messageType = message && message[$TYPE] || void 0;
                                messageValue = messageType === SENTINEL ? message[VALUE] : messageType === ERROR ? message = errorSelector(requestedPath, message) : message;
                                messageTimestamp = message && message[$TIMESTAMP];
                                messageExpires = message && message[$EXPIRES];
                                if (message != null && typeof message === 'object' && (messageExpires != null && messageExpires !== 1 && (messageExpires === 0 || messageExpires < Date.now()) || message[__INVALIDATED] === true)) {
                                    message = messageValue = (expired[expired.length] = message) && (message[__INVALIDATED] = true) && void 0;
                                }
                                node = node;
                                message = message;
                                merge_node_12597:
                                    do {
                                        if (node === message) {
                                            node = node;
                                            break merge_node_12597;
                                        }
                                        if (node != null) {
                                            if (message != null) {
                                                if ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                                                    if ((!messageType || messageType === SENTINEL) && Array.isArray(messageValue)) {
                                                        if ((messageTimestamp < nodeTimestamp || messageExpires === 0 && ((node = message) || true)) === false) {
                                                            message = message;
                                                            node = node;
                                                            nodeValue = nodeValue;
                                                            messageValue = messageValue;
                                                            replace_cache_reference_12766:
                                                                do {
                                                                    // compare the cache and message references.
                                                                    // if they're the same, break early so we don't insert.
                                                                    // if they're different, replace the cache reference.
                                                                    var i$2 = nodeValue.length;
                                                                    // If the reference lengths are equal, we have to check their keys
                                                                    // for equality.
                                                                    // If their lengths aren't the equal, the references aren't equal.
                                                                    // Insert the reference from the message.
                                                                    if (i$2 === messageValue.length) {
                                                                        while (--i$2 > -1) {
                                                                            // If any of their keys are different, replace the reference
                                                                            // in the cache with the reference in the message.
                                                                            if (nodeValue[i$2] !== messageValue[i$2]) {
                                                                                message = message;
                                                                                break replace_cache_reference_12766;
                                                                            }
                                                                        }
                                                                        if (i$2 === -1) {
                                                                            message = node;
                                                                            break replace_cache_reference_12766;
                                                                        }
                                                                    }
                                                                    message = message;
                                                                    break replace_cache_reference_12766;
                                                                } while (true);
                                                            message = message;
                                                        }
                                                    }
                                                }
                                                if (node === message || !nodeType && (node != null && typeof node === 'object') && !Array.isArray(nodeValue) && (!messageType && (message != null && typeof message === 'object') && !Array.isArray(messageValue))) {
                                                    node = node;
                                                    break merge_node_12597;
                                                }
                                            } else if (!nodeType && (node != null && typeof node === 'object') || (!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                                                node = message = node;
                                                break merge_node_12597;
                                            }
                                        }
                                        if (message == null || messageType !== void 0 || typeof message !== 'object' || Array.isArray(messageValue)) {
                                            message = message;
                                            if ((!messageType || messageType === SENTINEL) && Array.isArray(messageValue)) {
                                                messageType = 'array';
                                                message[$SIZE] = messageSize = (messageType === SENTINEL && 50 || 0) + (messageValue.length || 1);
                                                delete messageValue[$SIZE];
                                                messageValue[__CONTAINER] = message;
                                            } else if (messageType === SENTINEL) {
                                                message[$SIZE] = messageSize = 50 + (typeof messageValue === 'string' && messageValue.length || 1);
                                            } else if (messageType === ERROR) {
                                                message[$SIZE] = messageSize = 50 + (message[$SIZE] || 0 || 1);
                                            } else if (!(message != null && typeof message === 'object')) {
                                                messageSize = 50 + (typeof messageValue === 'string' && messageValue.length || 1);
                                                messageType = 'sentinel';
                                                message = { 'value': messageValue };
                                                message[$TYPE] = messageType;
                                                message[$SIZE] = messageSize;
                                            } else {
                                                messageType = message[$TYPE] = messageType || 'leaf';
                                                message[$SIZE] = messageSize = message[$SIZE] || 0 || 50 + 1;
                                            }
                                            ;
                                        }
                                        if (node != null && node !== message) {
                                            var nodeRefsLength = node.__refsLength || 0, destRefsLength = message.__refsLength || 0, i$3 = -1, ref$2;
                                            while (++i$3 < nodeRefsLength) {
                                                if ((ref$2 = node[__REF + i$3]) !== void 0) {
                                                    ref$2[__CONTEXT] = message;
                                                    message[__REF + (destRefsLength + i$3)] = ref$2;
                                                    node[__REF + i$3] = void 0;
                                                }
                                            }
                                            message[__REFS_LENGTH] = nodeRefsLength + destRefsLength;
                                            node[__REFS_LENGTH] = ref$2 = void 0;
                                            if (node != null && typeof node === 'object') {
                                                var root$2 = root, head = root$2.__head, tail = root$2.__tail, next, prev;
                                                (next = node.__next) && (next != null && typeof next === 'object') && (next.__prev = prev);
                                                (prev = node.__prev) && (prev != null && typeof prev === 'object') && (prev.__next = next);
                                                node === head && (root$2.__head = root$2.__next = head = next);
                                                node === tail && (root$2.__tail = root$2.__prev = tail = prev);
                                                node.__next = node.__prev = void 0;
                                                head = tail = next = prev = void 0;
                                            }
                                        }
                                        nodeParent[key] = node = message;
                                        nodeType = node && node[$TYPE] || void 0;
                                        nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                        nodeTimestamp = node && node[$TIMESTAMP];
                                        nodeExpires = node && node[$EXPIRES];
                                        node = node;
                                        break merge_node_12597;
                                    } while (true);
                                node = node;
                                node != null && (node = !node[__SELF] && ((node[__SELF] = node) || true) && ((node[__KEY] = key) || true) && ((node[__PARENT] = nodeParent) || true) && ((node[__ROOT] = nodeRoot) || true) && (node[__GENERATION] || (node[__GENERATION] = 0) || node) && ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue) && (nodeValue[__CONTAINER] = node)) || node);
                                if ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                                    do {
                                        if (nodeExpires !== 1) {
                                            var root$3 = root, head$2 = root$3.__head, tail$2 = root$3.__tail, next$2 = node.__next, prev$2 = node.__prev;
                                            if (node !== head$2) {
                                                next$2 && (next$2 != null && typeof next$2 === 'object') && (next$2.__prev = prev$2);
                                                prev$2 && (prev$2 != null && typeof prev$2 === 'object') && (prev$2.__next = next$2);
                                                (next$2 = head$2) && (head$2 != null && typeof head$2 === 'object') && (head$2.__prev = node);
                                                root$3.__head = root$3.__next = head$2 = node;
                                                head$2.__next = next$2;
                                                head$2.__prev = void 0;
                                            }
                                            if (tail$2 == null || node === tail$2) {
                                                root$3.__tail = root$3.__prev = tail$2 = prev$2 || node;
                                            }
                                            root$3 = head$2 = tail$2 = next$2 = prev$2 = void 0;
                                        }
                                        refs[depth] = nodeValue;
                                        refIndex = depth + 1;
                                        refDepth = 0;
                                        var key$2, isKeySet$2;
                                        reference = nodeValue;
                                        refHeight = (refLength = reference.length) - 1;
                                        nodeParent = nodeRoot;
                                        messageParent = messageRoot;
                                        refDepth = refDepth;
                                        follow_path_12935:
                                            do {
                                                key$2 = reference[refDepth];
                                                isKeySet$2 = false;
                                                if (key$2 != null) {
                                                    if (refDepth < refHeight) {
                                                        optimizedPath[optimizedPath.length = refDepth] = key$2;
                                                        node = nodeParent[key$2];
                                                        nodeType = node && node[$TYPE] || void 0;
                                                        nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                                        nodeTimestamp = node && node[$TIMESTAMP];
                                                        nodeExpires = node && node[$EXPIRES];
                                                        if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                                            node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                                        }
                                                        message = messageParent[key$2];
                                                        messageType = message && message[$TYPE] || void 0;
                                                        messageValue = messageType === SENTINEL ? message[VALUE] : messageType === ERROR ? message = errorSelector(requestedPath, message) : message;
                                                        messageTimestamp = message && message[$TIMESTAMP];
                                                        messageExpires = message && message[$EXPIRES];
                                                        if (message != null && typeof message === 'object' && (messageExpires != null && messageExpires !== 1 && (messageExpires === 0 || messageExpires < Date.now()) || message[__INVALIDATED] === true)) {
                                                            message = messageValue = (expired[expired.length] = message) && (message[__INVALIDATED] = true) && void 0;
                                                        }
                                                        node = node;
                                                        message = message;
                                                        merge_node_13079:
                                                            do {
                                                                if (node === message) {
                                                                    node = node;
                                                                    break merge_node_13079;
                                                                }
                                                                if (node != null) {
                                                                    if (message != null) {
                                                                        if ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                                                                            if ((!messageType || messageType === SENTINEL) && Array.isArray(messageValue)) {
                                                                                if ((messageTimestamp < nodeTimestamp || messageExpires === 0 && ((node = message) || true)) === false) {
                                                                                    message = message;
                                                                                    node = node;
                                                                                    nodeValue = nodeValue;
                                                                                    messageValue = messageValue;
                                                                                    replace_cache_reference_13247:
                                                                                        do {
                                                                                            // compare the cache and message references.
                                                                                            // if they're the same, break early so we don't insert.
                                                                                            // if they're different, replace the cache reference.
                                                                                            var i$4 = nodeValue.length;
                                                                                            // If the reference lengths are equal, we have to check their keys
                                                                                            // for equality.
                                                                                            // If their lengths aren't the equal, the references aren't equal.
                                                                                            // Insert the reference from the message.
                                                                                            if (i$4 === messageValue.length) {
                                                                                                while (--i$4 > -1) {
                                                                                                    // If any of their keys are different, replace the reference
                                                                                                    // in the cache with the reference in the message.
                                                                                                    if (nodeValue[i$4] !== messageValue[i$4]) {
                                                                                                        message = message;
                                                                                                        break replace_cache_reference_13247;
                                                                                                    }
                                                                                                }
                                                                                                if (i$4 === -1) {
                                                                                                    message = node;
                                                                                                    break replace_cache_reference_13247;
                                                                                                }
                                                                                            }
                                                                                            message = message;
                                                                                            break replace_cache_reference_13247;
                                                                                        } while (true);
                                                                                    message = message;
                                                                                }
                                                                            }
                                                                        }
                                                                        if (node === message || !nodeType && (node != null && typeof node === 'object') && !Array.isArray(nodeValue) && (!messageType && (message != null && typeof message === 'object') && !Array.isArray(messageValue))) {
                                                                            node = node;
                                                                            break merge_node_13079;
                                                                        }
                                                                    } else if (!nodeType && (node != null && typeof node === 'object') || (!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                                                                        node = message = node;
                                                                        break merge_node_13079;
                                                                    }
                                                                }
                                                                if (message == null || messageType !== void 0 || typeof message !== 'object' || Array.isArray(messageValue)) {
                                                                    message = message;
                                                                    if ((!messageType || messageType === SENTINEL) && Array.isArray(messageValue)) {
                                                                        messageType = 'array';
                                                                        message[$SIZE] = messageSize = (messageType === SENTINEL && 50 || 0) + (messageValue.length || 1);
                                                                        delete messageValue[$SIZE];
                                                                        messageValue[__CONTAINER] = message;
                                                                    } else if (messageType === SENTINEL) {
                                                                        message[$SIZE] = messageSize = 50 + (typeof messageValue === 'string' && messageValue.length || 1);
                                                                    } else if (messageType === ERROR) {
                                                                        message[$SIZE] = messageSize = 50 + (message[$SIZE] || 0 || 1);
                                                                    } else if (!(message != null && typeof message === 'object')) {
                                                                        messageSize = 50 + (typeof messageValue === 'string' && messageValue.length || 1);
                                                                        messageType = 'sentinel';
                                                                        message = { 'value': messageValue };
                                                                        message[$TYPE] = messageType;
                                                                        message[$SIZE] = messageSize;
                                                                    } else {
                                                                        messageType = message[$TYPE] = messageType || 'leaf';
                                                                        message[$SIZE] = messageSize = message[$SIZE] || 0 || 50 + 1;
                                                                    }
                                                                    ;
                                                                }
                                                                if (node != null && node !== message) {
                                                                    var nodeRefsLength$2 = node.__refsLength || 0, destRefsLength$2 = message.__refsLength || 0, i$5 = -1, ref$3;
                                                                    while (++i$5 < nodeRefsLength$2) {
                                                                        if ((ref$3 = node[__REF + i$5]) !== void 0) {
                                                                            ref$3[__CONTEXT] = message;
                                                                            message[__REF + (destRefsLength$2 + i$5)] = ref$3;
                                                                            node[__REF + i$5] = void 0;
                                                                        }
                                                                    }
                                                                    message[__REFS_LENGTH] = nodeRefsLength$2 + destRefsLength$2;
                                                                    node[__REFS_LENGTH] = ref$3 = void 0;
                                                                    if (node != null && typeof node === 'object') {
                                                                        var root$4 = root, head$3 = root$4.__head, tail$3 = root$4.__tail, next$3, prev$3;
                                                                        (next$3 = node.__next) && (next$3 != null && typeof next$3 === 'object') && (next$3.__prev = prev$3);
                                                                        (prev$3 = node.__prev) && (prev$3 != null && typeof prev$3 === 'object') && (prev$3.__next = next$3);
                                                                        node === head$3 && (root$4.__head = root$4.__next = head$3 = next$3);
                                                                        node === tail$3 && (root$4.__tail = root$4.__prev = tail$3 = prev$3);
                                                                        node.__next = node.__prev = void 0;
                                                                        head$3 = tail$3 = next$3 = prev$3 = void 0;
                                                                    }
                                                                }
                                                                nodeParent[key$2] = node = message;
                                                                nodeType = node && node[$TYPE] || void 0;
                                                                nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                                                nodeTimestamp = node && node[$TIMESTAMP];
                                                                nodeExpires = node && node[$EXPIRES];
                                                                node = node;
                                                                break merge_node_13079;
                                                            } while (true);
                                                        node = node;
                                                        node != null && (node = !node[__SELF] && ((node[__SELF] = node) || true) && ((node[__KEY] = key$2) || true) && ((node[__PARENT] = nodeParent) || true) && ((node[__ROOT] = nodeRoot) || true) && (node[__GENERATION] || (node[__GENERATION] = 0) || node) && ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue) && (nodeValue[__CONTAINER] = node)) || node);
                                                        if (appendNullKey = node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue)) {
                                                            nodeParent = node;
                                                            break follow_path_12935;
                                                        }
                                                        nodeParent = node;
                                                        messageParent = message;
                                                        refDepth = refDepth + 1;
                                                        continue follow_path_12935;
                                                    } else if (refDepth === refHeight) {
                                                        optimizedPath[optimizedPath.length = refDepth] = key$2;
                                                        node = nodeParent[key$2];
                                                        nodeType = node && node[$TYPE] || void 0;
                                                        nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                                        nodeTimestamp = node && node[$TIMESTAMP];
                                                        nodeExpires = node && node[$EXPIRES];
                                                        if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                                            node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                                        }
                                                        message = messageParent[key$2];
                                                        messageType = message && message[$TYPE] || void 0;
                                                        messageValue = messageType === SENTINEL ? message[VALUE] : messageType === ERROR ? message = errorSelector(requestedPath, message) : message;
                                                        messageTimestamp = message && message[$TIMESTAMP];
                                                        messageExpires = message && message[$EXPIRES];
                                                        if (message != null && typeof message === 'object' && (messageExpires != null && messageExpires !== 1 && (messageExpires === 0 || messageExpires < Date.now()) || message[__INVALIDATED] === true)) {
                                                            message = messageValue = (expired[expired.length] = message) && (message[__INVALIDATED] = true) && void 0;
                                                        }
                                                        node = node;
                                                        message = message;
                                                        merge_node_13452:
                                                            do {
                                                                if (node === message) {
                                                                    node = node;
                                                                    break merge_node_13452;
                                                                }
                                                                if (node != null) {
                                                                    if (message != null) {
                                                                        if ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                                                                            if ((!messageType || messageType === SENTINEL) && Array.isArray(messageValue)) {
                                                                                if ((messageTimestamp < nodeTimestamp || messageExpires === 0 && ((node = message) || true)) === false) {
                                                                                    message = message;
                                                                                    node = node;
                                                                                    nodeValue = nodeValue;
                                                                                    messageValue = messageValue;
                                                                                    replace_cache_reference_13619:
                                                                                        do {
                                                                                            // compare the cache and message references.
                                                                                            // if they're the same, break early so we don't insert.
                                                                                            // if they're different, replace the cache reference.
                                                                                            var i$6 = nodeValue.length;
                                                                                            // If the reference lengths are equal, we have to check their keys
                                                                                            // for equality.
                                                                                            // If their lengths aren't the equal, the references aren't equal.
                                                                                            // Insert the reference from the message.
                                                                                            if (i$6 === messageValue.length) {
                                                                                                while (--i$6 > -1) {
                                                                                                    // If any of their keys are different, replace the reference
                                                                                                    // in the cache with the reference in the message.
                                                                                                    if (nodeValue[i$6] !== messageValue[i$6]) {
                                                                                                        message = message;
                                                                                                        break replace_cache_reference_13619;
                                                                                                    }
                                                                                                }
                                                                                                if (i$6 === -1) {
                                                                                                    message = node;
                                                                                                    break replace_cache_reference_13619;
                                                                                                }
                                                                                            }
                                                                                            message = message;
                                                                                            break replace_cache_reference_13619;
                                                                                        } while (true);
                                                                                    message = message;
                                                                                }
                                                                            }
                                                                        }
                                                                        if (node === message || !nodeType && (node != null && typeof node === 'object') && !Array.isArray(nodeValue) && (!messageType && (message != null && typeof message === 'object') && !Array.isArray(messageValue))) {
                                                                            node = node;
                                                                            break merge_node_13452;
                                                                        }
                                                                    } else if (!nodeType && (node != null && typeof node === 'object') || (!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                                                                        node = message = node;
                                                                        break merge_node_13452;
                                                                    }
                                                                }
                                                                if (message == null || messageType !== void 0 || typeof message !== 'object' || Array.isArray(messageValue)) {
                                                                    message = message;
                                                                    if ((!messageType || messageType === SENTINEL) && Array.isArray(messageValue)) {
                                                                        messageType = 'array';
                                                                        message[$SIZE] = messageSize = (messageType === SENTINEL && 50 || 0) + (messageValue.length || 1);
                                                                        delete messageValue[$SIZE];
                                                                        messageValue[__CONTAINER] = message;
                                                                    } else if (messageType === SENTINEL) {
                                                                        message[$SIZE] = messageSize = 50 + (typeof messageValue === 'string' && messageValue.length || 1);
                                                                    } else if (messageType === ERROR) {
                                                                        message[$SIZE] = messageSize = 50 + (message[$SIZE] || 0 || 1);
                                                                    } else if (!(message != null && typeof message === 'object')) {
                                                                        messageSize = 50 + (typeof messageValue === 'string' && messageValue.length || 1);
                                                                        messageType = 'sentinel';
                                                                        message = { 'value': messageValue };
                                                                        message[$TYPE] = messageType;
                                                                        message[$SIZE] = messageSize;
                                                                    } else {
                                                                        messageType = message[$TYPE] = messageType || 'leaf';
                                                                        message[$SIZE] = messageSize = message[$SIZE] || 0 || 50 + 1;
                                                                    }
                                                                    ;
                                                                }
                                                                if (node != null && node !== message) {
                                                                    var nodeRefsLength$3 = node.__refsLength || 0, destRefsLength$3 = message.__refsLength || 0, i$7 = -1, ref$4;
                                                                    while (++i$7 < nodeRefsLength$3) {
                                                                        if ((ref$4 = node[__REF + i$7]) !== void 0) {
                                                                            ref$4[__CONTEXT] = message;
                                                                            message[__REF + (destRefsLength$3 + i$7)] = ref$4;
                                                                            node[__REF + i$7] = void 0;
                                                                        }
                                                                    }
                                                                    message[__REFS_LENGTH] = nodeRefsLength$3 + destRefsLength$3;
                                                                    node[__REFS_LENGTH] = ref$4 = void 0;
                                                                    if (node != null && typeof node === 'object') {
                                                                        var root$5 = root, head$4 = root$5.__head, tail$4 = root$5.__tail, next$4, prev$4;
                                                                        (next$4 = node.__next) && (next$4 != null && typeof next$4 === 'object') && (next$4.__prev = prev$4);
                                                                        (prev$4 = node.__prev) && (prev$4 != null && typeof prev$4 === 'object') && (prev$4.__next = next$4);
                                                                        node === head$4 && (root$5.__head = root$5.__next = head$4 = next$4);
                                                                        node === tail$4 && (root$5.__tail = root$5.__prev = tail$4 = prev$4);
                                                                        node.__next = node.__prev = void 0;
                                                                        head$4 = tail$4 = next$4 = prev$4 = void 0;
                                                                    }
                                                                }
                                                                nodeParent[key$2] = node = message;
                                                                nodeType = node && node[$TYPE] || void 0;
                                                                nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                                                nodeTimestamp = node && node[$TIMESTAMP];
                                                                nodeExpires = node && node[$EXPIRES];
                                                                node = node;
                                                                break merge_node_13452;
                                                            } while (true);
                                                        node = node;
                                                        node != null && (node = !node[__SELF] && ((node[__SELF] = node) || true) && ((node[__KEY] = key$2) || true) && ((node[__PARENT] = nodeParent) || true) && ((node[__ROOT] = nodeRoot) || true) && (node[__GENERATION] || (node[__GENERATION] = 0) || node) && ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue) && (nodeValue[__CONTAINER] = node)) || node);
                                                        appendNullKey = node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue);
                                                        nodeParent = node;
                                                        break follow_path_12935;
                                                    }
                                                } else if (refDepth < refHeight) {
                                                    nodeParent = node;
                                                    messageParent = message;
                                                    refDepth = refDepth + 1;
                                                    continue follow_path_12935;
                                                }
                                                nodeParent = node;
                                                break follow_path_12935;
                                            } while (true);
                                        node = nodeParent;
                                    } while ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue));
                                    if (node == null) {
                                        while (refDepth <= refHeight) {
                                            optimizedPath[refDepth] = reference[refDepth++];
                                        }
                                    }
                                }
                                if (node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue)) {
                                    nodeParent = node;
                                    break follow_path_12359;
                                }
                                nodeParent = nodes[depth] = node;
                                messageParent = messages[depth] = message;
                                depth = depth + 1;
                                continue follow_path_12359;
                            } else if (depth === height) {
                                optimizedPath[optimizedPath.length = depth + (refLength - refIndex)] = key;
                                node = nodeParent[key];
                                nodeType = node && node[$TYPE] || void 0;
                                nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                nodeTimestamp = node && node[$TIMESTAMP];
                                nodeExpires = node && node[$EXPIRES];
                                if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                    node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                }
                                message = messageParent[key];
                                messageType = message && message[$TYPE] || void 0;
                                messageValue = messageType === SENTINEL ? message[VALUE] : messageType === ERROR ? message = errorSelector(requestedPath, message) : message;
                                messageTimestamp = message && message[$TIMESTAMP];
                                messageExpires = message && message[$EXPIRES];
                                if (message != null && typeof message === 'object' && (messageExpires != null && messageExpires !== 1 && (messageExpires === 0 || messageExpires < Date.now()) || message[__INVALIDATED] === true)) {
                                    message = messageValue = (expired[expired.length] = message) && (message[__INVALIDATED] = true) && void 0;
                                }
                                if ((messageTimestamp < nodeTimestamp || messageExpires === 0 && ((node = message) || true)) === false) {
                                    message = message;
                                    if ((!messageType || messageType === SENTINEL) && Array.isArray(messageValue)) {
                                        messageType = 'array';
                                        message[$SIZE] = messageSize = (messageType === SENTINEL && 50 || 0) + (messageValue.length || 1);
                                        delete messageValue[$SIZE];
                                        messageValue[__CONTAINER] = message;
                                    } else if (messageType === SENTINEL) {
                                        message[$SIZE] = messageSize = 50 + (typeof messageValue === 'string' && messageValue.length || 1);
                                    } else if (messageType === ERROR) {
                                        message[$SIZE] = messageSize = 50 + (message[$SIZE] || 0 || 1);
                                    } else if (!(message != null && typeof message === 'object')) {
                                        messageSize = 50 + (typeof messageValue === 'string' && messageValue.length || 1);
                                        messageType = 'sentinel';
                                        message = { 'value': messageValue };
                                        message[$TYPE] = messageType;
                                        message[$SIZE] = messageSize;
                                    } else {
                                        messageType = message[$TYPE] = messageType || 'leaf';
                                        message[$SIZE] = messageSize = message[$SIZE] || 0 || 50 + 1;
                                    }
                                    ;
                                    if (node != null && node !== message) {
                                        var nodeRefsLength$4 = node.__refsLength || 0, destRefsLength$4 = message.__refsLength || 0, i$8 = -1, ref$5;
                                        while (++i$8 < nodeRefsLength$4) {
                                            if ((ref$5 = node[__REF + i$8]) !== void 0) {
                                                ref$5[__CONTEXT] = message;
                                                message[__REF + (destRefsLength$4 + i$8)] = ref$5;
                                                node[__REF + i$8] = void 0;
                                            }
                                        }
                                        message[__REFS_LENGTH] = nodeRefsLength$4 + destRefsLength$4;
                                        node[__REFS_LENGTH] = ref$5 = void 0;
                                        if (node != null && typeof node === 'object') {
                                            var root$6 = root, head$5 = root$6.__head, tail$5 = root$6.__tail, next$5, prev$5;
                                            (next$5 = node.__next) && (next$5 != null && typeof next$5 === 'object') && (next$5.__prev = prev$5);
                                            (prev$5 = node.__prev) && (prev$5 != null && typeof prev$5 === 'object') && (prev$5.__next = next$5);
                                            node === head$5 && (root$6.__head = root$6.__next = head$5 = next$5);
                                            node === tail$5 && (root$6.__tail = root$6.__prev = tail$5 = prev$5);
                                            node.__next = node.__prev = void 0;
                                            head$5 = tail$5 = next$5 = prev$5 = void 0;
                                        }
                                    }
                                    nodeParent[key] = node = message;
                                    nodeType = node && node[$TYPE] || void 0;
                                    nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                    node = !node[__SELF] && ((node[__SELF] = node) || true) && ((node[__KEY] = key) || true) && ((node[__PARENT] = nodeParent) || true) && ((node[__ROOT] = nodeRoot) || true) && (node[__GENERATION] || (node[__GENERATION] = 0) || node) && ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue) && (nodeValue[__CONTAINER] = node)) || node;
                                }
                                appendNullKey = false;
                                nodeParent = node;
                                break follow_path_12359;
                            }
                        } else if (depth < height) {
                            nodeParent = nodeParent;
                            messageParent = messageParent;
                            depth = depth + 1;
                            continue follow_path_12359;
                        }
                        nodeParent = node;
                        break follow_path_12359;
                    } while (true);
                node = nodeParent;
                if (node != null || boxed === true) {
                    if (nodeType === ERROR) {
                        if (nodeExpires !== 1) {
                            var root$7 = root, head$6 = root$7.__head, tail$6 = root$7.__tail, next$6 = node.__next, prev$6 = node.__prev;
                            if (node !== head$6) {
                                next$6 && (next$6 != null && typeof next$6 === 'object') && (next$6.__prev = prev$6);
                                prev$6 && (prev$6 != null && typeof prev$6 === 'object') && (prev$6.__next = next$6);
                                (next$6 = head$6) && (head$6 != null && typeof head$6 === 'object') && (head$6.__prev = node);
                                root$7.__head = root$7.__next = head$6 = node;
                                head$6.__next = next$6;
                                head$6.__prev = void 0;
                            }
                            if (tail$6 == null || node === tail$6) {
                                root$7.__tail = root$7.__prev = tail$6 = prev$6 || node;
                            }
                            root$7 = head$6 = tail$6 = next$6 = prev$6 = void 0;
                        }
                        var pbv = Object.create(null);
                        var src = requestedPath, i$9 = -1, n = src.length, req = new Array(n);
                        while (++i$9 < n) {
                            req[i$9] = src[i$9];
                        }
                        if (appendNullKey === true) {
                            req[req.length] = null;
                        }
                        pbv.path = req;
                        if (boxed === true) {
                            pbv.value = node;
                        } else {
                            var dest = nodeValue, src$2 = dest, x;
                            if (dest != null && typeof dest === 'object') {
                                dest = Array.isArray(src$2) && [] || Object.create(null);
                                for (x in src$2) {
                                    !(!(x[0] !== '_' || x[1] !== '_') || (x === __SELF || x === __PARENT || x === __ROOT) || x[0] === '$') && (dest[x] = src$2[x]);
                                }
                            }
                            pbv.value = dest;
                        }
                        errors[errors.length] = pbv;
                    }
                    var src$3 = optimizedPath, i$10 = -1, n$2 = src$3.length, opt = new Array(n$2);
                    while (++i$10 < n$2) {
                        opt[i$10] = src$3[i$10];
                    }
                    var src$4 = requestedPath, i$11 = -1, n$3 = src$4.length, req$2 = new Array(n$3);
                    while (++i$11 < n$3) {
                        req$2[i$11] = src$4[i$11];
                    }
                    if (appendNullKey === true) {
                        req$2[req$2.length] = null;
                    }
                    requestedPaths[requestedPaths.length] = req$2;
                    optimizedPaths[optimizedPaths.length] = opt;
                    var pbv$2 = Object.create(null);
                    var src$5 = requestedPath, i$12 = -1, n$4 = src$5.length, req$3 = new Array(n$4);
                    while (++i$12 < n$4) {
                        req$3[i$12] = src$5[i$12];
                    }
                    if (appendNullKey === true) {
                        req$3[req$3.length] = null;
                    }
                    pbv$2.path = req$3;
                    if (boxed === true) {
                        pbv$2.value = node;
                    } else {
                        var dest$2 = nodeValue, src$6 = dest$2, x$2;
                        if (dest$2 != null && typeof dest$2 === 'object') {
                            dest$2 = Array.isArray(src$6) && [] || Object.create(null);
                            for (x$2 in src$6) {
                                !(!(x$2[0] !== '_' || x$2[1] !== '_') || (x$2 === __SELF || x$2 === __PARENT || x$2 === __ROOT) || x$2[0] === '$') && (dest$2[x$2] = src$6[x$2]);
                            }
                        }
                        pbv$2.value = dest$2;
                    }
                    typeof values === 'function' && (values(pbv$2) || true) || Array.isArray(values) && (values[values.length] = pbv$2);
                }
                if (boxed === false && node == null || refreshing === true) {
                    var src$7 = boundPath, i$13 = -1, n$5 = src$7.length, req$4 = new Array(n$5);
                    while (++i$13 < n$5) {
                        req$4[i$13] = src$7[i$13];
                    }
                    var src$8 = optimizedPath, i$14 = -1, n$6 = src$8.length, opt$2 = new Array(n$6);
                    while (++i$14 < n$6) {
                        opt$2[i$14] = src$8[i$14];
                    }
                    var reqLen = req$4.length - 1, optLen = opt$2.length - 1, i$15 = -1, n$7 = requestedPath.length, j$2 = depth, k = height, x$3;
                    while (++i$15 < n$7) {
                        req$4[++reqLen] = path[i$15 + boundLength] != null && typeof path[i$15 + boundLength] === 'object' && [requestedPath[i$15]] || requestedPath[i$15];
                    }
                    i$15 = -1;
                    n$7 = height - depth;
                    while (++i$15 < n$7) {
                        x$3 = req$4[++reqLen] = path[++j$2 + boundLength];
                        x$3 != null && (opt$2[++optLen] = x$3);
                    }
                    req$4.pathSetIndex = index$2;
                    requestedMissingPaths[requestedMissingPaths.length] = req$4;
                    optimizedMissingPaths[optimizedMissingPaths.length] = opt$2;
                }
                appendNullKey = false;
                var key$3;
                depth = depth;
                unroll_12450:
                    do {
                        if (depth < 0) {
                            depth = (path.depth = 0) - 1;
                            break unroll_12450;
                        }
                        if (!((key$3 = path[depth]) != null && typeof key$3 === 'object')) {
                            depth = path.depth = depth - 1;
                            continue unroll_12450;
                        }
                        if (Array.isArray(key$3)) {
                            if (++key$3.index === key$3.length) {
                                if (!((key$3 = key$3[key$3.index = 0]) != null && typeof key$3 === 'object')) {
                                    depth = path.depth = depth - 1;
                                    continue unroll_12450;
                                }
                            } else {
                                depth = path.depth = depth;
                                break unroll_12450;
                            }
                        }
                        if (++key$3[__OFFSET] > (key$3.to || (key$3.to = key$3.from + (key$3.length || 1) - 1))) {
                            key$3[__OFFSET] = key$3.from;
                            depth = path.depth = depth - 1;
                            continue unroll_12450;
                        }
                        depth = path.depth = depth;
                        break unroll_12450;
                    } while (true);
                depth = depth;
            }
        }
    }
    return {
        'values': values,
        'errors': errors,
        'requestedPaths': requestedPaths,
        'optimizedPaths': optimizedPaths,
        'requestedMissingPaths': requestedMissingPaths,
        'optimizedMissingPaths': optimizedMissingPaths
    };
}
function setPathMapsAsJSON(model, pathMaps, values, errorSelector, boundPath) {
    var boundLength = 0, nodeRoot = model._cache || {}, nodeParent, node;
    if (Array.isArray(boundPath)) {
        nodeParent = nodeRoot;
        boundLength = boundPath.length;
    } else {
        nodeParent = getBoundValue(model);
        boundPath = model._path || [];
    }
    var root = model._root || model, boxed = model._boxed || false, expired = root.expired || (root.expired = []), refreshing = model._refreshing || false, appendNullKey = false;
    typeof errorSelector === 'function' || (errorSelector = model._errorSelector) || (errorSelector = function (x$4, y$2) {
        return y$2;
    });
    var jsonKeys = pathMaps.jsonKeys || (pathMaps.jsonKeys = []);
    var pathMapStack = pathMaps.pathMapStack || (pathMaps.pathMapStack = []);
    var nodes = pathMaps.nodes || (pathMaps.nodes = []);
    var jsons = pathMaps.jsons || (pathMaps.jsons = []);
    var errors = pathMaps.errors || (pathMaps.errors = []);
    var refs = pathMaps.refs || (pathMaps.refs = []);
    var depth = pathMaps.depth || (pathMaps.depth = 0);
    var refIndex = pathMaps.refIndex || (pathMaps.refIndex = 0);
    var refDepth = pathMaps.refDepth || (pathMaps.refDepth = 0);
    var requestedPath = pathMaps.requestedPath || (pathMaps.requestedPath = []);
    var optimizedPath = pathMaps.optimizedPath || (pathMaps.optimizedPath = []);
    var requestedPaths = pathMaps.requestedPaths || (pathMaps.requestedPaths = []);
    var optimizedPaths = pathMaps.optimizedPaths || (pathMaps.optimizedPaths = []);
    var requestedMissingPaths = pathMaps.requestedMissingPaths || (pathMaps.requestedMissingPaths = []);
    var optimizedMissingPaths = pathMaps.optimizedMissingPaths || (pathMaps.optimizedMissingPaths = []);
    var hasValue = pathMaps.hasValue || (pathMaps.hasValue = false);
    var jsonRoot = pathMaps.jsonRoot || (pathMaps.jsonRoot = values && values[0]);
    var jsonParent = pathMaps.jsonParent || (pathMaps.jsonParent = jsonRoot);
    var jsonNode = pathMaps.jsonNode || (pathMaps.jsonNode = jsonParent);
    var pathMap, length = 0, height = 0, reference, refLength = 0, refHeight = 0, nodeType, nodeValue, nodeSize, nodeTimestamp, nodeExpires;
    refs[-1] = boundPath;
    nodes[-1] = nodeParent;
    jsons[-2] = jsons;
    jsonKeys[-1] = -1;
    var index = -1, count = pathMaps.length;
    while (++index < count) {
        pathMap = pathMaps[index];
        pathMapStack[0] = pathMap;
        hasValue = false;
        jsons.length = 0;
        jsons[-1] = jsonRoot = values && values[index] || void 0;
        jsonKeys.length = 0;
        jsonKeys[-1] = -1;
        depth = 0;
        length = pathMap.length;
        height = length - 1;
        var ref;
        refs.length = 0;
        while (depth > -1) {
            refIndex = depth;
            while (--refIndex >= -1) {
                if (!!(ref = refs[refIndex])) {
                    refLength = ref.length;
                    var i = -1, j = 0;
                    while (++i < refLength) {
                        optimizedPath[j++] = ref[i];
                    }
                    i = ++refIndex;
                    while (i < depth) {
                        optimizedPath[j++] = requestedPath[i++];
                    }
                    optimizedPath.length = j;
                    break;
                }
            }
            var offset, keys, index$2, key, isKeySet;
            pathMap = pathMap;
            height = (length = depth) - 1;
            nodeParent = node = nodes[depth - 1];
            jsonParent = jsonNode = jsons[depth - 1];
            depth = depth;
            follow_path_map_15895:
                do {
                    if ((pathMap = pathMapStack[offset = depth * 4]) != null && typeof pathMap === 'object' && (keys = pathMapStack[offset + 1] || (pathMapStack[offset + 1] = Object.keys(pathMap))) && ((index$2 = pathMapStack[offset + 2] || (pathMapStack[offset + 2] = 0)) || true) && ((key = pathMapStack[offset + 3]) || true) && ((isKeySet = keys.length > 1) || keys.length > 0)) {
                        key = keys[index$2];
                        if (key != null) {
                            depth >= boundLength && (requestedPath[requestedPath.length = depth] = key);
                            pathMapStack[offset = 4 * (depth + 1)] = pathMap = pathMap[key];
                            if (pathMap != null && typeof pathMap === 'object' && pathMap[$TYPE] === void 0 && Array.isArray(pathMap) === false && (keys = Object.keys(pathMap)) && keys.length > 0) {
                                optimizedPath[optimizedPath.length = depth + (refLength - refIndex)] = key;
                                node = nodeParent[key];
                                nodeType = node && node[$TYPE] || void 0;
                                nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                nodeTimestamp = node && node[$TIMESTAMP];
                                nodeExpires = node && node[$EXPIRES];
                                if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                    node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                }
                                if (typeof node !== 'object' || !!nodeType && nodeType !== SENTINEL && !Array.isArray(nodeValue)) {
                                    nodeType = void 0;
                                    nodeValue = Object.create(null);
                                    if (node != null && node !== nodeValue) {
                                        var nodeRefsLength = node.__refsLength || 0, destRefsLength = nodeValue.__refsLength || 0, i$2 = -1, ref$2;
                                        while (++i$2 < nodeRefsLength) {
                                            if ((ref$2 = node[__REF + i$2]) !== void 0) {
                                                ref$2[__CONTEXT] = nodeValue;
                                                nodeValue[__REF + (destRefsLength + i$2)] = ref$2;
                                                node[__REF + i$2] = void 0;
                                            }
                                        }
                                        nodeValue[__REFS_LENGTH] = nodeRefsLength + destRefsLength;
                                        node[__REFS_LENGTH] = ref$2 = void 0;
                                        if (node != null && typeof node === 'object') {
                                            var root$2 = root, head = root$2.__head, tail = root$2.__tail, next, prev;
                                            (next = node.__next) && (next != null && typeof next === 'object') && (next.__prev = prev);
                                            (prev = node.__prev) && (prev != null && typeof prev === 'object') && (prev.__next = next);
                                            node === head && (root$2.__head = root$2.__next = head = next);
                                            node === tail && (root$2.__tail = root$2.__prev = tail = prev);
                                            node.__next = node.__prev = void 0;
                                            head = tail = next = prev = void 0;
                                        }
                                    }
                                    nodeParent[key] = node = nodeValue;
                                    node = !node[__SELF] && ((node[__SELF] = node) || true) && ((node[__KEY] = key) || true) && ((node[__PARENT] = nodeParent) || true) && ((node[__ROOT] = nodeRoot) || true) && (node[__GENERATION] || (node[__GENERATION] = 0) || node) && ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue) && (nodeValue[__CONTAINER] = node)) || node;
                                }
                                if (depth >= boundLength) {
                                    jsonKeys[depth] = isKeySet ? key : void 0;
                                    if (node != null && jsonParent != null && isKeySet && (!(jsonNode = jsonParent[key]) || !(jsonNode != null && typeof jsonNode === 'object'))) {
                                        jsonNode = jsonParent[key] = Object.create(null);
                                    }
                                } else {
                                    jsonKeys[depth] = void 0;
                                }
                                if ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                                    do {
                                        if (nodeExpires !== 1) {
                                            var root$3 = root, head$2 = root$3.__head, tail$2 = root$3.__tail, next$2 = node.__next, prev$2 = node.__prev;
                                            if (node !== head$2) {
                                                next$2 && (next$2 != null && typeof next$2 === 'object') && (next$2.__prev = prev$2);
                                                prev$2 && (prev$2 != null && typeof prev$2 === 'object') && (prev$2.__next = next$2);
                                                (next$2 = head$2) && (head$2 != null && typeof head$2 === 'object') && (head$2.__prev = node);
                                                root$3.__head = root$3.__next = head$2 = node;
                                                head$2.__next = next$2;
                                                head$2.__prev = void 0;
                                            }
                                            if (tail$2 == null || node === tail$2) {
                                                root$3.__tail = root$3.__prev = tail$2 = prev$2 || node;
                                            }
                                            root$3 = head$2 = tail$2 = next$2 = prev$2 = void 0;
                                        }
                                        refs[depth] = nodeValue;
                                        refIndex = depth + 1;
                                        refDepth = 0;
                                        var key$2, isKeySet$2;
                                        reference = nodeValue;
                                        refHeight = (refLength = reference.length) - 1;
                                        nodeParent = nodeRoot;
                                        jsonParent = jsonRoot;
                                        refDepth = refDepth;
                                        follow_path_16117:
                                            do {
                                                key$2 = reference[refDepth];
                                                isKeySet$2 = false;
                                                if (key$2 != null) {
                                                    if (refDepth < refHeight) {
                                                        optimizedPath[optimizedPath.length = refDepth] = key$2;
                                                        node = nodeParent[key$2];
                                                        nodeType = node && node[$TYPE] || void 0;
                                                        nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                                        nodeTimestamp = node && node[$TIMESTAMP];
                                                        nodeExpires = node && node[$EXPIRES];
                                                        if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                                            node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                                        }
                                                        if (typeof node !== 'object' || !!nodeType && nodeType !== SENTINEL && !Array.isArray(nodeValue)) {
                                                            nodeType = void 0;
                                                            nodeValue = Object.create(null);
                                                            if (node != null && node !== nodeValue) {
                                                                var nodeRefsLength$2 = node.__refsLength || 0, destRefsLength$2 = nodeValue.__refsLength || 0, i$3 = -1, ref$3;
                                                                while (++i$3 < nodeRefsLength$2) {
                                                                    if ((ref$3 = node[__REF + i$3]) !== void 0) {
                                                                        ref$3[__CONTEXT] = nodeValue;
                                                                        nodeValue[__REF + (destRefsLength$2 + i$3)] = ref$3;
                                                                        node[__REF + i$3] = void 0;
                                                                    }
                                                                }
                                                                nodeValue[__REFS_LENGTH] = nodeRefsLength$2 + destRefsLength$2;
                                                                node[__REFS_LENGTH] = ref$3 = void 0;
                                                                if (node != null && typeof node === 'object') {
                                                                    var root$4 = root, head$3 = root$4.__head, tail$3 = root$4.__tail, next$3, prev$3;
                                                                    (next$3 = node.__next) && (next$3 != null && typeof next$3 === 'object') && (next$3.__prev = prev$3);
                                                                    (prev$3 = node.__prev) && (prev$3 != null && typeof prev$3 === 'object') && (prev$3.__next = next$3);
                                                                    node === head$3 && (root$4.__head = root$4.__next = head$3 = next$3);
                                                                    node === tail$3 && (root$4.__tail = root$4.__prev = tail$3 = prev$3);
                                                                    node.__next = node.__prev = void 0;
                                                                    head$3 = tail$3 = next$3 = prev$3 = void 0;
                                                                }
                                                            }
                                                            nodeParent[key$2] = node = nodeValue;
                                                            node = !node[__SELF] && ((node[__SELF] = node) || true) && ((node[__KEY] = key$2) || true) && ((node[__PARENT] = nodeParent) || true) && ((node[__ROOT] = nodeRoot) || true) && (node[__GENERATION] || (node[__GENERATION] = 0) || node) && ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue) && (nodeValue[__CONTAINER] = node)) || node;
                                                        }
                                                        if (appendNullKey = node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue)) {
                                                            nodeParent = node;
                                                            break follow_path_16117;
                                                        }
                                                        nodeParent = node;
                                                        jsonParent = jsonNode;
                                                        refDepth = refDepth + 1;
                                                        continue follow_path_16117;
                                                    } else if (refDepth === refHeight) {
                                                        optimizedPath[optimizedPath.length = refDepth] = key$2;
                                                        node = nodeParent[key$2];
                                                        nodeType = node && node[$TYPE] || void 0;
                                                        nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                                        nodeTimestamp = node && node[$TIMESTAMP];
                                                        nodeExpires = node && node[$EXPIRES];
                                                        if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                                            node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                                        }
                                                        if (typeof node !== 'object' || !!nodeType && nodeType !== SENTINEL && !Array.isArray(nodeValue)) {
                                                            nodeType = void 0;
                                                            nodeValue = Object.create(null);
                                                            if (node != null && node !== nodeValue) {
                                                                var nodeRefsLength$3 = node.__refsLength || 0, destRefsLength$3 = nodeValue.__refsLength || 0, i$4 = -1, ref$4;
                                                                while (++i$4 < nodeRefsLength$3) {
                                                                    if ((ref$4 = node[__REF + i$4]) !== void 0) {
                                                                        ref$4[__CONTEXT] = nodeValue;
                                                                        nodeValue[__REF + (destRefsLength$3 + i$4)] = ref$4;
                                                                        node[__REF + i$4] = void 0;
                                                                    }
                                                                }
                                                                nodeValue[__REFS_LENGTH] = nodeRefsLength$3 + destRefsLength$3;
                                                                node[__REFS_LENGTH] = ref$4 = void 0;
                                                                if (node != null && typeof node === 'object') {
                                                                    var root$5 = root, head$4 = root$5.__head, tail$4 = root$5.__tail, next$4, prev$4;
                                                                    (next$4 = node.__next) && (next$4 != null && typeof next$4 === 'object') && (next$4.__prev = prev$4);
                                                                    (prev$4 = node.__prev) && (prev$4 != null && typeof prev$4 === 'object') && (prev$4.__next = next$4);
                                                                    node === head$4 && (root$5.__head = root$5.__next = head$4 = next$4);
                                                                    node === tail$4 && (root$5.__tail = root$5.__prev = tail$4 = prev$4);
                                                                    node.__next = node.__prev = void 0;
                                                                    head$4 = tail$4 = next$4 = prev$4 = void 0;
                                                                }
                                                            }
                                                            nodeParent[key$2] = node = nodeValue;
                                                            node = !node[__SELF] && ((node[__SELF] = node) || true) && ((node[__KEY] = key$2) || true) && ((node[__PARENT] = nodeParent) || true) && ((node[__ROOT] = nodeRoot) || true) && (node[__GENERATION] || (node[__GENERATION] = 0) || node) && ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue) && (nodeValue[__CONTAINER] = node)) || node;
                                                        }
                                                        appendNullKey = node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue);
                                                        nodeParent = node;
                                                        break follow_path_16117;
                                                    }
                                                } else if (refDepth < refHeight) {
                                                    nodeParent = node;
                                                    jsonParent = jsonNode;
                                                    refDepth = refDepth + 1;
                                                    continue follow_path_16117;
                                                }
                                                nodeParent = node;
                                                break follow_path_16117;
                                            } while (true);
                                        node = nodeParent;
                                    } while ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue));
                                    if (node == null) {
                                        while (refDepth <= refHeight) {
                                            optimizedPath[refDepth] = reference[refDepth++];
                                        }
                                    }
                                }
                                if (node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue)) {
                                    nodeParent = node;
                                    break follow_path_map_15895;
                                }
                                pathMapStack[offset + 1] = keys;
                                pathMapStack[offset + 3] = key;
                                nodeParent = nodes[depth] = node;
                                jsonParent = jsons[depth] = jsonNode;
                                depth = depth + 1;
                                continue follow_path_map_15895;
                            }
                        } else {
                            pathMapStack[offset = 3 * (depth + 1)] = pathMap[__NULL];
                            pathMapStack[offset + 1] = keys;
                            pathMapStack[offset + 2] = 0;
                            nodeParent = nodes[depth] = node;
                            jsonParent = jsons[depth] = jsonNode;
                            depth = depth + 1;
                            continue follow_path_map_15895;
                        }
                    }
                    if (key != null) {
                        optimizedPath[optimizedPath.length = depth + (refLength - refIndex)] = key;
                        node = nodeParent[key];
                        nodeType = node && node[$TYPE] || void 0;
                        nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                        nodeTimestamp = node && node[$TIMESTAMP];
                        nodeExpires = node && node[$EXPIRES];
                        if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                            node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                        }
                        nodeType = pathMap && pathMap[$TYPE] || void 0;
                        nodeValue = nodeType === SENTINEL ? pathMap[VALUE] : nodeType === ERROR ? pathMap = errorSelector(requestedPath, pathMap) : pathMap;
                        nodeTimestamp = pathMap && pathMap[$TIMESTAMP];
                        nodeExpires = pathMap && pathMap[$EXPIRES];
                        var newNode;
                        newNode = pathMap;
                        if ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                            nodeType = 'array';
                            newNode[$SIZE] = nodeSize = (nodeType === SENTINEL && 50 || 0) + (nodeValue.length || 1);
                            delete nodeValue[$SIZE];
                            nodeValue[__CONTAINER] = newNode;
                        } else if (nodeType === SENTINEL) {
                            newNode[$SIZE] = nodeSize = 50 + (typeof nodeValue === 'string' && nodeValue.length || 1);
                        } else if (nodeType === ERROR) {
                            newNode[$SIZE] = nodeSize = 50 + (pathMap[$SIZE] || 0 || 1);
                        } else if (!(pathMap != null && typeof pathMap === 'object')) {
                            nodeSize = 50 + (typeof nodeValue === 'string' && nodeValue.length || 1);
                            nodeType = 'sentinel';
                            newNode = { 'value': nodeValue };
                            newNode[$TYPE] = nodeType;
                            newNode[$SIZE] = nodeSize;
                        } else {
                            nodeType = newNode[$TYPE] = nodeType || 'leaf';
                            newNode[$SIZE] = nodeSize = pathMap[$SIZE] || 0 || 50 + 1;
                        }
                        ;
                        if (node != null && node !== newNode) {
                            var nodeRefsLength$4 = node.__refsLength || 0, destRefsLength$4 = newNode.__refsLength || 0, i$5 = -1, ref$5;
                            while (++i$5 < nodeRefsLength$4) {
                                if ((ref$5 = node[__REF + i$5]) !== void 0) {
                                    ref$5[__CONTEXT] = newNode;
                                    newNode[__REF + (destRefsLength$4 + i$5)] = ref$5;
                                    node[__REF + i$5] = void 0;
                                }
                            }
                            newNode[__REFS_LENGTH] = nodeRefsLength$4 + destRefsLength$4;
                            node[__REFS_LENGTH] = ref$5 = void 0;
                            if (node != null && typeof node === 'object') {
                                var root$6 = root, head$5 = root$6.__head, tail$5 = root$6.__tail, next$5, prev$5;
                                (next$5 = node.__next) && (next$5 != null && typeof next$5 === 'object') && (next$5.__prev = prev$5);
                                (prev$5 = node.__prev) && (prev$5 != null && typeof prev$5 === 'object') && (prev$5.__next = next$5);
                                node === head$5 && (root$6.__head = root$6.__next = head$5 = next$5);
                                node === tail$5 && (root$6.__tail = root$6.__prev = tail$5 = prev$5);
                                node.__next = node.__prev = void 0;
                                head$5 = tail$5 = next$5 = prev$5 = void 0;
                            }
                        }
                        nodeParent[key] = node = newNode;
                        node = !node[__SELF] && ((node[__SELF] = node) || true) && ((node[__KEY] = key) || true) && ((node[__PARENT] = nodeParent) || true) && ((node[__ROOT] = nodeRoot) || true) && (node[__GENERATION] || (node[__GENERATION] = 0) || node) && ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue) && (nodeValue[__CONTAINER] = node)) || node;
                        if (node != null && typeof node === 'object') {
                            if (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true) {
                                node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                            } else {
                                if (nodeExpires !== 1) {
                                    var root$7 = root, head$6 = root$7.__head, tail$6 = root$7.__tail, next$6 = node.__next, prev$6 = node.__prev;
                                    if (node !== head$6) {
                                        next$6 && (next$6 != null && typeof next$6 === 'object') && (next$6.__prev = prev$6);
                                        prev$6 && (prev$6 != null && typeof prev$6 === 'object') && (prev$6.__next = next$6);
                                        (next$6 = head$6) && (head$6 != null && typeof head$6 === 'object') && (head$6.__prev = node);
                                        root$7.__head = root$7.__next = head$6 = node;
                                        head$6.__next = next$6;
                                        head$6.__prev = void 0;
                                    }
                                    if (tail$6 == null || node === tail$6) {
                                        root$7.__tail = root$7.__prev = tail$6 = prev$6 || node;
                                    }
                                    root$7 = head$6 = tail$6 = next$6 = prev$6 = void 0;
                                }
                            }
                        }
                        if (depth >= boundLength) {
                            jsonKeys[depth] = isKeySet ? key : void 0;
                        } else {
                            jsonKeys[depth] = void 0;
                        }
                        appendNullKey = false;
                    }
                    nodeParent = node;
                    break follow_path_map_15895;
                } while (true);
            node = nodeParent;
            if (node != null || boxed === true) {
                if (nodeType === ERROR) {
                    if (nodeExpires !== 1) {
                        var root$8 = root, head$7 = root$8.__head, tail$7 = root$8.__tail, next$7 = node.__next, prev$7 = node.__prev;
                        if (node !== head$7) {
                            next$7 && (next$7 != null && typeof next$7 === 'object') && (next$7.__prev = prev$7);
                            prev$7 && (prev$7 != null && typeof prev$7 === 'object') && (prev$7.__next = next$7);
                            (next$7 = head$7) && (head$7 != null && typeof head$7 === 'object') && (head$7.__prev = node);
                            root$8.__head = root$8.__next = head$7 = node;
                            head$7.__next = next$7;
                            head$7.__prev = void 0;
                        }
                        if (tail$7 == null || node === tail$7) {
                            root$8.__tail = root$8.__prev = tail$7 = prev$7 || node;
                        }
                        root$8 = head$7 = tail$7 = next$7 = prev$7 = void 0;
                    }
                    var pbv = Object.create(null);
                    var src = requestedPath, i$6 = -1, n = src.length, req = new Array(n);
                    while (++i$6 < n) {
                        req[i$6] = src[i$6];
                    }
                    if (appendNullKey === true) {
                        req[req.length] = null;
                    }
                    pbv.path = req;
                    if (boxed === true) {
                        pbv.value = node;
                    } else {
                        var dest = nodeValue, src$2 = dest, x;
                        if (dest != null && typeof dest === 'object') {
                            dest = Array.isArray(src$2) && [] || Object.create(null);
                            for (x in src$2) {
                                !(!(x[0] !== '_' || x[1] !== '_') || (x === __SELF || x === __PARENT || x === __ROOT) || x[0] === '$') && (dest[x] = src$2[x]);
                            }
                        }
                        pbv.value = dest;
                    }
                    errors[errors.length] = pbv;
                }
                if (jsonParent != null) {
                    hasValue = true;
                    var jsonKey, jsonDepth = depth;
                    do {
                        jsonKey = jsonKeys[jsonDepth];
                        jsonParent = jsons[--jsonDepth];
                    } while (jsonKey == null);
                    if (boxed === true) {
                        jsonParent[jsonKey] = node;
                    } else {
                        var dest$2 = nodeValue, src$3 = dest$2, x$2;
                        if (dest$2 != null && typeof dest$2 === 'object') {
                            dest$2 = Array.isArray(src$3) && [] || Object.create(null);
                            for (x$2 in src$3) {
                                !(!(x$2[0] !== '_' || x$2[1] !== '_') || (x$2 === __SELF || x$2 === __PARENT || x$2 === __ROOT) || x$2[0] === '$') && (dest$2[x$2] = src$3[x$2]);
                            }
                        }
                        jsonParent[jsonKey] = dest$2;
                    }
                }
                var src$4 = optimizedPath, i$7 = -1, n$2 = src$4.length, opt = new Array(n$2);
                while (++i$7 < n$2) {
                    opt[i$7] = src$4[i$7];
                }
                var src$5 = requestedPath, i$8 = -1, n$3 = src$5.length, req$2 = new Array(n$3);
                while (++i$8 < n$3) {
                    req$2[i$8] = src$5[i$8];
                }
                if (appendNullKey === true) {
                    req$2[req$2.length] = null;
                }
                requestedPaths[requestedPaths.length] = req$2;
                optimizedPaths[optimizedPaths.length] = opt;
            }
            if (boxed === false && node == null || refreshing === true) {
                var src$6 = boundPath, i$9 = -1, n$4 = src$6.length, req$3 = new Array(n$4);
                while (++i$9 < n$4) {
                    req$3[i$9] = src$6[i$9];
                }
                var src$7 = optimizedPath, i$10 = -1, n$5 = src$7.length, opt$2 = new Array(n$5);
                while (++i$10 < n$5) {
                    opt$2[i$10] = src$7[i$10];
                }
                var reqLen = req$3.length - 1, optLen = opt$2.length - 1, i$11 = -1, n$6 = requestedPath.length, map, offset$2, keys$2, index$3, reqKeys, optKeys, optKeysLen, x$3, y, z;
                while (++i$11 < n$6) {
                    req$3[++reqLen] = (reqKeys = pathMapStack[offset$2 = (i$11 + boundLength) * 4 + 1]) && reqKeys.length > 1 && [requestedPath[i$11]] || requestedPath[i$11];
                }
                var j$2 = pathMap, k = reqLen, l = optLen;
                i$11 = j$2++;
                while (j$2 > i$11) {
                    if ((map = pathMapStack[offset$2 = (j$2 + boundLength) * 4]) != null && typeof map === 'object' && map[$TYPE] === void 0 && Array.isArray(map) === false && (keys$2 = pathMapStack[offset$2 + 1] || (pathMapStack[offset$2 + 1] = Object.keys(map))) && ((index$3 = pathMapStack[offset$2 + 2] || (pathMapStack[offset$2 + 2] = 0)) || true) && keys$2.length > 0) {
                        if ((pathMapStack[offset$2 + 2] = ++index$3) - 1 < keys$2.length) {
                            if (reqLen - k < j$2 - i$11) {
                                var src$8 = keys$2, i$12 = -1, n$7 = src$8.length, dest$3 = new Array(n$7);
                                while (++i$12 < n$7) {
                                    dest$3[i$12] = src$8[i$12];
                                }
                                reqKeys = dest$3;
                                x$3 = -1;
                                y = reqKeys.length;
                                while (++x$3 < y) {
                                    reqKeys[x$3] = (z = reqKeys[x$3]) == __NULL ? null : z;
                                }
                                req$3[++reqLen] = y === 1 ? reqKeys[0] : reqKeys;
                            }
                            if (optLen - l < j$2 - i$11) {
                                var src$9 = keys$2, i$13 = -1, n$8 = src$9.length, dest$4 = new Array(n$8);
                                while (++i$13 < n$8) {
                                    dest$4[i$13] = src$9[i$13];
                                }
                                reqKeys = dest$4;
                                optKeys = [];
                                optKeysLen = 0;
                                x$3 = -1;
                                y = reqKeys.length;
                                while (++x$3 < y) {
                                    (z = reqKeys[x$3]) !== __NULL && (optKeys[optKeysLen++] = z);
                                }
                                if (optKeysLen > 0) {
                                    opt$2[++optLen] = optKeysLen === 1 ? optKeys[0] : optKeys;
                                }
                            }
                            pathMapStack[offset$2 = 4 * (++j$2 + boundLength)] = map[keys$2[index$3 - 1]];
                            continue;
                        }
                    }
                    delete pathMapStack[offset$2 = 4 * (j$2-- + boundLength)];
                    delete pathMapStack[offset$2 + 1];
                    delete pathMapStack[offset$2 + 2];
                    delete pathMapStack[offset$2 + 3];
                }
                req$3.pathSetIndex = pathMap;
                requestedMissingPaths[requestedMissingPaths.length] = req$3;
                optimizedMissingPaths[optimizedMissingPaths.length] = opt$2;
            }
            appendNullKey = false;
            jsonRoot != null && (values[index] = hasValue && { json: jsons[-1] } || void 0);
            var offset$3, keys$3, index$4;
            while (depth > -1 && (keys$3 = pathMapStack[(offset$3 = 4 * depth--) + 1]) && ((index$4 = pathMapStack[offset$3 + 2]) || true) && (pathMapStack[offset$3 + 2] = ++index$4) >= keys$3.length) {
                delete pathMapStack[offset$3 + 0];
                delete pathMapStack[offset$3 + 1];
                delete pathMapStack[offset$3 + 2];
                delete pathMapStack[offset$3 + 3];
            }
        }
    }
    return {
        'values': values,
        'errors': errors,
        'requestedPaths': requestedPaths,
        'optimizedPaths': optimizedPaths,
        'requestedMissingPaths': requestedMissingPaths,
        'optimizedMissingPaths': optimizedMissingPaths
    };
}
function setPathMapsAsJSONG(model, pathMaps, values, errorSelector, boundPath) {
    var boundLength = 0, nodeRoot = model._cache || {}, nodeParent, node;
    if (Array.isArray(boundPath)) {
        nodeParent = nodeRoot;
        boundLength = boundPath.length;
    } else {
        nodeParent = getBoundValue(model);
        boundPath = model._path || [];
    }
    var root = model._root || model, boxed = model._boxed || false, expired = root.expired || (root.expired = []), refreshing = model._refreshing || false, appendNullKey = false;
    typeof errorSelector === 'function' || (errorSelector = model._errorSelector) || (errorSelector = function (x$6, y$2) {
        return y$2;
    });
    var pathMapStack = pathMaps.pathMapStack || (pathMaps.pathMapStack = []);
    var nodes = pathMaps.nodes || (pathMaps.nodes = []);
    var jsons = pathMaps.jsons || (pathMaps.jsons = []);
    var errors = pathMaps.errors || (pathMaps.errors = []);
    var refs = pathMaps.refs || (pathMaps.refs = []);
    var depth = pathMaps.depth || (pathMaps.depth = 0);
    var refIndex = pathMaps.refIndex || (pathMaps.refIndex = 0);
    var refDepth = pathMaps.refDepth || (pathMaps.refDepth = 0);
    var requestedPath = pathMaps.requestedPath || (pathMaps.requestedPath = []);
    var optimizedPath = pathMaps.optimizedPath || (pathMaps.optimizedPath = []);
    var requestedPaths = pathMaps.requestedPaths || (pathMaps.requestedPaths = []);
    var optimizedPaths = pathMaps.optimizedPaths || (pathMaps.optimizedPaths = []);
    var requestedMissingPaths = pathMaps.requestedMissingPaths || (pathMaps.requestedMissingPaths = []);
    var optimizedMissingPaths = pathMaps.optimizedMissingPaths || (pathMaps.optimizedMissingPaths = []);
    var hasValue = pathMaps.hasValue || (pathMaps.hasValue = false);
    var jsonRoot = pathMaps.jsonRoot || (pathMaps.jsonRoot = values && values[0]);
    var jsonParent = pathMaps.jsonParent || (pathMaps.jsonParent = jsonRoot);
    var jsonNode = pathMaps.jsonNode || (pathMaps.jsonNode = jsonParent);
    var pathMap, length = 0, height = 0, reference, refLength = 0, refHeight = 0, nodeType, nodeValue, nodeSize, nodeTimestamp, nodeExpires;
    refs[-1] = boundPath;
    nodes[-1] = nodeParent;
    jsons[-1] = jsonParent;
    jsons[-2] = jsons;
    var index = -1, count = pathMaps.length;
    while (++index < count) {
        pathMap = pathMaps[index];
        pathMapStack[0] = pathMap;
        depth = 0;
        length = pathMap.length;
        height = length - 1;
        var ref;
        refs.length = 0;
        while (depth > -1) {
            refIndex = depth;
            while (--refIndex >= -1) {
                if (!!(ref = refs[refIndex])) {
                    refLength = ref.length;
                    var i = -1, j = 0;
                    while (++i < refLength) {
                        optimizedPath[j++] = ref[i];
                    }
                    i = ++refIndex;
                    while (i < depth) {
                        optimizedPath[j++] = requestedPath[i++];
                    }
                    optimizedPath.length = j;
                    break;
                }
            }
            var offset, keys, index$2, key, isKeySet;
            pathMap = pathMap;
            height = (length = depth) - 1;
            nodeParent = node = nodes[depth - 1];
            jsonParent = jsonNode = jsons[depth - 1];
            depth = depth;
            follow_path_map_5560:
                do {
                    if ((pathMap = pathMapStack[offset = depth * 4]) != null && typeof pathMap === 'object' && (keys = pathMapStack[offset + 1] || (pathMapStack[offset + 1] = Object.keys(pathMap))) && ((index$2 = pathMapStack[offset + 2] || (pathMapStack[offset + 2] = 0)) || true) && ((key = pathMapStack[offset + 3]) || true) && ((isKeySet = keys.length > 1) || keys.length > 0)) {
                        key = keys[index$2];
                        if (key != null) {
                            depth >= boundLength && (requestedPath[requestedPath.length = depth] = key);
                            pathMapStack[offset = 4 * (depth + 1)] = pathMap = pathMap[key];
                            if (pathMap != null && typeof pathMap === 'object' && pathMap[$TYPE] === void 0 && Array.isArray(pathMap) === false && (keys = Object.keys(pathMap)) && keys.length > 0) {
                                optimizedPath[optimizedPath.length = depth + (refLength - refIndex)] = key;
                                node = nodeParent[key];
                                nodeType = node && node[$TYPE] || void 0;
                                nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                nodeTimestamp = node && node[$TIMESTAMP];
                                nodeExpires = node && node[$EXPIRES];
                                if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                    node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                }
                                if (typeof node !== 'object' || !!nodeType && nodeType !== SENTINEL && !Array.isArray(nodeValue)) {
                                    nodeType = void 0;
                                    nodeValue = Object.create(null);
                                    if (node != null && node !== nodeValue) {
                                        var nodeRefsLength = node.__refsLength || 0, destRefsLength = nodeValue.__refsLength || 0, i$2 = -1, ref$2;
                                        while (++i$2 < nodeRefsLength) {
                                            if ((ref$2 = node[__REF + i$2]) !== void 0) {
                                                ref$2[__CONTEXT] = nodeValue;
                                                nodeValue[__REF + (destRefsLength + i$2)] = ref$2;
                                                node[__REF + i$2] = void 0;
                                            }
                                        }
                                        nodeValue[__REFS_LENGTH] = nodeRefsLength + destRefsLength;
                                        node[__REFS_LENGTH] = ref$2 = void 0;
                                        if (node != null && typeof node === 'object') {
                                            var root$2 = root, head = root$2.__head, tail = root$2.__tail, next, prev;
                                            (next = node.__next) && (next != null && typeof next === 'object') && (next.__prev = prev);
                                            (prev = node.__prev) && (prev != null && typeof prev === 'object') && (prev.__next = next);
                                            node === head && (root$2.__head = root$2.__next = head = next);
                                            node === tail && (root$2.__tail = root$2.__prev = tail = prev);
                                            node.__next = node.__prev = void 0;
                                            head = tail = next = prev = void 0;
                                        }
                                    }
                                    nodeParent[key] = node = nodeValue;
                                    node = !node[__SELF] && ((node[__SELF] = node) || true) && ((node[__KEY] = key) || true) && ((node[__PARENT] = nodeParent) || true) && ((node[__ROOT] = nodeRoot) || true) && (node[__GENERATION] || (node[__GENERATION] = 0) || node) && ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue) && (nodeValue[__CONTAINER] = node)) || node;
                                }
                                if (node != null && jsonParent != null) {
                                    if (!nodeType && (node != null && typeof node === 'object') && !Array.isArray(nodeValue)) {
                                        if (!(jsonNode = jsonParent[key]) || !(jsonNode != null && typeof jsonNode === 'object')) {
                                            jsonNode = jsonParent[key] = Object.create(null);
                                        }
                                    } else {
                                        if (boxed === true) {
                                            jsonParent[key] = node;
                                        } else {
                                            var val = nodeValue;
                                            if (val != null && typeof val === 'object') {
                                                var src = val, keys$2 = Object.keys(src), x, i$3 = -1, n = keys$2.length;
                                                val = Array.isArray(src) && new Array(src.length) || Object.create(null);
                                                while (++i$3 < n) {
                                                    x = keys$2[i$3];
                                                    !(!(x[0] !== '_' || x[1] !== '_') || (x === __SELF || x === __PARENT || x === __ROOT)) && (val[x] = src[x]);
                                                }
                                            }
                                            if (!nodeType && (val != null && typeof val === 'object') && !Array.isArray(val)) {
                                                val[$TYPE] = LEAF;
                                            }
                                            jsonParent[key] = val;
                                        }
                                    }
                                }
                                if ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                                    do {
                                        if (nodeExpires !== 1) {
                                            var root$3 = root, head$2 = root$3.__head, tail$2 = root$3.__tail, next$2 = node.__next, prev$2 = node.__prev;
                                            if (node !== head$2) {
                                                next$2 && (next$2 != null && typeof next$2 === 'object') && (next$2.__prev = prev$2);
                                                prev$2 && (prev$2 != null && typeof prev$2 === 'object') && (prev$2.__next = next$2);
                                                (next$2 = head$2) && (head$2 != null && typeof head$2 === 'object') && (head$2.__prev = node);
                                                root$3.__head = root$3.__next = head$2 = node;
                                                head$2.__next = next$2;
                                                head$2.__prev = void 0;
                                            }
                                            if (tail$2 == null || node === tail$2) {
                                                root$3.__tail = root$3.__prev = tail$2 = prev$2 || node;
                                            }
                                            root$3 = head$2 = tail$2 = next$2 = prev$2 = void 0;
                                        }
                                        refs[depth] = nodeValue;
                                        refIndex = depth + 1;
                                        refDepth = 0;
                                        var key$2, isKeySet$2;
                                        reference = nodeValue;
                                        refHeight = (refLength = reference.length) - 1;
                                        nodeParent = nodeRoot;
                                        jsonParent = jsonRoot;
                                        refDepth = refDepth;
                                        follow_path_5797:
                                            do {
                                                key$2 = reference[refDepth];
                                                isKeySet$2 = false;
                                                if (key$2 != null) {
                                                    if (refDepth < refHeight) {
                                                        optimizedPath[optimizedPath.length = refDepth] = key$2;
                                                        node = nodeParent[key$2];
                                                        nodeType = node && node[$TYPE] || void 0;
                                                        nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                                        nodeTimestamp = node && node[$TIMESTAMP];
                                                        nodeExpires = node && node[$EXPIRES];
                                                        if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                                            node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                                        }
                                                        if (typeof node !== 'object' || !!nodeType && nodeType !== SENTINEL && !Array.isArray(nodeValue)) {
                                                            nodeType = void 0;
                                                            nodeValue = Object.create(null);
                                                            if (node != null && node !== nodeValue) {
                                                                var nodeRefsLength$2 = node.__refsLength || 0, destRefsLength$2 = nodeValue.__refsLength || 0, i$4 = -1, ref$3;
                                                                while (++i$4 < nodeRefsLength$2) {
                                                                    if ((ref$3 = node[__REF + i$4]) !== void 0) {
                                                                        ref$3[__CONTEXT] = nodeValue;
                                                                        nodeValue[__REF + (destRefsLength$2 + i$4)] = ref$3;
                                                                        node[__REF + i$4] = void 0;
                                                                    }
                                                                }
                                                                nodeValue[__REFS_LENGTH] = nodeRefsLength$2 + destRefsLength$2;
                                                                node[__REFS_LENGTH] = ref$3 = void 0;
                                                                if (node != null && typeof node === 'object') {
                                                                    var root$4 = root, head$3 = root$4.__head, tail$3 = root$4.__tail, next$3, prev$3;
                                                                    (next$3 = node.__next) && (next$3 != null && typeof next$3 === 'object') && (next$3.__prev = prev$3);
                                                                    (prev$3 = node.__prev) && (prev$3 != null && typeof prev$3 === 'object') && (prev$3.__next = next$3);
                                                                    node === head$3 && (root$4.__head = root$4.__next = head$3 = next$3);
                                                                    node === tail$3 && (root$4.__tail = root$4.__prev = tail$3 = prev$3);
                                                                    node.__next = node.__prev = void 0;
                                                                    head$3 = tail$3 = next$3 = prev$3 = void 0;
                                                                }
                                                            }
                                                            nodeParent[key$2] = node = nodeValue;
                                                            node = !node[__SELF] && ((node[__SELF] = node) || true) && ((node[__KEY] = key$2) || true) && ((node[__PARENT] = nodeParent) || true) && ((node[__ROOT] = nodeRoot) || true) && (node[__GENERATION] || (node[__GENERATION] = 0) || node) && ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue) && (nodeValue[__CONTAINER] = node)) || node;
                                                        }
                                                        if (node != null && jsonParent != null) {
                                                            if (!nodeType && (node != null && typeof node === 'object') && !Array.isArray(nodeValue)) {
                                                                if (!(jsonNode = jsonParent[key$2]) || !(jsonNode != null && typeof jsonNode === 'object')) {
                                                                    jsonNode = jsonParent[key$2] = Object.create(null);
                                                                }
                                                            } else {
                                                                if (boxed === true) {
                                                                    jsonParent[key$2] = node;
                                                                } else {
                                                                    var val$2 = nodeValue;
                                                                    if (val$2 != null && typeof val$2 === 'object') {
                                                                        var src$2 = val$2, keys$3 = Object.keys(src$2), x$2, i$5 = -1, n$2 = keys$3.length;
                                                                        val$2 = Array.isArray(src$2) && new Array(src$2.length) || Object.create(null);
                                                                        while (++i$5 < n$2) {
                                                                            x$2 = keys$3[i$5];
                                                                            !(!(x$2[0] !== '_' || x$2[1] !== '_') || (x$2 === __SELF || x$2 === __PARENT || x$2 === __ROOT)) && (val$2[x$2] = src$2[x$2]);
                                                                        }
                                                                    }
                                                                    if (!nodeType && (val$2 != null && typeof val$2 === 'object') && !Array.isArray(val$2)) {
                                                                        val$2[$TYPE] = LEAF;
                                                                    }
                                                                    jsonParent[key$2] = val$2;
                                                                }
                                                            }
                                                        }
                                                        if (appendNullKey = node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue)) {
                                                            nodeParent = node;
                                                            break follow_path_5797;
                                                        }
                                                        nodeParent = node;
                                                        jsonParent = jsonNode;
                                                        refDepth = refDepth + 1;
                                                        continue follow_path_5797;
                                                    } else if (refDepth === refHeight) {
                                                        optimizedPath[optimizedPath.length = refDepth] = key$2;
                                                        node = nodeParent[key$2];
                                                        nodeType = node && node[$TYPE] || void 0;
                                                        nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                                        nodeTimestamp = node && node[$TIMESTAMP];
                                                        nodeExpires = node && node[$EXPIRES];
                                                        if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                                            node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                                        }
                                                        if (typeof node !== 'object' || !!nodeType && nodeType !== SENTINEL && !Array.isArray(nodeValue)) {
                                                            nodeType = void 0;
                                                            nodeValue = Object.create(null);
                                                            if (node != null && node !== nodeValue) {
                                                                var nodeRefsLength$3 = node.__refsLength || 0, destRefsLength$3 = nodeValue.__refsLength || 0, i$6 = -1, ref$4;
                                                                while (++i$6 < nodeRefsLength$3) {
                                                                    if ((ref$4 = node[__REF + i$6]) !== void 0) {
                                                                        ref$4[__CONTEXT] = nodeValue;
                                                                        nodeValue[__REF + (destRefsLength$3 + i$6)] = ref$4;
                                                                        node[__REF + i$6] = void 0;
                                                                    }
                                                                }
                                                                nodeValue[__REFS_LENGTH] = nodeRefsLength$3 + destRefsLength$3;
                                                                node[__REFS_LENGTH] = ref$4 = void 0;
                                                                if (node != null && typeof node === 'object') {
                                                                    var root$5 = root, head$4 = root$5.__head, tail$4 = root$5.__tail, next$4, prev$4;
                                                                    (next$4 = node.__next) && (next$4 != null && typeof next$4 === 'object') && (next$4.__prev = prev$4);
                                                                    (prev$4 = node.__prev) && (prev$4 != null && typeof prev$4 === 'object') && (prev$4.__next = next$4);
                                                                    node === head$4 && (root$5.__head = root$5.__next = head$4 = next$4);
                                                                    node === tail$4 && (root$5.__tail = root$5.__prev = tail$4 = prev$4);
                                                                    node.__next = node.__prev = void 0;
                                                                    head$4 = tail$4 = next$4 = prev$4 = void 0;
                                                                }
                                                            }
                                                            nodeParent[key$2] = node = nodeValue;
                                                            node = !node[__SELF] && ((node[__SELF] = node) || true) && ((node[__KEY] = key$2) || true) && ((node[__PARENT] = nodeParent) || true) && ((node[__ROOT] = nodeRoot) || true) && (node[__GENERATION] || (node[__GENERATION] = 0) || node) && ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue) && (nodeValue[__CONTAINER] = node)) || node;
                                                        }
                                                        if (node != null && jsonParent != null) {
                                                            if (!nodeType && (node != null && typeof node === 'object') && !Array.isArray(nodeValue)) {
                                                                if (!(jsonNode = jsonParent[key$2]) || !(jsonNode != null && typeof jsonNode === 'object')) {
                                                                    jsonNode = jsonParent[key$2] = Object.create(null);
                                                                }
                                                            } else {
                                                                if (boxed === true) {
                                                                    jsonParent[key$2] = node;
                                                                } else {
                                                                    var val$3 = nodeValue;
                                                                    if (val$3 != null && typeof val$3 === 'object') {
                                                                        var src$3 = val$3, keys$4 = Object.keys(src$3), x$3, i$7 = -1, n$3 = keys$4.length;
                                                                        val$3 = Array.isArray(src$3) && new Array(src$3.length) || Object.create(null);
                                                                        while (++i$7 < n$3) {
                                                                            x$3 = keys$4[i$7];
                                                                            !(!(x$3[0] !== '_' || x$3[1] !== '_') || (x$3 === __SELF || x$3 === __PARENT || x$3 === __ROOT)) && (val$3[x$3] = src$3[x$3]);
                                                                        }
                                                                    }
                                                                    if (!nodeType && (val$3 != null && typeof val$3 === 'object') && !Array.isArray(val$3)) {
                                                                        val$3[$TYPE] = LEAF;
                                                                    }
                                                                    jsonParent[key$2] = val$3;
                                                                }
                                                            }
                                                        }
                                                        appendNullKey = node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue);
                                                        nodeParent = node;
                                                        break follow_path_5797;
                                                    }
                                                } else if (refDepth < refHeight) {
                                                    nodeParent = node;
                                                    jsonParent = jsonNode;
                                                    refDepth = refDepth + 1;
                                                    continue follow_path_5797;
                                                }
                                                nodeParent = node;
                                                break follow_path_5797;
                                            } while (true);
                                        node = nodeParent;
                                    } while ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue));
                                    if (node == null) {
                                        while (refDepth <= refHeight) {
                                            optimizedPath[refDepth] = reference[refDepth++];
                                        }
                                    }
                                }
                                if (node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue)) {
                                    nodeParent = node;
                                    break follow_path_map_5560;
                                }
                                pathMapStack[offset + 1] = keys;
                                pathMapStack[offset + 3] = key;
                                nodeParent = nodes[depth] = node;
                                jsonParent = jsons[depth] = jsonNode;
                                depth = depth + 1;
                                continue follow_path_map_5560;
                            }
                        } else {
                            pathMapStack[offset = 3 * (depth + 1)] = pathMap[__NULL];
                            pathMapStack[offset + 1] = keys;
                            pathMapStack[offset + 2] = 0;
                            nodeParent = nodes[depth] = node;
                            jsonParent = jsons[depth] = jsonNode;
                            depth = depth + 1;
                            continue follow_path_map_5560;
                        }
                    }
                    if (key != null) {
                        optimizedPath[optimizedPath.length = depth + (refLength - refIndex)] = key;
                        node = nodeParent[key];
                        nodeType = node && node[$TYPE] || void 0;
                        nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                        nodeTimestamp = node && node[$TIMESTAMP];
                        nodeExpires = node && node[$EXPIRES];
                        if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                            node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                        }
                        nodeType = pathMap && pathMap[$TYPE] || void 0;
                        nodeValue = nodeType === SENTINEL ? pathMap[VALUE] : nodeType === ERROR ? pathMap = errorSelector(requestedPath, pathMap) : pathMap;
                        nodeTimestamp = pathMap && pathMap[$TIMESTAMP];
                        nodeExpires = pathMap && pathMap[$EXPIRES];
                        var newNode;
                        newNode = pathMap;
                        if ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                            nodeType = 'array';
                            newNode[$SIZE] = nodeSize = (nodeType === SENTINEL && 50 || 0) + (nodeValue.length || 1);
                            delete nodeValue[$SIZE];
                            nodeValue[__CONTAINER] = newNode;
                        } else if (nodeType === SENTINEL) {
                            newNode[$SIZE] = nodeSize = 50 + (typeof nodeValue === 'string' && nodeValue.length || 1);
                        } else if (nodeType === ERROR) {
                            newNode[$SIZE] = nodeSize = 50 + (pathMap[$SIZE] || 0 || 1);
                        } else if (!(pathMap != null && typeof pathMap === 'object')) {
                            nodeSize = 50 + (typeof nodeValue === 'string' && nodeValue.length || 1);
                            nodeType = 'sentinel';
                            newNode = { 'value': nodeValue };
                            newNode[$TYPE] = nodeType;
                            newNode[$SIZE] = nodeSize;
                        } else {
                            nodeType = newNode[$TYPE] = nodeType || 'leaf';
                            newNode[$SIZE] = nodeSize = pathMap[$SIZE] || 0 || 50 + 1;
                        }
                        ;
                        if (node != null && node !== newNode) {
                            var nodeRefsLength$4 = node.__refsLength || 0, destRefsLength$4 = newNode.__refsLength || 0, i$8 = -1, ref$5;
                            while (++i$8 < nodeRefsLength$4) {
                                if ((ref$5 = node[__REF + i$8]) !== void 0) {
                                    ref$5[__CONTEXT] = newNode;
                                    newNode[__REF + (destRefsLength$4 + i$8)] = ref$5;
                                    node[__REF + i$8] = void 0;
                                }
                            }
                            newNode[__REFS_LENGTH] = nodeRefsLength$4 + destRefsLength$4;
                            node[__REFS_LENGTH] = ref$5 = void 0;
                            if (node != null && typeof node === 'object') {
                                var root$6 = root, head$5 = root$6.__head, tail$5 = root$6.__tail, next$5, prev$5;
                                (next$5 = node.__next) && (next$5 != null && typeof next$5 === 'object') && (next$5.__prev = prev$5);
                                (prev$5 = node.__prev) && (prev$5 != null && typeof prev$5 === 'object') && (prev$5.__next = next$5);
                                node === head$5 && (root$6.__head = root$6.__next = head$5 = next$5);
                                node === tail$5 && (root$6.__tail = root$6.__prev = tail$5 = prev$5);
                                node.__next = node.__prev = void 0;
                                head$5 = tail$5 = next$5 = prev$5 = void 0;
                            }
                        }
                        nodeParent[key] = node = newNode;
                        node = !node[__SELF] && ((node[__SELF] = node) || true) && ((node[__KEY] = key) || true) && ((node[__PARENT] = nodeParent) || true) && ((node[__ROOT] = nodeRoot) || true) && (node[__GENERATION] || (node[__GENERATION] = 0) || node) && ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue) && (nodeValue[__CONTAINER] = node)) || node;
                        if (node != null && typeof node === 'object') {
                            if (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true) {
                                node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                            } else {
                                if (nodeExpires !== 1) {
                                    var root$7 = root, head$6 = root$7.__head, tail$6 = root$7.__tail, next$6 = node.__next, prev$6 = node.__prev;
                                    if (node !== head$6) {
                                        next$6 && (next$6 != null && typeof next$6 === 'object') && (next$6.__prev = prev$6);
                                        prev$6 && (prev$6 != null && typeof prev$6 === 'object') && (prev$6.__next = next$6);
                                        (next$6 = head$6) && (head$6 != null && typeof head$6 === 'object') && (head$6.__prev = node);
                                        root$7.__head = root$7.__next = head$6 = node;
                                        head$6.__next = next$6;
                                        head$6.__prev = void 0;
                                    }
                                    if (tail$6 == null || node === tail$6) {
                                        root$7.__tail = root$7.__prev = tail$6 = prev$6 || node;
                                    }
                                    root$7 = head$6 = tail$6 = next$6 = prev$6 = void 0;
                                }
                            }
                        }
                        if (node != null && jsonParent != null) {
                            if (boxed === true) {
                                jsonParent[key] = node;
                            } else {
                                var val$4 = nodeValue;
                                if (val$4 != null && typeof val$4 === 'object') {
                                    var src$4 = val$4, keys$5 = Object.keys(src$4), x$4, i$9 = -1, n$4 = keys$5.length;
                                    val$4 = Array.isArray(src$4) && new Array(src$4.length) || Object.create(null);
                                    while (++i$9 < n$4) {
                                        x$4 = keys$5[i$9];
                                        !(!(x$4[0] !== '_' || x$4[1] !== '_') || (x$4 === __SELF || x$4 === __PARENT || x$4 === __ROOT)) && (val$4[x$4] = src$4[x$4]);
                                    }
                                }
                                if (!nodeType && (val$4 != null && typeof val$4 === 'object') && !Array.isArray(val$4)) {
                                    val$4[$TYPE] = LEAF;
                                }
                                jsonParent[key] = val$4;
                            }
                        }
                        appendNullKey = false;
                    }
                    nodeParent = node;
                    break follow_path_map_5560;
                } while (true);
            node = nodeParent;
            if (node != null || boxed === true) {
                if (nodeType === ERROR) {
                    if (nodeExpires !== 1) {
                        var root$8 = root, head$7 = root$8.__head, tail$7 = root$8.__tail, next$7 = node.__next, prev$7 = node.__prev;
                        if (node !== head$7) {
                            next$7 && (next$7 != null && typeof next$7 === 'object') && (next$7.__prev = prev$7);
                            prev$7 && (prev$7 != null && typeof prev$7 === 'object') && (prev$7.__next = next$7);
                            (next$7 = head$7) && (head$7 != null && typeof head$7 === 'object') && (head$7.__prev = node);
                            root$8.__head = root$8.__next = head$7 = node;
                            head$7.__next = next$7;
                            head$7.__prev = void 0;
                        }
                        if (tail$7 == null || node === tail$7) {
                            root$8.__tail = root$8.__prev = tail$7 = prev$7 || node;
                        }
                        root$8 = head$7 = tail$7 = next$7 = prev$7 = void 0;
                    }
                    node = onErrorAsJSONG(errors, boxed, requestedPath, index, node, nodeValue);
                }
                hasValue || (hasValue = jsonParent != null);
                var src$5 = optimizedPath, i$10 = -1, n$5 = src$5.length, opt = new Array(n$5);
                while (++i$10 < n$5) {
                    opt[i$10] = src$5[i$10];
                }
                var src$6 = requestedPath, i$11 = -1, n$6 = src$6.length, req = new Array(n$6);
                while (++i$11 < n$6) {
                    req[i$11] = src$6[i$11];
                }
                if (appendNullKey === true) {
                    req[req.length] = null;
                }
                requestedPaths[requestedPaths.length] = req;
                optimizedPaths[optimizedPaths.length] = opt;
            }
            if (boxed === false && node == null || refreshing === true) {
                var src$7 = boundPath, i$12 = -1, n$7 = src$7.length, req$2 = new Array(n$7);
                while (++i$12 < n$7) {
                    req$2[i$12] = src$7[i$12];
                }
                var src$8 = optimizedPath, i$13 = -1, n$8 = src$8.length, opt$2 = new Array(n$8);
                while (++i$13 < n$8) {
                    opt$2[i$13] = src$8[i$13];
                }
                var reqLen = req$2.length - 1, optLen = opt$2.length - 1, i$14 = -1, n$9 = requestedPath.length, map, offset$2, keys$6, index$3, reqKeys, optKeys, optKeysLen, x$5, y, z;
                while (++i$14 < n$9) {
                    req$2[++reqLen] = (reqKeys = pathMapStack[offset$2 = (i$14 + boundLength) * 4 + 1]) && reqKeys.length > 1 && [requestedPath[i$14]] || requestedPath[i$14];
                }
                var j$2 = depth, k = reqLen, l = optLen;
                i$14 = j$2++;
                while (j$2 > i$14) {
                    if ((map = pathMapStack[offset$2 = (j$2 + boundLength) * 4]) != null && typeof map === 'object' && map[$TYPE] === void 0 && Array.isArray(map) === false && (keys$6 = pathMapStack[offset$2 + 1] || (pathMapStack[offset$2 + 1] = Object.keys(map))) && ((index$3 = pathMapStack[offset$2 + 2] || (pathMapStack[offset$2 + 2] = 0)) || true) && keys$6.length > 0) {
                        if ((pathMapStack[offset$2 + 2] = ++index$3) - 1 < keys$6.length) {
                            if (reqLen - k < j$2 - i$14) {
                                var src$9 = keys$6, i$15 = -1, n$10 = src$9.length, dest = new Array(n$10);
                                while (++i$15 < n$10) {
                                    dest[i$15] = src$9[i$15];
                                }
                                reqKeys = dest;
                                x$5 = -1;
                                y = reqKeys.length;
                                while (++x$5 < y) {
                                    reqKeys[x$5] = (z = reqKeys[x$5]) == __NULL ? null : z;
                                }
                                req$2[++reqLen] = y === 1 ? reqKeys[0] : reqKeys;
                            }
                            if (optLen - l < j$2 - i$14) {
                                var src$10 = keys$6, i$16 = -1, n$11 = src$10.length, dest$2 = new Array(n$11);
                                while (++i$16 < n$11) {
                                    dest$2[i$16] = src$10[i$16];
                                }
                                reqKeys = dest$2;
                                optKeys = [];
                                optKeysLen = 0;
                                x$5 = -1;
                                y = reqKeys.length;
                                while (++x$5 < y) {
                                    (z = reqKeys[x$5]) !== __NULL && (optKeys[optKeysLen++] = z);
                                }
                                if (optKeysLen > 0) {
                                    opt$2[++optLen] = optKeysLen === 1 ? optKeys[0] : optKeys;
                                }
                            }
                            pathMapStack[offset$2 = 4 * (++j$2 + boundLength)] = map[keys$6[index$3 - 1]];
                            continue;
                        }
                    }
                    delete pathMapStack[offset$2 = 4 * (j$2-- + boundLength)];
                    delete pathMapStack[offset$2 + 1];
                    delete pathMapStack[offset$2 + 2];
                    delete pathMapStack[offset$2 + 3];
                }
                req$2.pathSetIndex = index;
                requestedMissingPaths[requestedMissingPaths.length] = req$2;
                optimizedMissingPaths[optimizedMissingPaths.length] = opt$2;
            }
            appendNullKey = false;
            var offset$3, keys$7, index$4;
            while (depth > -1 && (keys$7 = pathMapStack[(offset$3 = 4 * depth--) + 1]) && ((index$4 = pathMapStack[offset$3 + 2]) || true) && (pathMapStack[offset$3 + 2] = ++index$4) >= keys$7.length) {
                delete pathMapStack[offset$3 + 0];
                delete pathMapStack[offset$3 + 1];
                delete pathMapStack[offset$3 + 2];
                delete pathMapStack[offset$3 + 3];
            }
        }
    }
    values && (values[0] = hasValue && {
        paths: requestedPaths,
        jsong: jsons[-1]
    } || undefined);
    return {
        'values': values,
        'errors': errors,
        'requestedPaths': requestedPaths,
        'optimizedPaths': optimizedPaths,
        'requestedMissingPaths': requestedMissingPaths,
        'optimizedMissingPaths': optimizedMissingPaths
    };
}
function setPathMapsAsPathMap(model, pathMaps, values, errorSelector, boundPath) {
    var boundLength = 0, nodeRoot = model._cache || {}, nodeParent, node;
    if (Array.isArray(boundPath)) {
        nodeParent = nodeRoot;
        boundLength = boundPath.length;
    } else {
        nodeParent = getBoundValue(model);
        boundPath = model._path || [];
    }
    var root = model._root || model, boxed = model._boxed || false, expired = root.expired || (root.expired = []), refreshing = model._refreshing || false, appendNullKey = false;
    typeof errorSelector === 'function' || (errorSelector = model._errorSelector) || (errorSelector = function (x$5, y$2) {
        return y$2;
    });
    var pathMapStack = pathMaps.pathMapStack || (pathMaps.pathMapStack = []);
    var nodes = pathMaps.nodes || (pathMaps.nodes = []);
    var jsons = pathMaps.jsons || (pathMaps.jsons = []);
    var errors = pathMaps.errors || (pathMaps.errors = []);
    var refs = pathMaps.refs || (pathMaps.refs = []);
    var depth = pathMaps.depth || (pathMaps.depth = 0);
    var refIndex = pathMaps.refIndex || (pathMaps.refIndex = 0);
    var refDepth = pathMaps.refDepth || (pathMaps.refDepth = 0);
    var requestedPath = pathMaps.requestedPath || (pathMaps.requestedPath = []);
    var optimizedPath = pathMaps.optimizedPath || (pathMaps.optimizedPath = []);
    var requestedPaths = pathMaps.requestedPaths || (pathMaps.requestedPaths = []);
    var optimizedPaths = pathMaps.optimizedPaths || (pathMaps.optimizedPaths = []);
    var requestedMissingPaths = pathMaps.requestedMissingPaths || (pathMaps.requestedMissingPaths = []);
    var optimizedMissingPaths = pathMaps.optimizedMissingPaths || (pathMaps.optimizedMissingPaths = []);
    var hasValue = pathMaps.hasValue || (pathMaps.hasValue = false);
    var jsonRoot = pathMaps.jsonRoot || (pathMaps.jsonRoot = values && values[0]);
    var jsonParent = pathMaps.jsonParent || (pathMaps.jsonParent = jsonRoot);
    var jsonNode = pathMaps.jsonNode || (pathMaps.jsonNode = jsonParent);
    var pathMap, length = 0, height = 0, reference, refLength = 0, refHeight = 0, nodeType, nodeValue, nodeSize, nodeTimestamp, nodeExpires;
    refs[-1] = boundPath;
    nodes[-1] = nodeParent;
    jsons[-1] = jsonParent;
    jsons[-2] = jsons;
    var index = -1, count = pathMaps.length;
    while (++index < count) {
        pathMap = pathMaps[index];
        pathMapStack[0] = pathMap;
        depth = 0;
        length = pathMap.length;
        height = length - 1;
        var ref;
        refs.length = 0;
        while (depth > -1) {
            refIndex = depth;
            while (--refIndex >= -1) {
                if (!!(ref = refs[refIndex])) {
                    refLength = ref.length;
                    var i = -1, j = 0;
                    while (++i < refLength) {
                        optimizedPath[j++] = ref[i];
                    }
                    i = ++refIndex;
                    while (i < depth) {
                        optimizedPath[j++] = requestedPath[i++];
                    }
                    optimizedPath.length = j;
                    break;
                }
            }
            var offset, keys, index$2, key, isKeySet;
            pathMap = pathMap;
            height = (length = depth) - 1;
            nodeParent = node = nodes[depth - 1];
            jsonParent = jsonNode = jsons[depth - 1];
            depth = depth;
            follow_path_map_8152:
                do {
                    if ((pathMap = pathMapStack[offset = depth * 4]) != null && typeof pathMap === 'object' && (keys = pathMapStack[offset + 1] || (pathMapStack[offset + 1] = Object.keys(pathMap))) && ((index$2 = pathMapStack[offset + 2] || (pathMapStack[offset + 2] = 0)) || true) && ((key = pathMapStack[offset + 3]) || true) && ((isKeySet = keys.length > 1) || keys.length > 0)) {
                        key = keys[index$2];
                        if (key != null) {
                            depth >= boundLength && (requestedPath[requestedPath.length = depth] = key);
                            pathMapStack[offset = 4 * (depth + 1)] = pathMap = pathMap[key];
                            if (pathMap != null && typeof pathMap === 'object' && pathMap[$TYPE] === void 0 && Array.isArray(pathMap) === false && (keys = Object.keys(pathMap)) && keys.length > 0) {
                                optimizedPath[optimizedPath.length = depth + (refLength - refIndex)] = key;
                                node = nodeParent[key];
                                nodeType = node && node[$TYPE] || void 0;
                                nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                nodeTimestamp = node && node[$TIMESTAMP];
                                nodeExpires = node && node[$EXPIRES];
                                if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                    node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                }
                                if (typeof node !== 'object' || !!nodeType && nodeType !== SENTINEL && !Array.isArray(nodeValue)) {
                                    nodeType = void 0;
                                    nodeValue = Object.create(null);
                                    if (node != null && node !== nodeValue) {
                                        var nodeRefsLength = node.__refsLength || 0, destRefsLength = nodeValue.__refsLength || 0, i$2 = -1, ref$2;
                                        while (++i$2 < nodeRefsLength) {
                                            if ((ref$2 = node[__REF + i$2]) !== void 0) {
                                                ref$2[__CONTEXT] = nodeValue;
                                                nodeValue[__REF + (destRefsLength + i$2)] = ref$2;
                                                node[__REF + i$2] = void 0;
                                            }
                                        }
                                        nodeValue[__REFS_LENGTH] = nodeRefsLength + destRefsLength;
                                        node[__REFS_LENGTH] = ref$2 = void 0;
                                        if (node != null && typeof node === 'object') {
                                            var root$2 = root, head = root$2.__head, tail = root$2.__tail, next, prev;
                                            (next = node.__next) && (next != null && typeof next === 'object') && (next.__prev = prev);
                                            (prev = node.__prev) && (prev != null && typeof prev === 'object') && (prev.__next = next);
                                            node === head && (root$2.__head = root$2.__next = head = next);
                                            node === tail && (root$2.__tail = root$2.__prev = tail = prev);
                                            node.__next = node.__prev = void 0;
                                            head = tail = next = prev = void 0;
                                        }
                                    }
                                    nodeParent[key] = node = nodeValue;
                                    node = !node[__SELF] && ((node[__SELF] = node) || true) && ((node[__KEY] = key) || true) && ((node[__PARENT] = nodeParent) || true) && ((node[__ROOT] = nodeRoot) || true) && (node[__GENERATION] || (node[__GENERATION] = 0) || node) && ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue) && (nodeValue[__CONTAINER] = node)) || node;
                                }
                                if ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                                    do {
                                        if (nodeExpires !== 1) {
                                            var root$3 = root, head$2 = root$3.__head, tail$2 = root$3.__tail, next$2 = node.__next, prev$2 = node.__prev;
                                            if (node !== head$2) {
                                                next$2 && (next$2 != null && typeof next$2 === 'object') && (next$2.__prev = prev$2);
                                                prev$2 && (prev$2 != null && typeof prev$2 === 'object') && (prev$2.__next = next$2);
                                                (next$2 = head$2) && (head$2 != null && typeof head$2 === 'object') && (head$2.__prev = node);
                                                root$3.__head = root$3.__next = head$2 = node;
                                                head$2.__next = next$2;
                                                head$2.__prev = void 0;
                                            }
                                            if (tail$2 == null || node === tail$2) {
                                                root$3.__tail = root$3.__prev = tail$2 = prev$2 || node;
                                            }
                                            root$3 = head$2 = tail$2 = next$2 = prev$2 = void 0;
                                        }
                                        refs[depth] = nodeValue;
                                        refIndex = depth + 1;
                                        refDepth = 0;
                                        var key$2, isKeySet$2;
                                        reference = nodeValue;
                                        refHeight = (refLength = reference.length) - 1;
                                        nodeParent = nodeRoot;
                                        jsonParent = jsonRoot;
                                        refDepth = refDepth;
                                        follow_path_8357:
                                            do {
                                                key$2 = reference[refDepth];
                                                isKeySet$2 = false;
                                                if (key$2 != null) {
                                                    if (refDepth < refHeight) {
                                                        optimizedPath[optimizedPath.length = refDepth] = key$2;
                                                        node = nodeParent[key$2];
                                                        nodeType = node && node[$TYPE] || void 0;
                                                        nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                                        nodeTimestamp = node && node[$TIMESTAMP];
                                                        nodeExpires = node && node[$EXPIRES];
                                                        if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                                            node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                                        }
                                                        if (typeof node !== 'object' || !!nodeType && nodeType !== SENTINEL && !Array.isArray(nodeValue)) {
                                                            nodeType = void 0;
                                                            nodeValue = Object.create(null);
                                                            if (node != null && node !== nodeValue) {
                                                                var nodeRefsLength$2 = node.__refsLength || 0, destRefsLength$2 = nodeValue.__refsLength || 0, i$3 = -1, ref$3;
                                                                while (++i$3 < nodeRefsLength$2) {
                                                                    if ((ref$3 = node[__REF + i$3]) !== void 0) {
                                                                        ref$3[__CONTEXT] = nodeValue;
                                                                        nodeValue[__REF + (destRefsLength$2 + i$3)] = ref$3;
                                                                        node[__REF + i$3] = void 0;
                                                                    }
                                                                }
                                                                nodeValue[__REFS_LENGTH] = nodeRefsLength$2 + destRefsLength$2;
                                                                node[__REFS_LENGTH] = ref$3 = void 0;
                                                                if (node != null && typeof node === 'object') {
                                                                    var root$4 = root, head$3 = root$4.__head, tail$3 = root$4.__tail, next$3, prev$3;
                                                                    (next$3 = node.__next) && (next$3 != null && typeof next$3 === 'object') && (next$3.__prev = prev$3);
                                                                    (prev$3 = node.__prev) && (prev$3 != null && typeof prev$3 === 'object') && (prev$3.__next = next$3);
                                                                    node === head$3 && (root$4.__head = root$4.__next = head$3 = next$3);
                                                                    node === tail$3 && (root$4.__tail = root$4.__prev = tail$3 = prev$3);
                                                                    node.__next = node.__prev = void 0;
                                                                    head$3 = tail$3 = next$3 = prev$3 = void 0;
                                                                }
                                                            }
                                                            nodeParent[key$2] = node = nodeValue;
                                                            node = !node[__SELF] && ((node[__SELF] = node) || true) && ((node[__KEY] = key$2) || true) && ((node[__PARENT] = nodeParent) || true) && ((node[__ROOT] = nodeRoot) || true) && (node[__GENERATION] || (node[__GENERATION] = 0) || node) && ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue) && (nodeValue[__CONTAINER] = node)) || node;
                                                        }
                                                        if (appendNullKey = node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue)) {
                                                            nodeParent = node;
                                                            break follow_path_8357;
                                                        }
                                                        nodeParent = node;
                                                        jsonParent = jsonNode;
                                                        refDepth = refDepth + 1;
                                                        continue follow_path_8357;
                                                    } else if (refDepth === refHeight) {
                                                        optimizedPath[optimizedPath.length = refDepth] = key$2;
                                                        node = nodeParent[key$2];
                                                        nodeType = node && node[$TYPE] || void 0;
                                                        nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                                        nodeTimestamp = node && node[$TIMESTAMP];
                                                        nodeExpires = node && node[$EXPIRES];
                                                        if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                                            node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                                        }
                                                        if (typeof node !== 'object' || !!nodeType && nodeType !== SENTINEL && !Array.isArray(nodeValue)) {
                                                            nodeType = void 0;
                                                            nodeValue = Object.create(null);
                                                            if (node != null && node !== nodeValue) {
                                                                var nodeRefsLength$3 = node.__refsLength || 0, destRefsLength$3 = nodeValue.__refsLength || 0, i$4 = -1, ref$4;
                                                                while (++i$4 < nodeRefsLength$3) {
                                                                    if ((ref$4 = node[__REF + i$4]) !== void 0) {
                                                                        ref$4[__CONTEXT] = nodeValue;
                                                                        nodeValue[__REF + (destRefsLength$3 + i$4)] = ref$4;
                                                                        node[__REF + i$4] = void 0;
                                                                    }
                                                                }
                                                                nodeValue[__REFS_LENGTH] = nodeRefsLength$3 + destRefsLength$3;
                                                                node[__REFS_LENGTH] = ref$4 = void 0;
                                                                if (node != null && typeof node === 'object') {
                                                                    var root$5 = root, head$4 = root$5.__head, tail$4 = root$5.__tail, next$4, prev$4;
                                                                    (next$4 = node.__next) && (next$4 != null && typeof next$4 === 'object') && (next$4.__prev = prev$4);
                                                                    (prev$4 = node.__prev) && (prev$4 != null && typeof prev$4 === 'object') && (prev$4.__next = next$4);
                                                                    node === head$4 && (root$5.__head = root$5.__next = head$4 = next$4);
                                                                    node === tail$4 && (root$5.__tail = root$5.__prev = tail$4 = prev$4);
                                                                    node.__next = node.__prev = void 0;
                                                                    head$4 = tail$4 = next$4 = prev$4 = void 0;
                                                                }
                                                            }
                                                            nodeParent[key$2] = node = nodeValue;
                                                            node = !node[__SELF] && ((node[__SELF] = node) || true) && ((node[__KEY] = key$2) || true) && ((node[__PARENT] = nodeParent) || true) && ((node[__ROOT] = nodeRoot) || true) && (node[__GENERATION] || (node[__GENERATION] = 0) || node) && ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue) && (nodeValue[__CONTAINER] = node)) || node;
                                                        }
                                                        appendNullKey = node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue);
                                                        nodeParent = node;
                                                        break follow_path_8357;
                                                    }
                                                } else if (refDepth < refHeight) {
                                                    nodeParent = node;
                                                    jsonParent = jsonNode;
                                                    refDepth = refDepth + 1;
                                                    continue follow_path_8357;
                                                }
                                                nodeParent = node;
                                                break follow_path_8357;
                                            } while (true);
                                        node = nodeParent;
                                    } while ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue));
                                    if (node == null) {
                                        while (refDepth <= refHeight) {
                                            optimizedPath[refDepth] = reference[refDepth++];
                                        }
                                    }
                                }
                                if (depth >= boundLength) {
                                    if (node != null && jsonParent != null) {
                                        if (!nodeType && (node != null && typeof node === 'object') && !Array.isArray(nodeValue)) {
                                            if (!(jsonNode = jsonParent[key]) || !(jsonNode != null && typeof jsonNode === 'object')) {
                                                jsonNode = jsonParent[key] = Object.create(null);
                                            }
                                            jsonNode[__KEY] = key;
                                            jsonNode[__GENERATION] = node[__GENERATION] || 0;
                                        } else {
                                            if (boxed === true) {
                                                jsonParent[key] = node;
                                            } else {
                                                var val = nodeValue;
                                                if (val != null && typeof val === 'object') {
                                                    var src = val, keys$2 = Object.keys(src), x, i$5 = -1, n = keys$2.length;
                                                    val = Array.isArray(src) && new Array(src.length) || Object.create(null);
                                                    while (++i$5 < n) {
                                                        x = keys$2[i$5];
                                                        !(!(x[0] !== '_' || x[1] !== '_') || (x === __SELF || x === __PARENT || x === __ROOT) || x[0] === '$') && (val[x] = src[x]);
                                                    }
                                                }
                                                if (val != null && typeof val === 'object' && !Array.isArray(val)) {
                                                    val[$TYPE] = LEAF;
                                                }
                                                jsonParent[key] = val;
                                            }
                                        }
                                    }
                                }
                                if (node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue)) {
                                    nodeParent = node;
                                    break follow_path_map_8152;
                                }
                                pathMapStack[offset + 1] = keys;
                                pathMapStack[offset + 3] = key;
                                nodeParent = nodes[depth] = node;
                                jsonParent = jsons[depth] = jsonNode;
                                depth = depth + 1;
                                continue follow_path_map_8152;
                            }
                        } else {
                            pathMapStack[offset = 3 * (depth + 1)] = pathMap[__NULL];
                            pathMapStack[offset + 1] = keys;
                            pathMapStack[offset + 2] = 0;
                            nodeParent = nodes[depth] = node;
                            jsonParent = jsons[depth] = jsonNode;
                            depth = depth + 1;
                            continue follow_path_map_8152;
                        }
                    }
                    if (key != null) {
                        optimizedPath[optimizedPath.length = depth + (refLength - refIndex)] = key;
                        node = nodeParent[key];
                        nodeType = node && node[$TYPE] || void 0;
                        nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                        nodeTimestamp = node && node[$TIMESTAMP];
                        nodeExpires = node && node[$EXPIRES];
                        if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                            node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                        }
                        nodeType = pathMap && pathMap[$TYPE] || void 0;
                        nodeValue = nodeType === SENTINEL ? pathMap[VALUE] : nodeType === ERROR ? pathMap = errorSelector(requestedPath, pathMap) : pathMap;
                        nodeTimestamp = pathMap && pathMap[$TIMESTAMP];
                        nodeExpires = pathMap && pathMap[$EXPIRES];
                        var newNode;
                        newNode = pathMap;
                        if ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                            nodeType = 'array';
                            newNode[$SIZE] = nodeSize = (nodeType === SENTINEL && 50 || 0) + (nodeValue.length || 1);
                            delete nodeValue[$SIZE];
                            nodeValue[__CONTAINER] = newNode;
                        } else if (nodeType === SENTINEL) {
                            newNode[$SIZE] = nodeSize = 50 + (typeof nodeValue === 'string' && nodeValue.length || 1);
                        } else if (nodeType === ERROR) {
                            newNode[$SIZE] = nodeSize = 50 + (pathMap[$SIZE] || 0 || 1);
                        } else if (!(pathMap != null && typeof pathMap === 'object')) {
                            nodeSize = 50 + (typeof nodeValue === 'string' && nodeValue.length || 1);
                            nodeType = 'sentinel';
                            newNode = { 'value': nodeValue };
                            newNode[$TYPE] = nodeType;
                            newNode[$SIZE] = nodeSize;
                        } else {
                            nodeType = newNode[$TYPE] = nodeType || 'leaf';
                            newNode[$SIZE] = nodeSize = pathMap[$SIZE] || 0 || 50 + 1;
                        }
                        ;
                        if (node != null && node !== newNode) {
                            var nodeRefsLength$4 = node.__refsLength || 0, destRefsLength$4 = newNode.__refsLength || 0, i$6 = -1, ref$5;
                            while (++i$6 < nodeRefsLength$4) {
                                if ((ref$5 = node[__REF + i$6]) !== void 0) {
                                    ref$5[__CONTEXT] = newNode;
                                    newNode[__REF + (destRefsLength$4 + i$6)] = ref$5;
                                    node[__REF + i$6] = void 0;
                                }
                            }
                            newNode[__REFS_LENGTH] = nodeRefsLength$4 + destRefsLength$4;
                            node[__REFS_LENGTH] = ref$5 = void 0;
                            if (node != null && typeof node === 'object') {
                                var root$6 = root, head$5 = root$6.__head, tail$5 = root$6.__tail, next$5, prev$5;
                                (next$5 = node.__next) && (next$5 != null && typeof next$5 === 'object') && (next$5.__prev = prev$5);
                                (prev$5 = node.__prev) && (prev$5 != null && typeof prev$5 === 'object') && (prev$5.__next = next$5);
                                node === head$5 && (root$6.__head = root$6.__next = head$5 = next$5);
                                node === tail$5 && (root$6.__tail = root$6.__prev = tail$5 = prev$5);
                                node.__next = node.__prev = void 0;
                                head$5 = tail$5 = next$5 = prev$5 = void 0;
                            }
                        }
                        nodeParent[key] = node = newNode;
                        node = !node[__SELF] && ((node[__SELF] = node) || true) && ((node[__KEY] = key) || true) && ((node[__PARENT] = nodeParent) || true) && ((node[__ROOT] = nodeRoot) || true) && (node[__GENERATION] || (node[__GENERATION] = 0) || node) && ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue) && (nodeValue[__CONTAINER] = node)) || node;
                        if (node != null && typeof node === 'object') {
                            if (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true) {
                                node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                            } else {
                                if (nodeExpires !== 1) {
                                    var root$7 = root, head$6 = root$7.__head, tail$6 = root$7.__tail, next$6 = node.__next, prev$6 = node.__prev;
                                    if (node !== head$6) {
                                        next$6 && (next$6 != null && typeof next$6 === 'object') && (next$6.__prev = prev$6);
                                        prev$6 && (prev$6 != null && typeof prev$6 === 'object') && (prev$6.__next = next$6);
                                        (next$6 = head$6) && (head$6 != null && typeof head$6 === 'object') && (head$6.__prev = node);
                                        root$7.__head = root$7.__next = head$6 = node;
                                        head$6.__next = next$6;
                                        head$6.__prev = void 0;
                                    }
                                    if (tail$6 == null || node === tail$6) {
                                        root$7.__tail = root$7.__prev = tail$6 = prev$6 || node;
                                    }
                                    root$7 = head$6 = tail$6 = next$6 = prev$6 = void 0;
                                }
                            }
                        }
                        if (depth >= boundLength) {
                            if (node != null && jsonParent != null) {
                                if (boxed === true) {
                                    jsonParent[key] = node;
                                } else {
                                    var val$2 = nodeValue;
                                    if (val$2 != null && typeof val$2 === 'object') {
                                        var src$2 = val$2, keys$3 = Object.keys(src$2), x$2, i$7 = -1, n$2 = keys$3.length;
                                        val$2 = Array.isArray(src$2) && new Array(src$2.length) || Object.create(null);
                                        while (++i$7 < n$2) {
                                            x$2 = keys$3[i$7];
                                            !(!(x$2[0] !== '_' || x$2[1] !== '_') || (x$2 === __SELF || x$2 === __PARENT || x$2 === __ROOT) || x$2[0] === '$') && (val$2[x$2] = src$2[x$2]);
                                        }
                                    }
                                    if (val$2 != null && typeof val$2 === 'object' && !Array.isArray(val$2)) {
                                        val$2[$TYPE] = LEAF;
                                    }
                                    jsonParent[key] = val$2;
                                }
                            }
                        }
                        appendNullKey = false;
                    }
                    nodeParent = node;
                    break follow_path_map_8152;
                } while (true);
            node = nodeParent;
            if (node != null || boxed === true) {
                if (nodeType === ERROR) {
                    if (nodeExpires !== 1) {
                        var root$8 = root, head$7 = root$8.__head, tail$7 = root$8.__tail, next$7 = node.__next, prev$7 = node.__prev;
                        if (node !== head$7) {
                            next$7 && (next$7 != null && typeof next$7 === 'object') && (next$7.__prev = prev$7);
                            prev$7 && (prev$7 != null && typeof prev$7 === 'object') && (prev$7.__next = next$7);
                            (next$7 = head$7) && (head$7 != null && typeof head$7 === 'object') && (head$7.__prev = node);
                            root$8.__head = root$8.__next = head$7 = node;
                            head$7.__next = next$7;
                            head$7.__prev = void 0;
                        }
                        if (tail$7 == null || node === tail$7) {
                            root$8.__tail = root$8.__prev = tail$7 = prev$7 || node;
                        }
                        root$8 = head$7 = tail$7 = next$7 = prev$7 = void 0;
                    }
                    var pbv = Object.create(null);
                    var src$3 = requestedPath, i$8 = -1, n$3 = src$3.length, req = new Array(n$3);
                    while (++i$8 < n$3) {
                        req[i$8] = src$3[i$8];
                    }
                    if (appendNullKey === true) {
                        req[req.length] = null;
                    }
                    pbv.path = req;
                    if (boxed === true) {
                        pbv.value = node;
                    } else {
                        var dest = nodeValue, src$4 = dest, x$3;
                        if (dest != null && typeof dest === 'object') {
                            dest = Array.isArray(src$4) && [] || Object.create(null);
                            for (x$3 in src$4) {
                                !(!(x$3[0] !== '_' || x$3[1] !== '_') || (x$3 === __SELF || x$3 === __PARENT || x$3 === __ROOT) || x$3[0] === '$') && (dest[x$3] = src$4[x$3]);
                            }
                        }
                        pbv.value = dest;
                    }
                    errors[errors.length] = pbv;
                }
                hasValue || (hasValue = jsonParent != null);
                var src$5 = optimizedPath, i$9 = -1, n$4 = src$5.length, opt = new Array(n$4);
                while (++i$9 < n$4) {
                    opt[i$9] = src$5[i$9];
                }
                var src$6 = requestedPath, i$10 = -1, n$5 = src$6.length, req$2 = new Array(n$5);
                while (++i$10 < n$5) {
                    req$2[i$10] = src$6[i$10];
                }
                if (appendNullKey === true) {
                    req$2[req$2.length] = null;
                }
                requestedPaths[requestedPaths.length] = req$2;
                optimizedPaths[optimizedPaths.length] = opt;
            }
            if (boxed === false && node == null || refreshing === true) {
                var src$7 = boundPath, i$11 = -1, n$6 = src$7.length, req$3 = new Array(n$6);
                while (++i$11 < n$6) {
                    req$3[i$11] = src$7[i$11];
                }
                var src$8 = optimizedPath, i$12 = -1, n$7 = src$8.length, opt$2 = new Array(n$7);
                while (++i$12 < n$7) {
                    opt$2[i$12] = src$8[i$12];
                }
                var reqLen = req$3.length - 1, optLen = opt$2.length - 1, i$13 = -1, n$8 = requestedPath.length, map, offset$2, keys$4, index$3, reqKeys, optKeys, optKeysLen, x$4, y, z;
                while (++i$13 < n$8) {
                    req$3[++reqLen] = (reqKeys = pathMapStack[offset$2 = (i$13 + boundLength) * 4 + 1]) && reqKeys.length > 1 && [requestedPath[i$13]] || requestedPath[i$13];
                }
                var j$2 = depth, k = reqLen, l = optLen;
                i$13 = j$2++;
                while (j$2 > i$13) {
                    if ((map = pathMapStack[offset$2 = (j$2 + boundLength) * 4]) != null && typeof map === 'object' && map[$TYPE] === void 0 && Array.isArray(map) === false && (keys$4 = pathMapStack[offset$2 + 1] || (pathMapStack[offset$2 + 1] = Object.keys(map))) && ((index$3 = pathMapStack[offset$2 + 2] || (pathMapStack[offset$2 + 2] = 0)) || true) && keys$4.length > 0) {
                        if ((pathMapStack[offset$2 + 2] = ++index$3) - 1 < keys$4.length) {
                            if (reqLen - k < j$2 - i$13) {
                                var src$9 = keys$4, i$14 = -1, n$9 = src$9.length, dest$2 = new Array(n$9);
                                while (++i$14 < n$9) {
                                    dest$2[i$14] = src$9[i$14];
                                }
                                reqKeys = dest$2;
                                x$4 = -1;
                                y = reqKeys.length;
                                while (++x$4 < y) {
                                    reqKeys[x$4] = (z = reqKeys[x$4]) == __NULL ? null : z;
                                }
                                req$3[++reqLen] = y === 1 ? reqKeys[0] : reqKeys;
                            }
                            if (optLen - l < j$2 - i$13) {
                                var src$10 = keys$4, i$15 = -1, n$10 = src$10.length, dest$3 = new Array(n$10);
                                while (++i$15 < n$10) {
                                    dest$3[i$15] = src$10[i$15];
                                }
                                reqKeys = dest$3;
                                optKeys = [];
                                optKeysLen = 0;
                                x$4 = -1;
                                y = reqKeys.length;
                                while (++x$4 < y) {
                                    (z = reqKeys[x$4]) !== __NULL && (optKeys[optKeysLen++] = z);
                                }
                                if (optKeysLen > 0) {
                                    opt$2[++optLen] = optKeysLen === 1 ? optKeys[0] : optKeys;
                                }
                            }
                            pathMapStack[offset$2 = 4 * (++j$2 + boundLength)] = map[keys$4[index$3 - 1]];
                            continue;
                        }
                    }
                    delete pathMapStack[offset$2 = 4 * (j$2-- + boundLength)];
                    delete pathMapStack[offset$2 + 1];
                    delete pathMapStack[offset$2 + 2];
                    delete pathMapStack[offset$2 + 3];
                }
                req$3.pathSetIndex = index;
                requestedMissingPaths[requestedMissingPaths.length] = req$3;
                optimizedMissingPaths[optimizedMissingPaths.length] = opt$2;
            }
            appendNullKey = false;
            var offset$3, keys$5, index$4;
            while (depth > -1 && (keys$5 = pathMapStack[(offset$3 = 4 * depth--) + 1]) && ((index$4 = pathMapStack[offset$3 + 2]) || true) && (pathMapStack[offset$3 + 2] = ++index$4) >= keys$5.length) {
                delete pathMapStack[offset$3 + 0];
                delete pathMapStack[offset$3 + 1];
                delete pathMapStack[offset$3 + 2];
                delete pathMapStack[offset$3 + 3];
            }
        }
    }
    values && (values[0] = hasValue && { json: jsons[-1] } || undefined);
    return {
        'values': values,
        'errors': errors,
        'requestedPaths': requestedPaths,
        'optimizedPaths': optimizedPaths,
        'requestedMissingPaths': requestedMissingPaths,
        'optimizedMissingPaths': optimizedMissingPaths
    };
}
function setPathMapsAsValues(model, pathMaps, values, errorSelector, boundPath) {
    Array.isArray(values) && (values.length = 0);
    var boundLength = 0, nodeRoot = model._cache || {}, nodeParent, node;
    if (Array.isArray(boundPath)) {
        nodeParent = nodeRoot;
        boundLength = boundPath.length;
    } else {
        nodeParent = getBoundValue(model);
        boundPath = model._path || [];
    }
    var root = model._root || model, boxed = model._boxed || false, expired = root.expired || (root.expired = []), refreshing = model._refreshing || false, appendNullKey = false;
    typeof errorSelector === 'function' || (errorSelector = model._errorSelector) || (errorSelector = function (x$4, y$2) {
        return y$2;
    });
    var pathMapStack = pathMaps.pathMapStack || (pathMaps.pathMapStack = []);
    var nodes = pathMaps.nodes || (pathMaps.nodes = []);
    var errors = pathMaps.errors || (pathMaps.errors = []);
    var refs = pathMaps.refs || (pathMaps.refs = []);
    var depth = pathMaps.depth || (pathMaps.depth = 0);
    var refIndex = pathMaps.refIndex || (pathMaps.refIndex = 0);
    var refDepth = pathMaps.refDepth || (pathMaps.refDepth = 0);
    var requestedPath = pathMaps.requestedPath || (pathMaps.requestedPath = []);
    var optimizedPath = pathMaps.optimizedPath || (pathMaps.optimizedPath = []);
    var requestedPaths = pathMaps.requestedPaths || (pathMaps.requestedPaths = []);
    var optimizedPaths = pathMaps.optimizedPaths || (pathMaps.optimizedPaths = []);
    var requestedMissingPaths = pathMaps.requestedMissingPaths || (pathMaps.requestedMissingPaths = []);
    var optimizedMissingPaths = pathMaps.optimizedMissingPaths || (pathMaps.optimizedMissingPaths = []);
    var pathMap, length = 0, height = 0, reference, refLength = 0, refHeight = 0, nodeType, nodeValue, nodeSize, nodeTimestamp, nodeExpires;
    refs[-1] = boundPath;
    nodes[-1] = nodeParent;
    var index = -1, count = pathMaps.length;
    while (++index < count) {
        pathMap = pathMaps[index];
        pathMapStack[0] = pathMap;
        depth = 0;
        length = pathMap.length;
        height = length - 1;
        var ref;
        refs.length = 0;
        while (depth > -1) {
            refIndex = depth;
            while (--refIndex >= -1) {
                if (!!(ref = refs[refIndex])) {
                    refLength = ref.length;
                    var i = -1, j = 0;
                    while (++i < refLength) {
                        optimizedPath[j++] = ref[i];
                    }
                    i = ++refIndex;
                    while (i < depth) {
                        optimizedPath[j++] = requestedPath[i++];
                    }
                    optimizedPath.length = j;
                    break;
                }
            }
            var offset, keys, index$2, key, isKeySet;
            pathMap = pathMap;
            height = (length = depth) - 1;
            nodeParent = node = nodes[depth - 1];
            depth = depth;
            follow_path_map_10134:
                do {
                    if ((pathMap = pathMapStack[offset = depth * 4]) != null && typeof pathMap === 'object' && (keys = pathMapStack[offset + 1] || (pathMapStack[offset + 1] = Object.keys(pathMap))) && ((index$2 = pathMapStack[offset + 2] || (pathMapStack[offset + 2] = 0)) || true) && ((key = pathMapStack[offset + 3]) || true) && ((isKeySet = keys.length > 1) || keys.length > 0)) {
                        key = keys[index$2];
                        if (key != null) {
                            depth >= boundLength && (requestedPath[requestedPath.length = depth] = key);
                            pathMapStack[offset = 4 * (depth + 1)] = pathMap = pathMap[key];
                            if (pathMap != null && typeof pathMap === 'object' && pathMap[$TYPE] === void 0 && Array.isArray(pathMap) === false && (keys = Object.keys(pathMap)) && keys.length > 0) {
                                optimizedPath[optimizedPath.length = depth + (refLength - refIndex)] = key;
                                node = nodeParent[key];
                                nodeType = node && node[$TYPE] || void 0;
                                nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                nodeTimestamp = node && node[$TIMESTAMP];
                                nodeExpires = node && node[$EXPIRES];
                                if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                    node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                }
                                if (typeof node !== 'object' || !!nodeType && nodeType !== SENTINEL && !Array.isArray(nodeValue)) {
                                    nodeType = void 0;
                                    nodeValue = Object.create(null);
                                    if (node != null && node !== nodeValue) {
                                        var nodeRefsLength = node.__refsLength || 0, destRefsLength = nodeValue.__refsLength || 0, i$2 = -1, ref$2;
                                        while (++i$2 < nodeRefsLength) {
                                            if ((ref$2 = node[__REF + i$2]) !== void 0) {
                                                ref$2[__CONTEXT] = nodeValue;
                                                nodeValue[__REF + (destRefsLength + i$2)] = ref$2;
                                                node[__REF + i$2] = void 0;
                                            }
                                        }
                                        nodeValue[__REFS_LENGTH] = nodeRefsLength + destRefsLength;
                                        node[__REFS_LENGTH] = ref$2 = void 0;
                                        if (node != null && typeof node === 'object') {
                                            var root$2 = root, head = root$2.__head, tail = root$2.__tail, next, prev;
                                            (next = node.__next) && (next != null && typeof next === 'object') && (next.__prev = prev);
                                            (prev = node.__prev) && (prev != null && typeof prev === 'object') && (prev.__next = next);
                                            node === head && (root$2.__head = root$2.__next = head = next);
                                            node === tail && (root$2.__tail = root$2.__prev = tail = prev);
                                            node.__next = node.__prev = void 0;
                                            head = tail = next = prev = void 0;
                                        }
                                    }
                                    nodeParent[key] = node = nodeValue;
                                    node = !node[__SELF] && ((node[__SELF] = node) || true) && ((node[__KEY] = key) || true) && ((node[__PARENT] = nodeParent) || true) && ((node[__ROOT] = nodeRoot) || true) && (node[__GENERATION] || (node[__GENERATION] = 0) || node) && ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue) && (nodeValue[__CONTAINER] = node)) || node;
                                }
                                if ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                                    do {
                                        if (nodeExpires !== 1) {
                                            var root$3 = root, head$2 = root$3.__head, tail$2 = root$3.__tail, next$2 = node.__next, prev$2 = node.__prev;
                                            if (node !== head$2) {
                                                next$2 && (next$2 != null && typeof next$2 === 'object') && (next$2.__prev = prev$2);
                                                prev$2 && (prev$2 != null && typeof prev$2 === 'object') && (prev$2.__next = next$2);
                                                (next$2 = head$2) && (head$2 != null && typeof head$2 === 'object') && (head$2.__prev = node);
                                                root$3.__head = root$3.__next = head$2 = node;
                                                head$2.__next = next$2;
                                                head$2.__prev = void 0;
                                            }
                                            if (tail$2 == null || node === tail$2) {
                                                root$3.__tail = root$3.__prev = tail$2 = prev$2 || node;
                                            }
                                            root$3 = head$2 = tail$2 = next$2 = prev$2 = void 0;
                                        }
                                        refs[depth] = nodeValue;
                                        refIndex = depth + 1;
                                        refDepth = 0;
                                        var key$2, isKeySet$2;
                                        reference = nodeValue;
                                        refHeight = (refLength = reference.length) - 1;
                                        nodeParent = nodeRoot;
                                        refDepth = refDepth;
                                        follow_path_10333:
                                            do {
                                                key$2 = reference[refDepth];
                                                isKeySet$2 = false;
                                                if (key$2 != null) {
                                                    if (refDepth < refHeight) {
                                                        optimizedPath[optimizedPath.length = refDepth] = key$2;
                                                        node = nodeParent[key$2];
                                                        nodeType = node && node[$TYPE] || void 0;
                                                        nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                                        nodeTimestamp = node && node[$TIMESTAMP];
                                                        nodeExpires = node && node[$EXPIRES];
                                                        if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                                            node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                                        }
                                                        if (typeof node !== 'object' || !!nodeType && nodeType !== SENTINEL && !Array.isArray(nodeValue)) {
                                                            nodeType = void 0;
                                                            nodeValue = Object.create(null);
                                                            if (node != null && node !== nodeValue) {
                                                                var nodeRefsLength$2 = node.__refsLength || 0, destRefsLength$2 = nodeValue.__refsLength || 0, i$3 = -1, ref$3;
                                                                while (++i$3 < nodeRefsLength$2) {
                                                                    if ((ref$3 = node[__REF + i$3]) !== void 0) {
                                                                        ref$3[__CONTEXT] = nodeValue;
                                                                        nodeValue[__REF + (destRefsLength$2 + i$3)] = ref$3;
                                                                        node[__REF + i$3] = void 0;
                                                                    }
                                                                }
                                                                nodeValue[__REFS_LENGTH] = nodeRefsLength$2 + destRefsLength$2;
                                                                node[__REFS_LENGTH] = ref$3 = void 0;
                                                                if (node != null && typeof node === 'object') {
                                                                    var root$4 = root, head$3 = root$4.__head, tail$3 = root$4.__tail, next$3, prev$3;
                                                                    (next$3 = node.__next) && (next$3 != null && typeof next$3 === 'object') && (next$3.__prev = prev$3);
                                                                    (prev$3 = node.__prev) && (prev$3 != null && typeof prev$3 === 'object') && (prev$3.__next = next$3);
                                                                    node === head$3 && (root$4.__head = root$4.__next = head$3 = next$3);
                                                                    node === tail$3 && (root$4.__tail = root$4.__prev = tail$3 = prev$3);
                                                                    node.__next = node.__prev = void 0;
                                                                    head$3 = tail$3 = next$3 = prev$3 = void 0;
                                                                }
                                                            }
                                                            nodeParent[key$2] = node = nodeValue;
                                                            node = !node[__SELF] && ((node[__SELF] = node) || true) && ((node[__KEY] = key$2) || true) && ((node[__PARENT] = nodeParent) || true) && ((node[__ROOT] = nodeRoot) || true) && (node[__GENERATION] || (node[__GENERATION] = 0) || node) && ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue) && (nodeValue[__CONTAINER] = node)) || node;
                                                        }
                                                        if (appendNullKey = node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue)) {
                                                            nodeParent = node;
                                                            break follow_path_10333;
                                                        }
                                                        nodeParent = node;
                                                        refDepth = refDepth + 1;
                                                        continue follow_path_10333;
                                                    } else if (refDepth === refHeight) {
                                                        optimizedPath[optimizedPath.length = refDepth] = key$2;
                                                        node = nodeParent[key$2];
                                                        nodeType = node && node[$TYPE] || void 0;
                                                        nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                                        nodeTimestamp = node && node[$TIMESTAMP];
                                                        nodeExpires = node && node[$EXPIRES];
                                                        if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                                            node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                                        }
                                                        if (typeof node !== 'object' || !!nodeType && nodeType !== SENTINEL && !Array.isArray(nodeValue)) {
                                                            nodeType = void 0;
                                                            nodeValue = Object.create(null);
                                                            if (node != null && node !== nodeValue) {
                                                                var nodeRefsLength$3 = node.__refsLength || 0, destRefsLength$3 = nodeValue.__refsLength || 0, i$4 = -1, ref$4;
                                                                while (++i$4 < nodeRefsLength$3) {
                                                                    if ((ref$4 = node[__REF + i$4]) !== void 0) {
                                                                        ref$4[__CONTEXT] = nodeValue;
                                                                        nodeValue[__REF + (destRefsLength$3 + i$4)] = ref$4;
                                                                        node[__REF + i$4] = void 0;
                                                                    }
                                                                }
                                                                nodeValue[__REFS_LENGTH] = nodeRefsLength$3 + destRefsLength$3;
                                                                node[__REFS_LENGTH] = ref$4 = void 0;
                                                                if (node != null && typeof node === 'object') {
                                                                    var root$5 = root, head$4 = root$5.__head, tail$4 = root$5.__tail, next$4, prev$4;
                                                                    (next$4 = node.__next) && (next$4 != null && typeof next$4 === 'object') && (next$4.__prev = prev$4);
                                                                    (prev$4 = node.__prev) && (prev$4 != null && typeof prev$4 === 'object') && (prev$4.__next = next$4);
                                                                    node === head$4 && (root$5.__head = root$5.__next = head$4 = next$4);
                                                                    node === tail$4 && (root$5.__tail = root$5.__prev = tail$4 = prev$4);
                                                                    node.__next = node.__prev = void 0;
                                                                    head$4 = tail$4 = next$4 = prev$4 = void 0;
                                                                }
                                                            }
                                                            nodeParent[key$2] = node = nodeValue;
                                                            node = !node[__SELF] && ((node[__SELF] = node) || true) && ((node[__KEY] = key$2) || true) && ((node[__PARENT] = nodeParent) || true) && ((node[__ROOT] = nodeRoot) || true) && (node[__GENERATION] || (node[__GENERATION] = 0) || node) && ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue) && (nodeValue[__CONTAINER] = node)) || node;
                                                        }
                                                        appendNullKey = node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue);
                                                        nodeParent = node;
                                                        break follow_path_10333;
                                                    }
                                                } else if (refDepth < refHeight) {
                                                    nodeParent = node;
                                                    refDepth = refDepth + 1;
                                                    continue follow_path_10333;
                                                }
                                                nodeParent = node;
                                                break follow_path_10333;
                                            } while (true);
                                        node = nodeParent;
                                    } while ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue));
                                    if (node == null) {
                                        while (refDepth <= refHeight) {
                                            optimizedPath[refDepth] = reference[refDepth++];
                                        }
                                    }
                                }
                                if (node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue)) {
                                    nodeParent = node;
                                    break follow_path_map_10134;
                                }
                                pathMapStack[offset + 1] = keys;
                                pathMapStack[offset + 3] = key;
                                nodeParent = nodes[depth] = node;
                                depth = depth + 1;
                                continue follow_path_map_10134;
                            }
                        } else {
                            pathMapStack[offset = 3 * (depth + 1)] = pathMap[__NULL];
                            pathMapStack[offset + 1] = keys;
                            pathMapStack[offset + 2] = 0;
                            nodeParent = nodes[depth] = node;
                            depth = depth + 1;
                            continue follow_path_map_10134;
                        }
                    }
                    if (key != null) {
                        optimizedPath[optimizedPath.length = depth + (refLength - refIndex)] = key;
                        node = nodeParent[key];
                        nodeType = node && node[$TYPE] || void 0;
                        nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                        nodeTimestamp = node && node[$TIMESTAMP];
                        nodeExpires = node && node[$EXPIRES];
                        if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                            node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                        }
                        nodeType = pathMap && pathMap[$TYPE] || void 0;
                        nodeValue = nodeType === SENTINEL ? pathMap[VALUE] : nodeType === ERROR ? pathMap = errorSelector(requestedPath, pathMap) : pathMap;
                        nodeTimestamp = pathMap && pathMap[$TIMESTAMP];
                        nodeExpires = pathMap && pathMap[$EXPIRES];
                        var newNode;
                        newNode = pathMap;
                        if ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                            nodeType = 'array';
                            newNode[$SIZE] = nodeSize = (nodeType === SENTINEL && 50 || 0) + (nodeValue.length || 1);
                            delete nodeValue[$SIZE];
                            nodeValue[__CONTAINER] = newNode;
                        } else if (nodeType === SENTINEL) {
                            newNode[$SIZE] = nodeSize = 50 + (typeof nodeValue === 'string' && nodeValue.length || 1);
                        } else if (nodeType === ERROR) {
                            newNode[$SIZE] = nodeSize = 50 + (pathMap[$SIZE] || 0 || 1);
                        } else if (!(pathMap != null && typeof pathMap === 'object')) {
                            nodeSize = 50 + (typeof nodeValue === 'string' && nodeValue.length || 1);
                            nodeType = 'sentinel';
                            newNode = { 'value': nodeValue };
                            newNode[$TYPE] = nodeType;
                            newNode[$SIZE] = nodeSize;
                        } else {
                            nodeType = newNode[$TYPE] = nodeType || 'leaf';
                            newNode[$SIZE] = nodeSize = pathMap[$SIZE] || 0 || 50 + 1;
                        }
                        ;
                        if (node != null && node !== newNode) {
                            var nodeRefsLength$4 = node.__refsLength || 0, destRefsLength$4 = newNode.__refsLength || 0, i$5 = -1, ref$5;
                            while (++i$5 < nodeRefsLength$4) {
                                if ((ref$5 = node[__REF + i$5]) !== void 0) {
                                    ref$5[__CONTEXT] = newNode;
                                    newNode[__REF + (destRefsLength$4 + i$5)] = ref$5;
                                    node[__REF + i$5] = void 0;
                                }
                            }
                            newNode[__REFS_LENGTH] = nodeRefsLength$4 + destRefsLength$4;
                            node[__REFS_LENGTH] = ref$5 = void 0;
                            if (node != null && typeof node === 'object') {
                                var root$6 = root, head$5 = root$6.__head, tail$5 = root$6.__tail, next$5, prev$5;
                                (next$5 = node.__next) && (next$5 != null && typeof next$5 === 'object') && (next$5.__prev = prev$5);
                                (prev$5 = node.__prev) && (prev$5 != null && typeof prev$5 === 'object') && (prev$5.__next = next$5);
                                node === head$5 && (root$6.__head = root$6.__next = head$5 = next$5);
                                node === tail$5 && (root$6.__tail = root$6.__prev = tail$5 = prev$5);
                                node.__next = node.__prev = void 0;
                                head$5 = tail$5 = next$5 = prev$5 = void 0;
                            }
                        }
                        nodeParent[key] = node = newNode;
                        node = !node[__SELF] && ((node[__SELF] = node) || true) && ((node[__KEY] = key) || true) && ((node[__PARENT] = nodeParent) || true) && ((node[__ROOT] = nodeRoot) || true) && (node[__GENERATION] || (node[__GENERATION] = 0) || node) && ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue) && (nodeValue[__CONTAINER] = node)) || node;
                        if (node != null && typeof node === 'object') {
                            if (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true) {
                                node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                            } else {
                                if (nodeExpires !== 1) {
                                    var root$7 = root, head$6 = root$7.__head, tail$6 = root$7.__tail, next$6 = node.__next, prev$6 = node.__prev;
                                    if (node !== head$6) {
                                        next$6 && (next$6 != null && typeof next$6 === 'object') && (next$6.__prev = prev$6);
                                        prev$6 && (prev$6 != null && typeof prev$6 === 'object') && (prev$6.__next = next$6);
                                        (next$6 = head$6) && (head$6 != null && typeof head$6 === 'object') && (head$6.__prev = node);
                                        root$7.__head = root$7.__next = head$6 = node;
                                        head$6.__next = next$6;
                                        head$6.__prev = void 0;
                                    }
                                    if (tail$6 == null || node === tail$6) {
                                        root$7.__tail = root$7.__prev = tail$6 = prev$6 || node;
                                    }
                                    root$7 = head$6 = tail$6 = next$6 = prev$6 = void 0;
                                }
                            }
                        }
                        appendNullKey = false;
                    }
                    nodeParent = node;
                    break follow_path_map_10134;
                } while (true);
            node = nodeParent;
            if (node != null || boxed === true) {
                if (nodeType === ERROR) {
                    if (nodeExpires !== 1) {
                        var root$8 = root, head$7 = root$8.__head, tail$7 = root$8.__tail, next$7 = node.__next, prev$7 = node.__prev;
                        if (node !== head$7) {
                            next$7 && (next$7 != null && typeof next$7 === 'object') && (next$7.__prev = prev$7);
                            prev$7 && (prev$7 != null && typeof prev$7 === 'object') && (prev$7.__next = next$7);
                            (next$7 = head$7) && (head$7 != null && typeof head$7 === 'object') && (head$7.__prev = node);
                            root$8.__head = root$8.__next = head$7 = node;
                            head$7.__next = next$7;
                            head$7.__prev = void 0;
                        }
                        if (tail$7 == null || node === tail$7) {
                            root$8.__tail = root$8.__prev = tail$7 = prev$7 || node;
                        }
                        root$8 = head$7 = tail$7 = next$7 = prev$7 = void 0;
                    }
                    var pbv = Object.create(null);
                    var src = requestedPath, i$6 = -1, n = src.length, req = new Array(n);
                    while (++i$6 < n) {
                        req[i$6] = src[i$6];
                    }
                    if (appendNullKey === true) {
                        req[req.length] = null;
                    }
                    pbv.path = req;
                    if (boxed === true) {
                        pbv.value = node;
                    } else {
                        var dest = nodeValue, src$2 = dest, x;
                        if (dest != null && typeof dest === 'object') {
                            dest = Array.isArray(src$2) && [] || Object.create(null);
                            for (x in src$2) {
                                !(!(x[0] !== '_' || x[1] !== '_') || (x === __SELF || x === __PARENT || x === __ROOT) || x[0] === '$') && (dest[x] = src$2[x]);
                            }
                        }
                        pbv.value = dest;
                    }
                    errors[errors.length] = pbv;
                }
                var src$3 = optimizedPath, i$7 = -1, n$2 = src$3.length, opt = new Array(n$2);
                while (++i$7 < n$2) {
                    opt[i$7] = src$3[i$7];
                }
                var src$4 = requestedPath, i$8 = -1, n$3 = src$4.length, req$2 = new Array(n$3);
                while (++i$8 < n$3) {
                    req$2[i$8] = src$4[i$8];
                }
                if (appendNullKey === true) {
                    req$2[req$2.length] = null;
                }
                requestedPaths[requestedPaths.length] = req$2;
                optimizedPaths[optimizedPaths.length] = opt;
                var pbv$2 = Object.create(null);
                var src$5 = requestedPath, i$9 = -1, n$4 = src$5.length, req$3 = new Array(n$4);
                while (++i$9 < n$4) {
                    req$3[i$9] = src$5[i$9];
                }
                if (appendNullKey === true) {
                    req$3[req$3.length] = null;
                }
                pbv$2.path = req$3;
                if (boxed === true) {
                    pbv$2.value = node;
                } else {
                    var dest$2 = nodeValue, src$6 = dest$2, x$2;
                    if (dest$2 != null && typeof dest$2 === 'object') {
                        dest$2 = Array.isArray(src$6) && [] || Object.create(null);
                        for (x$2 in src$6) {
                            !(!(x$2[0] !== '_' || x$2[1] !== '_') || (x$2 === __SELF || x$2 === __PARENT || x$2 === __ROOT) || x$2[0] === '$') && (dest$2[x$2] = src$6[x$2]);
                        }
                    }
                    pbv$2.value = dest$2;
                }
                typeof values === 'function' && (values(pbv$2) || true) || Array.isArray(values) && (values[values.length] = pbv$2);
            }
            if (boxed === false && node == null || refreshing === true) {
                var src$7 = boundPath, i$10 = -1, n$5 = src$7.length, req$4 = new Array(n$5);
                while (++i$10 < n$5) {
                    req$4[i$10] = src$7[i$10];
                }
                var src$8 = optimizedPath, i$11 = -1, n$6 = src$8.length, opt$2 = new Array(n$6);
                while (++i$11 < n$6) {
                    opt$2[i$11] = src$8[i$11];
                }
                var reqLen = req$4.length - 1, optLen = opt$2.length - 1, i$12 = -1, n$7 = requestedPath.length, map, offset$2, keys$2, index$3, reqKeys, optKeys, optKeysLen, x$3, y, z;
                while (++i$12 < n$7) {
                    req$4[++reqLen] = (reqKeys = pathMapStack[offset$2 = (i$12 + boundLength) * 4 + 1]) && reqKeys.length > 1 && [requestedPath[i$12]] || requestedPath[i$12];
                }
                var j$2 = depth, k = reqLen, l = optLen;
                i$12 = j$2++;
                while (j$2 > i$12) {
                    if ((map = pathMapStack[offset$2 = (j$2 + boundLength) * 4]) != null && typeof map === 'object' && map[$TYPE] === void 0 && Array.isArray(map) === false && (keys$2 = pathMapStack[offset$2 + 1] || (pathMapStack[offset$2 + 1] = Object.keys(map))) && ((index$3 = pathMapStack[offset$2 + 2] || (pathMapStack[offset$2 + 2] = 0)) || true) && keys$2.length > 0) {
                        if ((pathMapStack[offset$2 + 2] = ++index$3) - 1 < keys$2.length) {
                            if (reqLen - k < j$2 - i$12) {
                                var src$9 = keys$2, i$13 = -1, n$8 = src$9.length, dest$3 = new Array(n$8);
                                while (++i$13 < n$8) {
                                    dest$3[i$13] = src$9[i$13];
                                }
                                reqKeys = dest$3;
                                x$3 = -1;
                                y = reqKeys.length;
                                while (++x$3 < y) {
                                    reqKeys[x$3] = (z = reqKeys[x$3]) == __NULL ? null : z;
                                }
                                req$4[++reqLen] = y === 1 ? reqKeys[0] : reqKeys;
                            }
                            if (optLen - l < j$2 - i$12) {
                                var src$10 = keys$2, i$14 = -1, n$9 = src$10.length, dest$4 = new Array(n$9);
                                while (++i$14 < n$9) {
                                    dest$4[i$14] = src$10[i$14];
                                }
                                reqKeys = dest$4;
                                optKeys = [];
                                optKeysLen = 0;
                                x$3 = -1;
                                y = reqKeys.length;
                                while (++x$3 < y) {
                                    (z = reqKeys[x$3]) !== __NULL && (optKeys[optKeysLen++] = z);
                                }
                                if (optKeysLen > 0) {
                                    opt$2[++optLen] = optKeysLen === 1 ? optKeys[0] : optKeys;
                                }
                            }
                            pathMapStack[offset$2 = 4 * (++j$2 + boundLength)] = map[keys$2[index$3 - 1]];
                            continue;
                        }
                    }
                    delete pathMapStack[offset$2 = 4 * (j$2-- + boundLength)];
                    delete pathMapStack[offset$2 + 1];
                    delete pathMapStack[offset$2 + 2];
                    delete pathMapStack[offset$2 + 3];
                }
                req$4.pathSetIndex = index;
                requestedMissingPaths[requestedMissingPaths.length] = req$4;
                optimizedMissingPaths[optimizedMissingPaths.length] = opt$2;
            }
            appendNullKey = false;
            var offset$3, keys$3, index$4;
            while (depth > -1 && (keys$3 = pathMapStack[(offset$3 = 4 * depth--) + 1]) && ((index$4 = pathMapStack[offset$3 + 2]) || true) && (pathMapStack[offset$3 + 2] = ++index$4) >= keys$3.length) {
                delete pathMapStack[offset$3 + 0];
                delete pathMapStack[offset$3 + 1];
                delete pathMapStack[offset$3 + 2];
                delete pathMapStack[offset$3 + 3];
            }
        }
    }
    return {
        'values': values,
        'errors': errors,
        'requestedPaths': requestedPaths,
        'optimizedPaths': optimizedPaths,
        'requestedMissingPaths': requestedMissingPaths,
        'optimizedMissingPaths': optimizedMissingPaths
    };
}
function setPathsAsJSON(model, pathValues, values, errorSelector, boundPath) {
    var boundLength = 0, nodeRoot = model._cache || {}, nodeParent, node;
    if (Array.isArray(boundPath)) {
        nodeParent = nodeRoot;
        boundLength = boundPath.length;
    } else {
        nodeParent = getBoundValue(model);
        boundPath = model._path || [];
    }
    var value, root = model._root || model, boxed = model._boxed || false, expired = root.expired || (root.expired = []), refreshing = model._refreshing || false, appendNullKey = false;
    typeof errorSelector === 'function' || (errorSelector = model._errorSelector) || (errorSelector = function (x$4, y) {
        return y;
    });
    var jsonKeys = pathValues.jsonKeys || (pathValues.jsonKeys = []);
    var nodes = pathValues.nodes || (pathValues.nodes = []);
    var jsons = pathValues.jsons || (pathValues.jsons = []);
    var errors = pathValues.errors || (pathValues.errors = []);
    var refs = pathValues.refs || (pathValues.refs = []);
    var depth = pathValues.depth || (pathValues.depth = 0);
    var refIndex = pathValues.refIndex || (pathValues.refIndex = 0);
    var refDepth = pathValues.refDepth || (pathValues.refDepth = 0);
    var requestedPath = pathValues.requestedPath || (pathValues.requestedPath = []);
    var optimizedPath = pathValues.optimizedPath || (pathValues.optimizedPath = []);
    var requestedPaths = pathValues.requestedPaths || (pathValues.requestedPaths = []);
    var optimizedPaths = pathValues.optimizedPaths || (pathValues.optimizedPaths = []);
    var requestedMissingPaths = pathValues.requestedMissingPaths || (pathValues.requestedMissingPaths = []);
    var optimizedMissingPaths = pathValues.optimizedMissingPaths || (pathValues.optimizedMissingPaths = []);
    var hasValue = pathValues.hasValue || (pathValues.hasValue = false);
    var jsonRoot = pathValues.jsonRoot || (pathValues.jsonRoot = values && values[0]);
    var jsonParent = pathValues.jsonParent || (pathValues.jsonParent = jsonRoot);
    var jsonNode = pathValues.jsonNode || (pathValues.jsonNode = jsonParent);
    var path, length = 0, height = 0, reference, refLength = 0, refHeight = 0, nodeType, nodeValue, nodeSize, nodeTimestamp, nodeExpires;
    refs[-1] = boundPath;
    nodes[-1] = nodeParent;
    jsons[-2] = jsons;
    jsonKeys[-1] = -1;
    var index = -1, count = pathValues.length;
    while (++index < count) {
        path = pathValues[index];
        value = path.value;
        path = path.path;
        hasValue = false;
        jsons.length = 0;
        jsons[-1] = jsonRoot = values && values[index] || void 0;
        jsonKeys.length = 0;
        jsonKeys[-1] = -1;
        depth = 0;
        length = path.length;
        height = length - 1;
        var ref;
        refs.length = 0;
        while (depth > -1) {
            refIndex = depth;
            while (--refIndex >= -1) {
                if (!!(ref = refs[refIndex])) {
                    refLength = ref.length;
                    var i = -1, j = 0;
                    while (++i < refLength) {
                        optimizedPath[j++] = ref[i];
                    }
                    i = ++refIndex;
                    while (i < depth) {
                        optimizedPath[j++] = requestedPath[i++];
                    }
                    optimizedPath.length = j;
                    break;
                }
            }
            var key, isKeySet;
            path = path;
            height = (length = path.length) - 1;
            nodeParent = node = nodes[depth - 1];
            jsonParent = jsonNode = jsons[depth - 1];
            depth = depth;
            follow_path_12652:
                do {
                    key = path[depth];
                    if (isKeySet = key != null && typeof key === 'object') {
                        if (Array.isArray(key)) {
                            if ((key = key[key.index || (key.index = 0)]) != null && typeof key === 'object') {
                                key = key[__OFFSET] === void 0 && (key[__OFFSET] = key.from || (key.from = 0)) || key[__OFFSET];
                            }
                        } else {
                            key = key[__OFFSET] === void 0 && (key[__OFFSET] = key.from || (key.from = 0)) || key[__OFFSET];
                        }
                    }
                    if (key === __NULL) {
                        key = null;
                    }
                    depth >= boundLength && (requestedPath[requestedPath.length = depth] = key);
                    if (key != null) {
                        if (depth < height) {
                            optimizedPath[optimizedPath.length = depth + (refLength - refIndex)] = key;
                            node = nodeParent[key];
                            nodeType = node && node[$TYPE] || void 0;
                            nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                            nodeTimestamp = node && node[$TIMESTAMP];
                            nodeExpires = node && node[$EXPIRES];
                            if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                            }
                            if (typeof node !== 'object' || !!nodeType && nodeType !== SENTINEL && !Array.isArray(nodeValue)) {
                                nodeType = void 0;
                                nodeValue = Object.create(null);
                                if (node != null && node !== nodeValue) {
                                    var nodeRefsLength = node.__refsLength || 0, destRefsLength = nodeValue.__refsLength || 0, i$2 = -1, ref$2;
                                    while (++i$2 < nodeRefsLength) {
                                        if ((ref$2 = node[__REF + i$2]) !== void 0) {
                                            ref$2[__CONTEXT] = nodeValue;
                                            nodeValue[__REF + (destRefsLength + i$2)] = ref$2;
                                            node[__REF + i$2] = void 0;
                                        }
                                    }
                                    nodeValue[__REFS_LENGTH] = nodeRefsLength + destRefsLength;
                                    node[__REFS_LENGTH] = ref$2 = void 0;
                                    if (node != null && typeof node === 'object') {
                                        var root$2 = root, head = root$2.__head, tail = root$2.__tail, next, prev;
                                        (next = node.__next) && (next != null && typeof next === 'object') && (next.__prev = prev);
                                        (prev = node.__prev) && (prev != null && typeof prev === 'object') && (prev.__next = next);
                                        node === head && (root$2.__head = root$2.__next = head = next);
                                        node === tail && (root$2.__tail = root$2.__prev = tail = prev);
                                        node.__next = node.__prev = void 0;
                                        head = tail = next = prev = void 0;
                                    }
                                }
                                nodeParent[key] = node = nodeValue;
                                node = !node[__SELF] && ((node[__SELF] = node) || true) && ((node[__KEY] = key) || true) && ((node[__PARENT] = nodeParent) || true) && ((node[__ROOT] = nodeRoot) || true) && (node[__GENERATION] || (node[__GENERATION] = 0) || node) && ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue) && (nodeValue[__CONTAINER] = node)) || node;
                            }
                            if (depth >= boundLength) {
                                jsonKeys[depth] = isKeySet ? key : void 0;
                                if (node != null && jsonParent != null && isKeySet && (!(jsonNode = jsonParent[key]) || !(jsonNode != null && typeof jsonNode === 'object'))) {
                                    jsonNode = jsonParent[key] = Object.create(null);
                                }
                            } else {
                                jsonKeys[depth] = void 0;
                            }
                            if ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                                do {
                                    if (nodeExpires !== 1) {
                                        var root$3 = root, head$2 = root$3.__head, tail$2 = root$3.__tail, next$2 = node.__next, prev$2 = node.__prev;
                                        if (node !== head$2) {
                                            next$2 && (next$2 != null && typeof next$2 === 'object') && (next$2.__prev = prev$2);
                                            prev$2 && (prev$2 != null && typeof prev$2 === 'object') && (prev$2.__next = next$2);
                                            (next$2 = head$2) && (head$2 != null && typeof head$2 === 'object') && (head$2.__prev = node);
                                            root$3.__head = root$3.__next = head$2 = node;
                                            head$2.__next = next$2;
                                            head$2.__prev = void 0;
                                        }
                                        if (tail$2 == null || node === tail$2) {
                                            root$3.__tail = root$3.__prev = tail$2 = prev$2 || node;
                                        }
                                        root$3 = head$2 = tail$2 = next$2 = prev$2 = void 0;
                                    }
                                    refs[depth] = nodeValue;
                                    refIndex = depth + 1;
                                    refDepth = 0;
                                    var key$2, isKeySet$2;
                                    reference = nodeValue;
                                    refHeight = (refLength = reference.length) - 1;
                                    nodeParent = nodeRoot;
                                    jsonParent = jsonRoot;
                                    refDepth = refDepth;
                                    follow_path_12947:
                                        do {
                                            key$2 = reference[refDepth];
                                            isKeySet$2 = false;
                                            if (key$2 != null) {
                                                if (refDepth < refHeight) {
                                                    optimizedPath[optimizedPath.length = refDepth] = key$2;
                                                    node = nodeParent[key$2];
                                                    nodeType = node && node[$TYPE] || void 0;
                                                    nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                                    nodeTimestamp = node && node[$TIMESTAMP];
                                                    nodeExpires = node && node[$EXPIRES];
                                                    if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                                        node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                                    }
                                                    if (typeof node !== 'object' || !!nodeType && nodeType !== SENTINEL && !Array.isArray(nodeValue)) {
                                                        nodeType = void 0;
                                                        nodeValue = Object.create(null);
                                                        if (node != null && node !== nodeValue) {
                                                            var nodeRefsLength$2 = node.__refsLength || 0, destRefsLength$2 = nodeValue.__refsLength || 0, i$3 = -1, ref$3;
                                                            while (++i$3 < nodeRefsLength$2) {
                                                                if ((ref$3 = node[__REF + i$3]) !== void 0) {
                                                                    ref$3[__CONTEXT] = nodeValue;
                                                                    nodeValue[__REF + (destRefsLength$2 + i$3)] = ref$3;
                                                                    node[__REF + i$3] = void 0;
                                                                }
                                                            }
                                                            nodeValue[__REFS_LENGTH] = nodeRefsLength$2 + destRefsLength$2;
                                                            node[__REFS_LENGTH] = ref$3 = void 0;
                                                            if (node != null && typeof node === 'object') {
                                                                var root$4 = root, head$3 = root$4.__head, tail$3 = root$4.__tail, next$3, prev$3;
                                                                (next$3 = node.__next) && (next$3 != null && typeof next$3 === 'object') && (next$3.__prev = prev$3);
                                                                (prev$3 = node.__prev) && (prev$3 != null && typeof prev$3 === 'object') && (prev$3.__next = next$3);
                                                                node === head$3 && (root$4.__head = root$4.__next = head$3 = next$3);
                                                                node === tail$3 && (root$4.__tail = root$4.__prev = tail$3 = prev$3);
                                                                node.__next = node.__prev = void 0;
                                                                head$3 = tail$3 = next$3 = prev$3 = void 0;
                                                            }
                                                        }
                                                        nodeParent[key$2] = node = nodeValue;
                                                        node = !node[__SELF] && ((node[__SELF] = node) || true) && ((node[__KEY] = key$2) || true) && ((node[__PARENT] = nodeParent) || true) && ((node[__ROOT] = nodeRoot) || true) && (node[__GENERATION] || (node[__GENERATION] = 0) || node) && ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue) && (nodeValue[__CONTAINER] = node)) || node;
                                                    }
                                                    if (appendNullKey = node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue)) {
                                                        nodeParent = node;
                                                        break follow_path_12947;
                                                    }
                                                    nodeParent = node;
                                                    jsonParent = jsonNode;
                                                    refDepth = refDepth + 1;
                                                    continue follow_path_12947;
                                                } else if (refDepth === refHeight) {
                                                    optimizedPath[optimizedPath.length = refDepth] = key$2;
                                                    node = nodeParent[key$2];
                                                    nodeType = node && node[$TYPE] || void 0;
                                                    nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                                    nodeTimestamp = node && node[$TIMESTAMP];
                                                    nodeExpires = node && node[$EXPIRES];
                                                    if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                                        node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                                    }
                                                    if (typeof node !== 'object' || !!nodeType && nodeType !== SENTINEL && !Array.isArray(nodeValue)) {
                                                        nodeType = void 0;
                                                        nodeValue = Object.create(null);
                                                        if (node != null && node !== nodeValue) {
                                                            var nodeRefsLength$3 = node.__refsLength || 0, destRefsLength$3 = nodeValue.__refsLength || 0, i$4 = -1, ref$4;
                                                            while (++i$4 < nodeRefsLength$3) {
                                                                if ((ref$4 = node[__REF + i$4]) !== void 0) {
                                                                    ref$4[__CONTEXT] = nodeValue;
                                                                    nodeValue[__REF + (destRefsLength$3 + i$4)] = ref$4;
                                                                    node[__REF + i$4] = void 0;
                                                                }
                                                            }
                                                            nodeValue[__REFS_LENGTH] = nodeRefsLength$3 + destRefsLength$3;
                                                            node[__REFS_LENGTH] = ref$4 = void 0;
                                                            if (node != null && typeof node === 'object') {
                                                                var root$5 = root, head$4 = root$5.__head, tail$4 = root$5.__tail, next$4, prev$4;
                                                                (next$4 = node.__next) && (next$4 != null && typeof next$4 === 'object') && (next$4.__prev = prev$4);
                                                                (prev$4 = node.__prev) && (prev$4 != null && typeof prev$4 === 'object') && (prev$4.__next = next$4);
                                                                node === head$4 && (root$5.__head = root$5.__next = head$4 = next$4);
                                                                node === tail$4 && (root$5.__tail = root$5.__prev = tail$4 = prev$4);
                                                                node.__next = node.__prev = void 0;
                                                                head$4 = tail$4 = next$4 = prev$4 = void 0;
                                                            }
                                                        }
                                                        nodeParent[key$2] = node = nodeValue;
                                                        node = !node[__SELF] && ((node[__SELF] = node) || true) && ((node[__KEY] = key$2) || true) && ((node[__PARENT] = nodeParent) || true) && ((node[__ROOT] = nodeRoot) || true) && (node[__GENERATION] || (node[__GENERATION] = 0) || node) && ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue) && (nodeValue[__CONTAINER] = node)) || node;
                                                    }
                                                    appendNullKey = node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue);
                                                    nodeParent = node;
                                                    break follow_path_12947;
                                                }
                                            } else if (refDepth < refHeight) {
                                                nodeParent = node;
                                                jsonParent = jsonNode;
                                                refDepth = refDepth + 1;
                                                continue follow_path_12947;
                                            }
                                            nodeParent = node;
                                            break follow_path_12947;
                                        } while (true);
                                    node = nodeParent;
                                } while ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue));
                                if (node == null) {
                                    while (refDepth <= refHeight) {
                                        optimizedPath[refDepth] = reference[refDepth++];
                                    }
                                }
                            }
                            if (node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue)) {
                                nodeParent = node;
                                break follow_path_12652;
                            }
                            nodeParent = nodes[depth] = node;
                            jsonParent = jsons[depth] = jsonNode;
                            depth = depth + 1;
                            continue follow_path_12652;
                        } else if (depth === height) {
                            optimizedPath[optimizedPath.length = depth + (refLength - refIndex)] = key;
                            node = nodeParent[key];
                            nodeType = node && node[$TYPE] || void 0;
                            nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                            nodeTimestamp = node && node[$TIMESTAMP];
                            nodeExpires = node && node[$EXPIRES];
                            if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                            }
                            nodeType = value && value[$TYPE] || void 0;
                            nodeValue = nodeType === SENTINEL ? value[VALUE] : nodeType === ERROR ? value = errorSelector(requestedPath, value) : value;
                            nodeTimestamp = value && value[$TIMESTAMP];
                            nodeExpires = value && value[$EXPIRES];
                            var newNode;
                            newNode = value;
                            if ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                                nodeType = 'array';
                                newNode[$SIZE] = nodeSize = (nodeType === SENTINEL && 50 || 0) + (nodeValue.length || 1);
                                delete nodeValue[$SIZE];
                                nodeValue[__CONTAINER] = newNode;
                            } else if (nodeType === SENTINEL) {
                                newNode[$SIZE] = nodeSize = 50 + (typeof nodeValue === 'string' && nodeValue.length || 1);
                            } else if (nodeType === ERROR) {
                                newNode[$SIZE] = nodeSize = 50 + (value[$SIZE] || 0 || 1);
                            } else if (!(value != null && typeof value === 'object')) {
                                nodeSize = 50 + (typeof nodeValue === 'string' && nodeValue.length || 1);
                                nodeType = 'sentinel';
                                newNode = { 'value': nodeValue };
                                newNode[$TYPE] = nodeType;
                                newNode[$SIZE] = nodeSize;
                            } else {
                                nodeType = newNode[$TYPE] = nodeType || 'leaf';
                                newNode[$SIZE] = nodeSize = value[$SIZE] || 0 || 50 + 1;
                            }
                            ;
                            if (node != null && node !== newNode) {
                                var nodeRefsLength$4 = node.__refsLength || 0, destRefsLength$4 = newNode.__refsLength || 0, i$5 = -1, ref$5;
                                while (++i$5 < nodeRefsLength$4) {
                                    if ((ref$5 = node[__REF + i$5]) !== void 0) {
                                        ref$5[__CONTEXT] = newNode;
                                        newNode[__REF + (destRefsLength$4 + i$5)] = ref$5;
                                        node[__REF + i$5] = void 0;
                                    }
                                }
                                newNode[__REFS_LENGTH] = nodeRefsLength$4 + destRefsLength$4;
                                node[__REFS_LENGTH] = ref$5 = void 0;
                                if (node != null && typeof node === 'object') {
                                    var root$6 = root, head$5 = root$6.__head, tail$5 = root$6.__tail, next$5, prev$5;
                                    (next$5 = node.__next) && (next$5 != null && typeof next$5 === 'object') && (next$5.__prev = prev$5);
                                    (prev$5 = node.__prev) && (prev$5 != null && typeof prev$5 === 'object') && (prev$5.__next = next$5);
                                    node === head$5 && (root$6.__head = root$6.__next = head$5 = next$5);
                                    node === tail$5 && (root$6.__tail = root$6.__prev = tail$5 = prev$5);
                                    node.__next = node.__prev = void 0;
                                    head$5 = tail$5 = next$5 = prev$5 = void 0;
                                }
                            }
                            nodeParent[key] = node = newNode;
                            node = !node[__SELF] && ((node[__SELF] = node) || true) && ((node[__KEY] = key) || true) && ((node[__PARENT] = nodeParent) || true) && ((node[__ROOT] = nodeRoot) || true) && (node[__GENERATION] || (node[__GENERATION] = 0) || node) && ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue) && (nodeValue[__CONTAINER] = node)) || node;
                            if (node != null && typeof node === 'object') {
                                if (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true) {
                                    node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                } else {
                                    if (nodeExpires !== 1) {
                                        var root$7 = root, head$6 = root$7.__head, tail$6 = root$7.__tail, next$6 = node.__next, prev$6 = node.__prev;
                                        if (node !== head$6) {
                                            next$6 && (next$6 != null && typeof next$6 === 'object') && (next$6.__prev = prev$6);
                                            prev$6 && (prev$6 != null && typeof prev$6 === 'object') && (prev$6.__next = next$6);
                                            (next$6 = head$6) && (head$6 != null && typeof head$6 === 'object') && (head$6.__prev = node);
                                            root$7.__head = root$7.__next = head$6 = node;
                                            head$6.__next = next$6;
                                            head$6.__prev = void 0;
                                        }
                                        if (tail$6 == null || node === tail$6) {
                                            root$7.__tail = root$7.__prev = tail$6 = prev$6 || node;
                                        }
                                        root$7 = head$6 = tail$6 = next$6 = prev$6 = void 0;
                                    }
                                }
                            }
                            if (depth >= boundLength) {
                                jsonKeys[depth] = isKeySet ? key : void 0;
                            } else {
                                jsonKeys[depth] = void 0;
                            }
                            appendNullKey = false;
                            nodeParent = node;
                            break follow_path_12652;
                        }
                    } else if (depth < height) {
                        nodeParent = nodeParent;
                        jsonParent = jsonParent;
                        depth = depth + 1;
                        continue follow_path_12652;
                    }
                    nodeParent = node;
                    break follow_path_12652;
                } while (true);
            node = nodeParent;
            if (node != null || boxed === true) {
                if (nodeType === ERROR) {
                    if (nodeExpires !== 1) {
                        var root$8 = root, head$7 = root$8.__head, tail$7 = root$8.__tail, next$7 = node.__next, prev$7 = node.__prev;
                        if (node !== head$7) {
                            next$7 && (next$7 != null && typeof next$7 === 'object') && (next$7.__prev = prev$7);
                            prev$7 && (prev$7 != null && typeof prev$7 === 'object') && (prev$7.__next = next$7);
                            (next$7 = head$7) && (head$7 != null && typeof head$7 === 'object') && (head$7.__prev = node);
                            root$8.__head = root$8.__next = head$7 = node;
                            head$7.__next = next$7;
                            head$7.__prev = void 0;
                        }
                        if (tail$7 == null || node === tail$7) {
                            root$8.__tail = root$8.__prev = tail$7 = prev$7 || node;
                        }
                        root$8 = head$7 = tail$7 = next$7 = prev$7 = void 0;
                    }
                    var pbv = Object.create(null);
                    var src = requestedPath, i$6 = -1, n = src.length, req = new Array(n);
                    while (++i$6 < n) {
                        req[i$6] = src[i$6];
                    }
                    if (appendNullKey === true) {
                        req[req.length] = null;
                    }
                    pbv.path = req;
                    if (boxed === true) {
                        pbv.value = node;
                    } else {
                        var dest = nodeValue, src$2 = dest, x;
                        if (dest != null && typeof dest === 'object') {
                            dest = Array.isArray(src$2) && [] || Object.create(null);
                            for (x in src$2) {
                                !(!(x[0] !== '_' || x[1] !== '_') || (x === __SELF || x === __PARENT || x === __ROOT) || x[0] === '$') && (dest[x] = src$2[x]);
                            }
                        }
                        pbv.value = dest;
                    }
                    errors[errors.length] = pbv;
                }
                if (jsonParent != null) {
                    hasValue = true;
                    var jsonKey, jsonDepth = depth;
                    do {
                        jsonKey = jsonKeys[jsonDepth];
                        jsonParent = jsons[--jsonDepth];
                    } while (jsonKey == null);
                    if (boxed === true) {
                        jsonParent[jsonKey] = node;
                    } else {
                        var dest$2 = nodeValue, src$3 = dest$2, x$2;
                        if (dest$2 != null && typeof dest$2 === 'object') {
                            dest$2 = Array.isArray(src$3) && [] || Object.create(null);
                            for (x$2 in src$3) {
                                !(!(x$2[0] !== '_' || x$2[1] !== '_') || (x$2 === __SELF || x$2 === __PARENT || x$2 === __ROOT) || x$2[0] === '$') && (dest$2[x$2] = src$3[x$2]);
                            }
                        }
                        jsonParent[jsonKey] = dest$2;
                    }
                }
                var src$4 = optimizedPath, i$7 = -1, n$2 = src$4.length, opt = new Array(n$2);
                while (++i$7 < n$2) {
                    opt[i$7] = src$4[i$7];
                }
                var src$5 = requestedPath, i$8 = -1, n$3 = src$5.length, req$2 = new Array(n$3);
                while (++i$8 < n$3) {
                    req$2[i$8] = src$5[i$8];
                }
                if (appendNullKey === true) {
                    req$2[req$2.length] = null;
                }
                requestedPaths[requestedPaths.length] = req$2;
                optimizedPaths[optimizedPaths.length] = opt;
            }
            if (boxed === false && node == null || refreshing === true) {
                var src$6 = boundPath, i$9 = -1, n$4 = src$6.length, req$3 = new Array(n$4);
                while (++i$9 < n$4) {
                    req$3[i$9] = src$6[i$9];
                }
                var src$7 = optimizedPath, i$10 = -1, n$5 = src$7.length, opt$2 = new Array(n$5);
                while (++i$10 < n$5) {
                    opt$2[i$10] = src$7[i$10];
                }
                var reqLen = req$3.length - 1, optLen = opt$2.length - 1, i$11 = -1, n$6 = requestedPath.length, j$2 = depth, k = height, x$3;
                while (++i$11 < n$6) {
                    req$3[++reqLen] = path[i$11 + boundLength] != null && typeof path[i$11 + boundLength] === 'object' && [requestedPath[i$11]] || requestedPath[i$11];
                }
                i$11 = -1;
                n$6 = height - depth;
                while (++i$11 < n$6) {
                    x$3 = req$3[++reqLen] = path[++j$2 + boundLength];
                    x$3 != null && (opt$2[++optLen] = x$3);
                }
                req$3.pathSetIndex = index;
                requestedMissingPaths[requestedMissingPaths.length] = req$3;
                optimizedMissingPaths[optimizedMissingPaths.length] = opt$2;
            }
            appendNullKey = false;
            jsonRoot != null && (values[index] = hasValue && { json: jsons[-1] } || void 0);
            var key$3;
            depth = depth;
            unroll_12748:
                do {
                    if (depth < 0) {
                        depth = (path.depth = 0) - 1;
                        break unroll_12748;
                    }
                    if (!((key$3 = path[depth]) != null && typeof key$3 === 'object')) {
                        depth = path.depth = depth - 1;
                        continue unroll_12748;
                    }
                    if (Array.isArray(key$3)) {
                        if (++key$3.index === key$3.length) {
                            if (!((key$3 = key$3[key$3.index = 0]) != null && typeof key$3 === 'object')) {
                                depth = path.depth = depth - 1;
                                continue unroll_12748;
                            }
                        } else {
                            depth = path.depth = depth;
                            break unroll_12748;
                        }
                    }
                    if (++key$3[__OFFSET] > (key$3.to || (key$3.to = key$3.from + (key$3.length || 1) - 1))) {
                        key$3[__OFFSET] = key$3.from;
                        depth = path.depth = depth - 1;
                        continue unroll_12748;
                    }
                    depth = path.depth = depth;
                    break unroll_12748;
                } while (true);
            depth = depth;
        }
    }
    return {
        'values': values,
        'errors': errors,
        'requestedPaths': requestedPaths,
        'optimizedPaths': optimizedPaths,
        'requestedMissingPaths': requestedMissingPaths,
        'optimizedMissingPaths': optimizedMissingPaths
    };
}
function setPathsAsJSONG(model, pathValues, values, errorSelector, boundPath) {
    var boundLength = 0, nodeRoot = model._cache || {}, nodeParent, node;
    if (Array.isArray(boundPath)) {
        nodeParent = nodeRoot;
        boundLength = boundPath.length;
    } else {
        nodeParent = getBoundValue(model);
        boundPath = model._path || [];
    }
    var value, root = model._root || model, boxed = model._boxed || false, expired = root.expired || (root.expired = []), refreshing = model._refreshing || false, appendNullKey = false;
    typeof errorSelector === 'function' || (errorSelector = model._errorSelector) || (errorSelector = function (x$6, y) {
        return y;
    });
    var nodes = pathValues.nodes || (pathValues.nodes = []);
    var jsons = pathValues.jsons || (pathValues.jsons = []);
    var errors = pathValues.errors || (pathValues.errors = []);
    var refs = pathValues.refs || (pathValues.refs = []);
    var depth = pathValues.depth || (pathValues.depth = 0);
    var refIndex = pathValues.refIndex || (pathValues.refIndex = 0);
    var refDepth = pathValues.refDepth || (pathValues.refDepth = 0);
    var requestedPath = pathValues.requestedPath || (pathValues.requestedPath = []);
    var optimizedPath = pathValues.optimizedPath || (pathValues.optimizedPath = []);
    var requestedPaths = pathValues.requestedPaths || (pathValues.requestedPaths = []);
    var optimizedPaths = pathValues.optimizedPaths || (pathValues.optimizedPaths = []);
    var requestedMissingPaths = pathValues.requestedMissingPaths || (pathValues.requestedMissingPaths = []);
    var optimizedMissingPaths = pathValues.optimizedMissingPaths || (pathValues.optimizedMissingPaths = []);
    var hasValue = pathValues.hasValue || (pathValues.hasValue = false);
    var jsonRoot = pathValues.jsonRoot || (pathValues.jsonRoot = values && values[0]);
    var jsonParent = pathValues.jsonParent || (pathValues.jsonParent = jsonRoot);
    var jsonNode = pathValues.jsonNode || (pathValues.jsonNode = jsonParent);
    var path, length = 0, height = 0, reference, refLength = 0, refHeight = 0, nodeType, nodeValue, nodeSize, nodeTimestamp, nodeExpires;
    refs[-1] = boundPath;
    nodes[-1] = nodeParent;
    jsons[-1] = jsonParent;
    jsons[-2] = jsons;
    var index = -1, count = pathValues.length;
    while (++index < count) {
        path = pathValues[index];
        value = path.value;
        path = path.path;
        depth = 0;
        length = path.length;
        height = length - 1;
        var ref;
        refs.length = 0;
        while (depth > -1) {
            refIndex = depth;
            while (--refIndex >= -1) {
                if (!!(ref = refs[refIndex])) {
                    refLength = ref.length;
                    var i = -1, j = 0;
                    while (++i < refLength) {
                        optimizedPath[j++] = ref[i];
                    }
                    i = ++refIndex;
                    while (i < depth) {
                        optimizedPath[j++] = requestedPath[i++];
                    }
                    optimizedPath.length = j;
                    break;
                }
            }
            var key, isKeySet;
            path = path;
            height = (length = path.length) - 1;
            nodeParent = node = nodes[depth - 1];
            jsonParent = jsonNode = jsons[depth - 1];
            depth = depth;
            follow_path_5522:
                do {
                    key = path[depth];
                    if (isKeySet = key != null && typeof key === 'object') {
                        if (Array.isArray(key)) {
                            if ((key = key[key.index || (key.index = 0)]) != null && typeof key === 'object') {
                                key = key[__OFFSET] === void 0 && (key[__OFFSET] = key.from || (key.from = 0)) || key[__OFFSET];
                            }
                        } else {
                            key = key[__OFFSET] === void 0 && (key[__OFFSET] = key.from || (key.from = 0)) || key[__OFFSET];
                        }
                    }
                    if (key === __NULL) {
                        key = null;
                    }
                    depth >= boundLength && (requestedPath[requestedPath.length = depth] = key);
                    if (key != null) {
                        if (depth < height) {
                            optimizedPath[optimizedPath.length = depth + (refLength - refIndex)] = key;
                            node = nodeParent[key];
                            nodeType = node && node[$TYPE] || void 0;
                            nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                            nodeTimestamp = node && node[$TIMESTAMP];
                            nodeExpires = node && node[$EXPIRES];
                            if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                            }
                            if (typeof node !== 'object' || !!nodeType && nodeType !== SENTINEL && !Array.isArray(nodeValue)) {
                                nodeType = void 0;
                                nodeValue = Object.create(null);
                                if (node != null && node !== nodeValue) {
                                    var nodeRefsLength = node.__refsLength || 0, destRefsLength = nodeValue.__refsLength || 0, i$2 = -1, ref$2;
                                    while (++i$2 < nodeRefsLength) {
                                        if ((ref$2 = node[__REF + i$2]) !== void 0) {
                                            ref$2[__CONTEXT] = nodeValue;
                                            nodeValue[__REF + (destRefsLength + i$2)] = ref$2;
                                            node[__REF + i$2] = void 0;
                                        }
                                    }
                                    nodeValue[__REFS_LENGTH] = nodeRefsLength + destRefsLength;
                                    node[__REFS_LENGTH] = ref$2 = void 0;
                                    if (node != null && typeof node === 'object') {
                                        var root$2 = root, head = root$2.__head, tail = root$2.__tail, next, prev;
                                        (next = node.__next) && (next != null && typeof next === 'object') && (next.__prev = prev);
                                        (prev = node.__prev) && (prev != null && typeof prev === 'object') && (prev.__next = next);
                                        node === head && (root$2.__head = root$2.__next = head = next);
                                        node === tail && (root$2.__tail = root$2.__prev = tail = prev);
                                        node.__next = node.__prev = void 0;
                                        head = tail = next = prev = void 0;
                                    }
                                }
                                nodeParent[key] = node = nodeValue;
                                node = !node[__SELF] && ((node[__SELF] = node) || true) && ((node[__KEY] = key) || true) && ((node[__PARENT] = nodeParent) || true) && ((node[__ROOT] = nodeRoot) || true) && (node[__GENERATION] || (node[__GENERATION] = 0) || node) && ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue) && (nodeValue[__CONTAINER] = node)) || node;
                            }
                            if (node != null && jsonParent != null) {
                                if (!nodeType && (node != null && typeof node === 'object') && !Array.isArray(nodeValue)) {
                                    if (!(jsonNode = jsonParent[key]) || !(jsonNode != null && typeof jsonNode === 'object')) {
                                        jsonNode = jsonParent[key] = Object.create(null);
                                    }
                                } else {
                                    if (boxed === true) {
                                        jsonParent[key] = node;
                                    } else {
                                        var val = nodeValue;
                                        if (val != null && typeof val === 'object') {
                                            var src = val, keys = Object.keys(src), x, i$3 = -1, n = keys.length;
                                            val = Array.isArray(src) && new Array(src.length) || Object.create(null);
                                            while (++i$3 < n) {
                                                x = keys[i$3];
                                                !(!(x[0] !== '_' || x[1] !== '_') || (x === __SELF || x === __PARENT || x === __ROOT)) && (val[x] = src[x]);
                                            }
                                        }
                                        if (!nodeType && (val != null && typeof val === 'object') && !Array.isArray(val)) {
                                            val[$TYPE] = LEAF;
                                        }
                                        jsonParent[key] = val;
                                    }
                                }
                            }
                            if ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                                do {
                                    if (nodeExpires !== 1) {
                                        var root$3 = root, head$2 = root$3.__head, tail$2 = root$3.__tail, next$2 = node.__next, prev$2 = node.__prev;
                                        if (node !== head$2) {
                                            next$2 && (next$2 != null && typeof next$2 === 'object') && (next$2.__prev = prev$2);
                                            prev$2 && (prev$2 != null && typeof prev$2 === 'object') && (prev$2.__next = next$2);
                                            (next$2 = head$2) && (head$2 != null && typeof head$2 === 'object') && (head$2.__prev = node);
                                            root$3.__head = root$3.__next = head$2 = node;
                                            head$2.__next = next$2;
                                            head$2.__prev = void 0;
                                        }
                                        if (tail$2 == null || node === tail$2) {
                                            root$3.__tail = root$3.__prev = tail$2 = prev$2 || node;
                                        }
                                        root$3 = head$2 = tail$2 = next$2 = prev$2 = void 0;
                                    }
                                    refs[depth] = nodeValue;
                                    refIndex = depth + 1;
                                    refDepth = 0;
                                    var key$2, isKeySet$2;
                                    reference = nodeValue;
                                    refHeight = (refLength = reference.length) - 1;
                                    nodeParent = nodeRoot;
                                    jsonParent = jsonRoot;
                                    refDepth = refDepth;
                                    follow_path_5832:
                                        do {
                                            key$2 = reference[refDepth];
                                            isKeySet$2 = false;
                                            if (key$2 != null) {
                                                if (refDepth < refHeight) {
                                                    optimizedPath[optimizedPath.length = refDepth] = key$2;
                                                    node = nodeParent[key$2];
                                                    nodeType = node && node[$TYPE] || void 0;
                                                    nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                                    nodeTimestamp = node && node[$TIMESTAMP];
                                                    nodeExpires = node && node[$EXPIRES];
                                                    if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                                        node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                                    }
                                                    if (typeof node !== 'object' || !!nodeType && nodeType !== SENTINEL && !Array.isArray(nodeValue)) {
                                                        nodeType = void 0;
                                                        nodeValue = Object.create(null);
                                                        if (node != null && node !== nodeValue) {
                                                            var nodeRefsLength$2 = node.__refsLength || 0, destRefsLength$2 = nodeValue.__refsLength || 0, i$4 = -1, ref$3;
                                                            while (++i$4 < nodeRefsLength$2) {
                                                                if ((ref$3 = node[__REF + i$4]) !== void 0) {
                                                                    ref$3[__CONTEXT] = nodeValue;
                                                                    nodeValue[__REF + (destRefsLength$2 + i$4)] = ref$3;
                                                                    node[__REF + i$4] = void 0;
                                                                }
                                                            }
                                                            nodeValue[__REFS_LENGTH] = nodeRefsLength$2 + destRefsLength$2;
                                                            node[__REFS_LENGTH] = ref$3 = void 0;
                                                            if (node != null && typeof node === 'object') {
                                                                var root$4 = root, head$3 = root$4.__head, tail$3 = root$4.__tail, next$3, prev$3;
                                                                (next$3 = node.__next) && (next$3 != null && typeof next$3 === 'object') && (next$3.__prev = prev$3);
                                                                (prev$3 = node.__prev) && (prev$3 != null && typeof prev$3 === 'object') && (prev$3.__next = next$3);
                                                                node === head$3 && (root$4.__head = root$4.__next = head$3 = next$3);
                                                                node === tail$3 && (root$4.__tail = root$4.__prev = tail$3 = prev$3);
                                                                node.__next = node.__prev = void 0;
                                                                head$3 = tail$3 = next$3 = prev$3 = void 0;
                                                            }
                                                        }
                                                        nodeParent[key$2] = node = nodeValue;
                                                        node = !node[__SELF] && ((node[__SELF] = node) || true) && ((node[__KEY] = key$2) || true) && ((node[__PARENT] = nodeParent) || true) && ((node[__ROOT] = nodeRoot) || true) && (node[__GENERATION] || (node[__GENERATION] = 0) || node) && ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue) && (nodeValue[__CONTAINER] = node)) || node;
                                                    }
                                                    if (node != null && jsonParent != null) {
                                                        if (!nodeType && (node != null && typeof node === 'object') && !Array.isArray(nodeValue)) {
                                                            if (!(jsonNode = jsonParent[key$2]) || !(jsonNode != null && typeof jsonNode === 'object')) {
                                                                jsonNode = jsonParent[key$2] = Object.create(null);
                                                            }
                                                        } else {
                                                            if (boxed === true) {
                                                                jsonParent[key$2] = node;
                                                            } else {
                                                                var val$2 = nodeValue;
                                                                if (val$2 != null && typeof val$2 === 'object') {
                                                                    var src$2 = val$2, keys$2 = Object.keys(src$2), x$2, i$5 = -1, n$2 = keys$2.length;
                                                                    val$2 = Array.isArray(src$2) && new Array(src$2.length) || Object.create(null);
                                                                    while (++i$5 < n$2) {
                                                                        x$2 = keys$2[i$5];
                                                                        !(!(x$2[0] !== '_' || x$2[1] !== '_') || (x$2 === __SELF || x$2 === __PARENT || x$2 === __ROOT)) && (val$2[x$2] = src$2[x$2]);
                                                                    }
                                                                }
                                                                if (!nodeType && (val$2 != null && typeof val$2 === 'object') && !Array.isArray(val$2)) {
                                                                    val$2[$TYPE] = LEAF;
                                                                }
                                                                jsonParent[key$2] = val$2;
                                                            }
                                                        }
                                                    }
                                                    if (appendNullKey = node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue)) {
                                                        nodeParent = node;
                                                        break follow_path_5832;
                                                    }
                                                    nodeParent = node;
                                                    jsonParent = jsonNode;
                                                    refDepth = refDepth + 1;
                                                    continue follow_path_5832;
                                                } else if (refDepth === refHeight) {
                                                    optimizedPath[optimizedPath.length = refDepth] = key$2;
                                                    node = nodeParent[key$2];
                                                    nodeType = node && node[$TYPE] || void 0;
                                                    nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                                    nodeTimestamp = node && node[$TIMESTAMP];
                                                    nodeExpires = node && node[$EXPIRES];
                                                    if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                                        node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                                    }
                                                    if (typeof node !== 'object' || !!nodeType && nodeType !== SENTINEL && !Array.isArray(nodeValue)) {
                                                        nodeType = void 0;
                                                        nodeValue = Object.create(null);
                                                        if (node != null && node !== nodeValue) {
                                                            var nodeRefsLength$3 = node.__refsLength || 0, destRefsLength$3 = nodeValue.__refsLength || 0, i$6 = -1, ref$4;
                                                            while (++i$6 < nodeRefsLength$3) {
                                                                if ((ref$4 = node[__REF + i$6]) !== void 0) {
                                                                    ref$4[__CONTEXT] = nodeValue;
                                                                    nodeValue[__REF + (destRefsLength$3 + i$6)] = ref$4;
                                                                    node[__REF + i$6] = void 0;
                                                                }
                                                            }
                                                            nodeValue[__REFS_LENGTH] = nodeRefsLength$3 + destRefsLength$3;
                                                            node[__REFS_LENGTH] = ref$4 = void 0;
                                                            if (node != null && typeof node === 'object') {
                                                                var root$5 = root, head$4 = root$5.__head, tail$4 = root$5.__tail, next$4, prev$4;
                                                                (next$4 = node.__next) && (next$4 != null && typeof next$4 === 'object') && (next$4.__prev = prev$4);
                                                                (prev$4 = node.__prev) && (prev$4 != null && typeof prev$4 === 'object') && (prev$4.__next = next$4);
                                                                node === head$4 && (root$5.__head = root$5.__next = head$4 = next$4);
                                                                node === tail$4 && (root$5.__tail = root$5.__prev = tail$4 = prev$4);
                                                                node.__next = node.__prev = void 0;
                                                                head$4 = tail$4 = next$4 = prev$4 = void 0;
                                                            }
                                                        }
                                                        nodeParent[key$2] = node = nodeValue;
                                                        node = !node[__SELF] && ((node[__SELF] = node) || true) && ((node[__KEY] = key$2) || true) && ((node[__PARENT] = nodeParent) || true) && ((node[__ROOT] = nodeRoot) || true) && (node[__GENERATION] || (node[__GENERATION] = 0) || node) && ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue) && (nodeValue[__CONTAINER] = node)) || node;
                                                    }
                                                    if (node != null && jsonParent != null) {
                                                        if (!nodeType && (node != null && typeof node === 'object') && !Array.isArray(nodeValue)) {
                                                            if (!(jsonNode = jsonParent[key$2]) || !(jsonNode != null && typeof jsonNode === 'object')) {
                                                                jsonNode = jsonParent[key$2] = Object.create(null);
                                                            }
                                                        } else {
                                                            if (boxed === true) {
                                                                jsonParent[key$2] = node;
                                                            } else {
                                                                var val$3 = nodeValue;
                                                                if (val$3 != null && typeof val$3 === 'object') {
                                                                    var src$3 = val$3, keys$3 = Object.keys(src$3), x$3, i$7 = -1, n$3 = keys$3.length;
                                                                    val$3 = Array.isArray(src$3) && new Array(src$3.length) || Object.create(null);
                                                                    while (++i$7 < n$3) {
                                                                        x$3 = keys$3[i$7];
                                                                        !(!(x$3[0] !== '_' || x$3[1] !== '_') || (x$3 === __SELF || x$3 === __PARENT || x$3 === __ROOT)) && (val$3[x$3] = src$3[x$3]);
                                                                    }
                                                                }
                                                                if (!nodeType && (val$3 != null && typeof val$3 === 'object') && !Array.isArray(val$3)) {
                                                                    val$3[$TYPE] = LEAF;
                                                                }
                                                                jsonParent[key$2] = val$3;
                                                            }
                                                        }
                                                    }
                                                    appendNullKey = node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue);
                                                    nodeParent = node;
                                                    break follow_path_5832;
                                                }
                                            } else if (refDepth < refHeight) {
                                                nodeParent = node;
                                                jsonParent = jsonNode;
                                                refDepth = refDepth + 1;
                                                continue follow_path_5832;
                                            }
                                            nodeParent = node;
                                            break follow_path_5832;
                                        } while (true);
                                    node = nodeParent;
                                } while ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue));
                                if (node == null) {
                                    while (refDepth <= refHeight) {
                                        optimizedPath[refDepth] = reference[refDepth++];
                                    }
                                }
                            }
                            if (node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue)) {
                                nodeParent = node;
                                break follow_path_5522;
                            }
                            nodeParent = nodes[depth] = node;
                            jsonParent = jsons[depth] = jsonNode;
                            depth = depth + 1;
                            continue follow_path_5522;
                        } else if (depth === height) {
                            optimizedPath[optimizedPath.length = depth + (refLength - refIndex)] = key;
                            node = nodeParent[key];
                            nodeType = node && node[$TYPE] || void 0;
                            nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                            nodeTimestamp = node && node[$TIMESTAMP];
                            nodeExpires = node && node[$EXPIRES];
                            if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                            }
                            nodeType = value && value[$TYPE] || void 0;
                            nodeValue = nodeType === SENTINEL ? value[VALUE] : nodeType === ERROR ? value = errorSelector(requestedPath, value) : value;
                            nodeTimestamp = value && value[$TIMESTAMP];
                            nodeExpires = value && value[$EXPIRES];
                            var newNode;
                            newNode = value;
                            if ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                                nodeType = 'array';
                                newNode[$SIZE] = nodeSize = (nodeType === SENTINEL && 50 || 0) + (nodeValue.length || 1);
                                delete nodeValue[$SIZE];
                                nodeValue[__CONTAINER] = newNode;
                            } else if (nodeType === SENTINEL) {
                                newNode[$SIZE] = nodeSize = 50 + (typeof nodeValue === 'string' && nodeValue.length || 1);
                            } else if (nodeType === ERROR) {
                                newNode[$SIZE] = nodeSize = 50 + (value[$SIZE] || 0 || 1);
                            } else if (!(value != null && typeof value === 'object')) {
                                nodeSize = 50 + (typeof nodeValue === 'string' && nodeValue.length || 1);
                                nodeType = 'sentinel';
                                newNode = { 'value': nodeValue };
                                newNode[$TYPE] = nodeType;
                                newNode[$SIZE] = nodeSize;
                            } else {
                                nodeType = newNode[$TYPE] = nodeType || 'leaf';
                                newNode[$SIZE] = nodeSize = value[$SIZE] || 0 || 50 + 1;
                            }
                            ;
                            if (node != null && node !== newNode) {
                                var nodeRefsLength$4 = node.__refsLength || 0, destRefsLength$4 = newNode.__refsLength || 0, i$8 = -1, ref$5;
                                while (++i$8 < nodeRefsLength$4) {
                                    if ((ref$5 = node[__REF + i$8]) !== void 0) {
                                        ref$5[__CONTEXT] = newNode;
                                        newNode[__REF + (destRefsLength$4 + i$8)] = ref$5;
                                        node[__REF + i$8] = void 0;
                                    }
                                }
                                newNode[__REFS_LENGTH] = nodeRefsLength$4 + destRefsLength$4;
                                node[__REFS_LENGTH] = ref$5 = void 0;
                                if (node != null && typeof node === 'object') {
                                    var root$6 = root, head$5 = root$6.__head, tail$5 = root$6.__tail, next$5, prev$5;
                                    (next$5 = node.__next) && (next$5 != null && typeof next$5 === 'object') && (next$5.__prev = prev$5);
                                    (prev$5 = node.__prev) && (prev$5 != null && typeof prev$5 === 'object') && (prev$5.__next = next$5);
                                    node === head$5 && (root$6.__head = root$6.__next = head$5 = next$5);
                                    node === tail$5 && (root$6.__tail = root$6.__prev = tail$5 = prev$5);
                                    node.__next = node.__prev = void 0;
                                    head$5 = tail$5 = next$5 = prev$5 = void 0;
                                }
                            }
                            nodeParent[key] = node = newNode;
                            node = !node[__SELF] && ((node[__SELF] = node) || true) && ((node[__KEY] = key) || true) && ((node[__PARENT] = nodeParent) || true) && ((node[__ROOT] = nodeRoot) || true) && (node[__GENERATION] || (node[__GENERATION] = 0) || node) && ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue) && (nodeValue[__CONTAINER] = node)) || node;
                            if (node != null && typeof node === 'object') {
                                if (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true) {
                                    node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                } else {
                                    if (nodeExpires !== 1) {
                                        var root$7 = root, head$6 = root$7.__head, tail$6 = root$7.__tail, next$6 = node.__next, prev$6 = node.__prev;
                                        if (node !== head$6) {
                                            next$6 && (next$6 != null && typeof next$6 === 'object') && (next$6.__prev = prev$6);
                                            prev$6 && (prev$6 != null && typeof prev$6 === 'object') && (prev$6.__next = next$6);
                                            (next$6 = head$6) && (head$6 != null && typeof head$6 === 'object') && (head$6.__prev = node);
                                            root$7.__head = root$7.__next = head$6 = node;
                                            head$6.__next = next$6;
                                            head$6.__prev = void 0;
                                        }
                                        if (tail$6 == null || node === tail$6) {
                                            root$7.__tail = root$7.__prev = tail$6 = prev$6 || node;
                                        }
                                        root$7 = head$6 = tail$6 = next$6 = prev$6 = void 0;
                                    }
                                }
                            }
                            if (node != null && jsonParent != null) {
                                if (boxed === true) {
                                    jsonParent[key] = node;
                                } else {
                                    var val$4 = nodeValue;
                                    if (val$4 != null && typeof val$4 === 'object') {
                                        var src$4 = val$4, keys$4 = Object.keys(src$4), x$4, i$9 = -1, n$4 = keys$4.length;
                                        val$4 = Array.isArray(src$4) && new Array(src$4.length) || Object.create(null);
                                        while (++i$9 < n$4) {
                                            x$4 = keys$4[i$9];
                                            !(!(x$4[0] !== '_' || x$4[1] !== '_') || (x$4 === __SELF || x$4 === __PARENT || x$4 === __ROOT)) && (val$4[x$4] = src$4[x$4]);
                                        }
                                    }
                                    if (!nodeType && (val$4 != null && typeof val$4 === 'object') && !Array.isArray(val$4)) {
                                        val$4[$TYPE] = LEAF;
                                    }
                                    jsonParent[key] = val$4;
                                }
                            }
                            appendNullKey = false;
                            nodeParent = node;
                            break follow_path_5522;
                        }
                    } else if (depth < height) {
                        nodeParent = nodeParent;
                        jsonParent = jsonParent;
                        depth = depth + 1;
                        continue follow_path_5522;
                    }
                    nodeParent = node;
                    break follow_path_5522;
                } while (true);
            node = nodeParent;
            if (node != null || boxed === true) {
                if (nodeType === ERROR) {
                    if (nodeExpires !== 1) {
                        var root$8 = root, head$7 = root$8.__head, tail$7 = root$8.__tail, next$7 = node.__next, prev$7 = node.__prev;
                        if (node !== head$7) {
                            next$7 && (next$7 != null && typeof next$7 === 'object') && (next$7.__prev = prev$7);
                            prev$7 && (prev$7 != null && typeof prev$7 === 'object') && (prev$7.__next = next$7);
                            (next$7 = head$7) && (head$7 != null && typeof head$7 === 'object') && (head$7.__prev = node);
                            root$8.__head = root$8.__next = head$7 = node;
                            head$7.__next = next$7;
                            head$7.__prev = void 0;
                        }
                        if (tail$7 == null || node === tail$7) {
                            root$8.__tail = root$8.__prev = tail$7 = prev$7 || node;
                        }
                        root$8 = head$7 = tail$7 = next$7 = prev$7 = void 0;
                    }
                    node = onErrorAsJSONG(errors, boxed, requestedPath, index, node, nodeValue);
                }
                hasValue || (hasValue = jsonParent != null);
                var src$5 = optimizedPath, i$10 = -1, n$5 = src$5.length, opt = new Array(n$5);
                while (++i$10 < n$5) {
                    opt[i$10] = src$5[i$10];
                }
                var src$6 = requestedPath, i$11 = -1, n$6 = src$6.length, req = new Array(n$6);
                while (++i$11 < n$6) {
                    req[i$11] = src$6[i$11];
                }
                if (appendNullKey === true) {
                    req[req.length] = null;
                }
                requestedPaths[requestedPaths.length] = req;
                optimizedPaths[optimizedPaths.length] = opt;
            }
            if (boxed === false && node == null || refreshing === true) {
                var src$7 = boundPath, i$12 = -1, n$7 = src$7.length, req$2 = new Array(n$7);
                while (++i$12 < n$7) {
                    req$2[i$12] = src$7[i$12];
                }
                var src$8 = optimizedPath, i$13 = -1, n$8 = src$8.length, opt$2 = new Array(n$8);
                while (++i$13 < n$8) {
                    opt$2[i$13] = src$8[i$13];
                }
                var reqLen = req$2.length - 1, optLen = opt$2.length - 1, i$14 = -1, n$9 = requestedPath.length, j$2 = depth, k = height, x$5;
                while (++i$14 < n$9) {
                    req$2[++reqLen] = path[i$14 + boundLength] != null && typeof path[i$14 + boundLength] === 'object' && [requestedPath[i$14]] || requestedPath[i$14];
                }
                i$14 = -1;
                n$9 = height - depth;
                while (++i$14 < n$9) {
                    x$5 = req$2[++reqLen] = path[++j$2 + boundLength];
                    x$5 != null && (opt$2[++optLen] = x$5);
                }
                req$2.pathSetIndex = index;
                requestedMissingPaths[requestedMissingPaths.length] = req$2;
                optimizedMissingPaths[optimizedMissingPaths.length] = opt$2;
            }
            appendNullKey = false;
            var key$3;
            depth = depth;
            unroll_5613:
                do {
                    if (depth < 0) {
                        depth = (path.depth = 0) - 1;
                        break unroll_5613;
                    }
                    if (!((key$3 = path[depth]) != null && typeof key$3 === 'object')) {
                        depth = path.depth = depth - 1;
                        continue unroll_5613;
                    }
                    if (Array.isArray(key$3)) {
                        if (++key$3.index === key$3.length) {
                            if (!((key$3 = key$3[key$3.index = 0]) != null && typeof key$3 === 'object')) {
                                depth = path.depth = depth - 1;
                                continue unroll_5613;
                            }
                        } else {
                            depth = path.depth = depth;
                            break unroll_5613;
                        }
                    }
                    if (++key$3[__OFFSET] > (key$3.to || (key$3.to = key$3.from + (key$3.length || 1) - 1))) {
                        key$3[__OFFSET] = key$3.from;
                        depth = path.depth = depth - 1;
                        continue unroll_5613;
                    }
                    depth = path.depth = depth;
                    break unroll_5613;
                } while (true);
            depth = depth;
        }
    }
    values && (values[0] = hasValue && {
        paths: requestedPaths,
        jsong: jsons[-1]
    } || undefined);
    return {
        'values': values,
        'errors': errors,
        'requestedPaths': requestedPaths,
        'optimizedPaths': optimizedPaths,
        'requestedMissingPaths': requestedMissingPaths,
        'optimizedMissingPaths': optimizedMissingPaths
    };
}
function setPathsAsPathMap(model, pathValues, values, errorSelector, boundPath) {
    var boundLength = 0, nodeRoot = model._cache || {}, nodeParent, node;
    if (Array.isArray(boundPath)) {
        nodeParent = nodeRoot;
        boundLength = boundPath.length;
    } else {
        nodeParent = getBoundValue(model);
        boundPath = model._path || [];
    }
    var value, root = model._root || model, boxed = model._boxed || false, expired = root.expired || (root.expired = []), refreshing = model._refreshing || false, appendNullKey = false;
    typeof errorSelector === 'function' || (errorSelector = model._errorSelector) || (errorSelector = function (x$5, y) {
        return y;
    });
    var nodes = pathValues.nodes || (pathValues.nodes = []);
    var jsons = pathValues.jsons || (pathValues.jsons = []);
    var errors = pathValues.errors || (pathValues.errors = []);
    var refs = pathValues.refs || (pathValues.refs = []);
    var depth = pathValues.depth || (pathValues.depth = 0);
    var refIndex = pathValues.refIndex || (pathValues.refIndex = 0);
    var refDepth = pathValues.refDepth || (pathValues.refDepth = 0);
    var requestedPath = pathValues.requestedPath || (pathValues.requestedPath = []);
    var optimizedPath = pathValues.optimizedPath || (pathValues.optimizedPath = []);
    var requestedPaths = pathValues.requestedPaths || (pathValues.requestedPaths = []);
    var optimizedPaths = pathValues.optimizedPaths || (pathValues.optimizedPaths = []);
    var requestedMissingPaths = pathValues.requestedMissingPaths || (pathValues.requestedMissingPaths = []);
    var optimizedMissingPaths = pathValues.optimizedMissingPaths || (pathValues.optimizedMissingPaths = []);
    var hasValue = pathValues.hasValue || (pathValues.hasValue = false);
    var jsonRoot = pathValues.jsonRoot || (pathValues.jsonRoot = values && values[0]);
    var jsonParent = pathValues.jsonParent || (pathValues.jsonParent = jsonRoot);
    var jsonNode = pathValues.jsonNode || (pathValues.jsonNode = jsonParent);
    var path, length = 0, height = 0, reference, refLength = 0, refHeight = 0, nodeType, nodeValue, nodeSize, nodeTimestamp, nodeExpires;
    refs[-1] = boundPath;
    nodes[-1] = nodeParent;
    jsons[-1] = jsonParent;
    jsons[-2] = jsons;
    var index = -1, count = pathValues.length;
    while (++index < count) {
        path = pathValues[index];
        value = path.value;
        path = path.path;
        depth = 0;
        length = path.length;
        height = length - 1;
        var ref;
        refs.length = 0;
        while (depth > -1) {
            refIndex = depth;
            while (--refIndex >= -1) {
                if (!!(ref = refs[refIndex])) {
                    refLength = ref.length;
                    var i = -1, j = 0;
                    while (++i < refLength) {
                        optimizedPath[j++] = ref[i];
                    }
                    i = ++refIndex;
                    while (i < depth) {
                        optimizedPath[j++] = requestedPath[i++];
                    }
                    optimizedPath.length = j;
                    break;
                }
            }
            var key, isKeySet;
            path = path;
            height = (length = path.length) - 1;
            nodeParent = node = nodes[depth - 1];
            jsonParent = jsonNode = jsons[depth - 1];
            depth = depth;
            follow_path_8139:
                do {
                    key = path[depth];
                    if (isKeySet = key != null && typeof key === 'object') {
                        if (Array.isArray(key)) {
                            if ((key = key[key.index || (key.index = 0)]) != null && typeof key === 'object') {
                                key = key[__OFFSET] === void 0 && (key[__OFFSET] = key.from || (key.from = 0)) || key[__OFFSET];
                            }
                        } else {
                            key = key[__OFFSET] === void 0 && (key[__OFFSET] = key.from || (key.from = 0)) || key[__OFFSET];
                        }
                    }
                    if (key === __NULL) {
                        key = null;
                    }
                    depth >= boundLength && (requestedPath[requestedPath.length = depth] = key);
                    if (key != null) {
                        if (depth < height) {
                            optimizedPath[optimizedPath.length = depth + (refLength - refIndex)] = key;
                            node = nodeParent[key];
                            nodeType = node && node[$TYPE] || void 0;
                            nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                            nodeTimestamp = node && node[$TIMESTAMP];
                            nodeExpires = node && node[$EXPIRES];
                            if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                            }
                            if (typeof node !== 'object' || !!nodeType && nodeType !== SENTINEL && !Array.isArray(nodeValue)) {
                                nodeType = void 0;
                                nodeValue = Object.create(null);
                                if (node != null && node !== nodeValue) {
                                    var nodeRefsLength = node.__refsLength || 0, destRefsLength = nodeValue.__refsLength || 0, i$2 = -1, ref$2;
                                    while (++i$2 < nodeRefsLength) {
                                        if ((ref$2 = node[__REF + i$2]) !== void 0) {
                                            ref$2[__CONTEXT] = nodeValue;
                                            nodeValue[__REF + (destRefsLength + i$2)] = ref$2;
                                            node[__REF + i$2] = void 0;
                                        }
                                    }
                                    nodeValue[__REFS_LENGTH] = nodeRefsLength + destRefsLength;
                                    node[__REFS_LENGTH] = ref$2 = void 0;
                                    if (node != null && typeof node === 'object') {
                                        var root$2 = root, head = root$2.__head, tail = root$2.__tail, next, prev;
                                        (next = node.__next) && (next != null && typeof next === 'object') && (next.__prev = prev);
                                        (prev = node.__prev) && (prev != null && typeof prev === 'object') && (prev.__next = next);
                                        node === head && (root$2.__head = root$2.__next = head = next);
                                        node === tail && (root$2.__tail = root$2.__prev = tail = prev);
                                        node.__next = node.__prev = void 0;
                                        head = tail = next = prev = void 0;
                                    }
                                }
                                nodeParent[key] = node = nodeValue;
                                node = !node[__SELF] && ((node[__SELF] = node) || true) && ((node[__KEY] = key) || true) && ((node[__PARENT] = nodeParent) || true) && ((node[__ROOT] = nodeRoot) || true) && (node[__GENERATION] || (node[__GENERATION] = 0) || node) && ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue) && (nodeValue[__CONTAINER] = node)) || node;
                            }
                            if ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                                do {
                                    if (nodeExpires !== 1) {
                                        var root$3 = root, head$2 = root$3.__head, tail$2 = root$3.__tail, next$2 = node.__next, prev$2 = node.__prev;
                                        if (node !== head$2) {
                                            next$2 && (next$2 != null && typeof next$2 === 'object') && (next$2.__prev = prev$2);
                                            prev$2 && (prev$2 != null && typeof prev$2 === 'object') && (prev$2.__next = next$2);
                                            (next$2 = head$2) && (head$2 != null && typeof head$2 === 'object') && (head$2.__prev = node);
                                            root$3.__head = root$3.__next = head$2 = node;
                                            head$2.__next = next$2;
                                            head$2.__prev = void 0;
                                        }
                                        if (tail$2 == null || node === tail$2) {
                                            root$3.__tail = root$3.__prev = tail$2 = prev$2 || node;
                                        }
                                        root$3 = head$2 = tail$2 = next$2 = prev$2 = void 0;
                                    }
                                    refs[depth] = nodeValue;
                                    refIndex = depth + 1;
                                    refDepth = 0;
                                    var key$2, isKeySet$2;
                                    reference = nodeValue;
                                    refHeight = (refLength = reference.length) - 1;
                                    nodeParent = nodeRoot;
                                    jsonParent = jsonRoot;
                                    refDepth = refDepth;
                                    follow_path_8417:
                                        do {
                                            key$2 = reference[refDepth];
                                            isKeySet$2 = false;
                                            if (key$2 != null) {
                                                if (refDepth < refHeight) {
                                                    optimizedPath[optimizedPath.length = refDepth] = key$2;
                                                    node = nodeParent[key$2];
                                                    nodeType = node && node[$TYPE] || void 0;
                                                    nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                                    nodeTimestamp = node && node[$TIMESTAMP];
                                                    nodeExpires = node && node[$EXPIRES];
                                                    if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                                        node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                                    }
                                                    if (typeof node !== 'object' || !!nodeType && nodeType !== SENTINEL && !Array.isArray(nodeValue)) {
                                                        nodeType = void 0;
                                                        nodeValue = Object.create(null);
                                                        if (node != null && node !== nodeValue) {
                                                            var nodeRefsLength$2 = node.__refsLength || 0, destRefsLength$2 = nodeValue.__refsLength || 0, i$3 = -1, ref$3;
                                                            while (++i$3 < nodeRefsLength$2) {
                                                                if ((ref$3 = node[__REF + i$3]) !== void 0) {
                                                                    ref$3[__CONTEXT] = nodeValue;
                                                                    nodeValue[__REF + (destRefsLength$2 + i$3)] = ref$3;
                                                                    node[__REF + i$3] = void 0;
                                                                }
                                                            }
                                                            nodeValue[__REFS_LENGTH] = nodeRefsLength$2 + destRefsLength$2;
                                                            node[__REFS_LENGTH] = ref$3 = void 0;
                                                            if (node != null && typeof node === 'object') {
                                                                var root$4 = root, head$3 = root$4.__head, tail$3 = root$4.__tail, next$3, prev$3;
                                                                (next$3 = node.__next) && (next$3 != null && typeof next$3 === 'object') && (next$3.__prev = prev$3);
                                                                (prev$3 = node.__prev) && (prev$3 != null && typeof prev$3 === 'object') && (prev$3.__next = next$3);
                                                                node === head$3 && (root$4.__head = root$4.__next = head$3 = next$3);
                                                                node === tail$3 && (root$4.__tail = root$4.__prev = tail$3 = prev$3);
                                                                node.__next = node.__prev = void 0;
                                                                head$3 = tail$3 = next$3 = prev$3 = void 0;
                                                            }
                                                        }
                                                        nodeParent[key$2] = node = nodeValue;
                                                        node = !node[__SELF] && ((node[__SELF] = node) || true) && ((node[__KEY] = key$2) || true) && ((node[__PARENT] = nodeParent) || true) && ((node[__ROOT] = nodeRoot) || true) && (node[__GENERATION] || (node[__GENERATION] = 0) || node) && ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue) && (nodeValue[__CONTAINER] = node)) || node;
                                                    }
                                                    if (appendNullKey = node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue)) {
                                                        nodeParent = node;
                                                        break follow_path_8417;
                                                    }
                                                    nodeParent = node;
                                                    jsonParent = jsonNode;
                                                    refDepth = refDepth + 1;
                                                    continue follow_path_8417;
                                                } else if (refDepth === refHeight) {
                                                    optimizedPath[optimizedPath.length = refDepth] = key$2;
                                                    node = nodeParent[key$2];
                                                    nodeType = node && node[$TYPE] || void 0;
                                                    nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                                    nodeTimestamp = node && node[$TIMESTAMP];
                                                    nodeExpires = node && node[$EXPIRES];
                                                    if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                                        node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                                    }
                                                    if (typeof node !== 'object' || !!nodeType && nodeType !== SENTINEL && !Array.isArray(nodeValue)) {
                                                        nodeType = void 0;
                                                        nodeValue = Object.create(null);
                                                        if (node != null && node !== nodeValue) {
                                                            var nodeRefsLength$3 = node.__refsLength || 0, destRefsLength$3 = nodeValue.__refsLength || 0, i$4 = -1, ref$4;
                                                            while (++i$4 < nodeRefsLength$3) {
                                                                if ((ref$4 = node[__REF + i$4]) !== void 0) {
                                                                    ref$4[__CONTEXT] = nodeValue;
                                                                    nodeValue[__REF + (destRefsLength$3 + i$4)] = ref$4;
                                                                    node[__REF + i$4] = void 0;
                                                                }
                                                            }
                                                            nodeValue[__REFS_LENGTH] = nodeRefsLength$3 + destRefsLength$3;
                                                            node[__REFS_LENGTH] = ref$4 = void 0;
                                                            if (node != null && typeof node === 'object') {
                                                                var root$5 = root, head$4 = root$5.__head, tail$4 = root$5.__tail, next$4, prev$4;
                                                                (next$4 = node.__next) && (next$4 != null && typeof next$4 === 'object') && (next$4.__prev = prev$4);
                                                                (prev$4 = node.__prev) && (prev$4 != null && typeof prev$4 === 'object') && (prev$4.__next = next$4);
                                                                node === head$4 && (root$5.__head = root$5.__next = head$4 = next$4);
                                                                node === tail$4 && (root$5.__tail = root$5.__prev = tail$4 = prev$4);
                                                                node.__next = node.__prev = void 0;
                                                                head$4 = tail$4 = next$4 = prev$4 = void 0;
                                                            }
                                                        }
                                                        nodeParent[key$2] = node = nodeValue;
                                                        node = !node[__SELF] && ((node[__SELF] = node) || true) && ((node[__KEY] = key$2) || true) && ((node[__PARENT] = nodeParent) || true) && ((node[__ROOT] = nodeRoot) || true) && (node[__GENERATION] || (node[__GENERATION] = 0) || node) && ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue) && (nodeValue[__CONTAINER] = node)) || node;
                                                    }
                                                    appendNullKey = node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue);
                                                    nodeParent = node;
                                                    break follow_path_8417;
                                                }
                                            } else if (refDepth < refHeight) {
                                                nodeParent = node;
                                                jsonParent = jsonNode;
                                                refDepth = refDepth + 1;
                                                continue follow_path_8417;
                                            }
                                            nodeParent = node;
                                            break follow_path_8417;
                                        } while (true);
                                    node = nodeParent;
                                } while ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue));
                                if (node == null) {
                                    while (refDepth <= refHeight) {
                                        optimizedPath[refDepth] = reference[refDepth++];
                                    }
                                }
                            }
                            if (depth >= boundLength) {
                                if (node != null && jsonParent != null) {
                                    if (!nodeType && (node != null && typeof node === 'object') && !Array.isArray(nodeValue)) {
                                        if (!(jsonNode = jsonParent[key]) || !(jsonNode != null && typeof jsonNode === 'object')) {
                                            jsonNode = jsonParent[key] = Object.create(null);
                                        }
                                        jsonNode[__KEY] = key;
                                        jsonNode[__GENERATION] = node[__GENERATION] || 0;
                                    } else {
                                        if (boxed === true) {
                                            jsonParent[key] = node;
                                        } else {
                                            var val = nodeValue;
                                            if (val != null && typeof val === 'object') {
                                                var src = val, keys = Object.keys(src), x, i$5 = -1, n = keys.length;
                                                val = Array.isArray(src) && new Array(src.length) || Object.create(null);
                                                while (++i$5 < n) {
                                                    x = keys[i$5];
                                                    !(!(x[0] !== '_' || x[1] !== '_') || (x === __SELF || x === __PARENT || x === __ROOT) || x[0] === '$') && (val[x] = src[x]);
                                                }
                                            }
                                            if (val != null && typeof val === 'object' && !Array.isArray(val)) {
                                                val[$TYPE] = LEAF;
                                            }
                                            jsonParent[key] = val;
                                        }
                                    }
                                }
                            }
                            if (node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue)) {
                                nodeParent = node;
                                break follow_path_8139;
                            }
                            nodeParent = nodes[depth] = node;
                            jsonParent = jsons[depth] = jsonNode;
                            depth = depth + 1;
                            continue follow_path_8139;
                        } else if (depth === height) {
                            optimizedPath[optimizedPath.length = depth + (refLength - refIndex)] = key;
                            node = nodeParent[key];
                            nodeType = node && node[$TYPE] || void 0;
                            nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                            nodeTimestamp = node && node[$TIMESTAMP];
                            nodeExpires = node && node[$EXPIRES];
                            if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                            }
                            nodeType = value && value[$TYPE] || void 0;
                            nodeValue = nodeType === SENTINEL ? value[VALUE] : nodeType === ERROR ? value = errorSelector(requestedPath, value) : value;
                            nodeTimestamp = value && value[$TIMESTAMP];
                            nodeExpires = value && value[$EXPIRES];
                            var newNode;
                            newNode = value;
                            if ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                                nodeType = 'array';
                                newNode[$SIZE] = nodeSize = (nodeType === SENTINEL && 50 || 0) + (nodeValue.length || 1);
                                delete nodeValue[$SIZE];
                                nodeValue[__CONTAINER] = newNode;
                            } else if (nodeType === SENTINEL) {
                                newNode[$SIZE] = nodeSize = 50 + (typeof nodeValue === 'string' && nodeValue.length || 1);
                            } else if (nodeType === ERROR) {
                                newNode[$SIZE] = nodeSize = 50 + (value[$SIZE] || 0 || 1);
                            } else if (!(value != null && typeof value === 'object')) {
                                nodeSize = 50 + (typeof nodeValue === 'string' && nodeValue.length || 1);
                                nodeType = 'sentinel';
                                newNode = { 'value': nodeValue };
                                newNode[$TYPE] = nodeType;
                                newNode[$SIZE] = nodeSize;
                            } else {
                                nodeType = newNode[$TYPE] = nodeType || 'leaf';
                                newNode[$SIZE] = nodeSize = value[$SIZE] || 0 || 50 + 1;
                            }
                            ;
                            if (node != null && node !== newNode) {
                                var nodeRefsLength$4 = node.__refsLength || 0, destRefsLength$4 = newNode.__refsLength || 0, i$6 = -1, ref$5;
                                while (++i$6 < nodeRefsLength$4) {
                                    if ((ref$5 = node[__REF + i$6]) !== void 0) {
                                        ref$5[__CONTEXT] = newNode;
                                        newNode[__REF + (destRefsLength$4 + i$6)] = ref$5;
                                        node[__REF + i$6] = void 0;
                                    }
                                }
                                newNode[__REFS_LENGTH] = nodeRefsLength$4 + destRefsLength$4;
                                node[__REFS_LENGTH] = ref$5 = void 0;
                                if (node != null && typeof node === 'object') {
                                    var root$6 = root, head$5 = root$6.__head, tail$5 = root$6.__tail, next$5, prev$5;
                                    (next$5 = node.__next) && (next$5 != null && typeof next$5 === 'object') && (next$5.__prev = prev$5);
                                    (prev$5 = node.__prev) && (prev$5 != null && typeof prev$5 === 'object') && (prev$5.__next = next$5);
                                    node === head$5 && (root$6.__head = root$6.__next = head$5 = next$5);
                                    node === tail$5 && (root$6.__tail = root$6.__prev = tail$5 = prev$5);
                                    node.__next = node.__prev = void 0;
                                    head$5 = tail$5 = next$5 = prev$5 = void 0;
                                }
                            }
                            nodeParent[key] = node = newNode;
                            node = !node[__SELF] && ((node[__SELF] = node) || true) && ((node[__KEY] = key) || true) && ((node[__PARENT] = nodeParent) || true) && ((node[__ROOT] = nodeRoot) || true) && (node[__GENERATION] || (node[__GENERATION] = 0) || node) && ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue) && (nodeValue[__CONTAINER] = node)) || node;
                            if (node != null && typeof node === 'object') {
                                if (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true) {
                                    node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                } else {
                                    if (nodeExpires !== 1) {
                                        var root$7 = root, head$6 = root$7.__head, tail$6 = root$7.__tail, next$6 = node.__next, prev$6 = node.__prev;
                                        if (node !== head$6) {
                                            next$6 && (next$6 != null && typeof next$6 === 'object') && (next$6.__prev = prev$6);
                                            prev$6 && (prev$6 != null && typeof prev$6 === 'object') && (prev$6.__next = next$6);
                                            (next$6 = head$6) && (head$6 != null && typeof head$6 === 'object') && (head$6.__prev = node);
                                            root$7.__head = root$7.__next = head$6 = node;
                                            head$6.__next = next$6;
                                            head$6.__prev = void 0;
                                        }
                                        if (tail$6 == null || node === tail$6) {
                                            root$7.__tail = root$7.__prev = tail$6 = prev$6 || node;
                                        }
                                        root$7 = head$6 = tail$6 = next$6 = prev$6 = void 0;
                                    }
                                }
                            }
                            if (depth >= boundLength) {
                                if (node != null && jsonParent != null) {
                                    if (boxed === true) {
                                        jsonParent[key] = node;
                                    } else {
                                        var val$2 = nodeValue;
                                        if (val$2 != null && typeof val$2 === 'object') {
                                            var src$2 = val$2, keys$2 = Object.keys(src$2), x$2, i$7 = -1, n$2 = keys$2.length;
                                            val$2 = Array.isArray(src$2) && new Array(src$2.length) || Object.create(null);
                                            while (++i$7 < n$2) {
                                                x$2 = keys$2[i$7];
                                                !(!(x$2[0] !== '_' || x$2[1] !== '_') || (x$2 === __SELF || x$2 === __PARENT || x$2 === __ROOT) || x$2[0] === '$') && (val$2[x$2] = src$2[x$2]);
                                            }
                                        }
                                        if (val$2 != null && typeof val$2 === 'object' && !Array.isArray(val$2)) {
                                            val$2[$TYPE] = LEAF;
                                        }
                                        jsonParent[key] = val$2;
                                    }
                                }
                            }
                            appendNullKey = false;
                            nodeParent = node;
                            break follow_path_8139;
                        }
                    } else if (depth < height) {
                        nodeParent = nodeParent;
                        jsonParent = jsonParent;
                        depth = depth + 1;
                        continue follow_path_8139;
                    }
                    nodeParent = node;
                    break follow_path_8139;
                } while (true);
            node = nodeParent;
            if (node != null || boxed === true) {
                if (nodeType === ERROR) {
                    if (nodeExpires !== 1) {
                        var root$8 = root, head$7 = root$8.__head, tail$7 = root$8.__tail, next$7 = node.__next, prev$7 = node.__prev;
                        if (node !== head$7) {
                            next$7 && (next$7 != null && typeof next$7 === 'object') && (next$7.__prev = prev$7);
                            prev$7 && (prev$7 != null && typeof prev$7 === 'object') && (prev$7.__next = next$7);
                            (next$7 = head$7) && (head$7 != null && typeof head$7 === 'object') && (head$7.__prev = node);
                            root$8.__head = root$8.__next = head$7 = node;
                            head$7.__next = next$7;
                            head$7.__prev = void 0;
                        }
                        if (tail$7 == null || node === tail$7) {
                            root$8.__tail = root$8.__prev = tail$7 = prev$7 || node;
                        }
                        root$8 = head$7 = tail$7 = next$7 = prev$7 = void 0;
                    }
                    var pbv = Object.create(null);
                    var src$3 = requestedPath, i$8 = -1, n$3 = src$3.length, req = new Array(n$3);
                    while (++i$8 < n$3) {
                        req[i$8] = src$3[i$8];
                    }
                    if (appendNullKey === true) {
                        req[req.length] = null;
                    }
                    pbv.path = req;
                    if (boxed === true) {
                        pbv.value = node;
                    } else {
                        var dest = nodeValue, src$4 = dest, x$3;
                        if (dest != null && typeof dest === 'object') {
                            dest = Array.isArray(src$4) && [] || Object.create(null);
                            for (x$3 in src$4) {
                                !(!(x$3[0] !== '_' || x$3[1] !== '_') || (x$3 === __SELF || x$3 === __PARENT || x$3 === __ROOT) || x$3[0] === '$') && (dest[x$3] = src$4[x$3]);
                            }
                        }
                        pbv.value = dest;
                    }
                    errors[errors.length] = pbv;
                }
                hasValue || (hasValue = jsonParent != null);
                var src$5 = optimizedPath, i$9 = -1, n$4 = src$5.length, opt = new Array(n$4);
                while (++i$9 < n$4) {
                    opt[i$9] = src$5[i$9];
                }
                var src$6 = requestedPath, i$10 = -1, n$5 = src$6.length, req$2 = new Array(n$5);
                while (++i$10 < n$5) {
                    req$2[i$10] = src$6[i$10];
                }
                if (appendNullKey === true) {
                    req$2[req$2.length] = null;
                }
                requestedPaths[requestedPaths.length] = req$2;
                optimizedPaths[optimizedPaths.length] = opt;
            }
            if (boxed === false && node == null || refreshing === true) {
                var src$7 = boundPath, i$11 = -1, n$6 = src$7.length, req$3 = new Array(n$6);
                while (++i$11 < n$6) {
                    req$3[i$11] = src$7[i$11];
                }
                var src$8 = optimizedPath, i$12 = -1, n$7 = src$8.length, opt$2 = new Array(n$7);
                while (++i$12 < n$7) {
                    opt$2[i$12] = src$8[i$12];
                }
                var reqLen = req$3.length - 1, optLen = opt$2.length - 1, i$13 = -1, n$8 = requestedPath.length, j$2 = depth, k = height, x$4;
                while (++i$13 < n$8) {
                    req$3[++reqLen] = path[i$13 + boundLength] != null && typeof path[i$13 + boundLength] === 'object' && [requestedPath[i$13]] || requestedPath[i$13];
                }
                i$13 = -1;
                n$8 = height - depth;
                while (++i$13 < n$8) {
                    x$4 = req$3[++reqLen] = path[++j$2 + boundLength];
                    x$4 != null && (opt$2[++optLen] = x$4);
                }
                req$3.pathSetIndex = index;
                requestedMissingPaths[requestedMissingPaths.length] = req$3;
                optimizedMissingPaths[optimizedMissingPaths.length] = opt$2;
            }
            appendNullKey = false;
            var key$3;
            depth = depth;
            unroll_8230:
                do {
                    if (depth < 0) {
                        depth = (path.depth = 0) - 1;
                        break unroll_8230;
                    }
                    if (!((key$3 = path[depth]) != null && typeof key$3 === 'object')) {
                        depth = path.depth = depth - 1;
                        continue unroll_8230;
                    }
                    if (Array.isArray(key$3)) {
                        if (++key$3.index === key$3.length) {
                            if (!((key$3 = key$3[key$3.index = 0]) != null && typeof key$3 === 'object')) {
                                depth = path.depth = depth - 1;
                                continue unroll_8230;
                            }
                        } else {
                            depth = path.depth = depth;
                            break unroll_8230;
                        }
                    }
                    if (++key$3[__OFFSET] > (key$3.to || (key$3.to = key$3.from + (key$3.length || 1) - 1))) {
                        key$3[__OFFSET] = key$3.from;
                        depth = path.depth = depth - 1;
                        continue unroll_8230;
                    }
                    depth = path.depth = depth;
                    break unroll_8230;
                } while (true);
            depth = depth;
        }
    }
    values && (values[0] = hasValue && { json: jsons[-1] } || undefined);
    return {
        'values': values,
        'errors': errors,
        'requestedPaths': requestedPaths,
        'optimizedPaths': optimizedPaths,
        'requestedMissingPaths': requestedMissingPaths,
        'optimizedMissingPaths': optimizedMissingPaths
    };
}
function setPathsAsValues(model, pathValues, values, errorSelector, boundPath) {
    Array.isArray(values) && (values.length = 0);
    var boundLength = 0, nodeRoot = model._cache || {}, nodeParent, node;
    if (Array.isArray(boundPath)) {
        nodeParent = nodeRoot;
        boundLength = boundPath.length;
    } else {
        nodeParent = getBoundValue(model);
        boundPath = model._path || [];
    }
    var value, root = model._root || model, boxed = model._boxed || false, expired = root.expired || (root.expired = []), refreshing = model._refreshing || false, appendNullKey = false;
    typeof errorSelector === 'function' || (errorSelector = model._errorSelector) || (errorSelector = function (x$4, y) {
        return y;
    });
    var nodes = pathValues.nodes || (pathValues.nodes = []);
    var errors = pathValues.errors || (pathValues.errors = []);
    var refs = pathValues.refs || (pathValues.refs = []);
    var depth = pathValues.depth || (pathValues.depth = 0);
    var refIndex = pathValues.refIndex || (pathValues.refIndex = 0);
    var refDepth = pathValues.refDepth || (pathValues.refDepth = 0);
    var requestedPath = pathValues.requestedPath || (pathValues.requestedPath = []);
    var optimizedPath = pathValues.optimizedPath || (pathValues.optimizedPath = []);
    var requestedPaths = pathValues.requestedPaths || (pathValues.requestedPaths = []);
    var optimizedPaths = pathValues.optimizedPaths || (pathValues.optimizedPaths = []);
    var requestedMissingPaths = pathValues.requestedMissingPaths || (pathValues.requestedMissingPaths = []);
    var optimizedMissingPaths = pathValues.optimizedMissingPaths || (pathValues.optimizedMissingPaths = []);
    var path, length = 0, height = 0, reference, refLength = 0, refHeight = 0, nodeType, nodeValue, nodeSize, nodeTimestamp, nodeExpires;
    refs[-1] = boundPath;
    nodes[-1] = nodeParent;
    var index = -1, count = pathValues.length;
    while (++index < count) {
        path = pathValues[index];
        value = path.value;
        path = path.path;
        depth = 0;
        length = path.length;
        height = length - 1;
        var ref;
        refs.length = 0;
        while (depth > -1) {
            refIndex = depth;
            while (--refIndex >= -1) {
                if (!!(ref = refs[refIndex])) {
                    refLength = ref.length;
                    var i = -1, j = 0;
                    while (++i < refLength) {
                        optimizedPath[j++] = ref[i];
                    }
                    i = ++refIndex;
                    while (i < depth) {
                        optimizedPath[j++] = requestedPath[i++];
                    }
                    optimizedPath.length = j;
                    break;
                }
            }
            var key, isKeySet;
            path = path;
            height = (length = path.length) - 1;
            nodeParent = node = nodes[depth - 1];
            depth = depth;
            follow_path_11537:
                do {
                    key = path[depth];
                    if (isKeySet = key != null && typeof key === 'object') {
                        if (Array.isArray(key)) {
                            if ((key = key[key.index || (key.index = 0)]) != null && typeof key === 'object') {
                                key = key[__OFFSET] === void 0 && (key[__OFFSET] = key.from || (key.from = 0)) || key[__OFFSET];
                            }
                        } else {
                            key = key[__OFFSET] === void 0 && (key[__OFFSET] = key.from || (key.from = 0)) || key[__OFFSET];
                        }
                    }
                    if (key === __NULL) {
                        key = null;
                    }
                    depth >= boundLength && (requestedPath[requestedPath.length = depth] = key);
                    if (key != null) {
                        if (depth < height) {
                            optimizedPath[optimizedPath.length = depth + (refLength - refIndex)] = key;
                            node = nodeParent[key];
                            nodeType = node && node[$TYPE] || void 0;
                            nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                            nodeTimestamp = node && node[$TIMESTAMP];
                            nodeExpires = node && node[$EXPIRES];
                            if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                            }
                            if (typeof node !== 'object' || !!nodeType && nodeType !== SENTINEL && !Array.isArray(nodeValue)) {
                                nodeType = void 0;
                                nodeValue = Object.create(null);
                                if (node != null && node !== nodeValue) {
                                    var nodeRefsLength = node.__refsLength || 0, destRefsLength = nodeValue.__refsLength || 0, i$2 = -1, ref$2;
                                    while (++i$2 < nodeRefsLength) {
                                        if ((ref$2 = node[__REF + i$2]) !== void 0) {
                                            ref$2[__CONTEXT] = nodeValue;
                                            nodeValue[__REF + (destRefsLength + i$2)] = ref$2;
                                            node[__REF + i$2] = void 0;
                                        }
                                    }
                                    nodeValue[__REFS_LENGTH] = nodeRefsLength + destRefsLength;
                                    node[__REFS_LENGTH] = ref$2 = void 0;
                                    if (node != null && typeof node === 'object') {
                                        var root$2 = root, head = root$2.__head, tail = root$2.__tail, next, prev;
                                        (next = node.__next) && (next != null && typeof next === 'object') && (next.__prev = prev);
                                        (prev = node.__prev) && (prev != null && typeof prev === 'object') && (prev.__next = next);
                                        node === head && (root$2.__head = root$2.__next = head = next);
                                        node === tail && (root$2.__tail = root$2.__prev = tail = prev);
                                        node.__next = node.__prev = void 0;
                                        head = tail = next = prev = void 0;
                                    }
                                }
                                nodeParent[key] = node = nodeValue;
                                node = !node[__SELF] && ((node[__SELF] = node) || true) && ((node[__KEY] = key) || true) && ((node[__PARENT] = nodeParent) || true) && ((node[__ROOT] = nodeRoot) || true) && (node[__GENERATION] || (node[__GENERATION] = 0) || node) && ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue) && (nodeValue[__CONTAINER] = node)) || node;
                            }
                            if ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                                do {
                                    if (nodeExpires !== 1) {
                                        var root$3 = root, head$2 = root$3.__head, tail$2 = root$3.__tail, next$2 = node.__next, prev$2 = node.__prev;
                                        if (node !== head$2) {
                                            next$2 && (next$2 != null && typeof next$2 === 'object') && (next$2.__prev = prev$2);
                                            prev$2 && (prev$2 != null && typeof prev$2 === 'object') && (prev$2.__next = next$2);
                                            (next$2 = head$2) && (head$2 != null && typeof head$2 === 'object') && (head$2.__prev = node);
                                            root$3.__head = root$3.__next = head$2 = node;
                                            head$2.__next = next$2;
                                            head$2.__prev = void 0;
                                        }
                                        if (tail$2 == null || node === tail$2) {
                                            root$3.__tail = root$3.__prev = tail$2 = prev$2 || node;
                                        }
                                        root$3 = head$2 = tail$2 = next$2 = prev$2 = void 0;
                                    }
                                    refs[depth] = nodeValue;
                                    refIndex = depth + 1;
                                    refDepth = 0;
                                    var key$2, isKeySet$2;
                                    reference = nodeValue;
                                    refHeight = (refLength = reference.length) - 1;
                                    nodeParent = nodeRoot;
                                    refDepth = refDepth;
                                    follow_path_11809:
                                        do {
                                            key$2 = reference[refDepth];
                                            isKeySet$2 = false;
                                            if (key$2 != null) {
                                                if (refDepth < refHeight) {
                                                    optimizedPath[optimizedPath.length = refDepth] = key$2;
                                                    node = nodeParent[key$2];
                                                    nodeType = node && node[$TYPE] || void 0;
                                                    nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                                    nodeTimestamp = node && node[$TIMESTAMP];
                                                    nodeExpires = node && node[$EXPIRES];
                                                    if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                                        node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                                    }
                                                    if (typeof node !== 'object' || !!nodeType && nodeType !== SENTINEL && !Array.isArray(nodeValue)) {
                                                        nodeType = void 0;
                                                        nodeValue = Object.create(null);
                                                        if (node != null && node !== nodeValue) {
                                                            var nodeRefsLength$2 = node.__refsLength || 0, destRefsLength$2 = nodeValue.__refsLength || 0, i$3 = -1, ref$3;
                                                            while (++i$3 < nodeRefsLength$2) {
                                                                if ((ref$3 = node[__REF + i$3]) !== void 0) {
                                                                    ref$3[__CONTEXT] = nodeValue;
                                                                    nodeValue[__REF + (destRefsLength$2 + i$3)] = ref$3;
                                                                    node[__REF + i$3] = void 0;
                                                                }
                                                            }
                                                            nodeValue[__REFS_LENGTH] = nodeRefsLength$2 + destRefsLength$2;
                                                            node[__REFS_LENGTH] = ref$3 = void 0;
                                                            if (node != null && typeof node === 'object') {
                                                                var root$4 = root, head$3 = root$4.__head, tail$3 = root$4.__tail, next$3, prev$3;
                                                                (next$3 = node.__next) && (next$3 != null && typeof next$3 === 'object') && (next$3.__prev = prev$3);
                                                                (prev$3 = node.__prev) && (prev$3 != null && typeof prev$3 === 'object') && (prev$3.__next = next$3);
                                                                node === head$3 && (root$4.__head = root$4.__next = head$3 = next$3);
                                                                node === tail$3 && (root$4.__tail = root$4.__prev = tail$3 = prev$3);
                                                                node.__next = node.__prev = void 0;
                                                                head$3 = tail$3 = next$3 = prev$3 = void 0;
                                                            }
                                                        }
                                                        nodeParent[key$2] = node = nodeValue;
                                                        node = !node[__SELF] && ((node[__SELF] = node) || true) && ((node[__KEY] = key$2) || true) && ((node[__PARENT] = nodeParent) || true) && ((node[__ROOT] = nodeRoot) || true) && (node[__GENERATION] || (node[__GENERATION] = 0) || node) && ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue) && (nodeValue[__CONTAINER] = node)) || node;
                                                    }
                                                    if (appendNullKey = node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue)) {
                                                        nodeParent = node;
                                                        break follow_path_11809;
                                                    }
                                                    nodeParent = node;
                                                    refDepth = refDepth + 1;
                                                    continue follow_path_11809;
                                                } else if (refDepth === refHeight) {
                                                    optimizedPath[optimizedPath.length = refDepth] = key$2;
                                                    node = nodeParent[key$2];
                                                    nodeType = node && node[$TYPE] || void 0;
                                                    nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                                    nodeTimestamp = node && node[$TIMESTAMP];
                                                    nodeExpires = node && node[$EXPIRES];
                                                    if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                                        node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                                    }
                                                    if (typeof node !== 'object' || !!nodeType && nodeType !== SENTINEL && !Array.isArray(nodeValue)) {
                                                        nodeType = void 0;
                                                        nodeValue = Object.create(null);
                                                        if (node != null && node !== nodeValue) {
                                                            var nodeRefsLength$3 = node.__refsLength || 0, destRefsLength$3 = nodeValue.__refsLength || 0, i$4 = -1, ref$4;
                                                            while (++i$4 < nodeRefsLength$3) {
                                                                if ((ref$4 = node[__REF + i$4]) !== void 0) {
                                                                    ref$4[__CONTEXT] = nodeValue;
                                                                    nodeValue[__REF + (destRefsLength$3 + i$4)] = ref$4;
                                                                    node[__REF + i$4] = void 0;
                                                                }
                                                            }
                                                            nodeValue[__REFS_LENGTH] = nodeRefsLength$3 + destRefsLength$3;
                                                            node[__REFS_LENGTH] = ref$4 = void 0;
                                                            if (node != null && typeof node === 'object') {
                                                                var root$5 = root, head$4 = root$5.__head, tail$4 = root$5.__tail, next$4, prev$4;
                                                                (next$4 = node.__next) && (next$4 != null && typeof next$4 === 'object') && (next$4.__prev = prev$4);
                                                                (prev$4 = node.__prev) && (prev$4 != null && typeof prev$4 === 'object') && (prev$4.__next = next$4);
                                                                node === head$4 && (root$5.__head = root$5.__next = head$4 = next$4);
                                                                node === tail$4 && (root$5.__tail = root$5.__prev = tail$4 = prev$4);
                                                                node.__next = node.__prev = void 0;
                                                                head$4 = tail$4 = next$4 = prev$4 = void 0;
                                                            }
                                                        }
                                                        nodeParent[key$2] = node = nodeValue;
                                                        node = !node[__SELF] && ((node[__SELF] = node) || true) && ((node[__KEY] = key$2) || true) && ((node[__PARENT] = nodeParent) || true) && ((node[__ROOT] = nodeRoot) || true) && (node[__GENERATION] || (node[__GENERATION] = 0) || node) && ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue) && (nodeValue[__CONTAINER] = node)) || node;
                                                    }
                                                    appendNullKey = node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue);
                                                    nodeParent = node;
                                                    break follow_path_11809;
                                                }
                                            } else if (refDepth < refHeight) {
                                                nodeParent = node;
                                                refDepth = refDepth + 1;
                                                continue follow_path_11809;
                                            }
                                            nodeParent = node;
                                            break follow_path_11809;
                                        } while (true);
                                    node = nodeParent;
                                } while ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue));
                                if (node == null) {
                                    while (refDepth <= refHeight) {
                                        optimizedPath[refDepth] = reference[refDepth++];
                                    }
                                }
                            }
                            if (node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue)) {
                                nodeParent = node;
                                break follow_path_11537;
                            }
                            nodeParent = nodes[depth] = node;
                            depth = depth + 1;
                            continue follow_path_11537;
                        } else if (depth === height) {
                            optimizedPath[optimizedPath.length = depth + (refLength - refIndex)] = key;
                            node = nodeParent[key];
                            nodeType = node && node[$TYPE] || void 0;
                            nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                            nodeTimestamp = node && node[$TIMESTAMP];
                            nodeExpires = node && node[$EXPIRES];
                            if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                            }
                            nodeType = value && value[$TYPE] || void 0;
                            nodeValue = nodeType === SENTINEL ? value[VALUE] : nodeType === ERROR ? value = errorSelector(requestedPath, value) : value;
                            nodeTimestamp = value && value[$TIMESTAMP];
                            nodeExpires = value && value[$EXPIRES];
                            var newNode;
                            newNode = value;
                            if ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                                nodeType = 'array';
                                newNode[$SIZE] = nodeSize = (nodeType === SENTINEL && 50 || 0) + (nodeValue.length || 1);
                                delete nodeValue[$SIZE];
                                nodeValue[__CONTAINER] = newNode;
                            } else if (nodeType === SENTINEL) {
                                newNode[$SIZE] = nodeSize = 50 + (typeof nodeValue === 'string' && nodeValue.length || 1);
                            } else if (nodeType === ERROR) {
                                newNode[$SIZE] = nodeSize = 50 + (value[$SIZE] || 0 || 1);
                            } else if (!(value != null && typeof value === 'object')) {
                                nodeSize = 50 + (typeof nodeValue === 'string' && nodeValue.length || 1);
                                nodeType = 'sentinel';
                                newNode = { 'value': nodeValue };
                                newNode[$TYPE] = nodeType;
                                newNode[$SIZE] = nodeSize;
                            } else {
                                nodeType = newNode[$TYPE] = nodeType || 'leaf';
                                newNode[$SIZE] = nodeSize = value[$SIZE] || 0 || 50 + 1;
                            }
                            ;
                            if (node != null && node !== newNode) {
                                var nodeRefsLength$4 = node.__refsLength || 0, destRefsLength$4 = newNode.__refsLength || 0, i$5 = -1, ref$5;
                                while (++i$5 < nodeRefsLength$4) {
                                    if ((ref$5 = node[__REF + i$5]) !== void 0) {
                                        ref$5[__CONTEXT] = newNode;
                                        newNode[__REF + (destRefsLength$4 + i$5)] = ref$5;
                                        node[__REF + i$5] = void 0;
                                    }
                                }
                                newNode[__REFS_LENGTH] = nodeRefsLength$4 + destRefsLength$4;
                                node[__REFS_LENGTH] = ref$5 = void 0;
                                if (node != null && typeof node === 'object') {
                                    var root$6 = root, head$5 = root$6.__head, tail$5 = root$6.__tail, next$5, prev$5;
                                    (next$5 = node.__next) && (next$5 != null && typeof next$5 === 'object') && (next$5.__prev = prev$5);
                                    (prev$5 = node.__prev) && (prev$5 != null && typeof prev$5 === 'object') && (prev$5.__next = next$5);
                                    node === head$5 && (root$6.__head = root$6.__next = head$5 = next$5);
                                    node === tail$5 && (root$6.__tail = root$6.__prev = tail$5 = prev$5);
                                    node.__next = node.__prev = void 0;
                                    head$5 = tail$5 = next$5 = prev$5 = void 0;
                                }
                            }
                            nodeParent[key] = node = newNode;
                            node = !node[__SELF] && ((node[__SELF] = node) || true) && ((node[__KEY] = key) || true) && ((node[__PARENT] = nodeParent) || true) && ((node[__ROOT] = nodeRoot) || true) && (node[__GENERATION] || (node[__GENERATION] = 0) || node) && ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue) && (nodeValue[__CONTAINER] = node)) || node;
                            if (node != null && typeof node === 'object') {
                                if (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true) {
                                    node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                } else {
                                    if (nodeExpires !== 1) {
                                        var root$7 = root, head$6 = root$7.__head, tail$6 = root$7.__tail, next$6 = node.__next, prev$6 = node.__prev;
                                        if (node !== head$6) {
                                            next$6 && (next$6 != null && typeof next$6 === 'object') && (next$6.__prev = prev$6);
                                            prev$6 && (prev$6 != null && typeof prev$6 === 'object') && (prev$6.__next = next$6);
                                            (next$6 = head$6) && (head$6 != null && typeof head$6 === 'object') && (head$6.__prev = node);
                                            root$7.__head = root$7.__next = head$6 = node;
                                            head$6.__next = next$6;
                                            head$6.__prev = void 0;
                                        }
                                        if (tail$6 == null || node === tail$6) {
                                            root$7.__tail = root$7.__prev = tail$6 = prev$6 || node;
                                        }
                                        root$7 = head$6 = tail$6 = next$6 = prev$6 = void 0;
                                    }
                                }
                            }
                            appendNullKey = false;
                            nodeParent = node;
                            break follow_path_11537;
                        }
                    } else if (depth < height) {
                        nodeParent = nodeParent;
                        depth = depth + 1;
                        continue follow_path_11537;
                    }
                    nodeParent = node;
                    break follow_path_11537;
                } while (true);
            node = nodeParent;
            if (node != null || boxed === true) {
                if (nodeType === ERROR) {
                    if (nodeExpires !== 1) {
                        var root$8 = root, head$7 = root$8.__head, tail$7 = root$8.__tail, next$7 = node.__next, prev$7 = node.__prev;
                        if (node !== head$7) {
                            next$7 && (next$7 != null && typeof next$7 === 'object') && (next$7.__prev = prev$7);
                            prev$7 && (prev$7 != null && typeof prev$7 === 'object') && (prev$7.__next = next$7);
                            (next$7 = head$7) && (head$7 != null && typeof head$7 === 'object') && (head$7.__prev = node);
                            root$8.__head = root$8.__next = head$7 = node;
                            head$7.__next = next$7;
                            head$7.__prev = void 0;
                        }
                        if (tail$7 == null || node === tail$7) {
                            root$8.__tail = root$8.__prev = tail$7 = prev$7 || node;
                        }
                        root$8 = head$7 = tail$7 = next$7 = prev$7 = void 0;
                    }
                    var pbv = Object.create(null);
                    var src = requestedPath, i$6 = -1, n = src.length, req = new Array(n);
                    while (++i$6 < n) {
                        req[i$6] = src[i$6];
                    }
                    if (appendNullKey === true) {
                        req[req.length] = null;
                    }
                    pbv.path = req;
                    if (boxed === true) {
                        pbv.value = node;
                    } else {
                        var dest = nodeValue, src$2 = dest, x;
                        if (dest != null && typeof dest === 'object') {
                            dest = Array.isArray(src$2) && [] || Object.create(null);
                            for (x in src$2) {
                                !(!(x[0] !== '_' || x[1] !== '_') || (x === __SELF || x === __PARENT || x === __ROOT) || x[0] === '$') && (dest[x] = src$2[x]);
                            }
                        }
                        pbv.value = dest;
                    }
                    errors[errors.length] = pbv;
                }
                var src$3 = optimizedPath, i$7 = -1, n$2 = src$3.length, opt = new Array(n$2);
                while (++i$7 < n$2) {
                    opt[i$7] = src$3[i$7];
                }
                var src$4 = requestedPath, i$8 = -1, n$3 = src$4.length, req$2 = new Array(n$3);
                while (++i$8 < n$3) {
                    req$2[i$8] = src$4[i$8];
                }
                if (appendNullKey === true) {
                    req$2[req$2.length] = null;
                }
                requestedPaths[requestedPaths.length] = req$2;
                optimizedPaths[optimizedPaths.length] = opt;
                var pbv$2 = Object.create(null);
                var src$5 = requestedPath, i$9 = -1, n$4 = src$5.length, req$3 = new Array(n$4);
                while (++i$9 < n$4) {
                    req$3[i$9] = src$5[i$9];
                }
                if (appendNullKey === true) {
                    req$3[req$3.length] = null;
                }
                pbv$2.path = req$3;
                if (boxed === true) {
                    pbv$2.value = node;
                } else {
                    var dest$2 = nodeValue, src$6 = dest$2, x$2;
                    if (dest$2 != null && typeof dest$2 === 'object') {
                        dest$2 = Array.isArray(src$6) && [] || Object.create(null);
                        for (x$2 in src$6) {
                            !(!(x$2[0] !== '_' || x$2[1] !== '_') || (x$2 === __SELF || x$2 === __PARENT || x$2 === __ROOT) || x$2[0] === '$') && (dest$2[x$2] = src$6[x$2]);
                        }
                    }
                    pbv$2.value = dest$2;
                }
                typeof values === 'function' && (values(pbv$2) || true) || Array.isArray(values) && (values[values.length] = pbv$2);
            }
            if (boxed === false && node == null || refreshing === true) {
                var src$7 = boundPath, i$10 = -1, n$5 = src$7.length, req$4 = new Array(n$5);
                while (++i$10 < n$5) {
                    req$4[i$10] = src$7[i$10];
                }
                var src$8 = optimizedPath, i$11 = -1, n$6 = src$8.length, opt$2 = new Array(n$6);
                while (++i$11 < n$6) {
                    opt$2[i$11] = src$8[i$11];
                }
                var reqLen = req$4.length - 1, optLen = opt$2.length - 1, i$12 = -1, n$7 = requestedPath.length, j$2 = depth, k = height, x$3;
                while (++i$12 < n$7) {
                    req$4[++reqLen] = path[i$12 + boundLength] != null && typeof path[i$12 + boundLength] === 'object' && [requestedPath[i$12]] || requestedPath[i$12];
                }
                i$12 = -1;
                n$7 = height - depth;
                while (++i$12 < n$7) {
                    x$3 = req$4[++reqLen] = path[++j$2 + boundLength];
                    x$3 != null && (opt$2[++optLen] = x$3);
                }
                req$4.pathSetIndex = index;
                requestedMissingPaths[requestedMissingPaths.length] = req$4;
                optimizedMissingPaths[optimizedMissingPaths.length] = opt$2;
            }
            appendNullKey = false;
            var key$3;
            depth = depth;
            unroll_11628:
                do {
                    if (depth < 0) {
                        depth = (path.depth = 0) - 1;
                        break unroll_11628;
                    }
                    if (!((key$3 = path[depth]) != null && typeof key$3 === 'object')) {
                        depth = path.depth = depth - 1;
                        continue unroll_11628;
                    }
                    if (Array.isArray(key$3)) {
                        if (++key$3.index === key$3.length) {
                            if (!((key$3 = key$3[key$3.index = 0]) != null && typeof key$3 === 'object')) {
                                depth = path.depth = depth - 1;
                                continue unroll_11628;
                            }
                        } else {
                            depth = path.depth = depth;
                            break unroll_11628;
                        }
                    }
                    if (++key$3[__OFFSET] > (key$3.to || (key$3.to = key$3.from + (key$3.length || 1) - 1))) {
                        key$3[__OFFSET] = key$3.from;
                        depth = path.depth = depth - 1;
                        continue unroll_11628;
                    }
                    depth = path.depth = depth;
                    break unroll_11628;
                } while (true);
            depth = depth;
        }
    }
    return {
        'values': values,
        'errors': errors,
        'requestedPaths': requestedPaths,
        'optimizedPaths': optimizedPaths,
        'requestedMissingPaths': requestedMissingPaths,
        'optimizedMissingPaths': optimizedMissingPaths
    };
}
function setValueSync(model, path, value, errorSelector) {
    if (Array.isArray(path) === false) {
        if (typeof errorSelector !== 'function') {
            errorSelector = value;
        }
        value = path.value;
        path = path.path;
    }
    typeof errorSelector === 'function' || (errorSelector = model._errorSelector) || (errorSelector = function (x$2, y) {
        return y;
    });
    var root = model._root || model, boxed = model._boxed || false, expired = root.expired || (root.expired = []), _cache = model._cache || {}, optimizedPath = [], depth = 0, length = 0, height = 0, reference, refIndex = 0, refDepth = 0, refLength = 0, refHeight = 0, nodeRoot = _cache, nodeParent = nodeRoot, node = nodeParent, nodeType, nodeValue, nodeSize, nodeTimestamp, nodeExpires;
    var key, isKeySet;
    path = path;
    length = (height = path.length) - 1;
    nodeParent = nodeRoot;
    depth = depth;
    follow_path_9889:
        do {
            key = path[depth];
            if (isKeySet = key != null && typeof key === 'object') {
                if (Array.isArray(key)) {
                    if ((key = key[key.index || (key.index = 0)]) != null && typeof key === 'object') {
                        key = key[__OFFSET] === void 0 && (key[__OFFSET] = key.from || (key.from = 0)) || key[__OFFSET];
                    }
                } else {
                    key = key[__OFFSET] === void 0 && (key[__OFFSET] = key.from || (key.from = 0)) || key[__OFFSET];
                }
            }
            if (key === __NULL) {
                key = null;
            }
            if (key != null) {
                if (depth < length) {
                    optimizedPath[optimizedPath.length = depth + (refLength - refIndex)] = key;
                    node = nodeParent[key];
                    nodeType = node && node[$TYPE] || void 0;
                    nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                    nodeTimestamp = node && node[$TIMESTAMP];
                    nodeExpires = node && node[$EXPIRES];
                    if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                        node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                    }
                    if ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                        do {
                            if (nodeExpires !== 1) {
                                var root$2 = root, head = root$2.__head, tail = root$2.__tail, next = node.__next, prev = node.__prev;
                                if (node !== head) {
                                    next && (next != null && typeof next === 'object') && (next.__prev = prev);
                                    prev && (prev != null && typeof prev === 'object') && (prev.__next = next);
                                    (next = head) && (head != null && typeof head === 'object') && (head.__prev = node);
                                    root$2.__head = root$2.__next = head = node;
                                    head.__next = next;
                                    head.__prev = void 0;
                                }
                                if (tail == null || node === tail) {
                                    root$2.__tail = root$2.__prev = tail = prev || node;
                                }
                                root$2 = head = tail = next = prev = void 0;
                            }
                            refIndex = depth + 1;
                            refDepth = 0;
                            var key$2, isKeySet$2;
                            reference = nodeValue;
                            refHeight = (refLength = reference.length) - 1;
                            nodeParent = nodeRoot;
                            refDepth = refDepth;
                            follow_path_10032:
                                do {
                                    key$2 = reference[refDepth];
                                    isKeySet$2 = false;
                                    if (key$2 != null) {
                                        if (refDepth < refHeight) {
                                            optimizedPath[optimizedPath.length = refDepth] = key$2;
                                            node = nodeParent[key$2];
                                            nodeType = node && node[$TYPE] || void 0;
                                            nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                            nodeTimestamp = node && node[$TIMESTAMP];
                                            nodeExpires = node && node[$EXPIRES];
                                            if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                                node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                            }
                                            if (node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue)) {
                                                nodeParent = node;
                                                break follow_path_10032;
                                            }
                                            nodeParent = node;
                                            refDepth = refDepth + 1;
                                            continue follow_path_10032;
                                        } else if (refDepth === refHeight) {
                                            optimizedPath[optimizedPath.length = refDepth] = key$2;
                                            node = nodeParent[key$2];
                                            nodeType = node && node[$TYPE] || void 0;
                                            nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                                            nodeTimestamp = node && node[$TIMESTAMP];
                                            nodeExpires = node && node[$EXPIRES];
                                            if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                                                node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                                            }
                                            nodeParent = node;
                                            break follow_path_10032;
                                        }
                                    } else if (refDepth < refHeight) {
                                        nodeParent = node;
                                        refDepth = refDepth + 1;
                                        continue follow_path_10032;
                                    }
                                    nodeParent = node;
                                    break follow_path_10032;
                                } while (true);
                            node = nodeParent;
                        } while ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue));
                        if (node == null) {
                            while (refDepth <= refHeight) {
                                optimizedPath[refDepth] = reference[refDepth++];
                            }
                        }
                    }
                    if (node == null || nodeType !== void 0 || typeof node !== 'object' || Array.isArray(nodeValue)) {
                        nodeParent = node;
                        break follow_path_9889;
                    }
                    nodeParent = node;
                    depth = depth + 1;
                    continue follow_path_9889;
                } else if (depth === length) {
                    optimizedPath[optimizedPath.length = depth + (refLength - refIndex)] = key;
                    node = nodeParent[key];
                    nodeType = node && node[$TYPE] || void 0;
                    nodeValue = nodeType === SENTINEL ? node[VALUE] : nodeType === ERROR ? node = errorSelector(requestedPath, node) : node;
                    nodeTimestamp = node && node[$TIMESTAMP];
                    nodeExpires = node && node[$EXPIRES];
                    if (node != null && typeof node === 'object' && (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true)) {
                        node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                    }
                    nodeType = value && value[$TYPE] || void 0;
                    nodeValue = nodeType === SENTINEL ? value[VALUE] : nodeType === ERROR ? value = errorSelector(requestedPath, value) : value;
                    nodeTimestamp = value && value[$TIMESTAMP];
                    nodeExpires = value && value[$EXPIRES];
                    var newNode;
                    newNode = value;
                    if ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue)) {
                        nodeType = 'array';
                        newNode[$SIZE] = nodeSize = (nodeType === SENTINEL && 50 || 0) + (nodeValue.length || 1);
                        delete nodeValue[$SIZE];
                        nodeValue[__CONTAINER] = newNode;
                    } else if (nodeType === SENTINEL) {
                        newNode[$SIZE] = nodeSize = 50 + (typeof nodeValue === 'string' && nodeValue.length || 1);
                    } else if (nodeType === ERROR) {
                        newNode[$SIZE] = nodeSize = 50 + (value[$SIZE] || 0 || 1);
                    } else if (!(value != null && typeof value === 'object')) {
                        nodeSize = 50 + (typeof nodeValue === 'string' && nodeValue.length || 1);
                        nodeType = 'sentinel';
                        newNode = { 'value': nodeValue };
                        newNode[$TYPE] = nodeType;
                        newNode[$SIZE] = nodeSize;
                    } else {
                        nodeType = newNode[$TYPE] = nodeType || 'leaf';
                        newNode[$SIZE] = nodeSize = value[$SIZE] || 0 || 50 + 1;
                    }
                    ;
                    if (node != null && node !== newNode) {
                        var nodeRefsLength = node.__refsLength || 0, destRefsLength = newNode.__refsLength || 0, i = -1, ref;
                        while (++i < nodeRefsLength) {
                            if ((ref = node[__REF + i]) !== void 0) {
                                ref[__CONTEXT] = newNode;
                                newNode[__REF + (destRefsLength + i)] = ref;
                                node[__REF + i] = void 0;
                            }
                        }
                        newNode[__REFS_LENGTH] = nodeRefsLength + destRefsLength;
                        node[__REFS_LENGTH] = ref = void 0;
                        if (node != null && typeof node === 'object') {
                            var root$3 = root, head$2 = root$3.__head, tail$2 = root$3.__tail, next$2, prev$2;
                            (next$2 = node.__next) && (next$2 != null && typeof next$2 === 'object') && (next$2.__prev = prev$2);
                            (prev$2 = node.__prev) && (prev$2 != null && typeof prev$2 === 'object') && (prev$2.__next = next$2);
                            node === head$2 && (root$3.__head = root$3.__next = head$2 = next$2);
                            node === tail$2 && (root$3.__tail = root$3.__prev = tail$2 = prev$2);
                            node.__next = node.__prev = void 0;
                            head$2 = tail$2 = next$2 = prev$2 = void 0;
                        }
                    }
                    nodeParent[key] = node = newNode;
                    node = !node[__SELF] && ((node[__SELF] = node) || true) && ((node[__KEY] = key) || true) && ((node[__PARENT] = nodeParent) || true) && ((node[__ROOT] = nodeRoot) || true) && (node[__GENERATION] || (node[__GENERATION] = 0) || node) && ((!nodeType || nodeType === SENTINEL) && Array.isArray(nodeValue) && (nodeValue[__CONTAINER] = node)) || node;
                    if (node != null && typeof node === 'object') {
                        if (nodeExpires != null && nodeExpires !== 1 && (nodeExpires === 0 || nodeExpires < Date.now()) || node[__INVALIDATED] === true) {
                            node = nodeValue = (expired[expired.length] = node) && (node[__INVALIDATED] = true) && void 0;
                        } else {
                            if (nodeExpires !== 1) {
                                var root$4 = root, head$3 = root$4.__head, tail$3 = root$4.__tail, next$3 = node.__next, prev$3 = node.__prev;
                                if (node !== head$3) {
                                    next$3 && (next$3 != null && typeof next$3 === 'object') && (next$3.__prev = prev$3);
                                    prev$3 && (prev$3 != null && typeof prev$3 === 'object') && (prev$3.__next = next$3);
                                    (next$3 = head$3) && (head$3 != null && typeof head$3 === 'object') && (head$3.__prev = node);
                                    root$4.__head = root$4.__next = head$3 = node;
                                    head$3.__next = next$3;
                                    head$3.__prev = void 0;
                                }
                                if (tail$3 == null || node === tail$3) {
                                    root$4.__tail = root$4.__prev = tail$3 = prev$3 || node;
                                }
                                root$4 = head$3 = tail$3 = next$3 = prev$3 = void 0;
                            }
                        }
                    }
                    nodeParent = node;
                    break follow_path_9889;
                }
            } else if (depth < length) {
                nodeParent = node;
                depth = depth + 1;
                continue follow_path_9889;
            }
            nodeParent = node;
            break follow_path_9889;
        } while (true);
    node = nodeParent;
    optimizedPath.length = depth + (refLength - refIndex) + 1;
    if (boxed === false) {
        var dest = nodeValue, src = dest, x;
        if (dest != null && typeof dest === 'object') {
            dest = Array.isArray(src) && [] || Object.create(null);
            for (x in src) {
                !(!(x[0] !== '_' || x[1] !== '_') || (x === __SELF || x === __PARENT || x === __ROOT) || x[0] === '$') && (dest[x] = src[x]);
            }
        }
        node = dest;
    }
    return {
        path: optimizedPath,
        value: node
    };
}
