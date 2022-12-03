"use strict";
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var collections;
(function (collections) {
    var SortedMap = /** @class */ (function () {
        function SortedMap(comparer, iterable) {
            this._keys = [];
            this._values = [];
            this._version = 0;
            this._copyOnWrite = false;
            this._comparer = typeof comparer === "object" ? comparer.comparer : comparer;
            this._order = typeof comparer === "object" && comparer.sort === "insertion" ? [] : undefined;
            if (iterable) {
                var iterator = getIterator(iterable);
                try {
                    for (var i = nextResult(iterator); i; i = nextResult(iterator)) {
                        var _a = i.value, key = _a[0], value = _a[1];
                        this.set(key, value);
                    }
                }
                finally {
                    closeIterator(iterator);
                }
            }
        }
        Object.defineProperty(SortedMap.prototype, "size", {
            get: function () {
                return this._keys.length;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(SortedMap.prototype, "comparer", {
            get: function () {
                return this._comparer;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(SortedMap.prototype, Symbol.toStringTag, {
            get: function () {
                return "SortedMap";
            },
            enumerable: false,
            configurable: true
        });
        SortedMap.prototype.has = function (key) {
            return ts.binarySearch(this._keys, key, ts.identity, this._comparer) >= 0;
        };
        SortedMap.prototype.get = function (key) {
            var index = ts.binarySearch(this._keys, key, ts.identity, this._comparer);
            return index >= 0 ? this._values[index] : undefined;
        };
        SortedMap.prototype.getEntry = function (key) {
            var index = ts.binarySearch(this._keys, key, ts.identity, this._comparer);
            return index >= 0 ? [this._keys[index], this._values[index]] : undefined;
        };
        SortedMap.prototype.set = function (key, value) {
            var index = ts.binarySearch(this._keys, key, ts.identity, this._comparer);
            if (index >= 0) {
                this._values[index] = value;
            }
            else {
                this.writePreamble();
                insertAt(this._keys, ~index, key);
                insertAt(this._values, ~index, value);
                if (this._order)
                    insertAt(this._order, ~index, this._version);
                this.writePostScript();
            }
            return this;
        };
        SortedMap.prototype.delete = function (key) {
            var index = ts.binarySearch(this._keys, key, ts.identity, this._comparer);
            if (index >= 0) {
                this.writePreamble();
                ts.orderedRemoveItemAt(this._keys, index);
                ts.orderedRemoveItemAt(this._values, index);
                if (this._order)
                    ts.orderedRemoveItemAt(this._order, index);
                this.writePostScript();
                return true;
            }
            return false;
        };
        SortedMap.prototype.clear = function () {
            if (this.size > 0) {
                this.writePreamble();
                this._keys.length = 0;
                this._values.length = 0;
                if (this._order)
                    this._order.length = 0;
                this.writePostScript();
            }
        };
        SortedMap.prototype.forEach = function (callback, thisArg) {
            var keys = this._keys;
            var values = this._values;
            var indices = this.getIterationOrder();
            var version = this._version;
            this._copyOnWrite = true;
            try {
                if (indices) {
                    for (var _i = 0, indices_1 = indices; _i < indices_1.length; _i++) {
                        var i = indices_1[_i];
                        callback.call(thisArg, values[i], keys[i], this);
                    }
                }
                else {
                    for (var i = 0; i < keys.length; i++) {
                        callback.call(thisArg, values[i], keys[i], this);
                    }
                }
            }
            finally {
                if (version === this._version) {
                    this._copyOnWrite = false;
                }
            }
        };
        SortedMap.prototype.keys = function () {
            var keys, indices, version, _i, indices_2, i;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        keys = this._keys;
                        indices = this.getIterationOrder();
                        version = this._version;
                        this._copyOnWrite = true;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, , 9, 10]);
                        if (!indices) return [3 /*break*/, 6];
                        _i = 0, indices_2 = indices;
                        _a.label = 2;
                    case 2:
                        if (!(_i < indices_2.length)) return [3 /*break*/, 5];
                        i = indices_2[_i];
                        return [4 /*yield*/, keys[i]];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5: return [3 /*break*/, 8];
                    case 6: return [5 /*yield**/, __values(keys)];
                    case 7:
                        _a.sent();
                        _a.label = 8;
                    case 8: return [3 /*break*/, 10];
                    case 9:
                        if (version === this._version) {
                            this._copyOnWrite = false;
                        }
                        return [7 /*endfinally*/];
                    case 10: return [2 /*return*/];
                }
            });
        };
        SortedMap.prototype.values = function () {
            var values, indices, version, _i, indices_3, i;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        values = this._values;
                        indices = this.getIterationOrder();
                        version = this._version;
                        this._copyOnWrite = true;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, , 9, 10]);
                        if (!indices) return [3 /*break*/, 6];
                        _i = 0, indices_3 = indices;
                        _a.label = 2;
                    case 2:
                        if (!(_i < indices_3.length)) return [3 /*break*/, 5];
                        i = indices_3[_i];
                        return [4 /*yield*/, values[i]];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5: return [3 /*break*/, 8];
                    case 6: return [5 /*yield**/, __values(values)];
                    case 7:
                        _a.sent();
                        _a.label = 8;
                    case 8: return [3 /*break*/, 10];
                    case 9:
                        if (version === this._version) {
                            this._copyOnWrite = false;
                        }
                        return [7 /*endfinally*/];
                    case 10: return [2 /*return*/];
                }
            });
        };
        SortedMap.prototype.entries = function () {
            var keys, values, indices, version, _i, indices_4, i, i;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        keys = this._keys;
                        values = this._values;
                        indices = this.getIterationOrder();
                        version = this._version;
                        this._copyOnWrite = true;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, , 11, 12]);
                        if (!indices) return [3 /*break*/, 6];
                        _i = 0, indices_4 = indices;
                        _a.label = 2;
                    case 2:
                        if (!(_i < indices_4.length)) return [3 /*break*/, 5];
                        i = indices_4[_i];
                        return [4 /*yield*/, [keys[i], values[i]]];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5: return [3 /*break*/, 10];
                    case 6:
                        i = 0;
                        _a.label = 7;
                    case 7:
                        if (!(i < keys.length)) return [3 /*break*/, 10];
                        return [4 /*yield*/, [keys[i], values[i]]];
                    case 8:
                        _a.sent();
                        _a.label = 9;
                    case 9:
                        i++;
                        return [3 /*break*/, 7];
                    case 10: return [3 /*break*/, 12];
                    case 11:
                        if (version === this._version) {
                            this._copyOnWrite = false;
                        }
                        return [7 /*endfinally*/];
                    case 12: return [2 /*return*/];
                }
            });
        };
        SortedMap.prototype[Symbol.iterator] = function () {
            return this.entries();
        };
        SortedMap.prototype.writePreamble = function () {
            if (this._copyOnWrite) {
                this._keys = this._keys.slice();
                this._values = this._values.slice();
                if (this._order)
                    this._order = this._order.slice();
                this._copyOnWrite = false;
            }
        };
        SortedMap.prototype.writePostScript = function () {
            this._version++;
        };
        SortedMap.prototype.getIterationOrder = function () {
            if (this._order) {
                var order_1 = this._order;
                return this._order
                    .map(function (_, i) { return i; })
                    .sort(function (x, y) { return order_1[x] - order_1[y]; });
            }
            return undefined;
        };
        return SortedMap;
    }());
    collections.SortedMap = SortedMap;
    function insertAt(array, index, value) {
        if (index === 0) {
            array.unshift(value);
        }
        else if (index === array.length) {
            array.push(value);
        }
        else {
            for (var i = array.length; i > index; i--) {
                array[i] = array[i - 1];
            }
            array[index] = value;
        }
    }
    collections.insertAt = insertAt;
    function getIterator(iterable) {
        return iterable[Symbol.iterator]();
    }
    collections.getIterator = getIterator;
    function nextResult(iterator) {
        var result = iterator.next();
        return result.done ? undefined : result;
    }
    collections.nextResult = nextResult;
    function closeIterator(iterator) {
        var fn = iterator.return;
        if (typeof fn === "function")
            fn.call(iterator);
    }
    collections.closeIterator = closeIterator;
    /**
     * A collection of metadata that supports inheritance.
     */
    var Metadata = /** @class */ (function () {
        function Metadata(parent) {
            this._version = 0;
            this._size = -1;
            this._parent = parent;
            this._map = Object.create(parent ? parent._map : null); // eslint-disable-line no-null/no-null
        }
        Object.defineProperty(Metadata.prototype, "size", {
            get: function () {
                if (this._size === -1 || (this._parent && this._parent._version !== this._parentVersion)) {
                    var size = 0;
                    for (var _ in this._map)
                        size++;
                    this._size = size;
                    if (this._parent) {
                        this._parentVersion = this._parent._version;
                    }
                }
                return this._size;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Metadata.prototype, "parent", {
            get: function () {
                return this._parent;
            },
            enumerable: false,
            configurable: true
        });
        Metadata.prototype.has = function (key) {
            return this._map[Metadata._escapeKey(key)] !== undefined;
        };
        Metadata.prototype.get = function (key) {
            var value = this._map[Metadata._escapeKey(key)];
            return value === Metadata._undefinedValue ? undefined : value;
        };
        Metadata.prototype.set = function (key, value) {
            this._map[Metadata._escapeKey(key)] = value === undefined ? Metadata._undefinedValue : value;
            this._size = -1;
            this._version++;
            return this;
        };
        Metadata.prototype.delete = function (key) {
            var escapedKey = Metadata._escapeKey(key);
            if (this._map[escapedKey] !== undefined) {
                delete this._map[escapedKey];
                this._size = -1;
                this._version++;
                return true;
            }
            return false;
        };
        Metadata.prototype.clear = function () {
            this._map = Object.create(this._parent ? this._parent._map : null); // eslint-disable-line no-null/no-null
            this._size = -1;
            this._version++;
        };
        Metadata.prototype.forEach = function (callback) {
            for (var key in this._map) {
                callback(this._map[key], Metadata._unescapeKey(key), this);
            }
        };
        Metadata._escapeKey = function (text) {
            return (text.length >= 2 && text.charAt(0) === "_" && text.charAt(1) === "_" ? "_" + text : text);
        };
        Metadata._unescapeKey = function (text) {
            return (text.length >= 3 && text.charAt(0) === "_" && text.charAt(1) === "_" && text.charAt(2) === "_" ? text.slice(1) : text);
        };
        Metadata._undefinedValue = {};
        return Metadata;
    }());
    collections.Metadata = Metadata;
})(collections || (collections = {}));
/**
 * Common utilities
 */
var Utils;
(function (Utils) {
    var testPathPrefixRegExp = /(?:(file:\/{3})|\/)\.(ts|lib|src)\//g;
    function removeTestPathPrefixes(text, retainTrailingDirectorySeparator) {
        return text !== undefined ? text.replace(testPathPrefixRegExp, function (_, scheme) { return scheme || (retainTrailingDirectorySeparator ? "/" : ""); }) : undefined; // TODO: GH#18217
    }
    Utils.removeTestPathPrefixes = removeTestPathPrefixes;
    function createDiagnosticMessageReplacer(diagnosticMessage, replacer) {
        var messageParts = diagnosticMessage.message.split(/{\d+}/g);
        var regExp = new RegExp("^(?:".concat(messageParts.map(ts.regExpEscape).join("(.*?)"), ")$"));
        return function (text) {
            var args = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                args[_i - 1] = arguments[_i];
            }
            return text.replace(regExp, function (_) {
                var fixedArgs = [];
                for (var _i = 1; _i < arguments.length; _i++) {
                    fixedArgs[_i - 1] = arguments[_i];
                }
                return ts.formatStringFromArgs(diagnosticMessage.message, replacer.apply(void 0, __spreadArray([fixedArgs], args, false)));
            });
        };
    }
    var replaceTypesVersionsMessage = createDiagnosticMessageReplacer(ts.Diagnostics.package_json_has_a_typesVersions_entry_0_that_matches_compiler_version_1_looking_for_a_pattern_to_match_module_name_2, function (_a, compilerVersion) {
        var entry = _a[0], moduleName = _a[2];
        return [entry, compilerVersion, moduleName];
    });
    function sanitizeTraceResolutionLogEntry(text) {
        return text && removeTestPathPrefixes(replaceTypesVersionsMessage(text, "3.1.0-dev"));
    }
    Utils.sanitizeTraceResolutionLogEntry = sanitizeTraceResolutionLogEntry;
    /**
     * Removes leading indentation from a template literal string.
     */
    function dedent(array) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        var text = array[0];
        for (var i = 0; i < args.length; i++) {
            text += args[i];
            text += array[i + 1];
        }
        var lineTerminatorRegExp = /\r\n?|\n/g;
        var lines = [];
        var lineTerminators = [];
        var match;
        var lineStart = 0;
        while (match = lineTerminatorRegExp.exec(text)) {
            if (lineStart !== match.index || lines.length > 0) {
                lines.push(text.slice(lineStart, match.index));
                lineTerminators.push(match[0]);
            }
            lineStart = match.index + match[0].length;
        }
        if (lineStart < text.length) {
            lines.push(text.slice(lineStart));
        }
        var indentation = guessIndentation(lines);
        var result = "";
        for (var i = 0; i < lines.length; i++) {
            var lineText = lines[i];
            var line = indentation ? lineText.slice(indentation) : lineText;
            result += line;
            if (i < lineTerminators.length) {
                result += lineTerminators[i];
            }
        }
        return result;
    }
    Utils.dedent = dedent;
    function guessIndentation(lines) {
        var indentation;
        for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
            var line = lines_1[_i];
            for (var i = 0; i < line.length && (indentation === undefined || i < indentation); i++) {
                if (!ts.isWhiteSpaceLike(line.charCodeAt(i))) {
                    if (indentation === undefined || i < indentation) {
                        indentation = i;
                        break;
                    }
                }
            }
        }
        return indentation;
    }
    function getByteOrderMarkLength(text) {
        if (text.length >= 1) {
            var ch0 = text.charCodeAt(0);
            if (ch0 === 0xfeff)
                return 1;
            if (ch0 === 0xfe)
                return text.length >= 2 && text.charCodeAt(1) === 0xff ? 2 : 0;
            if (ch0 === 0xff)
                return text.length >= 2 && text.charCodeAt(1) === 0xfe ? 2 : 0;
            if (ch0 === 0xef)
                return text.length >= 3 && text.charCodeAt(1) === 0xbb && text.charCodeAt(2) === 0xbf ? 3 : 0;
        }
        return 0;
    }
    Utils.getByteOrderMarkLength = getByteOrderMarkLength;
    function removeByteOrderMark(text) {
        var length = getByteOrderMarkLength(text);
        return length ? text.slice(length) : text;
    }
    Utils.removeByteOrderMark = removeByteOrderMark;
    function addUTF8ByteOrderMark(text) {
        return getByteOrderMarkLength(text) === 0 ? "\u00EF\u00BB\u00BF" + text : text;
    }
    Utils.addUTF8ByteOrderMark = addUTF8ByteOrderMark;
    function theory(name, cb, data) {
        var _loop_1 = function (entry) {
            it("".concat(name, "(").concat(entry.map(formatTheoryDatum).join(", "), ")"), function () { return cb.apply(void 0, entry); });
        };
        for (var _i = 0, data_1 = data; _i < data_1.length; _i++) {
            var entry = data_1[_i];
            _loop_1(entry);
        }
    }
    Utils.theory = theory;
    function formatTheoryDatum(value) {
        return typeof value === "function" ? value.name || "<anonymous function>" :
            value === undefined ? "undefined" :
                JSON.stringify(value);
    }
    function defer() {
        var resolve;
        var reject;
        var promise = new Promise(function (_resolve, _reject) {
            resolve = _resolve;
            reject = _reject;
        });
        return { resolve: resolve, reject: reject, promise: promise };
    }
    Utils.defer = defer;
})(Utils || (Utils = {}));
// NOTE: The contents of this file are all exported from the namespace 'documents'. This is to
//       support the eventual conversion of harness into a modular system.
var documents;
(function (documents) {
    var TextDocument = /** @class */ (function () {
        function TextDocument(file, text, meta) {
            this.file = file;
            this.text = text;
            this.meta = meta || new Map();
        }
        Object.defineProperty(TextDocument.prototype, "lineStarts", {
            get: function () {
                return this._lineStarts || (this._lineStarts = ts.computeLineStarts(this.text));
            },
            enumerable: false,
            configurable: true
        });
        TextDocument.fromTestFile = function (file) {
            return new TextDocument(file.unitName, file.content, file.fileOptions && Object.keys(file.fileOptions)
                .reduce(function (meta, key) { return meta.set(key, file.fileOptions[key]); }, new Map()));
        };
        TextDocument.prototype.asTestFile = function () {
            return this._testFile || (this._testFile = {
                unitName: this.file,
                content: this.text,
                fileOptions: Array.from(this.meta)
                    .reduce(function (obj, _a) {
                    var key = _a[0], value = _a[1];
                    return (obj[key] = value, obj);
                }, {})
            });
        };
        return TextDocument;
    }());
    documents.TextDocument = TextDocument;
    var SourceMap = /** @class */ (function () {
        function SourceMap(mapFile, data) {
            this.sources = [];
            this.mappings = [];
            this._emittedLineMappings = [];
            this._sourceLineMappings = [];
            this.raw = typeof data === "string" ? JSON.parse(data) : data;
            this.mapFile = mapFile;
            this.version = this.raw.version;
            this.file = this.raw.file;
            this.sourceRoot = this.raw.sourceRoot;
            this.sources = this.raw.sources;
            this.sourcesContent = this.raw.sourcesContent;
            this.names = this.raw.names;
            // populate mappings
            var mappings = [];
            var emittedLine = 0;
            var emittedColumn = 0;
            var sourceIndex = 0;
            var sourceLine = 0;
            var sourceColumn = 0;
            var nameIndex = 0;
            var match;
            while (match = SourceMap._mappingRegExp.exec(this.raw.mappings)) {
                if (match[1]) {
                    var segment = SourceMap._decodeVLQ(match[1]);
                    if (segment.length !== 1 && segment.length !== 4 && segment.length !== 5) {
                        throw new Error("Invalid VLQ");
                    }
                    emittedColumn += segment[0];
                    if (segment.length >= 4) {
                        sourceIndex += segment[1];
                        sourceLine += segment[2];
                        sourceColumn += segment[3];
                    }
                    var mapping = { mappingIndex: mappings.length, emittedLine: emittedLine, emittedColumn: emittedColumn, sourceIndex: sourceIndex, sourceLine: sourceLine, sourceColumn: sourceColumn };
                    if (segment.length === 5) {
                        nameIndex += segment[4];
                        mapping.nameIndex = nameIndex;
                    }
                    mappings.push(mapping);
                    var mappingsForEmittedLine = this._emittedLineMappings[mapping.emittedLine] || (this._emittedLineMappings[mapping.emittedLine] = []);
                    mappingsForEmittedLine.push(mapping);
                    var mappingsForSource = this._sourceLineMappings[mapping.sourceIndex] || (this._sourceLineMappings[mapping.sourceIndex] = []);
                    var mappingsForSourceLine = mappingsForSource[mapping.sourceLine] || (mappingsForSource[mapping.sourceLine] = []);
                    mappingsForSourceLine.push(mapping);
                }
                else if (match[2]) {
                    emittedLine++;
                    emittedColumn = 0;
                }
                else {
                    throw new Error("Unrecognized character '".concat(match[0], "'."));
                }
            }
            this.mappings = mappings;
        }
        SourceMap.getUrl = function (text) {
            var match;
            var lastMatch;
            while (match = SourceMap._sourceMappingURLRegExp.exec(text)) {
                lastMatch = match;
            }
            return lastMatch ? lastMatch[1] : undefined;
        };
        SourceMap.fromUrl = function (url) {
            var match = SourceMap._dataURLRegExp.exec(url);
            return match ? new SourceMap(/*mapFile*/ undefined, ts.sys.base64decode(match[1])) : undefined;
        };
        SourceMap.fromSource = function (text) {
            var url = this.getUrl(text);
            return url === undefined ? undefined : this.fromUrl(url);
        };
        SourceMap.prototype.getMappingsForEmittedLine = function (emittedLine) {
            return this._emittedLineMappings[emittedLine];
        };
        SourceMap.prototype.getMappingsForSourceLine = function (sourceIndex, sourceLine) {
            var mappingsForSource = this._sourceLineMappings[sourceIndex];
            return mappingsForSource && mappingsForSource[sourceLine];
        };
        SourceMap._decodeVLQ = function (text) {
            var vlq = [];
            var shift = 0;
            var value = 0;
            for (var i = 0; i < text.length; i++) {
                var currentByte = SourceMap._base64Chars.indexOf(text.charAt(i));
                value += (currentByte & 31) << shift;
                if ((currentByte & 32) === 0) {
                    vlq.push(value & 1 ? -(value >>> 1) : value >>> 1);
                    shift = 0;
                    value = 0;
                }
                else {
                    shift += 5;
                }
            }
            return vlq;
        };
        SourceMap._mappingRegExp = /([A-Za-z0-9+/]+),?|(;)|./g;
        SourceMap._sourceMappingURLRegExp = /^\/\/[#@]\s*sourceMappingURL\s*=\s*(.*?)\s*$/mig;
        SourceMap._dataURLRegExp = /^data:application\/json;base64,([a-z0-9+/=]+)$/i;
        SourceMap._base64Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        return SourceMap;
    }());
    documents.SourceMap = SourceMap;
})(documents || (documents = {}));
var vpath;
(function (vpath) {
    vpath.sep = ts.directorySeparator;
    vpath.normalizeSeparators = ts.normalizeSlashes;
    vpath.isAbsolute = ts.isRootedDiskPath;
    vpath.isRoot = ts.isDiskPathRoot;
    vpath.hasTrailingSeparator = ts.hasTrailingDirectorySeparator;
    vpath.addTrailingSeparator = ts.ensureTrailingDirectorySeparator;
    vpath.removeTrailingSeparator = ts.removeTrailingDirectorySeparator;
    vpath.normalize = ts.normalizePath;
    vpath.combine = ts.combinePaths;
    vpath.parse = ts.getPathComponents;
    vpath.reduce = ts.reducePathComponents;
    vpath.format = ts.getPathFromPathComponents;
    vpath.resolve = ts.resolvePath;
    vpath.compare = ts.comparePaths;
    vpath.compareCaseSensitive = ts.comparePathsCaseSensitive;
    vpath.compareCaseInsensitive = ts.comparePathsCaseInsensitive;
    vpath.dirname = ts.getDirectoryPath;
    vpath.basename = ts.getBaseFileName;
    vpath.extname = ts.getAnyExtensionFromPath;
    vpath.relative = ts.getRelativePathFromDirectory;
    vpath.beneath = ts.containsPath;
    vpath.changeExtension = ts.changeAnyExtension;
    vpath.isTypeScript = ts.hasTSFileExtension;
    vpath.isJavaScript = ts.hasJSFileExtension;
    var invalidRootComponentRegExp = /^(?!(\/|\/\/\w+\/|[a-zA-Z]:\/?|)$)/;
    var invalidNavigableComponentRegExp = /[:*?"<>|]/;
    var invalidNavigableComponentWithWildcardsRegExp = /[:"<>|]/;
    var invalidNonNavigableComponentRegExp = /^\.{1,2}$|[:*?"<>|]/;
    var invalidNonNavigableComponentWithWildcardsRegExp = /^\.{1,2}$|[:"<>|]/;
    var extRegExp = /\.\w+$/;
    var ValidationFlags;
    (function (ValidationFlags) {
        ValidationFlags[ValidationFlags["None"] = 0] = "None";
        ValidationFlags[ValidationFlags["RequireRoot"] = 1] = "RequireRoot";
        ValidationFlags[ValidationFlags["RequireDirname"] = 2] = "RequireDirname";
        ValidationFlags[ValidationFlags["RequireBasename"] = 4] = "RequireBasename";
        ValidationFlags[ValidationFlags["RequireExtname"] = 8] = "RequireExtname";
        ValidationFlags[ValidationFlags["RequireTrailingSeparator"] = 16] = "RequireTrailingSeparator";
        ValidationFlags[ValidationFlags["AllowRoot"] = 32] = "AllowRoot";
        ValidationFlags[ValidationFlags["AllowDirname"] = 64] = "AllowDirname";
        ValidationFlags[ValidationFlags["AllowBasename"] = 128] = "AllowBasename";
        ValidationFlags[ValidationFlags["AllowExtname"] = 256] = "AllowExtname";
        ValidationFlags[ValidationFlags["AllowTrailingSeparator"] = 512] = "AllowTrailingSeparator";
        ValidationFlags[ValidationFlags["AllowNavigation"] = 1024] = "AllowNavigation";
        ValidationFlags[ValidationFlags["AllowWildcard"] = 2048] = "AllowWildcard";
        /** Path must be a valid directory root */
        ValidationFlags[ValidationFlags["Root"] = 545] = "Root";
        /** Path must be a absolute */
        ValidationFlags[ValidationFlags["Absolute"] = 2017] = "Absolute";
        /** Path may be relative or absolute */
        ValidationFlags[ValidationFlags["RelativeOrAbsolute"] = 2016] = "RelativeOrAbsolute";
        /** Path may only be a filename */
        ValidationFlags[ValidationFlags["Basename"] = 260] = "Basename";
    })(ValidationFlags = vpath.ValidationFlags || (vpath.ValidationFlags = {}));
    function validateComponents(components, flags, hasTrailingSeparator) {
        var hasRoot = !!components[0];
        var hasDirname = components.length > 2;
        var hasBasename = components.length > 1;
        var hasExtname = hasBasename && extRegExp.test(components[components.length - 1]);
        var invalidComponentRegExp = flags & 1024 /* ValidationFlags.AllowNavigation */
            ? flags & 2048 /* ValidationFlags.AllowWildcard */ ? invalidNavigableComponentWithWildcardsRegExp : invalidNavigableComponentRegExp
            : flags & 2048 /* ValidationFlags.AllowWildcard */ ? invalidNonNavigableComponentWithWildcardsRegExp : invalidNonNavigableComponentRegExp;
        // Validate required components
        if (flags & 1 /* ValidationFlags.RequireRoot */ && !hasRoot)
            return false;
        if (flags & 2 /* ValidationFlags.RequireDirname */ && !hasDirname)
            return false;
        if (flags & 4 /* ValidationFlags.RequireBasename */ && !hasBasename)
            return false;
        if (flags & 8 /* ValidationFlags.RequireExtname */ && !hasExtname)
            return false;
        if (flags & 16 /* ValidationFlags.RequireTrailingSeparator */ && !hasTrailingSeparator)
            return false;
        // Required components indicate allowed components
        if (flags & 1 /* ValidationFlags.RequireRoot */)
            flags |= 32 /* ValidationFlags.AllowRoot */;
        if (flags & 2 /* ValidationFlags.RequireDirname */)
            flags |= 64 /* ValidationFlags.AllowDirname */;
        if (flags & 4 /* ValidationFlags.RequireBasename */)
            flags |= 128 /* ValidationFlags.AllowBasename */;
        if (flags & 8 /* ValidationFlags.RequireExtname */)
            flags |= 256 /* ValidationFlags.AllowExtname */;
        if (flags & 16 /* ValidationFlags.RequireTrailingSeparator */)
            flags |= 512 /* ValidationFlags.AllowTrailingSeparator */;
        // Validate disallowed components
        if (~flags & 32 /* ValidationFlags.AllowRoot */ && hasRoot)
            return false;
        if (~flags & 64 /* ValidationFlags.AllowDirname */ && hasDirname)
            return false;
        if (~flags & 128 /* ValidationFlags.AllowBasename */ && hasBasename)
            return false;
        if (~flags & 256 /* ValidationFlags.AllowExtname */ && hasExtname)
            return false;
        if (~flags & 512 /* ValidationFlags.AllowTrailingSeparator */ && hasTrailingSeparator)
            return false;
        // Validate component strings
        if (invalidRootComponentRegExp.test(components[0]))
            return false;
        for (var i = 1; i < components.length; i++) {
            if (invalidComponentRegExp.test(components[i]))
                return false;
        }
        return true;
    }
    function validate(path, flags) {
        if (flags === void 0) { flags = 2016 /* ValidationFlags.RelativeOrAbsolute */; }
        var components = vpath.parse(path);
        var trailing = vpath.hasTrailingSeparator(path);
        if (!validateComponents(components, flags, trailing))
            throw vfs.createIOError("ENOENT");
        return components.length > 1 && trailing ? vpath.format(vpath.reduce(components)) + vpath.sep : vpath.format(vpath.reduce(components));
    }
    vpath.validate = validate;
    function isDeclaration(path) {
        return ts.isDeclarationFileName(path);
    }
    vpath.isDeclaration = isDeclaration;
    function isSourceMap(path) {
        return vpath.extname(path, ".map", /*ignoreCase*/ false).length > 0;
    }
    vpath.isSourceMap = isSourceMap;
    var javaScriptSourceMapExtensions = [".js.map", ".jsx.map"];
    function isJavaScriptSourceMap(path) {
        return vpath.extname(path, javaScriptSourceMapExtensions, /*ignoreCase*/ false).length > 0;
    }
    vpath.isJavaScriptSourceMap = isJavaScriptSourceMap;
    function isJson(path) {
        return vpath.extname(path, ".json", /*ignoreCase*/ false).length > 0;
    }
    vpath.isJson = isJson;
    function isDefaultLibrary(path) {
        return isDeclaration(path)
            && vpath.basename(path).startsWith("lib.");
    }
    vpath.isDefaultLibrary = isDefaultLibrary;
    function isTsConfigFile(path) {
        return path.indexOf("tsconfig") !== -1 && path.indexOf("json") !== -1;
    }
    vpath.isTsConfigFile = isTsConfigFile;
})(vpath || (vpath = {}));
var vfs;
(function (vfs) {
    /**
     * Posix-style path to the TypeScript compiler build outputs (including tsc.js, lib.d.ts, etc.)
     */
    vfs.builtFolder = "/.ts";
    /**
     * Posix-style path to additional mountable folders (./tests/projects in this repo)
     */
    vfs.projectsFolder = "/.projects";
    /**
     * Posix-style path to additional test libraries
     */
    vfs.testLibFolder = "/.lib";
    /**
     * Posix-style path to sources under test
     */
    vfs.srcFolder = "/.src";
    // file type
    var S_IFMT = 61440; // file type
    var S_IFSOCK = 49152; // socket
    var S_IFLNK = 40960; // symbolic link
    var S_IFREG = 32768; // regular file
    var S_IFBLK = 24576; // block device
    var S_IFDIR = 16384; // directory
    var S_IFCHR = 8192; // character device
    var S_IFIFO = 4096; // FIFO
    var devCount = 0; // A monotonically increasing count of device ids
    var inoCount = 0; // A monotonically increasing count of inodes
    /**
     * Represents a virtual POSIX-like file system.
     */
    var FileSystem = /** @class */ (function () {
        function FileSystem(ignoreCase, options) {
            if (options === void 0) { options = {}; }
            // lazy-initialized state that should be mutable even if the FileSystem is frozen.
            this._lazy = {};
            var _a = options.time, time = _a === void 0 ? ts.TestFSWithWatch.timeIncrements : _a, files = options.files, meta = options.meta;
            this.ignoreCase = ignoreCase;
            this.stringComparer = this.ignoreCase ? vpath.compareCaseInsensitive : vpath.compareCaseSensitive;
            this._time = time;
            if (meta) {
                for (var _i = 0, _b = Object.keys(meta); _i < _b.length; _i++) {
                    var key = _b[_i];
                    this.meta.set(key, meta[key]);
                }
            }
            if (files) {
                this._applyFiles(files, /*dirname*/ "");
            }
            var cwd = options.cwd;
            if ((!cwd || !vpath.isRoot(cwd)) && this._lazy.links) {
                var iterator = collections.getIterator(this._lazy.links.keys());
                try {
                    for (var i = collections.nextResult(iterator); i; i = collections.nextResult(iterator)) {
                        var name = i.value;
                        cwd = cwd ? vpath.resolve(name, cwd) : name;
                        break;
                    }
                }
                finally {
                    collections.closeIterator(iterator);
                }
            }
            if (cwd) {
                vpath.validate(cwd, 2017 /* vpath.ValidationFlags.Absolute */);
                this.mkdirpSync(cwd);
            }
            this._cwd = cwd || "";
        }
        Object.defineProperty(FileSystem.prototype, "meta", {
            /**
             * Gets metadata for this `FileSystem`.
             */
            get: function () {
                if (!this._lazy.meta) {
                    this._lazy.meta = new collections.Metadata(this._shadowRoot ? this._shadowRoot.meta : undefined);
                }
                return this._lazy.meta;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(FileSystem.prototype, "isReadonly", {
            /**
             * Gets a value indicating whether the file system is read-only.
             */
            get: function () {
                return Object.isFrozen(this);
            },
            enumerable: false,
            configurable: true
        });
        /**
         * Makes the file system read-only.
         */
        FileSystem.prototype.makeReadonly = function () {
            Object.freeze(this);
            return this;
        };
        Object.defineProperty(FileSystem.prototype, "shadowRoot", {
            /**
             * Gets the file system shadowed by this file system.
             */
            get: function () {
                return this._shadowRoot;
            },
            enumerable: false,
            configurable: true
        });
        /**
         * Snapshots the current file system, effectively shadowing itself. This is useful for
         * generating file system patches using `.diff()` from one snapshot to the next. Performs
         * no action if this file system is read-only.
         */
        FileSystem.prototype.snapshot = function () {
            if (this.isReadonly)
                return;
            var fs = new FileSystem(this.ignoreCase, { time: this._time });
            fs._lazy = this._lazy;
            fs._cwd = this._cwd;
            fs._time = this._time;
            fs._shadowRoot = this._shadowRoot;
            fs._dirStack = this._dirStack;
            fs.makeReadonly();
            this._lazy = {};
            this._shadowRoot = fs;
        };
        /**
         * Gets a shadow copy of this file system. Changes to the shadow copy do not affect the
         * original, allowing multiple copies of the same core file system without multiple copies
         * of the same data.
         */
        FileSystem.prototype.shadow = function (ignoreCase) {
            if (ignoreCase === void 0) { ignoreCase = this.ignoreCase; }
            if (!this.isReadonly)
                throw new Error("Cannot shadow a mutable file system.");
            if (ignoreCase && !this.ignoreCase)
                throw new Error("Cannot create a case-insensitive file system from a case-sensitive one.");
            var fs = new FileSystem(ignoreCase, { time: this._time });
            fs._shadowRoot = this;
            fs._cwd = this._cwd;
            return fs;
        };
        /**
         * Gets or sets the timestamp (in milliseconds) used for file status, returning the previous timestamp.
         *
         * @link http://pubs.opengroup.org/onlinepubs/9699919799/functions/time.html
         */
        FileSystem.prototype.time = function (value) {
            if (value !== undefined) {
                if (this.isReadonly)
                    throw createIOError("EPERM");
                this._time = value;
            }
            else if (!this.isReadonly) {
                this._time += ts.TestFSWithWatch.timeIncrements;
            }
            return this._time;
        };
        /**
         * Gets the metadata object for a path.
         * @param path
         */
        FileSystem.prototype.filemeta = function (path) {
            var node = this._walk(this._resolve(path)).node;
            if (!node)
                throw createIOError("ENOENT");
            return this._filemeta(node);
        };
        FileSystem.prototype._filemeta = function (node) {
            if (!node.meta) {
                var parentMeta = node.shadowRoot && this._shadowRoot && this._shadowRoot._filemeta(node.shadowRoot);
                node.meta = new collections.Metadata(parentMeta);
            }
            return node.meta;
        };
        /**
         * Get the pathname of the current working directory.
         *
         * @link - http://pubs.opengroup.org/onlinepubs/9699919799/functions/getcwd.html
         */
        FileSystem.prototype.cwd = function () {
            if (!this._cwd)
                throw new Error("The current working directory has not been set.");
            var node = this._walk(this._cwd).node;
            if (!node)
                throw createIOError("ENOENT");
            if (!isDirectory(node))
                throw createIOError("ENOTDIR");
            return this._cwd;
        };
        /**
         * Changes the current working directory.
         *
         * @link http://pubs.opengroup.org/onlinepubs/9699919799/functions/chdir.html
         */
        FileSystem.prototype.chdir = function (path) {
            if (this.isReadonly)
                throw createIOError("EPERM");
            path = this._resolve(path);
            var node = this._walk(path).node;
            if (!node)
                throw createIOError("ENOENT");
            if (!isDirectory(node))
                throw createIOError("ENOTDIR");
            this._cwd = path;
        };
        /**
         * Pushes the current directory onto the directory stack and changes the current working directory to the supplied path.
         */
        FileSystem.prototype.pushd = function (path) {
            if (this.isReadonly)
                throw createIOError("EPERM");
            if (path)
                path = this._resolve(path);
            if (this._cwd) {
                if (!this._dirStack)
                    this._dirStack = [];
                this._dirStack.push(this._cwd);
            }
            if (path && path !== this._cwd) {
                this.chdir(path);
            }
        };
        /**
         * Pops the previous directory from the location stack and changes the current directory to that directory.
         */
        FileSystem.prototype.popd = function () {
            if (this.isReadonly)
                throw createIOError("EPERM");
            var path = this._dirStack && this._dirStack.pop();
            if (path) {
                this.chdir(path);
            }
        };
        /**
         * Update the file system with a set of files.
         */
        FileSystem.prototype.apply = function (files) {
            this._applyFiles(files, this._cwd);
        };
        /**
         * Scan file system entries along a path. If `path` is a symbolic link, it is dereferenced.
         * @param path The path at which to start the scan.
         * @param axis The axis along which to traverse.
         * @param traversal The traversal scheme to use.
         */
        FileSystem.prototype.scanSync = function (path, axis, traversal) {
            path = this._resolve(path);
            var results = [];
            this._scan(path, this._stat(this._walk(path)), axis, traversal, /*noFollow*/ false, results);
            return results;
        };
        /**
         * Scan file system entries along a path.
         * @param path The path at which to start the scan.
         * @param axis The axis along which to traverse.
         * @param traversal The traversal scheme to use.
         */
        FileSystem.prototype.lscanSync = function (path, axis, traversal) {
            path = this._resolve(path);
            var results = [];
            this._scan(path, this._stat(this._walk(path, /*noFollow*/ true)), axis, traversal, /*noFollow*/ true, results);
            return results;
        };
        FileSystem.prototype._scan = function (path, stats, axis, traversal, noFollow, results) {
            if (axis === "ancestors-or-self" || axis === "self" || axis === "descendants-or-self") {
                if (!traversal.accept || traversal.accept(path, stats)) {
                    results.push(path);
                }
            }
            if (axis === "ancestors-or-self" || axis === "ancestors") {
                var dirname = vpath.dirname(path);
                if (dirname !== path) {
                    try {
                        var stats_1 = this._stat(this._walk(dirname, noFollow));
                        if (!traversal.traverse || traversal.traverse(dirname, stats_1)) {
                            this._scan(dirname, stats_1, "ancestors-or-self", traversal, noFollow, results);
                        }
                    }
                    catch ( /*ignored*/_a) { /*ignored*/ }
                }
            }
            if (axis === "descendants-or-self" || axis === "descendants") {
                if (stats.isDirectory() && (!traversal.traverse || traversal.traverse(path, stats))) {
                    for (var _i = 0, _b = this.readdirSync(path); _i < _b.length; _i++) {
                        var file = _b[_i];
                        try {
                            var childpath = vpath.combine(path, file);
                            var stats_2 = this._stat(this._walk(childpath, noFollow));
                            this._scan(childpath, stats_2, "descendants-or-self", traversal, noFollow, results);
                        }
                        catch ( /*ignored*/_c) { /*ignored*/ }
                    }
                }
            }
        };
        /**
         * Mounts a physical or virtual file system at a location in this virtual file system.
         *
         * @param source The path in the physical (or other virtual) file system.
         * @param target The path in this virtual file system.
         * @param resolver An object used to resolve files in `source`.
         */
        FileSystem.prototype.mountSync = function (source, target, resolver) {
            if (this.isReadonly)
                throw createIOError("EROFS");
            source = vpath.validate(source, 2017 /* vpath.ValidationFlags.Absolute */);
            var _a = this._walk(this._resolve(target), /*noFollow*/ true), parent = _a.parent, links = _a.links, existingNode = _a.node, basename = _a.basename;
            if (existingNode)
                throw createIOError("EEXIST");
            var time = this.time();
            var node = this._mknod(parent ? parent.dev : ++devCount, S_IFDIR, /*mode*/ 511, time);
            node.source = source;
            node.resolver = resolver;
            this._addLink(parent, links, basename, node, time);
        };
        /**
         * Recursively remove all files and directories underneath the provided path.
         */
        FileSystem.prototype.rimrafSync = function (path) {
            try {
                var stats = this.lstatSync(path);
                if (stats.isFile() || stats.isSymbolicLink()) {
                    this.unlinkSync(path);
                }
                else if (stats.isDirectory()) {
                    for (var _i = 0, _a = this.readdirSync(path); _i < _a.length; _i++) {
                        var file = _a[_i];
                        this.rimrafSync(vpath.combine(path, file));
                    }
                    this.rmdirSync(path);
                }
            }
            catch (e) {
                if (e.code === "ENOENT")
                    return;
                throw e;
            }
        };
        /**
         * Make a directory and all of its parent paths (if they don't exist).
         */
        FileSystem.prototype.mkdirpSync = function (path) {
            var _this = this;
            path = this._resolve(path);
            var result = this._walk(path, /*noFollow*/ true, function (error, result) {
                if (error.code === "ENOENT") {
                    _this._mkdir(result);
                    return "retry";
                }
                return "throw";
            });
            if (!result.node)
                this._mkdir(result);
        };
        FileSystem.prototype.getFileListing = function () {
            var _this = this;
            var result = "";
            var printLinks = function (dirname, links) {
                var iterator = collections.getIterator(links);
                try {
                    for (var i = collections.nextResult(iterator); i; i = collections.nextResult(iterator)) {
                        var _a = i.value, name = _a[0], node = _a[1];
                        var path = dirname ? vpath.combine(dirname, name) : name;
                        var marker = vpath.compare(_this._cwd, path, _this.ignoreCase) === 0 ? "*" : " ";
                        if (result)
                            result += "\n";
                        result += marker;
                        if (isDirectory(node)) {
                            result += vpath.addTrailingSeparator(path);
                            printLinks(path, _this._getLinks(node));
                        }
                        else if (isFile(node)) {
                            result += path;
                        }
                        else if (isSymlink(node)) {
                            result += path + " -> " + node.symlink;
                        }
                    }
                }
                finally {
                    collections.closeIterator(iterator);
                }
            };
            printLinks(/*dirname*/ undefined, this._getRootLinks());
            return result;
        };
        /**
         * Print diagnostic information about the structure of the file system to the console.
         */
        FileSystem.prototype.debugPrint = function () {
            console.log(this.getFileListing());
        };
        // POSIX API (aligns with NodeJS "fs" module API)
        /**
         * Determines whether a path exists.
         */
        FileSystem.prototype.existsSync = function (path) {
            var result = this._walk(this._resolve(path), /*noFollow*/ true, function () { return "stop"; });
            return result !== undefined && result.node !== undefined;
        };
        /**
         * Get file status. If `path` is a symbolic link, it is dereferenced.
         *
         * @link http://pubs.opengroup.org/onlinepubs/9699919799/functions/stat.html
         *
         * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
         */
        FileSystem.prototype.statSync = function (path) {
            return this._stat(this._walk(this._resolve(path)));
        };
        /**
         * Change file access times
         *
         * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
         */
        FileSystem.prototype.utimesSync = function (path, atime, mtime) {
            if (this.isReadonly)
                throw createIOError("EROFS");
            if (!isFinite(+atime) || !isFinite(+mtime))
                throw createIOError("EINVAL");
            var entry = this._walk(this._resolve(path));
            if (!entry || !entry.node) {
                throw createIOError("ENOENT");
            }
            entry.node.atimeMs = +atime;
            entry.node.mtimeMs = +mtime;
            entry.node.ctimeMs = this.time();
        };
        /**
         * Get file status. If `path` is a symbolic link, it is dereferenced.
         *
         * @link http://pubs.opengroup.org/onlinepubs/9699919799/functions/lstat.html
         *
         * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
         */
        FileSystem.prototype.lstatSync = function (path) {
            return this._stat(this._walk(this._resolve(path), /*noFollow*/ true));
        };
        FileSystem.prototype._stat = function (entry) {
            var node = entry.node;
            if (!node)
                throw createIOError("ENOENT", entry.realpath);
            return new Stats(node.dev, node.ino, node.mode, node.nlink, 
            /*rdev*/ 0, 
            /*size*/ isFile(node) ? this._getSize(node) : isSymlink(node) ? node.symlink.length : 0, 
            /*blksize*/ 4096, 
            /*blocks*/ 0, node.atimeMs, node.mtimeMs, node.ctimeMs, node.birthtimeMs);
        };
        /**
         * Read a directory. If `path` is a symbolic link, it is dereferenced.
         *
         * @link http://pubs.opengroup.org/onlinepubs/9699919799/functions/readdir.html
         *
         * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
         */
        FileSystem.prototype.readdirSync = function (path) {
            var node = this._walk(this._resolve(path)).node;
            if (!node)
                throw createIOError("ENOENT");
            if (!isDirectory(node))
                throw createIOError("ENOTDIR");
            return Array.from(this._getLinks(node).keys());
        };
        /**
         * Make a directory.
         *
         * @link http://pubs.opengroup.org/onlinepubs/9699919799/functions/mkdir.html
         *
         * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
         */
        FileSystem.prototype.mkdirSync = function (path) {
            if (this.isReadonly)
                throw createIOError("EROFS");
            this._mkdir(this._walk(this._resolve(path), /*noFollow*/ true));
        };
        FileSystem.prototype._mkdir = function (_a) {
            var parent = _a.parent, links = _a.links, existingNode = _a.node, basename = _a.basename;
            if (existingNode)
                throw createIOError("EEXIST");
            var time = this.time();
            var node = this._mknod(parent ? parent.dev : ++devCount, S_IFDIR, /*mode*/ 511, time);
            this._addLink(parent, links, basename, node, time);
        };
        /**
         * Remove a directory.
         *
         * @link http://pubs.opengroup.org/onlinepubs/9699919799/functions/rmdir.html
         *
         * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
         */
        FileSystem.prototype.rmdirSync = function (path) {
            if (this.isReadonly)
                throw createIOError("EROFS");
            path = this._resolve(path);
            var _a = this._walk(path, /*noFollow*/ true), parent = _a.parent, links = _a.links, node = _a.node, basename = _a.basename;
            if (!parent)
                throw createIOError("EPERM");
            if (!isDirectory(node))
                throw createIOError("ENOTDIR");
            if (this._getLinks(node).size !== 0)
                throw createIOError("ENOTEMPTY");
            this._removeLink(parent, links, basename, node);
        };
        /**
         * Link one file to another file (also known as a "hard link").
         *
         * @link http://pubs.opengroup.org/onlinepubs/9699919799/functions/link.html
         *
         * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
         */
        FileSystem.prototype.linkSync = function (oldpath, newpath) {
            if (this.isReadonly)
                throw createIOError("EROFS");
            var node = this._walk(this._resolve(oldpath)).node;
            if (!node)
                throw createIOError("ENOENT");
            if (isDirectory(node))
                throw createIOError("EPERM");
            var _a = this._walk(this._resolve(newpath), /*noFollow*/ true), parent = _a.parent, links = _a.links, basename = _a.basename, existingNode = _a.node;
            if (!parent)
                throw createIOError("EPERM");
            if (existingNode)
                throw createIOError("EEXIST");
            this._addLink(parent, links, basename, node);
        };
        /**
         * Remove a directory entry.
         *
         * @link http://pubs.opengroup.org/onlinepubs/9699919799/functions/unlink.html
         *
         * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
         */
        FileSystem.prototype.unlinkSync = function (path) {
            if (this.isReadonly)
                throw createIOError("EROFS");
            var _a = this._walk(this._resolve(path), /*noFollow*/ true), parent = _a.parent, links = _a.links, node = _a.node, basename = _a.basename;
            if (!parent)
                throw createIOError("EPERM");
            if (!node)
                throw createIOError("ENOENT");
            if (isDirectory(node))
                throw createIOError("EISDIR");
            this._removeLink(parent, links, basename, node);
        };
        /**
         * Rename a file.
         *
         * @link http://pubs.opengroup.org/onlinepubs/9699919799/functions/rename.html
         *
         * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
         */
        FileSystem.prototype.renameSync = function (oldpath, newpath) {
            if (this.isReadonly)
                throw createIOError("EROFS");
            var _a = this._walk(this._resolve(oldpath), /*noFollow*/ true), oldParent = _a.parent, oldParentLinks = _a.links, node = _a.node, oldBasename = _a.basename;
            if (!oldParent)
                throw createIOError("EPERM");
            if (!node)
                throw createIOError("ENOENT");
            var _b = this._walk(this._resolve(newpath), /*noFollow*/ true), newParent = _b.parent, newParentLinks = _b.links, existingNode = _b.node, newBasename = _b.basename;
            if (!newParent)
                throw createIOError("EPERM");
            var time = this.time();
            if (existingNode) {
                if (isDirectory(node)) {
                    if (!isDirectory(existingNode))
                        throw createIOError("ENOTDIR");
                    // if both old and new arguments point to the same directory, just pass. So we could rename /src/a/1 to /src/A/1 in Win.
                    // if not and the directory pointed by the new path is not empty, throw an error.
                    if (this.stringComparer(oldpath, newpath) !== 0 && this._getLinks(existingNode).size > 0)
                        throw createIOError("ENOTEMPTY");
                }
                else {
                    if (isDirectory(existingNode))
                        throw createIOError("EISDIR");
                }
                this._removeLink(newParent, newParentLinks, newBasename, existingNode, time);
            }
            this._replaceLink(oldParent, oldParentLinks, oldBasename, newParent, newParentLinks, newBasename, node, time);
        };
        /**
         * Make a symbolic link.
         *
         * @link http://pubs.opengroup.org/onlinepubs/9699919799/functions/symlink.html
         *
         * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
         */
        FileSystem.prototype.symlinkSync = function (target, linkpath) {
            if (this.isReadonly)
                throw createIOError("EROFS");
            var _a = this._walk(this._resolve(linkpath), /*noFollow*/ true), parent = _a.parent, links = _a.links, existingNode = _a.node, basename = _a.basename;
            if (!parent)
                throw createIOError("EPERM");
            if (existingNode)
                throw createIOError("EEXIST");
            var time = this.time();
            var node = this._mknod(parent.dev, S_IFLNK, /*mode*/ 438, time);
            node.symlink = vpath.validate(target, 2016 /* vpath.ValidationFlags.RelativeOrAbsolute */);
            this._addLink(parent, links, basename, node, time);
        };
        /**
         * Resolve a pathname.
         *
         * @link http://pubs.opengroup.org/onlinepubs/9699919799/functions/realpath.html
         *
         * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
         */
        FileSystem.prototype.realpathSync = function (path) {
            var realpath = this._walk(this._resolve(path)).realpath;
            return realpath;
        };
        FileSystem.prototype.readFileSync = function (path, encoding) {
            if (encoding === void 0) { encoding = null; }
            var node = this._walk(this._resolve(path)).node;
            if (!node)
                throw createIOError("ENOENT");
            if (isDirectory(node))
                throw createIOError("EISDIR");
            if (!isFile(node))
                throw createIOError("EBADF");
            var buffer = this._getBuffer(node).slice();
            return encoding ? buffer.toString(encoding) : buffer;
        };
        /**
         * Write to a file.
         *
         * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
         */
        // eslint-disable-next-line no-null/no-null
        FileSystem.prototype.writeFileSync = function (path, data, encoding) {
            if (encoding === void 0) { encoding = null; }
            if (this.isReadonly)
                throw createIOError("EROFS");
            var _a = this._walk(this._resolve(path), /*noFollow*/ false), parent = _a.parent, links = _a.links, existingNode = _a.node, basename = _a.basename;
            if (!parent)
                throw createIOError("EPERM");
            var time = this.time();
            var node = existingNode;
            if (!node) {
                node = this._mknod(parent.dev, S_IFREG, 438, time);
                this._addLink(parent, links, basename, node, time);
            }
            if (isDirectory(node))
                throw createIOError("EISDIR");
            if (!isFile(node))
                throw createIOError("EBADF");
            node.buffer = Buffer.isBuffer(data) ? data.slice() : ts.sys.bufferFrom("" + data, encoding || "utf8");
            node.size = node.buffer.byteLength;
            node.mtimeMs = time;
            node.ctimeMs = time;
        };
        /**
         * Generates a `FileSet` patch containing all the entries in this `FileSystem` that are not in `base`.
         * @param base The base file system. If not provided, this file system's `shadowRoot` is used (if present).
         */
        FileSystem.prototype.diff = function (base, options) {
            if (options === void 0) { options = {}; }
            if (!base && !options.baseIsNotShadowRoot)
                base = this.shadowRoot;
            var differences = {};
            var hasDifferences = base ?
                FileSystem.rootDiff(differences, this, base, options) :
                FileSystem.trackCreatedInodes(differences, this, this._getRootLinks());
            return hasDifferences ? differences : undefined;
        };
        /**
         * Generates a `FileSet` patch containing all the entries in `changed` that are not in `base`.
         */
        FileSystem.diff = function (changed, base, options) {
            if (options === void 0) { options = {}; }
            var differences = {};
            return FileSystem.rootDiff(differences, changed, base, options) ?
                differences :
                undefined;
        };
        FileSystem.diffWorker = function (container, changed, changedLinks, base, baseLinks, options) {
            if (changedLinks && !baseLinks)
                return FileSystem.trackCreatedInodes(container, changed, changedLinks);
            if (baseLinks && !changedLinks)
                return FileSystem.trackDeletedInodes(container, baseLinks);
            if (changedLinks && baseLinks) {
                var hasChanges_1 = false;
                // track base items missing in changed
                baseLinks.forEach(function (node, basename) {
                    if (!changedLinks.has(basename)) {
                        container[basename] = isDirectory(node) ? new Rmdir() : new Unlink();
                        hasChanges_1 = true;
                    }
                });
                // track changed items missing or differing in base
                changedLinks.forEach(function (changedNode, basename) {
                    var baseNode = baseLinks.get(basename);
                    if (baseNode) {
                        if (isDirectory(changedNode) && isDirectory(baseNode)) {
                            return hasChanges_1 = FileSystem.directoryDiff(container, basename, changed, changedNode, base, baseNode, options) || hasChanges_1;
                        }
                        if (isFile(changedNode) && isFile(baseNode)) {
                            return hasChanges_1 = FileSystem.fileDiff(container, basename, changed, changedNode, base, baseNode, options) || hasChanges_1;
                        }
                        if (isSymlink(changedNode) && isSymlink(baseNode)) {
                            return hasChanges_1 = FileSystem.symlinkDiff(container, basename, changedNode, baseNode) || hasChanges_1;
                        }
                    }
                    return hasChanges_1 = FileSystem.trackCreatedInode(container, basename, changed, changedNode) || hasChanges_1;
                });
                return hasChanges_1;
            }
            return false;
        };
        FileSystem.rootDiff = function (container, changed, base, options) {
            while (!changed._lazy.links && changed._shadowRoot)
                changed = changed._shadowRoot;
            while (!base._lazy.links && base._shadowRoot)
                base = base._shadowRoot;
            // no difference if the file systems are the same reference
            if (changed === base)
                return false;
            // no difference if the root links are empty and unshadowed
            if (!changed._lazy.links && !changed._shadowRoot && !base._lazy.links && !base._shadowRoot)
                return false;
            return FileSystem.diffWorker(container, changed, changed._getRootLinks(), base, base._getRootLinks(), options);
        };
        FileSystem.directoryDiff = function (container, basename, changed, changedNode, base, baseNode, options) {
            while (!changedNode.links && changedNode.shadowRoot)
                changedNode = changedNode.shadowRoot;
            while (!baseNode.links && baseNode.shadowRoot)
                baseNode = baseNode.shadowRoot;
            // no difference if the nodes are the same reference
            if (changedNode === baseNode)
                return false;
            // no difference if both nodes are non shadowed and have no entries
            if (isEmptyNonShadowedDirectory(changedNode) && isEmptyNonShadowedDirectory(baseNode))
                return false;
            // no difference if both nodes are unpopulated and point to the same mounted file system
            if (!changedNode.links && !baseNode.links &&
                changedNode.resolver && changedNode.source !== undefined &&
                baseNode.resolver === changedNode.resolver && baseNode.source === changedNode.source)
                return false;
            // no difference if both nodes have identical children
            var children = {};
            if (!FileSystem.diffWorker(children, changed, changed._getLinks(changedNode), base, base._getLinks(baseNode), options)) {
                return false;
            }
            container[basename] = new Directory(children);
            return true;
        };
        FileSystem.fileDiff = function (container, basename, changed, changedNode, base, baseNode, options) {
            while (!changedNode.buffer && changedNode.shadowRoot)
                changedNode = changedNode.shadowRoot;
            while (!baseNode.buffer && baseNode.shadowRoot)
                baseNode = baseNode.shadowRoot;
            // no difference if the nodes are the same reference
            if (changedNode === baseNode)
                return false;
            // no difference if both nodes are non shadowed and have no entries
            if (isEmptyNonShadowedFile(changedNode) && isEmptyNonShadowedFile(baseNode))
                return false;
            // no difference if both nodes are unpopulated and point to the same mounted file system
            if (!changedNode.buffer && !baseNode.buffer &&
                changedNode.resolver && changedNode.source !== undefined &&
                baseNode.resolver === changedNode.resolver && baseNode.source === changedNode.source)
                return false;
            var changedBuffer = changed._getBuffer(changedNode);
            var baseBuffer = base._getBuffer(baseNode);
            // no difference if both buffers are the same reference
            if (changedBuffer === baseBuffer) {
                if (!options.includeChangedFileWithSameContent || changedNode.mtimeMs === baseNode.mtimeMs)
                    return false;
                container[basename] = new SameFileWithModifiedTime(changedBuffer);
                return true;
            }
            // no difference if both buffers are identical
            if (Buffer.compare(changedBuffer, baseBuffer) === 0) {
                if (!options.includeChangedFileWithSameContent)
                    return false;
                container[basename] = new SameFileContentFile(changedBuffer);
                return true;
            }
            container[basename] = new File(changedBuffer);
            return true;
        };
        FileSystem.symlinkDiff = function (container, basename, changedNode, baseNode) {
            // no difference if the nodes are the same reference
            if (changedNode.symlink === baseNode.symlink)
                return false;
            container[basename] = new Symlink(changedNode.symlink);
            return true;
        };
        FileSystem.trackCreatedInode = function (container, basename, changed, node) {
            if (isDirectory(node)) {
                var children = {};
                FileSystem.trackCreatedInodes(children, changed, changed._getLinks(node));
                container[basename] = new Directory(children);
            }
            else if (isSymlink(node)) {
                container[basename] = new Symlink(node.symlink);
            }
            else {
                container[basename] = new File(changed._getBuffer(node));
            }
            return true;
        };
        FileSystem.trackCreatedInodes = function (container, changed, changedLinks) {
            // no difference if links are empty
            if (!changedLinks.size)
                return false;
            changedLinks.forEach(function (node, basename) {
                FileSystem.trackCreatedInode(container, basename, changed, node);
            });
            return true;
        };
        FileSystem.trackDeletedInodes = function (container, baseLinks) {
            // no difference if links are empty
            if (!baseLinks.size)
                return false;
            baseLinks.forEach(function (node, basename) {
                container[basename] = isDirectory(node) ? new Rmdir() : new Unlink();
            });
            return true;
        };
        FileSystem.prototype._mknod = function (dev, type, mode, time) {
            if (time === void 0) { time = this.time(); }
            return {
                dev: dev,
                ino: ++inoCount,
                mode: (mode & ~S_IFMT & ~18 & 4095) | (type & S_IFMT),
                atimeMs: time,
                mtimeMs: time,
                ctimeMs: time,
                birthtimeMs: time,
                nlink: 0
            };
        };
        FileSystem.prototype._addLink = function (parent, links, name, node, time) {
            if (time === void 0) { time = this.time(); }
            links.set(name, node);
            node.nlink++;
            node.ctimeMs = time;
            if (parent)
                parent.mtimeMs = time;
            if (!parent && !this._cwd)
                this._cwd = name;
        };
        FileSystem.prototype._removeLink = function (parent, links, name, node, time) {
            if (time === void 0) { time = this.time(); }
            links.delete(name);
            node.nlink--;
            node.ctimeMs = time;
            if (parent)
                parent.mtimeMs = time;
        };
        FileSystem.prototype._replaceLink = function (oldParent, oldLinks, oldName, newParent, newLinks, newName, node, time) {
            if (oldParent !== newParent) {
                this._removeLink(oldParent, oldLinks, oldName, node, time);
                this._addLink(newParent, newLinks, newName, node, time);
            }
            else {
                oldLinks.delete(oldName);
                oldLinks.set(newName, node);
                oldParent.mtimeMs = time;
                newParent.mtimeMs = time;
            }
        };
        FileSystem.prototype._getRootLinks = function () {
            if (!this._lazy.links) {
                this._lazy.links = new collections.SortedMap(this.stringComparer);
                if (this._shadowRoot) {
                    this._copyShadowLinks(this._shadowRoot._getRootLinks(), this._lazy.links);
                }
            }
            return this._lazy.links;
        };
        FileSystem.prototype._getLinks = function (node) {
            if (!node.links) {
                var links = new collections.SortedMap(this.stringComparer);
                var source = node.source, resolver = node.resolver;
                if (source && resolver) {
                    node.source = undefined;
                    node.resolver = undefined;
                    for (var _i = 0, _a = resolver.readdirSync(source); _i < _a.length; _i++) {
                        var name = _a[_i];
                        var path = vpath.combine(source, name);
                        var stats = resolver.statSync(path);
                        switch (stats.mode & S_IFMT) {
                            case S_IFDIR:
                                var dir = this._mknod(node.dev, S_IFDIR, 511);
                                dir.source = vpath.combine(source, name);
                                dir.resolver = resolver;
                                this._addLink(node, links, name, dir);
                                break;
                            case S_IFREG:
                                var file = this._mknod(node.dev, S_IFREG, 438);
                                file.source = vpath.combine(source, name);
                                file.resolver = resolver;
                                file.size = stats.size;
                                this._addLink(node, links, name, file);
                                break;
                        }
                    }
                }
                else if (this._shadowRoot && node.shadowRoot) {
                    this._copyShadowLinks(this._shadowRoot._getLinks(node.shadowRoot), links);
                }
                node.links = links;
            }
            return node.links;
        };
        FileSystem.prototype._getShadow = function (root) {
            var shadows = this._lazy.shadows || (this._lazy.shadows = new Map());
            var shadow = shadows.get(root.ino);
            if (!shadow) {
                shadow = {
                    dev: root.dev,
                    ino: root.ino,
                    mode: root.mode,
                    atimeMs: root.atimeMs,
                    mtimeMs: root.mtimeMs,
                    ctimeMs: root.ctimeMs,
                    birthtimeMs: root.birthtimeMs,
                    nlink: root.nlink,
                    shadowRoot: root
                };
                if (isSymlink(root))
                    shadow.symlink = root.symlink;
                shadows.set(shadow.ino, shadow);
            }
            return shadow;
        };
        FileSystem.prototype._copyShadowLinks = function (source, target) {
            var iterator = collections.getIterator(source);
            try {
                for (var i = collections.nextResult(iterator); i; i = collections.nextResult(iterator)) {
                    var _a = i.value, name = _a[0], root = _a[1];
                    target.set(name, this._getShadow(root));
                }
            }
            finally {
                collections.closeIterator(iterator);
            }
        };
        FileSystem.prototype._getSize = function (node) {
            if (node.buffer)
                return node.buffer.byteLength;
            if (node.size !== undefined)
                return node.size;
            if (node.source && node.resolver)
                return node.size = node.resolver.statSync(node.source).size;
            if (this._shadowRoot && node.shadowRoot)
                return node.size = this._shadowRoot._getSize(node.shadowRoot);
            return 0;
        };
        FileSystem.prototype._getBuffer = function (node) {
            if (!node.buffer) {
                var source = node.source, resolver = node.resolver;
                if (source && resolver) {
                    node.source = undefined;
                    node.resolver = undefined;
                    node.size = undefined;
                    node.buffer = resolver.readFileSync(source);
                }
                else if (this._shadowRoot && node.shadowRoot) {
                    node.buffer = this._shadowRoot._getBuffer(node.shadowRoot);
                }
                else {
                    node.buffer = Buffer.allocUnsafe(0);
                }
            }
            return node.buffer;
        };
        FileSystem.prototype._walk = function (path, noFollow, onError) {
            var links = this._getRootLinks();
            var parent;
            var components = vpath.parse(path);
            var step = 0;
            var depth = 0;
            var retry = false;
            while (true) {
                if (depth >= 40)
                    throw createIOError("ELOOP");
                var lastStep = step === components.length - 1;
                var basename = components[step];
                var linkEntry = links.getEntry(basename);
                if (linkEntry) {
                    components[step] = basename = linkEntry[0];
                }
                var node = linkEntry === null || linkEntry === void 0 ? void 0 : linkEntry[1];
                if (lastStep && (noFollow || !isSymlink(node))) {
                    return { realpath: vpath.format(components), basename: basename, parent: parent, links: links, node: node };
                }
                if (node === undefined) {
                    if (trapError(createIOError("ENOENT"), node))
                        continue;
                    return undefined;
                }
                if (isSymlink(node)) {
                    var dirname = vpath.format(components.slice(0, step));
                    var symlink = vpath.resolve(dirname, node.symlink);
                    links = this._getRootLinks();
                    parent = undefined;
                    components = vpath.parse(symlink).concat(components.slice(step + 1));
                    step = 0;
                    depth++;
                    retry = false;
                    continue;
                }
                if (isDirectory(node)) {
                    links = this._getLinks(node);
                    parent = node;
                    step++;
                    retry = false;
                    continue;
                }
                if (trapError(createIOError("ENOTDIR"), node))
                    continue;
                return undefined;
            }
            function trapError(error, node) {
                var realpath = vpath.format(components.slice(0, step + 1));
                var basename = components[step];
                var result = !retry && onError ? onError(error, { realpath: realpath, basename: basename, parent: parent, links: links, node: node }) : "throw";
                if (result === "stop")
                    return false;
                if (result === "retry") {
                    retry = true;
                    return true;
                }
                throw error;
            }
        };
        /**
         * Resolve a path relative to the current working directory.
         */
        FileSystem.prototype._resolve = function (path) {
            return this._cwd
                ? vpath.resolve(this._cwd, vpath.validate(path, 2016 /* vpath.ValidationFlags.RelativeOrAbsolute */ | 2048 /* vpath.ValidationFlags.AllowWildcard */))
                : vpath.validate(path, 2017 /* vpath.ValidationFlags.Absolute */ | 2048 /* vpath.ValidationFlags.AllowWildcard */);
        };
        FileSystem.prototype._applyFiles = function (files, dirname) {
            var deferred = [];
            this._applyFilesWorker(files, dirname, deferred);
            for (var _i = 0, deferred_1 = deferred; _i < deferred_1.length; _i++) {
                var _a = deferred_1[_i], entry = _a[0], path = _a[1];
                this.mkdirpSync(vpath.dirname(path));
                this.pushd(vpath.dirname(path));
                if (entry instanceof Symlink) {
                    if (this.stringComparer(vpath.dirname(path), path) === 0) {
                        throw new TypeError("Roots cannot be symbolic links.");
                    }
                    this.symlinkSync(vpath.resolve(dirname, entry.symlink), path);
                    this._applyFileExtendedOptions(path, entry);
                }
                else if (entry instanceof Link) {
                    if (this.stringComparer(vpath.dirname(path), path) === 0) {
                        throw new TypeError("Roots cannot be hard links.");
                    }
                    this.linkSync(entry.path, path);
                }
                else {
                    this.mountSync(entry.source, path, entry.resolver);
                    this._applyFileExtendedOptions(path, entry);
                }
                this.popd();
            }
        };
        FileSystem.prototype._applyFileExtendedOptions = function (path, entry) {
            var meta = entry.meta;
            if (meta !== undefined) {
                var filemeta = this.filemeta(path);
                for (var _i = 0, _a = Object.keys(meta); _i < _a.length; _i++) {
                    var key = _a[_i];
                    filemeta.set(key, meta[key]);
                }
            }
        };
        FileSystem.prototype._applyFilesWorker = function (files, dirname, deferred) {
            for (var _i = 0, _a = Object.keys(files); _i < _a.length; _i++) {
                var key = _a[_i];
                var value = normalizeFileSetEntry(files[key]);
                var path = dirname ? vpath.resolve(dirname, key) : key;
                vpath.validate(path, 2017 /* vpath.ValidationFlags.Absolute */);
                // eslint-disable-next-line no-null/no-null
                if (value === null || value === undefined || value instanceof Rmdir || value instanceof Unlink) {
                    if (this.stringComparer(vpath.dirname(path), path) === 0) {
                        throw new TypeError("Roots cannot be deleted.");
                    }
                    this.rimrafSync(path);
                }
                else if (value instanceof File) {
                    if (this.stringComparer(vpath.dirname(path), path) === 0) {
                        throw new TypeError("Roots cannot be files.");
                    }
                    this.mkdirpSync(vpath.dirname(path));
                    this.writeFileSync(path, value.data, value.encoding);
                    this._applyFileExtendedOptions(path, value);
                }
                else if (value instanceof Directory) {
                    this.mkdirpSync(path);
                    this._applyFileExtendedOptions(path, value);
                    this._applyFilesWorker(value.files, path, deferred);
                }
                else {
                    deferred.push([value, path]);
                }
            }
        };
        return FileSystem;
    }());
    vfs.FileSystem = FileSystem;
    function createResolver(host) {
        return {
            readdirSync: function (path) {
                var _a = host.getAccessibleFileSystemEntries(path), files = _a.files, directories = _a.directories;
                return directories.concat(files);
            },
            statSync: function (path) {
                if (host.directoryExists(path)) {
                    return { mode: S_IFDIR | 511, size: 0 };
                }
                else if (host.fileExists(path)) {
                    return { mode: S_IFREG | 438, size: host.getFileSize(path) };
                }
                else {
                    throw new Error("ENOENT: path does not exist");
                }
            },
            readFileSync: function (path) {
                return ts.sys.bufferFrom(host.readFile(path), "utf8"); // TODO: GH#18217
            }
        };
    }
    vfs.createResolver = createResolver;
    /**
     * Create a virtual file system from a physical file system using the following path mappings:
     *
     *  - `/.ts` is a directory mapped to `${workspaceRoot}/built/local`
     *  - `/.lib` is a directory mapped to `${workspaceRoot}/tests/lib`
     *  - `/.src` is a virtual directory to be used for tests.
     *
     * Unless overridden, `/.src` will be the current working directory for the virtual file system.
     */
    function createFromFileSystem(host, ignoreCase, _a) {
        var _b = _a === void 0 ? {} : _a, documents = _b.documents, files = _b.files, cwd = _b.cwd, time = _b.time, meta = _b.meta;
        var fs = getBuiltLocal(host, ignoreCase).shadow();
        if (meta) {
            for (var _i = 0, _c = Object.keys(meta); _i < _c.length; _i++) {
                var key = _c[_i];
                fs.meta.set(key, meta[key]);
            }
        }
        if (time) {
            fs.time(time);
        }
        if (cwd) {
            fs.mkdirpSync(cwd);
            fs.chdir(cwd);
        }
        if (documents) {
            for (var _d = 0, documents_1 = documents; _d < documents_1.length; _d++) {
                var document = documents_1[_d];
                fs.mkdirpSync(vpath.dirname(document.file));
                fs.writeFileSync(document.file, document.text, "utf8");
                fs.filemeta(document.file).set("document", document);
                // Add symlinks
                var symlink = document.meta.get("symlink");
                if (symlink) {
                    for (var _e = 0, _f = symlink.split(",").map(function (link) { return link.trim(); }); _e < _f.length; _e++) {
                        var link = _f[_e];
                        fs.mkdirpSync(vpath.dirname(link));
                        fs.symlinkSync(vpath.resolve(fs.cwd(), document.file), link);
                    }
                }
            }
        }
        if (files) {
            fs.apply(files);
        }
        return fs;
    }
    vfs.createFromFileSystem = createFromFileSystem;
    var Stats = /** @class */ (function () {
        function Stats(dev, ino, mode, nlink, rdev, size, blksize, blocks, atimeMs, mtimeMs, ctimeMs, birthtimeMs) {
            if (dev === void 0) { dev = 0; }
            if (ino === void 0) { ino = 0; }
            if (mode === void 0) { mode = 0; }
            if (nlink === void 0) { nlink = 0; }
            if (rdev === void 0) { rdev = 0; }
            if (size === void 0) { size = 0; }
            if (blksize === void 0) { blksize = 0; }
            if (blocks === void 0) { blocks = 0; }
            if (atimeMs === void 0) { atimeMs = 0; }
            if (mtimeMs === void 0) { mtimeMs = 0; }
            if (ctimeMs === void 0) { ctimeMs = 0; }
            if (birthtimeMs === void 0) { birthtimeMs = 0; }
            this.dev = dev;
            this.ino = ino;
            this.mode = mode;
            this.nlink = nlink;
            this.uid = 0;
            this.gid = 0;
            this.rdev = rdev;
            this.size = size;
            this.blksize = blksize;
            this.blocks = blocks;
            this.atimeMs = atimeMs;
            this.mtimeMs = mtimeMs;
            this.ctimeMs = ctimeMs;
            this.birthtimeMs = birthtimeMs;
            this.atime = new Date(this.atimeMs);
            this.mtime = new Date(this.mtimeMs);
            this.ctime = new Date(this.ctimeMs);
            this.birthtime = new Date(this.birthtimeMs);
        }
        Stats.prototype.isFile = function () { return (this.mode & S_IFMT) === S_IFREG; };
        Stats.prototype.isDirectory = function () { return (this.mode & S_IFMT) === S_IFDIR; };
        Stats.prototype.isSymbolicLink = function () { return (this.mode & S_IFMT) === S_IFLNK; };
        Stats.prototype.isBlockDevice = function () { return (this.mode & S_IFMT) === S_IFBLK; };
        Stats.prototype.isCharacterDevice = function () { return (this.mode & S_IFMT) === S_IFCHR; };
        Stats.prototype.isFIFO = function () { return (this.mode & S_IFMT) === S_IFIFO; };
        Stats.prototype.isSocket = function () { return (this.mode & S_IFMT) === S_IFSOCK; };
        return Stats;
    }());
    vfs.Stats = Stats;
    vfs.IOErrorMessages = Object.freeze({
        EACCES: "access denied",
        EIO: "an I/O error occurred",
        ENOENT: "no such file or directory",
        EEXIST: "file already exists",
        ELOOP: "too many symbolic links encountered",
        ENOTDIR: "no such directory",
        EISDIR: "path is a directory",
        EBADF: "invalid file descriptor",
        EINVAL: "invalid value",
        ENOTEMPTY: "directory not empty",
        EPERM: "operation not permitted",
        EROFS: "file system is read-only"
    });
    function createIOError(code, details) {
        if (details === void 0) { details = ""; }
        var err = new Error("".concat(code, ": ").concat(vfs.IOErrorMessages[code], " ").concat(details));
        err.code = code;
        if (Error.captureStackTrace)
            Error.captureStackTrace(err, createIOError);
        return err;
    }
    vfs.createIOError = createIOError;
    /** Extended options for a directory in a `FileSet` */
    var Directory = /** @class */ (function () {
        function Directory(files, _a) {
            var _b = _a === void 0 ? {} : _a, meta = _b.meta;
            this.files = files;
            this.meta = meta;
        }
        return Directory;
    }());
    vfs.Directory = Directory;
    /** Extended options for a file in a `FileSet` */
    var File = /** @class */ (function () {
        function File(data, _a) {
            var _b = _a === void 0 ? {} : _a, meta = _b.meta, encoding = _b.encoding;
            this.data = data;
            this.encoding = encoding;
            this.meta = meta;
        }
        return File;
    }());
    vfs.File = File;
    var SameFileContentFile = /** @class */ (function (_super) {
        __extends(SameFileContentFile, _super);
        function SameFileContentFile(data, metaAndEncoding) {
            return _super.call(this, data, metaAndEncoding) || this;
        }
        return SameFileContentFile;
    }(File));
    vfs.SameFileContentFile = SameFileContentFile;
    var SameFileWithModifiedTime = /** @class */ (function (_super) {
        __extends(SameFileWithModifiedTime, _super);
        function SameFileWithModifiedTime(data, metaAndEncoding) {
            return _super.call(this, data, metaAndEncoding) || this;
        }
        return SameFileWithModifiedTime;
    }(File));
    vfs.SameFileWithModifiedTime = SameFileWithModifiedTime;
    /** Extended options for a hard link in a `FileSet` */
    var Link = /** @class */ (function () {
        function Link(path) {
            this.path = path;
        }
        return Link;
    }());
    vfs.Link = Link;
    /** Removes a directory in a `FileSet` */
    var Rmdir = /** @class */ (function () {
        function Rmdir() {
        }
        return Rmdir;
    }());
    vfs.Rmdir = Rmdir;
    /** Unlinks a file in a `FileSet` */
    var Unlink = /** @class */ (function () {
        function Unlink() {
        }
        return Unlink;
    }());
    vfs.Unlink = Unlink;
    /** Extended options for a symbolic link in a `FileSet` */
    var Symlink = /** @class */ (function () {
        function Symlink(symlink, _a) {
            var _b = _a === void 0 ? {} : _a, meta = _b.meta;
            this.symlink = symlink;
            this.meta = meta;
        }
        return Symlink;
    }());
    vfs.Symlink = Symlink;
    /** Extended options for mounting a virtual copy of an external file system via a `FileSet` */
    var Mount = /** @class */ (function () {
        function Mount(source, resolver, _a) {
            var _b = _a === void 0 ? {} : _a, meta = _b.meta;
            this.source = source;
            this.resolver = resolver;
            this.meta = meta;
        }
        return Mount;
    }());
    vfs.Mount = Mount;
    function isEmptyNonShadowedDirectory(node) {
        return !node.links && !node.shadowRoot && !node.resolver && !node.source;
    }
    function isEmptyNonShadowedFile(node) {
        return !node.buffer && !node.shadowRoot && !node.resolver && !node.source;
    }
    function isFile(node) {
        return node !== undefined && (node.mode & S_IFMT) === S_IFREG;
    }
    function isDirectory(node) {
        return node !== undefined && (node.mode & S_IFMT) === S_IFDIR;
    }
    function isSymlink(node) {
        return node !== undefined && (node.mode & S_IFMT) === S_IFLNK;
    }
    var builtLocalHost;
    var builtLocalCI;
    var builtLocalCS;
    function getBuiltLocal(host, ignoreCase) {
        var _a;
        if (builtLocalHost !== host) {
            builtLocalCI = undefined;
            builtLocalCS = undefined;
            builtLocalHost = host;
        }
        if (!builtLocalCI) {
            var resolver = createResolver(host);
            builtLocalCI = new FileSystem(/*ignoreCase*/ true, {
                files: (_a = {},
                    _a[vfs.builtFolder] = new Mount(vpath.resolve(host.getWorkspaceRoot(), "built/local"), resolver),
                    _a[vfs.testLibFolder] = new Mount(vpath.resolve(host.getWorkspaceRoot(), "tests/lib"), resolver),
                    _a[vfs.projectsFolder] = new Mount(vpath.resolve(host.getWorkspaceRoot(), "tests/projects"), resolver),
                    _a[vfs.srcFolder] = {},
                    _a),
                cwd: vfs.srcFolder,
                meta: { defaultLibLocation: vfs.builtFolder }
            });
            builtLocalCI.makeReadonly();
        }
        if (ignoreCase)
            return builtLocalCI;
        if (!builtLocalCS) {
            builtLocalCS = builtLocalCI.shadow(/*ignoreCase*/ false);
            builtLocalCS.makeReadonly();
        }
        return builtLocalCS;
    }
    /* eslint-disable no-null/no-null */
    function normalizeFileSetEntry(value) {
        if (value === undefined ||
            value === null ||
            value instanceof Directory ||
            value instanceof File ||
            value instanceof Link ||
            value instanceof Symlink ||
            value instanceof Mount ||
            value instanceof Rmdir ||
            value instanceof Unlink) {
            return value;
        }
        return typeof value === "string" || Buffer.isBuffer(value) ? new File(value) : new Directory(value);
    }
    function formatPatch(patch) {
        return patch ? formatPatchWorker("", patch) : null;
    }
    vfs.formatPatch = formatPatch;
    /* eslint-enable no-null/no-null */
    function formatPatchWorker(dirname, container) {
        var text = "";
        for (var _i = 0, _a = Object.keys(container); _i < _a.length; _i++) {
            var name = _a[_i];
            var entry = normalizeFileSetEntry(container[name]);
            var file = dirname ? vpath.combine(dirname, name) : name;
            // eslint-disable-next-line no-null/no-null
            if (entry === null || entry === undefined || entry instanceof Unlink) {
                text += "//// [".concat(file, "] unlink\r\n");
            }
            else if (entry instanceof Rmdir) {
                text += "//// [".concat(vpath.addTrailingSeparator(file), "] rmdir\r\n");
            }
            else if (entry instanceof Directory) {
                text += formatPatchWorker(file, entry.files);
            }
            else if (entry instanceof SameFileWithModifiedTime) {
                text += "//// [".concat(file, "] file changed its modified time\r\n");
            }
            else if (entry instanceof SameFileContentFile) {
                text += "//// [".concat(file, "] file written with same contents\r\n");
            }
            else if (entry instanceof File) {
                var content = typeof entry.data === "string" ? entry.data : entry.data.toString("utf8");
                text += "//// [".concat(file, "]\r\n").concat(content, "\r\n\r\n");
            }
            else if (entry instanceof Link) {
                text += "//// [".concat(file, "] link(").concat(entry.path, ")\r\n");
            }
            else if (entry instanceof Symlink) {
                text += "//// [".concat(file, "] symlink(").concat(entry.symlink, ")\r\n");
            }
            else if (entry instanceof Mount) {
                text += "//// [".concat(file, "] mount(").concat(entry.source, ")\r\n");
            }
        }
        return text;
    }
    function iteratePatch(patch) {
        // eslint-disable-next-line no-null/no-null
        return patch ? Harness.Compiler.iterateOutputs(iteratePatchWorker("", patch)) : null;
    }
    vfs.iteratePatch = iteratePatch;
    function iteratePatchWorker(dirname, container) {
        var _i, _a, name, entry, file, content;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _i = 0, _a = Object.keys(container);
                    _b.label = 1;
                case 1:
                    if (!(_i < _a.length)) return [3 /*break*/, 6];
                    name = _a[_i];
                    entry = normalizeFileSetEntry(container[name]);
                    file = dirname ? vpath.combine(dirname, name) : name;
                    if (!(entry instanceof Directory)) return [3 /*break*/, 3];
                    return [5 /*yield**/, __values(ts.arrayFrom(iteratePatchWorker(file, entry.files)))];
                case 2:
                    _b.sent();
                    return [3 /*break*/, 5];
                case 3:
                    if (!(entry instanceof File)) return [3 /*break*/, 5];
                    content = typeof entry.data === "string" ? entry.data : entry.data.toString("utf8");
                    return [4 /*yield*/, new documents.TextDocument(file, content)];
                case 4:
                    _b.sent();
                    _b.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 1];
                case 6: return [2 /*return*/];
            }
        });
    }
})(vfs || (vfs = {}));
/**
 * Test harness compiler functionality.
 */
var compiler;
(function (compiler) {
    function readProject(host, project, existingOptions) {
        if (project) {
            project = vpath.isTsConfigFile(project) ? project : vpath.combine(project, "tsconfig.json");
        }
        else {
            project = host.vfs.scanSync(".", "ancestors-or-self", {
                accept: function (path, stats) { return stats.isFile() && host.vfs.stringComparer(vpath.basename(path), "tsconfig.json") === 0; }
            })[0];
        }
        if (project) {
            // TODO(rbuckton): Do we need to resolve this? Resolving breaks projects tests.
            // project = vpath.resolve(host.vfs.currentDirectory, project);
            // read the config file
            var readResult = ts.readConfigFile(project, function (path) { return host.readFile(path); });
            if (readResult.error) {
                return { file: project, errors: [readResult.error] };
            }
            // parse the config file
            var config = ts.parseJsonConfigFileContent(readResult.config, host, vpath.dirname(project), existingOptions);
            return { file: project, errors: config.errors, config: config };
        }
    }
    compiler.readProject = readProject;
    var CompilationResult = /** @class */ (function () {
        function CompilationResult(host, options, program, result, diagnostics) {
            this._inputs = [];
            this.host = host;
            this.program = program;
            this.result = result;
            this.diagnostics = diagnostics;
            this.options = program ? program.getCompilerOptions() : options;
            // collect outputs
            var js = this.js = new collections.SortedMap({ comparer: this.vfs.stringComparer, sort: "insertion" });
            var dts = this.dts = new collections.SortedMap({ comparer: this.vfs.stringComparer, sort: "insertion" });
            var maps = this.maps = new collections.SortedMap({ comparer: this.vfs.stringComparer, sort: "insertion" });
            for (var _i = 0, _a = this.host.outputs; _i < _a.length; _i++) {
                var document = _a[_i];
                if (vpath.isJavaScript(document.file) || ts.fileExtensionIs(document.file, ".json" /* ts.Extension.Json */)) {
                    js.set(document.file, document);
                }
                else if (vpath.isDeclaration(document.file)) {
                    dts.set(document.file, document);
                }
                else if (vpath.isSourceMap(document.file)) {
                    maps.set(document.file, document);
                }
            }
            // correlate inputs and outputs
            this._inputsAndOutputs = new collections.SortedMap({ comparer: this.vfs.stringComparer, sort: "insertion" });
            if (program) {
                if (this.options.out || this.options.outFile) {
                    var outFile = vpath.resolve(this.vfs.cwd(), this.options.outFile || this.options.out);
                    var inputs = [];
                    for (var _b = 0, _c = program.getSourceFiles(); _b < _c.length; _b++) {
                        var sourceFile = _c[_b];
                        if (sourceFile) {
                            var input = new documents.TextDocument(sourceFile.fileName, sourceFile.text);
                            this._inputs.push(input);
                            if (!vpath.isDeclaration(sourceFile.fileName)) {
                                inputs.push(input);
                            }
                        }
                    }
                    var outputs = {
                        inputs: inputs,
                        js: js.get(outFile),
                        dts: dts.get(vpath.changeExtension(outFile, ".d.ts")),
                        map: maps.get(outFile + ".map")
                    };
                    if (outputs.js)
                        this._inputsAndOutputs.set(outputs.js.file, outputs);
                    if (outputs.dts)
                        this._inputsAndOutputs.set(outputs.dts.file, outputs);
                    if (outputs.map)
                        this._inputsAndOutputs.set(outputs.map.file, outputs);
                    for (var _d = 0, inputs_1 = inputs; _d < inputs_1.length; _d++) {
                        var input = inputs_1[_d];
                        this._inputsAndOutputs.set(input.file, outputs);
                    }
                }
                else {
                    for (var _e = 0, _f = program.getSourceFiles(); _e < _f.length; _e++) {
                        var sourceFile = _f[_e];
                        if (sourceFile) {
                            var input = new documents.TextDocument(sourceFile.fileName, sourceFile.text);
                            this._inputs.push(input);
                            if (!vpath.isDeclaration(sourceFile.fileName)) {
                                var extname = ts.getOutputExtension(sourceFile.fileName, this.options);
                                var outputs = {
                                    inputs: [input],
                                    js: js.get(this.getOutputPath(sourceFile.fileName, extname)),
                                    dts: dts.get(this.getOutputPath(sourceFile.fileName, ts.getDeclarationEmitExtensionForPath(sourceFile.fileName))),
                                    map: maps.get(this.getOutputPath(sourceFile.fileName, extname + ".map"))
                                };
                                this._inputsAndOutputs.set(sourceFile.fileName, outputs);
                                if (outputs.js)
                                    this._inputsAndOutputs.set(outputs.js.file, outputs);
                                if (outputs.dts)
                                    this._inputsAndOutputs.set(outputs.dts.file, outputs);
                                if (outputs.map)
                                    this._inputsAndOutputs.set(outputs.map.file, outputs);
                            }
                        }
                    }
                }
            }
        }
        Object.defineProperty(CompilationResult.prototype, "vfs", {
            get: function () {
                return this.host.vfs;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(CompilationResult.prototype, "inputs", {
            get: function () {
                return this._inputs;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(CompilationResult.prototype, "outputs", {
            get: function () {
                return this.host.outputs;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(CompilationResult.prototype, "traces", {
            get: function () {
                return this.host.traces;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(CompilationResult.prototype, "emitSkipped", {
            get: function () {
                return this.result && this.result.emitSkipped || false;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(CompilationResult.prototype, "singleFile", {
            get: function () {
                return !!this.options.outFile || !!this.options.out;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(CompilationResult.prototype, "commonSourceDirectory", {
            get: function () {
                var common = this.program && this.program.getCommonSourceDirectory() || "";
                return common && vpath.combine(this.vfs.cwd(), common);
            },
            enumerable: false,
            configurable: true
        });
        CompilationResult.prototype.getInputsAndOutputs = function (path) {
            return this._inputsAndOutputs.get(vpath.resolve(this.vfs.cwd(), path));
        };
        CompilationResult.prototype.getInputs = function (path) {
            var outputs = this.getInputsAndOutputs(path);
            return outputs && outputs.inputs;
        };
        CompilationResult.prototype.getOutput = function (path, kind) {
            var outputs = this.getInputsAndOutputs(path);
            return outputs && outputs[kind];
        };
        CompilationResult.prototype.getSourceMapRecord = function () {
            var maps = this.result.sourceMaps;
            if (maps && maps.length > 0) {
                return Harness.SourceMapRecorder.getSourceMapRecord(maps, this.program, Array.from(this.js.values()).filter(function (d) { return !ts.fileExtensionIs(d.file, ".json" /* ts.Extension.Json */); }), Array.from(this.dts.values()));
            }
        };
        CompilationResult.prototype.getSourceMap = function (path) {
            if (this.options.noEmit || vpath.isDeclaration(path))
                return undefined;
            if (this.options.inlineSourceMap) {
                var document = this.getOutput(path, "js");
                return document && documents.SourceMap.fromSource(document.text);
            }
            if (this.options.sourceMap) {
                var document = this.getOutput(path, "map");
                return document && new documents.SourceMap(document.file, document.text);
            }
        };
        CompilationResult.prototype.getOutputPath = function (path, ext) {
            if (this.options.outFile || this.options.out) {
                path = vpath.resolve(this.vfs.cwd(), this.options.outFile || this.options.out);
            }
            else {
                path = vpath.resolve(this.vfs.cwd(), path);
                var outDir = ext === ".d.ts" || ext === ".json.d.ts" || ext === ".d.mts" || ext === ".d.cts" ? this.options.declarationDir || this.options.outDir : this.options.outDir;
                if (outDir) {
                    var common = this.commonSourceDirectory;
                    if (common) {
                        path = vpath.relative(common, path, this.vfs.ignoreCase);
                        path = vpath.combine(vpath.resolve(this.vfs.cwd(), this.options.outDir), path);
                    }
                }
            }
            return vpath.changeExtension(path, ext);
        };
        CompilationResult.prototype.getNumberOfJsFiles = function (includeJson) {
            if (includeJson) {
                return this.js.size;
            }
            else {
                var count_1 = this.js.size;
                this.js.forEach(function (document) {
                    if (ts.fileExtensionIs(document.file, ".json" /* ts.Extension.Json */)) {
                        count_1--;
                    }
                });
                return count_1;
            }
        };
        return CompilationResult;
    }());
    compiler.CompilationResult = CompilationResult;
    function compileFiles(host, rootFiles, compilerOptions) {
        if (compilerOptions.project || !rootFiles || rootFiles.length === 0) {
            var project = readProject(host.parseConfigHost, compilerOptions.project, compilerOptions);
            if (project) {
                if (project.errors && project.errors.length > 0) {
                    return new CompilationResult(host, compilerOptions, /*program*/ undefined, /*result*/ undefined, project.errors);
                }
                if (project.config) {
                    rootFiles = project.config.fileNames;
                    compilerOptions = project.config.options;
                }
            }
            delete compilerOptions.project;
        }
        // establish defaults (aligns with old harness)
        if (compilerOptions.target === undefined && compilerOptions.module !== ts.ModuleKind.Node16 && compilerOptions.module !== ts.ModuleKind.NodeNext)
            compilerOptions.target = 0 /* ts.ScriptTarget.ES3 */;
        if (compilerOptions.newLine === undefined)
            compilerOptions.newLine = 0 /* ts.NewLineKind.CarriageReturnLineFeed */;
        if (compilerOptions.skipDefaultLibCheck === undefined)
            compilerOptions.skipDefaultLibCheck = true;
        if (compilerOptions.noErrorTruncation === undefined)
            compilerOptions.noErrorTruncation = true;
        // pre-emit/post-emit error comparison requires declaration emit twice, which can be slow. If it's unlikely to flag any error consistency issues
        // and if the test is running `skipLibCheck` - an indicator that we want the tets to run quickly - skip the before/after error comparison, too
        var skipErrorComparison = ts.length(rootFiles) >= 100 || (!!compilerOptions.skipLibCheck && !!compilerOptions.declaration);
        var preProgram = !skipErrorComparison ? ts.createProgram(rootFiles || [], __assign(__assign({}, compilerOptions), { configFile: compilerOptions.configFile, traceResolution: false }), host) : undefined;
        var preErrors = preProgram && ts.getPreEmitDiagnostics(preProgram);
        var program = ts.createProgram(rootFiles || [], compilerOptions, host);
        var emitResult = program.emit();
        var postErrors = ts.getPreEmitDiagnostics(program);
        var longerErrors = ts.length(preErrors) > postErrors.length ? preErrors : postErrors;
        var shorterErrors = longerErrors === preErrors ? postErrors : preErrors;
        var errors = preErrors && (preErrors.length !== postErrors.length) ? __spreadArray(__spreadArray([], shorterErrors, true), [ts.addRelatedInfo.apply(ts, __spreadArray([ts.createCompilerDiagnostic({
                    category: ts.DiagnosticCategory.Error,
                    code: -1,
                    key: "-1",
                    message: "Pre-emit (".concat(preErrors.length, ") and post-emit (").concat(postErrors.length, ") diagnostic counts do not match! This can indicate that a semantic _error_ was added by the emit resolver - such an error may not be reflected on the command line or in the editor, but may be captured in a baseline here!")
                }),
                ts.createCompilerDiagnostic({
                    category: ts.DiagnosticCategory.Error,
                    code: -1,
                    key: "-1",
                    message: "The excess diagnostics are:"
                })], ts.filter(longerErrors, function (p) { return !ts.some(shorterErrors, function (p2) { return ts.compareDiagnostics(p, p2) === 0 /* ts.Comparison.EqualTo */; }); }), false))], false) : postErrors;
        return new CompilationResult(host, compilerOptions, program, emitResult, errors);
    }
    compiler.compileFiles = compileFiles;
})(compiler || (compiler = {}));
var evaluator;
(function (evaluator) {
    var sourceFile = vpath.combine(vfs.srcFolder, "source.ts");
    var sourceFileJs = vpath.combine(vfs.srcFolder, "source.js");
    // Define a custom "Symbol" constructor to attach missing built-in symbols without
    // modifying the global "Symbol" constructor
    var FakeSymbol = (function (description) { return Symbol(description); });
    FakeSymbol.prototype = Symbol.prototype;
    for (var _i = 0, _a = Object.getOwnPropertyNames(Symbol); _i < _a.length; _i++) {
        var key = _a[_i];
        Object.defineProperty(FakeSymbol, key, Object.getOwnPropertyDescriptor(Symbol, key));
    }
    // Add "asyncIterator" if missing
    if (!ts.hasProperty(FakeSymbol, "asyncIterator"))
        Object.defineProperty(FakeSymbol, "asyncIterator", { value: Symbol.for("Symbol.asyncIterator"), configurable: true });
    function evaluateTypeScript(source, options, globals) {
        var _a;
        if (typeof source === "string")
            source = { files: (_a = {}, _a[sourceFile] = source, _a), rootFiles: [sourceFile], main: sourceFile };
        var fs = vfs.createFromFileSystem(Harness.IO, /*ignoreCase*/ false, { files: source.files });
        var compilerOptions = __assign({ target: 1 /* ts.ScriptTarget.ES5 */, module: ts.ModuleKind.CommonJS, lib: ["lib.esnext.d.ts", "lib.dom.d.ts"] }, options);
        var host = new fakes.CompilerHost(fs, compilerOptions);
        var result = compiler.compileFiles(host, source.rootFiles, compilerOptions);
        if (ts.some(result.diagnostics)) {
            assert.ok(/*value*/ false, "Syntax error in evaluation source text:\n" + ts.formatDiagnostics(result.diagnostics, {
                getCanonicalFileName: function (file) { return file; },
                getCurrentDirectory: function () { return ""; },
                getNewLine: function () { return "\n"; }
            }));
        }
        var output = result.getOutput(source.main, "js");
        assert.isDefined(output);
        globals = __assign({ Symbol: FakeSymbol }, globals);
        var loader = getLoader(compilerOptions, fs, globals);
        return loader.import(output.file);
    }
    evaluator.evaluateTypeScript = evaluateTypeScript;
    function evaluateJavaScript(sourceText, globals, sourceFile) {
        var _a;
        if (sourceFile === void 0) { sourceFile = sourceFileJs; }
        globals = __assign({ Symbol: FakeSymbol }, globals);
        var fs = new vfs.FileSystem(/*ignoreCase*/ false, { files: (_a = {}, _a[sourceFile] = sourceText, _a) });
        return new CommonJsLoader(fs, globals).import(sourceFile);
    }
    evaluator.evaluateJavaScript = evaluateJavaScript;
    function getLoader(compilerOptions, fs, globals) {
        var moduleKind = ts.getEmitModuleKind(compilerOptions);
        switch (moduleKind) {
            case ts.ModuleKind.UMD:
            case ts.ModuleKind.CommonJS:
                return new CommonJsLoader(fs, globals);
            case ts.ModuleKind.System:
                return new SystemLoader(fs, globals);
            case ts.ModuleKind.AMD:
            case ts.ModuleKind.None:
            default:
                throw new Error("ModuleKind '".concat(ts.ModuleKind[moduleKind], "' not supported by evaluator."));
        }
    }
    var Loader = /** @class */ (function () {
        function Loader(fs, globals) {
            this.moduleCache = new ts.Map();
            this.fs = fs;
            this.globals = globals;
        }
        Loader.prototype.isFile = function (file) {
            return this.fs.existsSync(file) && this.fs.statSync(file).isFile();
        };
        Loader.prototype.load = function (file) {
            if (!ts.isExternalModuleNameRelative(file))
                throw new Error("Module '".concat(file, "' could not be found."));
            var module = this.moduleCache.get(file);
            if (module)
                return module;
            this.moduleCache.set(file, module = this.createModule(file));
            try {
                var sourceText = this.fs.readFileSync(file, "utf8");
                this.evaluate(sourceText, file, module);
                return module;
            }
            catch (e) {
                this.moduleCache.delete(file);
                throw e;
            }
        };
        Loader.prototype.resolve = function (id, base) {
            return vpath.resolve(base, id);
        };
        Loader.prototype.import = function (id, base) {
            if (base === void 0) { base = this.fs.cwd(); }
            if (!ts.isExternalModuleNameRelative(id))
                throw new Error("Module '".concat(id, "' could not be found."));
            var file = this.resolve(id, base);
            var module = this.load(file);
            if (!module)
                throw new Error("Module '".concat(id, "' could not be found."));
            return this.getExports(module);
        };
        return Loader;
    }());
    var CommonJsLoader = /** @class */ (function (_super) {
        __extends(CommonJsLoader, _super);
        function CommonJsLoader() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        CommonJsLoader.prototype.resolveAsFile = function (file) {
            if (this.isFile(file))
                return file;
            if (this.isFile(file + ".js"))
                return file + ".js";
            return undefined;
        };
        CommonJsLoader.prototype.resolveIndex = function (dir) {
            var indexFile = vpath.resolve(dir, "index.js");
            if (this.isFile(indexFile))
                return indexFile;
            return undefined;
        };
        CommonJsLoader.prototype.resolveAsDirectory = function (dir) {
            var packageFile = vpath.resolve(dir, "package.json");
            if (this.isFile(packageFile)) {
                var text = this.fs.readFileSync(packageFile, "utf8");
                var json = JSON.parse(text);
                if (json.main) {
                    var main = vpath.resolve(dir, json.main);
                    var result = this.resolveAsFile(main) || this.resolveIndex(main);
                    if (result === undefined)
                        throw new Error("Module not found");
                }
            }
            return this.resolveIndex(dir);
        };
        CommonJsLoader.prototype.resolve = function (id, base) {
            var file = vpath.resolve(base, id);
            var resolved = this.resolveAsFile(file) || this.resolveAsDirectory(file);
            if (!resolved)
                throw new Error("Module '".concat(id, "' could not be found."));
            return resolved;
        };
        CommonJsLoader.prototype.createModule = function () {
            return { exports: {} };
        };
        CommonJsLoader.prototype.getExports = function (module) {
            return module.exports;
        };
        CommonJsLoader.prototype.evaluate = function (text, file, module) {
            var _this = this;
            var globalNames = [];
            var globalArgs = [];
            for (var name in this.globals) {
                if (ts.hasProperty(this.globals, name)) {
                    globalNames.push(name);
                    globalArgs.push(this.globals[name]);
                }
            }
            var base = vpath.dirname(file);
            var localRequire = function (id) { return _this.import(id, base); };
            var evaluateText = "(function (module, exports, require, __dirname, __filename, ".concat(globalNames.join(", "), ") { ").concat(text, " })");
            // eslint-disable-next-line no-eval
            var evaluateThunk = (void 0, eval)(evaluateText);
            evaluateThunk.call.apply(evaluateThunk, __spreadArray([this.globals, module, module.exports, localRequire, vpath.dirname(file), file], globalArgs, false));
        };
        return CommonJsLoader;
    }(Loader));
    var SystemModuleState;
    (function (SystemModuleState) {
        // Instantiation phases:
        SystemModuleState[SystemModuleState["Uninstantiated"] = 0] = "Uninstantiated";
        SystemModuleState[SystemModuleState["Instantiated"] = 1] = "Instantiated";
        // Linker phases:
        SystemModuleState[SystemModuleState["AddingDependencies"] = 2] = "AddingDependencies";
        SystemModuleState[SystemModuleState["AllDependenciesAdded"] = 3] = "AllDependenciesAdded";
        SystemModuleState[SystemModuleState["AllDependenciesInstantiated"] = 4] = "AllDependenciesInstantiated";
        SystemModuleState[SystemModuleState["WiringSetters"] = 5] = "WiringSetters";
        SystemModuleState[SystemModuleState["Linked"] = 6] = "Linked";
        // Evaluation phases:
        SystemModuleState[SystemModuleState["Evaluating"] = 7] = "Evaluating";
        SystemModuleState[SystemModuleState["Ready"] = 8] = "Ready";
    })(SystemModuleState || (SystemModuleState = {}));
    var SystemLoader = /** @class */ (function (_super) {
        __extends(SystemLoader, _super);
        function SystemLoader() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        SystemLoader.prototype.createModule = function (file) {
            return {
                file: file,
                // eslint-disable-next-line no-null/no-null
                exports: Object.create(/*o*/ null),
                dependencies: [],
                dependers: [],
                setters: [],
                hasExports: false,
                state: 0 /* SystemModuleState.Uninstantiated */
            };
        };
        SystemLoader.prototype.getExports = function (module) {
            if (module.state < 8 /* SystemModuleState.Ready */) {
                this.resetDependers(module, []);
                this.evaluateModule(module, []);
                if (module.state < 8 /* SystemModuleState.Ready */) {
                    var error = new Error("Module graph could not be loaded");
                    this.handleError(module, error);
                    throw error;
                }
            }
            if (module.hasError) {
                throw module.error;
            }
            return module.exports;
        };
        SystemLoader.prototype.handleError = function (module, error) {
            if (!module.hasError) {
                module.hasError = true;
                module.error = error;
                module.state = 8 /* SystemModuleState.Ready */;
            }
        };
        SystemLoader.prototype.evaluate = function (text, _file, module) {
            var _this = this;
            var globalNames = [];
            var globalArgs = [];
            for (var name in this.globals) {
                if (ts.hasProperty(this.globals, name)) {
                    globalNames.push(name);
                    globalArgs.push(this.globals[name]);
                }
            }
            var localSystem = {
                register: function (dependencies, declare) { return _this.instantiateModule(module, dependencies, declare); }
            };
            var evaluateText = "(function (System, ".concat(globalNames.join(", "), ") { ").concat(text, " })");
            try {
                // eslint-disable-next-line no-eval
                var evaluateThunk = (void 0, eval)(evaluateText);
                evaluateThunk.call.apply(evaluateThunk, __spreadArray([this.globals, localSystem], globalArgs, false));
            }
            catch (e) {
                this.handleError(module, e);
                throw e;
            }
        };
        SystemLoader.prototype.instantiateModule = function (module, dependencies, registration) {
            function exporter() {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                module.hasExports = true;
                var name = args.length === 1 ? undefined : args[0];
                var value = args.length === 1 ? args[0] : args[1];
                if (name !== undefined) {
                    module.exports[name] = value;
                }
                else {
                    for (var name_1 in value) {
                        module.exports[name_1] = value[name_1];
                    }
                }
                for (var _a = 0, _b = module.setters; _a < _b.length; _a++) {
                    var setter = _b[_a];
                    setter(module.exports);
                }
                return value;
            }
            var context = {
                import: function (_id) { throw new Error("Dynamic import not implemented."); },
                meta: {
                    url: ts.isUrl(module.file) ? module.file : "file:///".concat(ts.normalizeSlashes(module.file).replace(/^\//, "").split("/").map(encodeURIComponent).join("/"))
                }
            };
            module.requestedDependencies = dependencies;
            try {
                module.declaration = registration === null || registration === void 0 ? void 0 : registration(exporter, context);
                module.state = 1 /* SystemModuleState.Instantiated */;
                for (var _i = 0, _a = module.dependers; _i < _a.length; _i++) {
                    var depender = _a[_i];
                    this.linkModule(depender);
                }
                this.linkModule(module);
            }
            catch (e) {
                this.handleError(module, e);
                throw e;
            }
        };
        SystemLoader.prototype.linkModule = function (module) {
            var _a;
            try {
                for (;;) {
                    switch (module.state) {
                        case 0 /* SystemModuleState.Uninstantiated */: {
                            throw new Error("Module not yet instantiated");
                        }
                        case 1 /* SystemModuleState.Instantiated */: {
                            // Module has been instantiated, start requesting dependencies.
                            // Set state so that re-entry while adding dependencies does nothing.
                            module.state = 2 /* SystemModuleState.AddingDependencies */;
                            var base = vpath.dirname(module.file);
                            var dependencies = module.requestedDependencies || [];
                            for (var _i = 0, dependencies_1 = dependencies; _i < dependencies_1.length; _i++) {
                                var dependencyId = dependencies_1[_i];
                                var dependency = this.load(this.resolve(dependencyId, base));
                                module.dependencies.push(dependency);
                                dependency.dependers.push(module);
                            }
                            // All dependencies have been added, switch state
                            // to check whether all dependencies are instantiated
                            module.state = 3 /* SystemModuleState.AllDependenciesAdded */;
                            continue;
                        }
                        case 2 /* SystemModuleState.AddingDependencies */: {
                            // in the middle of adding dependencies for this module, do nothing
                            return;
                        }
                        case 3 /* SystemModuleState.AllDependenciesAdded */: {
                            // all dependencies have been added, advance state if all dependencies are instantiated.
                            for (var _b = 0, _c = module.dependencies; _b < _c.length; _b++) {
                                var dependency = _c[_b];
                                if (dependency.state === 0 /* SystemModuleState.Uninstantiated */) {
                                    return;
                                }
                            }
                            // indicate all dependencies are instantiated for this module.
                            module.state = 4 /* SystemModuleState.AllDependenciesInstantiated */;
                            // trigger links for dependers of this module.
                            for (var _d = 0, _e = module.dependers; _d < _e.length; _d++) {
                                var depender = _e[_d];
                                this.linkModule(depender);
                            }
                            continue;
                        }
                        case 4 /* SystemModuleState.AllDependenciesInstantiated */: {
                            // all dependencies have been instantiated, start wiring setters
                            module.state = 5 /* SystemModuleState.WiringSetters */;
                            for (var i = 0; i < module.dependencies.length; i++) {
                                var dependency = module.dependencies[i];
                                var setter = (_a = module.declaration) === null || _a === void 0 ? void 0 : _a.setters[i];
                                if (setter) {
                                    dependency.setters.push(setter);
                                    if (dependency.hasExports || dependency.state === 8 /* SystemModuleState.Ready */) {
                                        // wire hoisted exports or ready dependencies.
                                        setter(dependency.exports);
                                    }
                                }
                            }
                            module.state = 6 /* SystemModuleState.Linked */;
                            // ensure graph is fully linked
                            for (var _f = 0, _g = module.dependers; _f < _g.length; _f++) {
                                var depender = _g[_f];
                                this.linkModule(depender);
                            }
                            continue;
                        }
                        case 5 /* SystemModuleState.WiringSetters */: // in the middle of wiring setters for this module, nothing to do
                        case 6 /* SystemModuleState.Linked */: // module has already been linked, nothing to do
                        case 7 /* SystemModuleState.Evaluating */: // module is currently evaluating, nothing to do
                        case 8 /* SystemModuleState.Ready */: // module is done evaluating, nothing to do
                            return;
                    }
                }
            }
            catch (e) {
                this.handleError(module, e);
                throw e;
            }
        };
        SystemLoader.prototype.resetDependers = function (module, stack) {
            if (stack.lastIndexOf(module) !== -1) {
                return;
            }
            stack.push(module);
            module.dependers.length = 0;
            for (var _i = 0, _a = module.dependencies; _i < _a.length; _i++) {
                var dependency = _a[_i];
                this.resetDependers(dependency, stack);
            }
            stack.pop();
        };
        SystemLoader.prototype.evaluateModule = function (module, stack) {
            var _a, _b;
            if (module.state < 6 /* SystemModuleState.Linked */)
                throw new Error("Invalid state for evaluation.");
            if (module.state !== 6 /* SystemModuleState.Linked */)
                return;
            if (stack.lastIndexOf(module) !== -1) {
                // we are already evaluating this module
                return;
            }
            stack.push(module);
            module.state = 7 /* SystemModuleState.Evaluating */;
            try {
                for (var _i = 0, _c = module.dependencies; _i < _c.length; _i++) {
                    var dependency = _c[_i];
                    this.evaluateModule(dependency, stack);
                }
                (_b = (_a = module.declaration) === null || _a === void 0 ? void 0 : _a.execute) === null || _b === void 0 ? void 0 : _b.call(_a);
                module.state = 8 /* SystemModuleState.Ready */;
            }
            catch (e) {
                this.handleError(module, e);
                throw e;
            }
        };
        return SystemLoader;
    }(Loader));
})(evaluator || (evaluator = {}));
/**
 * Fake implementations of various compiler dependencies.
 */
var fakes;
(function (fakes) {
    var processExitSentinel = new Error("System exit");
    /**
     * A fake `ts.System` that leverages a virtual file system.
     */
    var System = /** @class */ (function () {
        function System(vfs, _a) {
            var _b = _a === void 0 ? {} : _a, executingFilePath = _b.executingFilePath, _c = _b.newLine, newLine = _c === void 0 ? "\r\n" : _c, env = _b.env;
            var _this = this;
            this.args = [];
            this.output = [];
            this.testTerminalWidth = Number.parseInt(this.getEnvironmentVariable("TS_TEST_TERMINAL_WIDTH"));
            this.getWidthOfTerminal = Number.isNaN(this.testTerminalWidth) ? undefined : function () { return _this.testTerminalWidth; };
            this.vfs = vfs.isReadonly ? vfs.shadow() : vfs;
            this.useCaseSensitiveFileNames = !this.vfs.ignoreCase;
            this.newLine = newLine;
            this._executingFilePath = executingFilePath;
            this._env = env;
        }
        // Pretty output
        System.prototype.writeOutputIsTTY = function () {
            return true;
        };
        System.prototype.write = function (message) {
            if (ts.Debug.isDebugging)
                console.log(message);
            this.output.push(message);
        };
        System.prototype.readFile = function (path) {
            try {
                var content = this.vfs.readFileSync(path, "utf8");
                return content === undefined ? undefined : Utils.removeByteOrderMark(content);
            }
            catch (_a) {
                return undefined;
            }
        };
        System.prototype.writeFile = function (path, data, writeByteOrderMark) {
            this.vfs.mkdirpSync(vpath.dirname(path));
            this.vfs.writeFileSync(path, writeByteOrderMark ? Utils.addUTF8ByteOrderMark(data) : data);
        };
        System.prototype.deleteFile = function (path) {
            this.vfs.unlinkSync(path);
        };
        System.prototype.fileExists = function (path) {
            var stats = this._getStats(path);
            return stats ? stats.isFile() : false;
        };
        System.prototype.directoryExists = function (path) {
            var stats = this._getStats(path);
            return stats ? stats.isDirectory() : false;
        };
        System.prototype.createDirectory = function (path) {
            this.vfs.mkdirpSync(path);
        };
        System.prototype.getCurrentDirectory = function () {
            return this.vfs.cwd();
        };
        System.prototype.getDirectories = function (path) {
            var result = [];
            try {
                for (var _i = 0, _a = this.vfs.readdirSync(path); _i < _a.length; _i++) {
                    var file = _a[_i];
                    if (this.vfs.statSync(vpath.combine(path, file)).isDirectory()) {
                        result.push(file);
                    }
                }
            }
            catch ( /*ignore*/_b) { /*ignore*/ }
            return result;
        };
        System.prototype.readDirectory = function (path, extensions, exclude, include, depth) {
            var _this = this;
            return ts.matchFiles(path, extensions, exclude, include, this.useCaseSensitiveFileNames, this.getCurrentDirectory(), depth, function (path) { return _this.getAccessibleFileSystemEntries(path); }, function (path) { return _this.realpath(path); });
        };
        System.prototype.getAccessibleFileSystemEntries = function (path) {
            var files = [];
            var directories = [];
            try {
                for (var _i = 0, _a = this.vfs.readdirSync(path); _i < _a.length; _i++) {
                    var file = _a[_i];
                    try {
                        var stats = this.vfs.statSync(vpath.combine(path, file));
                        if (stats.isFile()) {
                            files.push(file);
                        }
                        else if (stats.isDirectory()) {
                            directories.push(file);
                        }
                    }
                    catch ( /*ignored*/_b) { /*ignored*/ }
                }
            }
            catch ( /*ignored*/_c) { /*ignored*/ }
            return { files: files, directories: directories };
        };
        System.prototype.exit = function (exitCode) {
            this.exitCode = exitCode;
            throw processExitSentinel;
        };
        System.prototype.getFileSize = function (path) {
            var stats = this._getStats(path);
            return stats && stats.isFile() ? stats.size : 0;
        };
        System.prototype.resolvePath = function (path) {
            return vpath.resolve(this.vfs.cwd(), path);
        };
        System.prototype.getExecutingFilePath = function () {
            if (this._executingFilePath === undefined)
                return ts.notImplemented();
            return this._executingFilePath;
        };
        System.prototype.getModifiedTime = function (path) {
            var stats = this._getStats(path);
            return stats ? stats.mtime : undefined; // TODO: GH#18217
        };
        System.prototype.setModifiedTime = function (path, time) {
            this.vfs.utimesSync(path, time, time);
        };
        System.prototype.createHash = function (data) {
            return "".concat(ts.generateDjb2Hash(data), "-").concat(data);
        };
        System.prototype.realpath = function (path) {
            try {
                return this.vfs.realpathSync(path);
            }
            catch (_a) {
                return path;
            }
        };
        System.prototype.getEnvironmentVariable = function (name) {
            return (this._env && this._env[name]); // TODO: GH#18217
        };
        System.prototype._getStats = function (path) {
            try {
                return this.vfs.existsSync(path) ? this.vfs.statSync(path) : undefined;
            }
            catch (_a) {
                return undefined;
            }
        };
        System.prototype.now = function () {
            return new Date(this.vfs.time());
        };
        return System;
    }());
    fakes.System = System;
    /**
     * A fake `ts.ParseConfigHost` that leverages a virtual file system.
     */
    var ParseConfigHost = /** @class */ (function () {
        function ParseConfigHost(sys) {
            if (sys instanceof vfs.FileSystem)
                sys = new System(sys);
            this.sys = sys;
        }
        Object.defineProperty(ParseConfigHost.prototype, "vfs", {
            get: function () {
                return this.sys.vfs;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(ParseConfigHost.prototype, "useCaseSensitiveFileNames", {
            get: function () {
                return this.sys.useCaseSensitiveFileNames;
            },
            enumerable: false,
            configurable: true
        });
        ParseConfigHost.prototype.fileExists = function (fileName) {
            return this.sys.fileExists(fileName);
        };
        ParseConfigHost.prototype.directoryExists = function (directoryName) {
            return this.sys.directoryExists(directoryName);
        };
        ParseConfigHost.prototype.readFile = function (path) {
            return this.sys.readFile(path);
        };
        ParseConfigHost.prototype.readDirectory = function (path, extensions, excludes, includes, depth) {
            return this.sys.readDirectory(path, extensions, excludes, includes, depth);
        };
        return ParseConfigHost;
    }());
    fakes.ParseConfigHost = ParseConfigHost;
    /**
     * A fake `ts.CompilerHost` that leverages a virtual file system.
     */
    var CompilerHost = /** @class */ (function () {
        function CompilerHost(sys, options, setParentNodes) {
            if (options === void 0) { options = ts.getDefaultCompilerOptions(); }
            if (setParentNodes === void 0) { setParentNodes = false; }
            var _this = this;
            this.outputs = [];
            this.traces = [];
            this.shouldAssertInvariants = !Harness.lightMode;
            if (sys instanceof vfs.FileSystem)
                sys = new System(sys);
            this.sys = sys;
            this.defaultLibLocation = sys.vfs.meta.get("defaultLibLocation") || "";
            this._newLine = ts.getNewLineCharacter(options, function () { return _this.sys.newLine; });
            this._sourceFiles = new collections.SortedMap({ comparer: sys.vfs.stringComparer, sort: "insertion" });
            this._setParentNodes = setParentNodes;
            this._outputsMap = new collections.SortedMap(this.vfs.stringComparer);
        }
        Object.defineProperty(CompilerHost.prototype, "vfs", {
            get: function () {
                return this.sys.vfs;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(CompilerHost.prototype, "parseConfigHost", {
            get: function () {
                return this._parseConfigHost || (this._parseConfigHost = new ParseConfigHost(this.sys));
            },
            enumerable: false,
            configurable: true
        });
        CompilerHost.prototype.getCurrentDirectory = function () {
            return this.sys.getCurrentDirectory();
        };
        CompilerHost.prototype.useCaseSensitiveFileNames = function () {
            return this.sys.useCaseSensitiveFileNames;
        };
        CompilerHost.prototype.getNewLine = function () {
            return this._newLine;
        };
        CompilerHost.prototype.getCanonicalFileName = function (fileName) {
            return this.sys.useCaseSensitiveFileNames ? fileName : fileName.toLowerCase();
        };
        CompilerHost.prototype.deleteFile = function (fileName) {
            this.sys.deleteFile(fileName);
        };
        CompilerHost.prototype.fileExists = function (fileName) {
            return this.sys.fileExists(fileName);
        };
        CompilerHost.prototype.directoryExists = function (directoryName) {
            return this.sys.directoryExists(directoryName);
        };
        CompilerHost.prototype.getModifiedTime = function (fileName) {
            return this.sys.getModifiedTime(fileName);
        };
        CompilerHost.prototype.setModifiedTime = function (fileName, time) {
            return this.sys.setModifiedTime(fileName, time);
        };
        CompilerHost.prototype.getDirectories = function (path) {
            return this.sys.getDirectories(path);
        };
        CompilerHost.prototype.readDirectory = function (path, extensions, exclude, include, depth) {
            return this.sys.readDirectory(path, extensions, exclude, include, depth);
        };
        CompilerHost.prototype.readFile = function (path) {
            return this.sys.readFile(path);
        };
        CompilerHost.prototype.writeFile = function (fileName, content, writeByteOrderMark) {
            if (writeByteOrderMark)
                content = Utils.addUTF8ByteOrderMark(content);
            this.sys.writeFile(fileName, content);
            var document = new documents.TextDocument(fileName, content);
            document.meta.set("fileName", fileName);
            this.vfs.filemeta(fileName).set("document", document);
            if (!this._outputsMap.has(document.file)) {
                this._outputsMap.set(document.file, this.outputs.length);
                this.outputs.push(document);
            }
            this.outputs[this._outputsMap.get(document.file)] = document;
        };
        CompilerHost.prototype.trace = function (s) {
            this.traces.push(s);
        };
        CompilerHost.prototype.realpath = function (path) {
            return this.sys.realpath(path);
        };
        CompilerHost.prototype.getDefaultLibLocation = function () {
            return vpath.resolve(this.getCurrentDirectory(), this.defaultLibLocation);
        };
        CompilerHost.prototype.getDefaultLibFileName = function (options) {
            return vpath.resolve(this.getDefaultLibLocation(), ts.getDefaultLibFileName(options));
        };
        CompilerHost.prototype.getSourceFile = function (fileName, languageVersion) {
            var canonicalFileName = this.getCanonicalFileName(vpath.resolve(this.getCurrentDirectory(), fileName));
            var existing = this._sourceFiles.get(canonicalFileName);
            if (existing)
                return existing;
            var content = this.readFile(canonicalFileName);
            if (content === undefined)
                return undefined;
            // A virtual file system may shadow another existing virtual file system. This
            // allows us to reuse a common virtual file system structure across multiple
            // tests. If a virtual file is a shadow, it is likely that the file will be
            // reused across multiple tests. In that case, we cache the SourceFile we parse
            // so that it can be reused across multiple tests to avoid the cost of
            // repeatedly parsing the same file over and over (such as lib.d.ts).
            var cacheKey = this.vfs.shadowRoot && "SourceFile[languageVersion=".concat(languageVersion, ",setParentNodes=").concat(this._setParentNodes, "]");
            if (cacheKey) {
                var meta = this.vfs.filemeta(canonicalFileName);
                var sourceFileFromMetadata = meta.get(cacheKey);
                if (sourceFileFromMetadata && sourceFileFromMetadata.getFullText() === content) {
                    this._sourceFiles.set(canonicalFileName, sourceFileFromMetadata);
                    return sourceFileFromMetadata;
                }
            }
            var parsed = ts.createSourceFile(fileName, content, languageVersion, this._setParentNodes || this.shouldAssertInvariants);
            if (this.shouldAssertInvariants) {
                Utils.assertInvariants(parsed, /*parent*/ undefined);
            }
            this._sourceFiles.set(canonicalFileName, parsed);
            if (cacheKey) {
                // store the cached source file on the unshadowed file with the same version.
                var stats = this.vfs.statSync(canonicalFileName);
                var fs = this.vfs;
                while (fs.shadowRoot) {
                    try {
                        var shadowRootStats = fs.shadowRoot.existsSync(canonicalFileName) ? fs.shadowRoot.statSync(canonicalFileName) : undefined; // TODO: GH#18217
                        if (shadowRootStats.dev !== stats.dev ||
                            shadowRootStats.ino !== stats.ino ||
                            shadowRootStats.mtimeMs !== stats.mtimeMs) {
                            break;
                        }
                        fs = fs.shadowRoot;
                    }
                    catch (_a) {
                        break;
                    }
                }
                if (fs !== this.vfs) {
                    fs.filemeta(canonicalFileName).set(cacheKey, parsed);
                }
            }
            return parsed;
        };
        return CompilerHost;
    }());
    fakes.CompilerHost = CompilerHost;
    var DiagnosticKind;
    (function (DiagnosticKind) {
        DiagnosticKind["Error"] = "Error";
        DiagnosticKind["Status"] = "Status";
    })(DiagnosticKind = fakes.DiagnosticKind || (fakes.DiagnosticKind = {}));
    function indentedText(indent, text) {
        if (!indent)
            return text;
        var indentText = "";
        for (var i = 0; i < indent; i++) {
            indentText += "  ";
        }
        return "\n".concat(indentText).concat(text);
    }
    function expectedDiagnosticMessageToText(_a) {
        var message = _a[0], args = _a.slice(1);
        var text = ts.getLocaleSpecificMessage(message);
        if (args.length) {
            text = ts.formatStringFromArgs(text, args);
        }
        return text;
    }
    function expectedDiagnosticMessageChainToText(_a, indent) {
        var message = _a.message, next = _a.next;
        if (indent === void 0) { indent = 0; }
        var text = indentedText(indent, expectedDiagnosticMessageToText(message));
        if (next) {
            indent++;
            next.forEach(function (kid) { return text += expectedDiagnosticMessageChainToText(kid, indent); });
        }
        return text;
    }
    function expectedDiagnosticRelatedInformationToText(_a) {
        var location = _a.location, diagnosticMessage = __rest(_a, ["location"]);
        var text = expectedDiagnosticMessageChainToText(diagnosticMessage);
        if (location) {
            var file = location.file, start = location.start, length = location.length;
            return "".concat(file, "(").concat(start, ":").concat(length, "):: ").concat(text);
        }
        return text;
    }
    function expectedErrorDiagnosticToText(_a) {
        var relatedInformation = _a.relatedInformation, diagnosticRelatedInformation = __rest(_a, ["relatedInformation"]);
        var text = "".concat(DiagnosticKind.Error, "!: ").concat(expectedDiagnosticRelatedInformationToText(diagnosticRelatedInformation));
        if (relatedInformation) {
            for (var _i = 0, relatedInformation_1 = relatedInformation; _i < relatedInformation_1.length; _i++) {
                var kid = relatedInformation_1[_i];
                text += "\n  related:: ".concat(expectedDiagnosticRelatedInformationToText(kid));
            }
        }
        return text;
    }
    function expectedDiagnosticToText(errorOrStatus) {
        return ts.isArray(errorOrStatus) ?
            "".concat(DiagnosticKind.Status, "!: ").concat(expectedDiagnosticMessageToText(errorOrStatus)) :
            expectedErrorDiagnosticToText(errorOrStatus);
    }
    function diagnosticMessageChainToText(_a, indent) {
        var messageText = _a.messageText, next = _a.next;
        if (indent === void 0) { indent = 0; }
        var text = indentedText(indent, messageText);
        if (next) {
            indent++;
            next.forEach(function (kid) { return text += diagnosticMessageChainToText(kid, indent); });
        }
        return text;
    }
    function diagnosticRelatedInformationToText(_a) {
        var file = _a.file, start = _a.start, length = _a.length, messageText = _a.messageText;
        var text = typeof messageText === "string" ?
            messageText :
            diagnosticMessageChainToText(messageText);
        return file ?
            "".concat(file.fileName, "(").concat(start, ":").concat(length, "):: ").concat(text) :
            text;
    }
    function diagnosticToText(_a) {
        var kind = _a.kind, _b = _a.diagnostic, relatedInformation = _b.relatedInformation, diagnosticRelatedInformation = __rest(_b, ["relatedInformation"]);
        var text = "".concat(kind, "!: ").concat(diagnosticRelatedInformationToText(diagnosticRelatedInformation));
        if (relatedInformation) {
            for (var _i = 0, relatedInformation_2 = relatedInformation; _i < relatedInformation_2.length; _i++) {
                var kid = relatedInformation_2[_i];
                text += "\n  related:: ".concat(diagnosticRelatedInformationToText(kid));
            }
        }
        return text;
    }
    fakes.version = "FakeTSVersion";
    function patchHostForBuildInfoReadWrite(sys) {
        var originalReadFile = sys.readFile;
        sys.readFile = function (path, encoding) {
            var value = originalReadFile.call(sys, path, encoding);
            if (!value || !ts.isBuildInfoFile(path))
                return value;
            var buildInfo = ts.getBuildInfo(path, value);
            if (!buildInfo)
                return value;
            ts.Debug.assert(buildInfo.version === fakes.version);
            buildInfo.version = ts.version;
            return ts.getBuildInfoText(buildInfo);
        };
        return patchHostForBuildInfoWrite(sys, fakes.version);
    }
    fakes.patchHostForBuildInfoReadWrite = patchHostForBuildInfoReadWrite;
    function patchHostForBuildInfoWrite(sys, version) {
        var originalWrite = sys.write;
        sys.write = function (msg) { return originalWrite.call(sys, msg.replace(ts.version, version)); };
        var originalWriteFile = sys.writeFile;
        sys.writeFile = function (fileName, content, writeByteOrderMark) {
            if (ts.isBuildInfoFile(fileName)) {
                var buildInfo = ts.getBuildInfo(fileName, content);
                if (buildInfo) {
                    buildInfo.version = version;
                    return originalWriteFile.call(sys, fileName, ts.getBuildInfoText(buildInfo), writeByteOrderMark);
                }
            }
            return originalWriteFile.call(sys, fileName, content, writeByteOrderMark);
        };
        return sys;
    }
    fakes.patchHostForBuildInfoWrite = patchHostForBuildInfoWrite;
    var SolutionBuilderHost = /** @class */ (function (_super) {
        __extends(SolutionBuilderHost, _super);
        function SolutionBuilderHost(sys, options, setParentNodes, createProgram) {
            var _this = _super.call(this, sys, options, setParentNodes) || this;
            _this.diagnostics = [];
            _this.createProgram = createProgram || ts.createEmitAndSemanticDiagnosticsBuilderProgram;
            return _this;
        }
        SolutionBuilderHost.create = function (sys, options, setParentNodes, createProgram) {
            var host = new SolutionBuilderHost(sys, options, setParentNodes, createProgram);
            patchHostForBuildInfoReadWrite(host.sys);
            return host;
        };
        SolutionBuilderHost.prototype.createHash = function (data) {
            return "".concat(ts.generateDjb2Hash(data), "-").concat(data);
        };
        SolutionBuilderHost.prototype.reportDiagnostic = function (diagnostic) {
            this.diagnostics.push({ kind: DiagnosticKind.Error, diagnostic: diagnostic });
        };
        SolutionBuilderHost.prototype.reportSolutionBuilderStatus = function (diagnostic) {
            this.diagnostics.push({ kind: DiagnosticKind.Status, diagnostic: diagnostic });
        };
        SolutionBuilderHost.prototype.clearDiagnostics = function () {
            this.diagnostics.length = 0;
        };
        SolutionBuilderHost.prototype.assertDiagnosticMessages = function () {
            var expectedDiagnostics = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                expectedDiagnostics[_i] = arguments[_i];
            }
            var actual = this.diagnostics.slice().map(diagnosticToText);
            var expected = expectedDiagnostics.map(expectedDiagnosticToText);
            assert.deepEqual(actual, expected, "Diagnostic arrays did not match:\nActual: ".concat(JSON.stringify(actual, /*replacer*/ undefined, " "), "\nExpected: ").concat(JSON.stringify(expected, /*replacer*/ undefined, " ")));
        };
        SolutionBuilderHost.prototype.assertErrors = function () {
            var expectedDiagnostics = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                expectedDiagnostics[_i] = arguments[_i];
            }
            var actual = this.diagnostics.filter(function (d) { return d.kind === DiagnosticKind.Error; }).map(diagnosticToText);
            var expected = expectedDiagnostics.map(expectedDiagnosticToText);
            assert.deepEqual(actual, expected, "Diagnostics arrays did not match:\nActual: ".concat(JSON.stringify(actual, /*replacer*/ undefined, " "), "\nExpected: ").concat(JSON.stringify(expected, /*replacer*/ undefined, " "), "\nActual All:: ").concat(JSON.stringify(this.diagnostics.slice().map(diagnosticToText), /*replacer*/ undefined, " ")));
        };
        SolutionBuilderHost.prototype.printDiagnostics = function (header) {
            if (header === void 0) { header = "== Diagnostics =="; }
            var out = ts.createDiagnosticReporter(ts.sys);
            ts.sys.write(header + "\r\n");
            for (var _i = 0, _a = this.diagnostics; _i < _a.length; _i++) {
                var diagnostic = _a[_i].diagnostic;
                out(diagnostic);
            }
        };
        SolutionBuilderHost.prototype.now = function () {
            return this.sys.now();
        };
        return SolutionBuilderHost;
    }(CompilerHost));
    fakes.SolutionBuilderHost = SolutionBuilderHost;
})(fakes || (fakes = {}));
var ts;
(function (ts) {
    var server;
    (function (server) {
        /* @internal */
        function extractMessage(message) {
            // Read the content length
            var contentLengthPrefix = "Content-Length: ";
            var lines = message.split(/\r?\n/);
            ts.Debug.assert(lines.length >= 2, "Malformed response: Expected 3 lines in the response.");
            var contentLengthText = lines[0];
            ts.Debug.assert(contentLengthText.indexOf(contentLengthPrefix) === 0, "Malformed response: Response text did not contain content-length header.");
            var contentLength = parseInt(contentLengthText.substring(contentLengthPrefix.length));
            // Read the body
            var responseBody = lines[2];
            // Verify content length
            ts.Debug.assert(responseBody.length + 1 === contentLength, "Malformed response: Content length did not match the response's body length.");
            return responseBody;
        }
        server.extractMessage = extractMessage;
        var SessionClient = /** @class */ (function () {
            function SessionClient(host) {
                this.host = host;
                this.sequence = 0;
                this.lineMaps = new ts.Map();
                this.messages = ts.createQueue();
                this.getCombinedCodeFix = ts.notImplemented;
                this.applyCodeActionCommand = ts.notImplemented;
            }
            SessionClient.prototype.onMessage = function (message) {
                this.messages.enqueue(message);
            };
            SessionClient.prototype.writeMessage = function (message) {
                this.host.writeMessage(message);
            };
            SessionClient.prototype.getLineMap = function (fileName) {
                var lineMap = this.lineMaps.get(fileName);
                if (!lineMap) {
                    lineMap = ts.computeLineStarts(ts.getSnapshotText(this.host.getScriptSnapshot(fileName)));
                    this.lineMaps.set(fileName, lineMap);
                }
                return lineMap;
            };
            SessionClient.prototype.lineOffsetToPosition = function (fileName, lineOffset, lineMap) {
                lineMap = lineMap || this.getLineMap(fileName);
                return ts.computePositionOfLineAndCharacter(lineMap, lineOffset.line - 1, lineOffset.offset - 1);
            };
            SessionClient.prototype.positionToOneBasedLineOffset = function (fileName, position) {
                var lineOffset = ts.computeLineAndCharacterOfPosition(this.getLineMap(fileName), position);
                return {
                    line: lineOffset.line + 1,
                    offset: lineOffset.character + 1
                };
            };
            SessionClient.prototype.convertCodeEditsToTextChange = function (fileName, codeEdit) {
                return { span: this.decodeSpan(codeEdit, fileName), newText: codeEdit.newText };
            };
            SessionClient.prototype.processRequest = function (command, args) {
                var request = {
                    seq: this.sequence,
                    type: "request",
                    arguments: args,
                    command: command
                };
                this.sequence++;
                this.writeMessage(JSON.stringify(request));
                return request;
            };
            SessionClient.prototype.processResponse = function (request, expectEmptyBody) {
                if (expectEmptyBody === void 0) { expectEmptyBody = false; }
                var foundResponseMessage = false;
                var response;
                while (!foundResponseMessage) {
                    var lastMessage = this.messages.dequeue();
                    ts.Debug.assert(!!lastMessage, "Did not receive any responses.");
                    var responseBody = extractMessage(lastMessage);
                    try {
                        response = JSON.parse(responseBody);
                        // the server may emit events before emitting the response. We
                        // want to ignore these events for testing purpose.
                        if (response.type === "response") {
                            foundResponseMessage = true;
                        }
                    }
                    catch (e) {
                        throw new Error("Malformed response: Failed to parse server response: " + lastMessage + ". \r\n  Error details: " + e.message);
                    }
                }
                // unmarshal errors
                if (!response.success) {
                    throw new Error("Error " + response.message);
                }
                ts.Debug.assert(response.request_seq === request.seq, "Malformed response: response sequence number did not match request sequence number.");
                ts.Debug.assert(expectEmptyBody || !!response.body, "Malformed response: Unexpected empty response body.");
                ts.Debug.assert(!expectEmptyBody || !response.body, "Malformed response: Unexpected non-empty response body.");
                return response;
            };
            /*@internal*/
            SessionClient.prototype.configure = function (preferences) {
                this.preferences = preferences;
                var args = { preferences: preferences };
                var request = this.processRequest(server.CommandNames.Configure, args);
                this.processResponse(request, /*expectEmptyBody*/ true);
            };
            /*@internal*/
            SessionClient.prototype.setFormattingOptions = function (formatOptions) {
                var args = { formatOptions: formatOptions };
                var request = this.processRequest(server.CommandNames.Configure, args);
                this.processResponse(request, /*expectEmptyBody*/ true);
            };
            /*@internal*/
            SessionClient.prototype.setCompilerOptionsForInferredProjects = function (options) {
                var args = { options: options };
                var request = this.processRequest(server.CommandNames.CompilerOptionsForInferredProjects, args);
                this.processResponse(request, /*expectEmptyBody*/ false);
            };
            SessionClient.prototype.openFile = function (file, fileContent, scriptKindName) {
                var args = { file: file, fileContent: fileContent, scriptKindName: scriptKindName };
                this.processRequest(server.CommandNames.Open, args);
            };
            SessionClient.prototype.closeFile = function (file) {
                var args = { file: file };
                this.processRequest(server.CommandNames.Close, args);
            };
            SessionClient.prototype.createChangeFileRequestArgs = function (fileName, start, end, insertString) {
                return __assign(__assign({}, this.createFileLocationRequestArgsWithEndLineAndOffset(fileName, start, end)), { insertString: insertString });
            };
            SessionClient.prototype.changeFile = function (fileName, args) {
                // clear the line map after an edit
                this.lineMaps.set(fileName, undefined); // TODO: GH#18217
                this.processRequest(server.CommandNames.Change, args);
            };
            SessionClient.prototype.toLineColumnOffset = function (fileName, position) {
                var _a = this.positionToOneBasedLineOffset(fileName, position), line = _a.line, offset = _a.offset;
                return { line: line, character: offset };
            };
            SessionClient.prototype.getQuickInfoAtPosition = function (fileName, position) {
                var args = this.createFileLocationRequestArgs(fileName, position);
                var request = this.processRequest(server.CommandNames.Quickinfo, args);
                var response = this.processResponse(request);
                var body = response.body; // TODO: GH#18217
                return {
                    kind: body.kind,
                    kindModifiers: body.kindModifiers,
                    textSpan: this.decodeSpan(body, fileName),
                    displayParts: [{ kind: "text", text: body.displayString }],
                    documentation: typeof body.documentation === "string" ? [{ kind: "text", text: body.documentation }] : body.documentation,
                    tags: this.decodeLinkDisplayParts(body.tags)
                };
            };
            SessionClient.prototype.getProjectInfo = function (file, needFileNameList) {
                var args = { file: file, needFileNameList: needFileNameList };
                var request = this.processRequest(server.CommandNames.ProjectInfo, args);
                var response = this.processResponse(request);
                return {
                    configFileName: response.body.configFileName,
                    fileNames: response.body.fileNames
                };
            };
            SessionClient.prototype.getCompletionsAtPosition = function (fileName, position, _preferences) {
                var _this = this;
                // Not passing along 'preferences' because server should already have those from the 'configure' command
                var args = this.createFileLocationRequestArgs(fileName, position);
                var request = this.processRequest(server.CommandNames.CompletionInfo, args);
                var response = this.processResponse(request);
                return {
                    isGlobalCompletion: response.body.isGlobalCompletion,
                    isMemberCompletion: response.body.isMemberCompletion,
                    isNewIdentifierLocation: response.body.isNewIdentifierLocation,
                    entries: response.body.entries.map(function (entry) {
                        if (entry.replacementSpan !== undefined) {
                            var res = __assign(__assign({}, entry), { data: entry.data, replacementSpan: _this.decodeSpan(entry.replacementSpan, fileName) });
                            return res;
                        }
                        return entry; // TODO: GH#18217
                    })
                };
            };
            SessionClient.prototype.getCompletionEntryDetails = function (fileName, position, entryName, _options, source, _preferences, data) {
                var args = __assign(__assign({}, this.createFileLocationRequestArgs(fileName, position)), { entryNames: [{ name: entryName, source: source, data: data }] });
                var request = this.processRequest(server.CommandNames.CompletionDetailsFull, args);
                var response = this.processResponse(request);
                ts.Debug.assert(response.body.length === 1, "Unexpected length of completion details response body.");
                return response.body[0];
            };
            SessionClient.prototype.getCompletionEntrySymbol = function (_fileName, _position, _entryName) {
                return ts.notImplemented();
            };
            SessionClient.prototype.getNavigateToItems = function (searchValue) {
                var _this = this;
                var args = {
                    searchValue: searchValue,
                    file: this.host.getScriptFileNames()[0]
                };
                var request = this.processRequest(server.CommandNames.Navto, args);
                var response = this.processResponse(request);
                return response.body.map(function (entry) { return ({
                    name: entry.name,
                    containerName: entry.containerName || "",
                    containerKind: entry.containerKind || "" /* ScriptElementKind.unknown */,
                    kind: entry.kind,
                    kindModifiers: entry.kindModifiers || "",
                    matchKind: entry.matchKind,
                    isCaseSensitive: entry.isCaseSensitive,
                    fileName: entry.file,
                    textSpan: _this.decodeSpan(entry),
                }); });
            };
            SessionClient.prototype.getFormattingEditsForRange = function (file, start, end, _options) {
                var _this = this;
                var args = this.createFileLocationRequestArgsWithEndLineAndOffset(file, start, end);
                // TODO: handle FormatCodeOptions
                var request = this.processRequest(server.CommandNames.Format, args);
                var response = this.processResponse(request);
                return response.body.map(function (entry) { return _this.convertCodeEditsToTextChange(file, entry); }); // TODO: GH#18217
            };
            SessionClient.prototype.getFormattingEditsForDocument = function (fileName, options) {
                return this.getFormattingEditsForRange(fileName, 0, this.host.getScriptSnapshot(fileName).getLength(), options);
            };
            SessionClient.prototype.getFormattingEditsAfterKeystroke = function (fileName, position, key, _options) {
                var _this = this;
                var args = __assign(__assign({}, this.createFileLocationRequestArgs(fileName, position)), { key: key });
                // TODO: handle FormatCodeOptions
                var request = this.processRequest(server.CommandNames.Formatonkey, args);
                var response = this.processResponse(request);
                return response.body.map(function (entry) { return _this.convertCodeEditsToTextChange(fileName, entry); }); // TODO: GH#18217
            };
            SessionClient.prototype.getDefinitionAtPosition = function (fileName, position) {
                var _this = this;
                var args = this.createFileLocationRequestArgs(fileName, position);
                var request = this.processRequest(server.CommandNames.Definition, args);
                var response = this.processResponse(request);
                return response.body.map(function (entry) { return ({
                    containerKind: "" /* ScriptElementKind.unknown */,
                    containerName: "",
                    fileName: entry.file,
                    textSpan: _this.decodeSpan(entry),
                    kind: "" /* ScriptElementKind.unknown */,
                    name: ""
                }); });
            };
            SessionClient.prototype.getDefinitionAndBoundSpan = function (fileName, position) {
                var _this = this;
                var args = this.createFileLocationRequestArgs(fileName, position);
                var request = this.processRequest(server.CommandNames.DefinitionAndBoundSpan, args);
                var response = this.processResponse(request);
                var body = ts.Debug.checkDefined(response.body); // TODO: GH#18217
                return {
                    definitions: body.definitions.map(function (entry) { return ({
                        containerKind: "" /* ScriptElementKind.unknown */,
                        containerName: "",
                        fileName: entry.file,
                        textSpan: _this.decodeSpan(entry),
                        kind: "" /* ScriptElementKind.unknown */,
                        name: "",
                        unverified: entry.unverified,
                    }); }),
                    textSpan: this.decodeSpan(body.textSpan, request.arguments.file)
                };
            };
            SessionClient.prototype.getTypeDefinitionAtPosition = function (fileName, position) {
                var _this = this;
                var args = this.createFileLocationRequestArgs(fileName, position);
                var request = this.processRequest(server.CommandNames.TypeDefinition, args);
                var response = this.processResponse(request);
                return response.body.map(function (entry) { return ({
                    containerKind: "" /* ScriptElementKind.unknown */,
                    containerName: "",
                    fileName: entry.file,
                    textSpan: _this.decodeSpan(entry),
                    kind: "" /* ScriptElementKind.unknown */,
                    name: ""
                }); });
            };
            SessionClient.prototype.getSourceDefinitionAndBoundSpan = function (fileName, position) {
                var _this = this;
                var args = this.createFileLocationRequestArgs(fileName, position);
                var request = this.processRequest(server.CommandNames.FindSourceDefinition, args);
                var response = this.processResponse(request);
                var body = ts.Debug.checkDefined(response.body); // TODO: GH#18217
                return body.map(function (entry) { return ({
                    containerKind: "" /* ScriptElementKind.unknown */,
                    containerName: "",
                    fileName: entry.file,
                    textSpan: _this.decodeSpan(entry),
                    kind: "" /* ScriptElementKind.unknown */,
                    name: "",
                    unverified: entry.unverified,
                }); });
            };
            SessionClient.prototype.getImplementationAtPosition = function (fileName, position) {
                var _this = this;
                var args = this.createFileLocationRequestArgs(fileName, position);
                var request = this.processRequest(server.CommandNames.Implementation, args);
                var response = this.processResponse(request);
                return response.body.map(function (entry) { return ({
                    fileName: entry.file,
                    textSpan: _this.decodeSpan(entry),
                    kind: "" /* ScriptElementKind.unknown */,
                    displayParts: []
                }); });
            };
            SessionClient.prototype.findReferences = function (fileName, position) {
                var args = this.createFileLocationRequestArgs(fileName, position);
                var request = this.processRequest(server.CommandNames.ReferencesFull, args);
                var response = this.processResponse(request);
                return response.body;
            };
            SessionClient.prototype.getReferencesAtPosition = function (fileName, position) {
                var _this = this;
                var args = this.createFileLocationRequestArgs(fileName, position);
                var request = this.processRequest(server.CommandNames.References, args);
                var response = this.processResponse(request);
                return response.body.refs.map(function (entry) { return ({
                    fileName: entry.file,
                    textSpan: _this.decodeSpan(entry),
                    isWriteAccess: entry.isWriteAccess,
                    isDefinition: entry.isDefinition,
                }); });
            };
            SessionClient.prototype.getFileReferences = function (fileName) {
                var _this = this;
                var request = this.processRequest(server.CommandNames.FileReferences, { file: fileName });
                var response = this.processResponse(request);
                return response.body.refs.map(function (entry) { return ({
                    fileName: entry.file,
                    textSpan: _this.decodeSpan(entry),
                    isWriteAccess: entry.isWriteAccess,
                    isDefinition: entry.isDefinition,
                }); });
            };
            SessionClient.prototype.getEmitOutput = function (file) {
                var request = this.processRequest("emit-output" /* protocol.CommandTypes.EmitOutput */, { file: file });
                var response = this.processResponse(request);
                return response.body;
            };
            SessionClient.prototype.getSyntacticDiagnostics = function (file) {
                return this.getDiagnostics(file, server.CommandNames.SyntacticDiagnosticsSync);
            };
            SessionClient.prototype.getSemanticDiagnostics = function (file) {
                return this.getDiagnostics(file, server.CommandNames.SemanticDiagnosticsSync);
            };
            SessionClient.prototype.getSuggestionDiagnostics = function (file) {
                return this.getDiagnostics(file, server.CommandNames.SuggestionDiagnosticsSync);
            };
            SessionClient.prototype.getDiagnostics = function (file, command) {
                var request = this.processRequest(command, { file: file, includeLinePosition: true });
                var response = this.processResponse(request);
                var sourceText = ts.getSnapshotText(this.host.getScriptSnapshot(file));
                var fakeSourceFile = { fileName: file, text: sourceText }; // Warning! This is a huge lie!
                return response.body.map(function (entry) {
                    var category = ts.firstDefined(Object.keys(ts.DiagnosticCategory), function (id) {
                        return ts.isString(id) && entry.category === id.toLowerCase() ? ts.DiagnosticCategory[id] : undefined;
                    });
                    return {
                        file: fakeSourceFile,
                        start: entry.start,
                        length: entry.length,
                        messageText: entry.message,
                        category: ts.Debug.checkDefined(category, "convertDiagnostic: category should not be undefined"),
                        code: entry.code,
                        reportsUnnecessary: entry.reportsUnnecessary,
                        reportsDeprecated: entry.reportsDeprecated,
                    };
                });
            };
            SessionClient.prototype.getCompilerOptionsDiagnostics = function () {
                return ts.notImplemented();
            };
            SessionClient.prototype.getRenameInfo = function (fileName, position, _preferences, findInStrings, findInComments) {
                // Not passing along 'options' because server should already have those from the 'configure' command
                var args = __assign(__assign({}, this.createFileLocationRequestArgs(fileName, position)), { findInStrings: findInStrings, findInComments: findInComments });
                var request = this.processRequest(server.CommandNames.Rename, args);
                var response = this.processResponse(request);
                var body = response.body; // TODO: GH#18217
                var locations = [];
                for (var _i = 0, _a = body.locs; _i < _a.length; _i++) {
                    var entry = _a[_i];
                    var fileName_1 = entry.file;
                    for (var _b = 0, _c = entry.locs; _b < _c.length; _b++) {
                        var _d = _c[_b];
                        var start = _d.start, end = _d.end, contextStart = _d.contextStart, contextEnd = _d.contextEnd, prefixSuffixText = __rest(_d, ["start", "end", "contextStart", "contextEnd"]);
                        locations.push(__assign(__assign({ textSpan: this.decodeSpan({ start: start, end: end }, fileName_1), fileName: fileName_1 }, (contextStart !== undefined ?
                            { contextSpan: this.decodeSpan({ start: contextStart, end: contextEnd }, fileName_1) } :
                            undefined)), prefixSuffixText));
                    }
                }
                var renameInfo = body.info.canRename
                    ? ts.identity({
                        canRename: body.info.canRename,
                        fileToRename: body.info.fileToRename,
                        displayName: body.info.displayName,
                        fullDisplayName: body.info.fullDisplayName,
                        kind: body.info.kind,
                        kindModifiers: body.info.kindModifiers,
                        triggerSpan: ts.createTextSpanFromBounds(position, position),
                    })
                    : ts.identity({ canRename: false, localizedErrorMessage: body.info.localizedErrorMessage });
                this.lastRenameEntry = {
                    renameInfo: renameInfo,
                    inputs: {
                        fileName: fileName,
                        position: position,
                        findInStrings: !!findInStrings,
                        findInComments: !!findInComments,
                    },
                    locations: locations,
                };
                return renameInfo;
            };
            SessionClient.prototype.getSmartSelectionRange = function () {
                return ts.notImplemented();
            };
            SessionClient.prototype.findRenameLocations = function (fileName, position, findInStrings, findInComments, providePrefixAndSuffixTextForRename) {
                if (!this.lastRenameEntry ||
                    this.lastRenameEntry.inputs.fileName !== fileName ||
                    this.lastRenameEntry.inputs.position !== position ||
                    this.lastRenameEntry.inputs.findInStrings !== findInStrings ||
                    this.lastRenameEntry.inputs.findInComments !== findInComments) {
                    if (providePrefixAndSuffixTextForRename !== undefined) {
                        // User preferences have to be set through the `Configure` command
                        this.configure({ providePrefixAndSuffixTextForRename: providePrefixAndSuffixTextForRename });
                        // Options argument is not used, so don't pass in options
                        this.getRenameInfo(fileName, position, /*preferences*/ {}, findInStrings, findInComments);
                        // Restore previous user preferences
                        if (this.preferences) {
                            this.configure(this.preferences);
                        }
                    }
                    else {
                        this.getRenameInfo(fileName, position, /*preferences*/ {}, findInStrings, findInComments);
                    }
                }
                return this.lastRenameEntry.locations;
            };
            SessionClient.prototype.decodeNavigationBarItems = function (items, fileName, lineMap) {
                var _this = this;
                if (!items) {
                    return [];
                }
                return items.map(function (item) { return ({
                    text: item.text,
                    kind: item.kind,
                    kindModifiers: item.kindModifiers || "",
                    spans: item.spans.map(function (span) { return _this.decodeSpan(span, fileName, lineMap); }),
                    childItems: _this.decodeNavigationBarItems(item.childItems, fileName, lineMap),
                    indent: item.indent,
                    bolded: false,
                    grayed: false
                }); });
            };
            SessionClient.prototype.getNavigationBarItems = function (file) {
                var request = this.processRequest(server.CommandNames.NavBar, { file: file });
                var response = this.processResponse(request);
                var lineMap = this.getLineMap(file);
                return this.decodeNavigationBarItems(response.body, file, lineMap);
            };
            SessionClient.prototype.decodeNavigationTree = function (tree, fileName, lineMap) {
                var _this = this;
                return {
                    text: tree.text,
                    kind: tree.kind,
                    kindModifiers: tree.kindModifiers,
                    spans: tree.spans.map(function (span) { return _this.decodeSpan(span, fileName, lineMap); }),
                    nameSpan: tree.nameSpan && this.decodeSpan(tree.nameSpan, fileName, lineMap),
                    childItems: ts.map(tree.childItems, function (item) { return _this.decodeNavigationTree(item, fileName, lineMap); })
                };
            };
            SessionClient.prototype.getNavigationTree = function (file) {
                var request = this.processRequest(server.CommandNames.NavTree, { file: file });
                var response = this.processResponse(request);
                var lineMap = this.getLineMap(file);
                return this.decodeNavigationTree(response.body, file, lineMap); // TODO: GH#18217
            };
            SessionClient.prototype.decodeSpan = function (span, fileName, lineMap) {
                if (span.start.line === 1 && span.start.offset === 1 && span.end.line === 1 && span.end.offset === 1) {
                    return { start: 0, length: 0 };
                }
                fileName = fileName || span.file;
                lineMap = lineMap || this.getLineMap(fileName);
                return ts.createTextSpanFromBounds(this.lineOffsetToPosition(fileName, span.start, lineMap), this.lineOffsetToPosition(fileName, span.end, lineMap));
            };
            SessionClient.prototype.decodeLinkDisplayParts = function (tags) {
                return tags.map(function (tag) { return typeof tag.text === "string" ? __assign(__assign({}, tag), { text: [ts.textPart(tag.text)] }) : tag; });
            };
            SessionClient.prototype.getNameOrDottedNameSpan = function (_fileName, _startPos, _endPos) {
                return ts.notImplemented();
            };
            SessionClient.prototype.getBreakpointStatementAtPosition = function (_fileName, _position) {
                return ts.notImplemented();
            };
            SessionClient.prototype.getSignatureHelpItems = function (fileName, position) {
                var _this = this;
                var args = this.createFileLocationRequestArgs(fileName, position);
                var request = this.processRequest(server.CommandNames.SignatureHelp, args);
                var response = this.processResponse(request);
                if (!response.body) {
                    return undefined;
                }
                var _a = response.body, encodedItems = _a.items, encodedApplicableSpan = _a.applicableSpan, selectedItemIndex = _a.selectedItemIndex, argumentIndex = _a.argumentIndex, argumentCount = _a.argumentCount;
                var applicableSpan = encodedApplicableSpan;
                var items = encodedItems.map(function (item) { return (__assign(__assign({}, item), { tags: _this.decodeLinkDisplayParts(item.tags) })); });
                return { items: items, applicableSpan: applicableSpan, selectedItemIndex: selectedItemIndex, argumentIndex: argumentIndex, argumentCount: argumentCount };
            };
            SessionClient.prototype.getOccurrencesAtPosition = function (fileName, position) {
                var _this = this;
                var args = this.createFileLocationRequestArgs(fileName, position);
                var request = this.processRequest(server.CommandNames.Occurrences, args);
                var response = this.processResponse(request);
                return response.body.map(function (entry) { return ({
                    fileName: entry.file,
                    textSpan: _this.decodeSpan(entry),
                    isWriteAccess: entry.isWriteAccess,
                }); });
            };
            SessionClient.prototype.getDocumentHighlights = function (fileName, position, filesToSearch) {
                var _this = this;
                var args = __assign(__assign({}, this.createFileLocationRequestArgs(fileName, position)), { filesToSearch: filesToSearch });
                var request = this.processRequest(server.CommandNames.DocumentHighlights, args);
                var response = this.processResponse(request);
                return response.body.map(function (item) { return ({
                    fileName: item.file,
                    highlightSpans: item.highlightSpans.map(function (span) { return ({
                        textSpan: _this.decodeSpan(span, item.file),
                        kind: span.kind
                    }); }),
                }); });
            };
            SessionClient.prototype.getOutliningSpans = function (file) {
                var _this = this;
                var request = this.processRequest(server.CommandNames.GetOutliningSpans, { file: file });
                var response = this.processResponse(request);
                return response.body.map(function (item) { return ({
                    textSpan: _this.decodeSpan(item.textSpan, file),
                    hintSpan: _this.decodeSpan(item.hintSpan, file),
                    bannerText: item.bannerText,
                    autoCollapse: item.autoCollapse,
                    kind: item.kind
                }); });
            };
            SessionClient.prototype.getTodoComments = function (_fileName, _descriptors) {
                return ts.notImplemented();
            };
            SessionClient.prototype.getDocCommentTemplateAtPosition = function (_fileName, _position, _options) {
                return ts.notImplemented();
            };
            SessionClient.prototype.isValidBraceCompletionAtPosition = function (_fileName, _position, _openingBrace) {
                return ts.notImplemented();
            };
            SessionClient.prototype.getJsxClosingTagAtPosition = function (_fileName, _position) {
                return ts.notImplemented();
            };
            SessionClient.prototype.getSpanOfEnclosingComment = function (_fileName, _position, _onlyMultiLine) {
                return ts.notImplemented();
            };
            SessionClient.prototype.getCodeFixesAtPosition = function (file, start, end, errorCodes) {
                var _this = this;
                var args = __assign(__assign({}, this.createFileRangeRequestArgs(file, start, end)), { errorCodes: errorCodes });
                var request = this.processRequest(server.CommandNames.GetCodeFixes, args);
                var response = this.processResponse(request);
                return response.body.map(function (_a) {
                    var fixName = _a.fixName, description = _a.description, changes = _a.changes, commands = _a.commands, fixId = _a.fixId, fixAllDescription = _a.fixAllDescription;
                    return ({ fixName: fixName, description: description, changes: _this.convertChanges(changes, file), commands: commands, fixId: fixId, fixAllDescription: fixAllDescription });
                });
            };
            SessionClient.prototype.provideInlayHints = function (file, span) {
                var _this = this;
                var start = span.start, length = span.length;
                var args = { file: file, start: start, length: length };
                var request = this.processRequest(server.CommandNames.ProvideInlayHints, args);
                var response = this.processResponse(request);
                return response.body.map(function (item) { return (__assign(__assign({}, item), { kind: item.kind, position: _this.lineOffsetToPosition(file, item.position) })); });
            };
            SessionClient.prototype.createFileLocationOrRangeRequestArgs = function (positionOrRange, fileName) {
                return typeof positionOrRange === "number"
                    ? this.createFileLocationRequestArgs(fileName, positionOrRange)
                    : this.createFileRangeRequestArgs(fileName, positionOrRange.pos, positionOrRange.end);
            };
            SessionClient.prototype.createFileLocationRequestArgs = function (file, position) {
                var _a = this.positionToOneBasedLineOffset(file, position), line = _a.line, offset = _a.offset;
                return { file: file, line: line, offset: offset };
            };
            SessionClient.prototype.createFileRangeRequestArgs = function (file, start, end) {
                var _a = this.positionToOneBasedLineOffset(file, start), startLine = _a.line, startOffset = _a.offset;
                var _b = this.positionToOneBasedLineOffset(file, end), endLine = _b.line, endOffset = _b.offset;
                return { file: file, startLine: startLine, startOffset: startOffset, endLine: endLine, endOffset: endOffset };
            };
            SessionClient.prototype.createFileLocationRequestArgsWithEndLineAndOffset = function (file, start, end) {
                var _a = this.positionToOneBasedLineOffset(file, start), line = _a.line, offset = _a.offset;
                var _b = this.positionToOneBasedLineOffset(file, end), endLine = _b.line, endOffset = _b.offset;
                return { file: file, line: line, offset: offset, endLine: endLine, endOffset: endOffset };
            };
            SessionClient.prototype.getApplicableRefactors = function (fileName, positionOrRange) {
                var args = this.createFileLocationOrRangeRequestArgs(positionOrRange, fileName);
                var request = this.processRequest(server.CommandNames.GetApplicableRefactors, args);
                var response = this.processResponse(request);
                return response.body; // TODO: GH#18217
            };
            SessionClient.prototype.getEditsForRefactor = function (fileName, _formatOptions, positionOrRange, refactorName, actionName) {
                var args = this.createFileLocationOrRangeRequestArgs(positionOrRange, fileName);
                args.refactor = refactorName;
                args.action = actionName;
                var request = this.processRequest(server.CommandNames.GetEditsForRefactor, args);
                var response = this.processResponse(request);
                if (!response.body) {
                    return { edits: [], renameFilename: undefined, renameLocation: undefined };
                }
                var edits = this.convertCodeEditsToTextChanges(response.body.edits);
                var renameFilename = response.body.renameFilename;
                var renameLocation;
                if (renameFilename !== undefined) {
                    renameLocation = this.lineOffsetToPosition(renameFilename, response.body.renameLocation); // TODO: GH#18217
                }
                return {
                    edits: edits,
                    renameFilename: renameFilename,
                    renameLocation: renameLocation
                };
            };
            SessionClient.prototype.organizeImports = function (_args, _formatOptions) {
                return ts.notImplemented();
            };
            SessionClient.prototype.getEditsForFileRename = function () {
                return ts.notImplemented();
            };
            SessionClient.prototype.convertCodeEditsToTextChanges = function (edits) {
                var _this = this;
                return edits.map(function (edit) {
                    var fileName = edit.fileName;
                    return {
                        fileName: fileName,
                        textChanges: edit.textChanges.map(function (t) { return _this.convertTextChangeToCodeEdit(t, fileName); })
                    };
                });
            };
            SessionClient.prototype.convertChanges = function (changes, fileName) {
                var _this = this;
                return changes.map(function (change) { return ({
                    fileName: change.fileName,
                    textChanges: change.textChanges.map(function (textChange) { return _this.convertTextChangeToCodeEdit(textChange, fileName); })
                }); });
            };
            SessionClient.prototype.convertTextChangeToCodeEdit = function (change, fileName) {
                return {
                    span: this.decodeSpan(change, fileName),
                    newText: change.newText ? change.newText : ""
                };
            };
            SessionClient.prototype.getBraceMatchingAtPosition = function (fileName, position) {
                var _this = this;
                var args = this.createFileLocationRequestArgs(fileName, position);
                var request = this.processRequest(server.CommandNames.Brace, args);
                var response = this.processResponse(request);
                return response.body.map(function (entry) { return _this.decodeSpan(entry, fileName); }); // TODO: GH#18217
            };
            SessionClient.prototype.configurePlugin = function (pluginName, configuration) {
                var request = this.processRequest("configurePlugin", { pluginName: pluginName, configuration: configuration });
                this.processResponse(request, /*expectEmptyBody*/ true);
            };
            SessionClient.prototype.getIndentationAtPosition = function (_fileName, _position, _options) {
                return ts.notImplemented();
            };
            SessionClient.prototype.getSyntacticClassifications = function (_fileName, _span) {
                return ts.notImplemented();
            };
            SessionClient.prototype.getSemanticClassifications = function (_fileName, _span) {
                return ts.notImplemented();
            };
            SessionClient.prototype.getEncodedSyntacticClassifications = function (_fileName, _span) {
                return ts.notImplemented();
            };
            SessionClient.prototype.getEncodedSemanticClassifications = function (file, span, format) {
                var request = this.processRequest("encodedSemanticClassifications-full" /* protocol.CommandTypes.EncodedSemanticClassificationsFull */, { file: file, start: span.start, length: span.length, format: format });
                var r = this.processResponse(request);
                return r.body;
            };
            SessionClient.prototype.convertCallHierarchyItem = function (item) {
                return {
                    file: item.file,
                    name: item.name,
                    kind: item.kind,
                    kindModifiers: item.kindModifiers,
                    containerName: item.containerName,
                    span: this.decodeSpan(item.span, item.file),
                    selectionSpan: this.decodeSpan(item.selectionSpan, item.file)
                };
            };
            SessionClient.prototype.prepareCallHierarchy = function (fileName, position) {
                var _this = this;
                var args = this.createFileLocationRequestArgs(fileName, position);
                var request = this.processRequest(server.CommandNames.PrepareCallHierarchy, args);
                var response = this.processResponse(request);
                return response.body && ts.mapOneOrMany(response.body, function (item) { return _this.convertCallHierarchyItem(item); });
            };
            SessionClient.prototype.convertCallHierarchyIncomingCall = function (item) {
                var _this = this;
                return {
                    from: this.convertCallHierarchyItem(item.from),
                    fromSpans: item.fromSpans.map(function (span) { return _this.decodeSpan(span, item.from.file); })
                };
            };
            SessionClient.prototype.provideCallHierarchyIncomingCalls = function (fileName, position) {
                var _this = this;
                var args = this.createFileLocationRequestArgs(fileName, position);
                var request = this.processRequest(server.CommandNames.ProvideCallHierarchyIncomingCalls, args);
                var response = this.processResponse(request);
                return response.body.map(function (item) { return _this.convertCallHierarchyIncomingCall(item); });
            };
            SessionClient.prototype.convertCallHierarchyOutgoingCall = function (file, item) {
                var _this = this;
                return {
                    to: this.convertCallHierarchyItem(item.to),
                    fromSpans: item.fromSpans.map(function (span) { return _this.decodeSpan(span, file); })
                };
            };
            SessionClient.prototype.provideCallHierarchyOutgoingCalls = function (fileName, position) {
                var _this = this;
                var args = this.createFileLocationRequestArgs(fileName, position);
                var request = this.processRequest(server.CommandNames.ProvideCallHierarchyOutgoingCalls, args);
                var response = this.processResponse(request);
                return response.body.map(function (item) { return _this.convertCallHierarchyOutgoingCall(fileName, item); });
            };
            SessionClient.prototype.getProgram = function () {
                throw new Error("Program objects are not serializable through the server protocol.");
            };
            SessionClient.prototype.getCurrentProgram = function () {
                throw new Error("Program objects are not serializable through the server protocol.");
            };
            SessionClient.prototype.getAutoImportProvider = function () {
                throw new Error("Program objects are not serializable through the server protocol.");
            };
            SessionClient.prototype.updateIsDefinitionOfReferencedSymbols = function (_referencedSymbols, _knownSymbolSpans) {
                return ts.notImplemented();
            };
            SessionClient.prototype.getNonBoundSourceFile = function (_fileName) {
                throw new Error("SourceFile objects are not serializable through the server protocol.");
            };
            SessionClient.prototype.getSourceFile = function (_fileName) {
                throw new Error("SourceFile objects are not serializable through the server protocol.");
            };
            SessionClient.prototype.cleanupSemanticCache = function () {
                throw new Error("cleanupSemanticCache is not available through the server layer.");
            };
            SessionClient.prototype.getSourceMapper = function () {
                return ts.notImplemented();
            };
            SessionClient.prototype.clearSourceMapperCache = function () {
                return ts.notImplemented();
            };
            SessionClient.prototype.toggleLineComment = function () {
                return ts.notImplemented();
            };
            SessionClient.prototype.toggleMultilineComment = function () {
                return ts.notImplemented();
            };
            SessionClient.prototype.commentSelection = function () {
                return ts.notImplemented();
            };
            SessionClient.prototype.uncommentSelection = function () {
                return ts.notImplemented();
            };
            SessionClient.prototype.dispose = function () {
                throw new Error("dispose is not available through the server layer.");
            };
            return SessionClient;
        }());
        server.SessionClient = SessionClient;
    })(server = ts.server || (ts.server = {}));
})(ts || (ts = {}));
var Utils;
(function (Utils) {
    var _a = require("path"), join = _a.join, resolve = _a.resolve, dirname = _a.dirname;
    var existsSync = require("fs").existsSync;
    // search directories upward to avoid hard-wired paths based on the
    // build tree (same as scripts/build/findUpDir.js)
    function findUpFile(name) {
        var dir = __dirname;
        while (true) {
            var fullPath = join(dir, name);
            if (existsSync(fullPath))
                return fullPath;
            var up = resolve(dir, "..");
            if (up === dir)
                return name; // it'll fail anyway
            dir = up;
        }
    }
    Utils.findUpFile = findUpFile;
    Utils.findUpRoot = function () { return Utils.findUpRoot.cached || (Utils.findUpRoot.cached = dirname(findUpFile("Gulpfile.mjs"))); };
})(Utils || (Utils = {}));
var Harness;
(function (Harness) {
    /* eslint-disable prefer-const */
    Harness.shards = 1;
    Harness.shardId = 1;
    /* eslint-enable prefer-const */
    // The following have setters as while they're read here in the harness, they're only set in the runner
    function setShards(count) {
        Harness.shards = count;
    }
    Harness.setShards = setShards;
    function setShardId(id) {
        Harness.shardId = id;
    }
    Harness.setShardId = setShardId;
    var RunnerBase = /** @class */ (function () {
        function RunnerBase() {
            // contains the tests to run
            this.tests = [];
            /** The working directory where tests are found. Needed for batch testing where the input path will differ from the output path inside baselines */
            this.workingDirectory = "";
        }
        /** Add a source file to the runner's list of tests that need to be initialized with initializeTests */
        RunnerBase.prototype.addTest = function (fileName) {
            this.tests.push(fileName);
        };
        RunnerBase.prototype.enumerateFiles = function (folder, regex, options) {
            return ts.map(Harness.IO.listFiles(Harness.userSpecifiedRoot + folder, regex, { recursive: (options ? options.recursive : false) }), ts.normalizeSlashes);
        };
        RunnerBase.prototype.getTestFiles = function () {
            var all = this.enumerateTestFiles();
            if (Harness.shards === 1) {
                return all;
            }
            return all.filter(function (_val, idx) { return idx % Harness.shards === (Harness.shardId - 1); });
        };
        /** Replaces instances of full paths with fileNames only */
        RunnerBase.removeFullPaths = function (path) {
            // If its a full path (starts with "C:" or "/") replace with just the filename
            var fixedPath = /^(\w:|\/)/.test(path) ? ts.getBaseFileName(path) : path;
            // when running in the browser the 'full path' is the host name, shows up in error baselines
            var localHost = /http:\/localhost:\d+/g;
            fixedPath = fixedPath.replace(localHost, "");
            return fixedPath;
        };
        return RunnerBase;
    }());
    Harness.RunnerBase = RunnerBase;
})(Harness || (Harness = {}));
var Harness;
(function (Harness) {
    var SourceMapRecorder;
    (function (SourceMapRecorder) {
        var SourceMapDecoder;
        (function (SourceMapDecoder) {
            var sourceMapMappings;
            var decodingIndex;
            var mappings;
            function initializeSourceMapDecoding(sourceMap) {
                decodingIndex = 0;
                sourceMapMappings = sourceMap.mappings;
                mappings = ts.decodeMappings(sourceMap.mappings);
            }
            SourceMapDecoder.initializeSourceMapDecoding = initializeSourceMapDecoding;
            function decodeNextEncodedSourceMapSpan() {
                if (!mappings)
                    return ts.Debug.fail("not initialized");
                var result = mappings.next();
                if (result.done)
                    return { error: mappings.error || "No encoded entry found", sourceMapSpan: mappings.state };
                return { sourceMapSpan: result.value };
            }
            SourceMapDecoder.decodeNextEncodedSourceMapSpan = decodeNextEncodedSourceMapSpan;
            function hasCompletedDecoding() {
                if (!mappings)
                    return ts.Debug.fail("not initialized");
                return mappings.pos === sourceMapMappings.length;
            }
            SourceMapDecoder.hasCompletedDecoding = hasCompletedDecoding;
            function getRemainingDecodeString() {
                return sourceMapMappings.substr(decodingIndex);
            }
            SourceMapDecoder.getRemainingDecodeString = getRemainingDecodeString;
        })(SourceMapDecoder || (SourceMapDecoder = {}));
        var SourceMapSpanWriter;
        (function (SourceMapSpanWriter) {
            var sourceMapRecorder;
            var sourceMapSources;
            var sourceMapNames;
            var jsFile;
            var jsLineMap;
            var tsCode;
            var tsLineMap;
            var spansOnSingleLine;
            var prevWrittenSourcePos;
            var nextJsLineToWrite;
            var spanMarkerContinues;
            function initializeSourceMapSpanWriter(sourceMapRecordWriter, sourceMap, currentJsFile) {
                sourceMapRecorder = sourceMapRecordWriter;
                sourceMapSources = sourceMap.sources;
                sourceMapNames = sourceMap.names;
                jsFile = currentJsFile;
                jsLineMap = jsFile.lineStarts;
                spansOnSingleLine = [];
                prevWrittenSourcePos = 0;
                nextJsLineToWrite = 0;
                spanMarkerContinues = false;
                SourceMapDecoder.initializeSourceMapDecoding(sourceMap);
                sourceMapRecorder.WriteLine("===================================================================");
                sourceMapRecorder.WriteLine("JsFile: " + sourceMap.file);
                sourceMapRecorder.WriteLine("mapUrl: " + ts.tryGetSourceMappingURL(ts.getLineInfo(jsFile.text, jsLineMap)));
                sourceMapRecorder.WriteLine("sourceRoot: " + sourceMap.sourceRoot);
                sourceMapRecorder.WriteLine("sources: " + sourceMap.sources);
                if (sourceMap.sourcesContent) {
                    sourceMapRecorder.WriteLine("sourcesContent: " + JSON.stringify(sourceMap.sourcesContent));
                }
                sourceMapRecorder.WriteLine("===================================================================");
            }
            SourceMapSpanWriter.initializeSourceMapSpanWriter = initializeSourceMapSpanWriter;
            function getSourceMapSpanString(mapEntry, getAbsentNameIndex) {
                var mapString = "Emitted(" + (mapEntry.generatedLine + 1) + ", " + (mapEntry.generatedCharacter + 1) + ")";
                if (ts.isSourceMapping(mapEntry)) {
                    mapString += " Source(" + (mapEntry.sourceLine + 1) + ", " + (mapEntry.sourceCharacter + 1) + ") + SourceIndex(" + mapEntry.sourceIndex + ")";
                    if (mapEntry.nameIndex >= 0 && mapEntry.nameIndex < sourceMapNames.length) {
                        mapString += " name (" + sourceMapNames[mapEntry.nameIndex] + ")";
                    }
                    else {
                        if ((mapEntry.nameIndex && mapEntry.nameIndex !== -1) || getAbsentNameIndex) {
                            mapString += " nameIndex (" + mapEntry.nameIndex + ")";
                        }
                    }
                }
                return mapString;
            }
            function recordSourceMapSpan(sourceMapSpan) {
                // verify the decoded span is same as the new span
                var decodeResult = SourceMapDecoder.decodeNextEncodedSourceMapSpan();
                var decodeErrors;
                if (typeof decodeResult.error === "string" || !ts.sameMapping(decodeResult.sourceMapSpan, sourceMapSpan)) {
                    if (decodeResult.error) {
                        decodeErrors = ["!!^^ !!^^ There was decoding error in the sourcemap at this location: " + decodeResult.error];
                    }
                    else {
                        decodeErrors = ["!!^^ !!^^ The decoded span from sourcemap's mapping entry does not match what was encoded for this span:"];
                    }
                    decodeErrors.push("!!^^ !!^^ Decoded span from sourcemap's mappings entry: " + getSourceMapSpanString(decodeResult.sourceMapSpan, /*getAbsentNameIndex*/ true) + " Span encoded by the emitter:" + getSourceMapSpanString(sourceMapSpan, /*getAbsentNameIndex*/ true));
                }
                if (spansOnSingleLine.length && spansOnSingleLine[0].sourceMapSpan.generatedLine !== sourceMapSpan.generatedLine) {
                    // On different line from the one that we have been recording till now,
                    writeRecordedSpans();
                    spansOnSingleLine = [];
                }
                spansOnSingleLine.push({ sourceMapSpan: sourceMapSpan, decodeErrors: decodeErrors });
            }
            SourceMapSpanWriter.recordSourceMapSpan = recordSourceMapSpan;
            function recordNewSourceFileSpan(sourceMapSpan, newSourceFileCode) {
                var continuesLine = false;
                if (spansOnSingleLine.length > 0 && spansOnSingleLine[0].sourceMapSpan.generatedCharacter === sourceMapSpan.generatedLine) {
                    writeRecordedSpans();
                    spansOnSingleLine = [];
                    nextJsLineToWrite--; // walk back one line to reprint the line
                    continuesLine = true;
                }
                recordSourceMapSpan(sourceMapSpan);
                assert.isTrue(spansOnSingleLine.length === 1);
                sourceMapRecorder.WriteLine("-------------------------------------------------------------------");
                sourceMapRecorder.WriteLine("emittedFile:" + jsFile.file + (continuesLine ? " (".concat(sourceMapSpan.generatedLine + 1, ", ").concat(sourceMapSpan.generatedCharacter + 1, ")") : ""));
                sourceMapRecorder.WriteLine("sourceFile:" + sourceMapSources[spansOnSingleLine[0].sourceMapSpan.sourceIndex]);
                sourceMapRecorder.WriteLine("-------------------------------------------------------------------");
                tsLineMap = ts.computeLineStarts(newSourceFileCode);
                tsCode = newSourceFileCode;
                prevWrittenSourcePos = 0;
            }
            SourceMapSpanWriter.recordNewSourceFileSpan = recordNewSourceFileSpan;
            function close() {
                // Write the lines pending on the single line
                writeRecordedSpans();
                if (!SourceMapDecoder.hasCompletedDecoding()) {
                    sourceMapRecorder.WriteLine("!!!! **** There are more source map entries in the sourceMap's mapping than what was encoded");
                    sourceMapRecorder.WriteLine("!!!! **** Remaining decoded string: " + SourceMapDecoder.getRemainingDecodeString());
                }
                // write remaining js lines
                writeJsFileLines(jsLineMap.length);
            }
            SourceMapSpanWriter.close = close;
            function getTextOfLine(line, lineMap, code) {
                var startPos = lineMap[line];
                var endPos = lineMap[line + 1];
                var text = code.substring(startPos, endPos);
                return line === 0 ? Utils.removeByteOrderMark(text) : text;
            }
            function writeJsFileLines(endJsLine) {
                for (; nextJsLineToWrite < endJsLine; nextJsLineToWrite++) {
                    sourceMapRecorder.Write(">>>" + getTextOfLine(nextJsLineToWrite, jsLineMap, jsFile.text));
                }
            }
            function writeRecordedSpans() {
                var markerIds = [];
                function getMarkerId(markerIndex) {
                    var markerId = "";
                    if (spanMarkerContinues) {
                        assert.isTrue(markerIndex === 0);
                        markerId = "1->";
                    }
                    else {
                        markerId = "" + (markerIndex + 1);
                        if (markerId.length < 2) {
                            markerId = markerId + " ";
                        }
                        markerId += ">";
                    }
                    return markerId;
                }
                var prevEmittedCol;
                function iterateSpans(fn) {
                    prevEmittedCol = 0;
                    for (var i = 0; i < spansOnSingleLine.length; i++) {
                        fn(spansOnSingleLine[i], i);
                        prevEmittedCol = spansOnSingleLine[i].sourceMapSpan.generatedCharacter;
                    }
                }
                function writeSourceMapIndent(indentLength, indentPrefix) {
                    sourceMapRecorder.Write(indentPrefix);
                    for (var i = 0; i < indentLength; i++) {
                        sourceMapRecorder.Write(" ");
                    }
                }
                function writeSourceMapMarker(currentSpan, index, endColumn, endContinues) {
                    if (endColumn === void 0) { endColumn = currentSpan.sourceMapSpan.generatedCharacter; }
                    if (endContinues === void 0) { endContinues = false; }
                    var markerId = getMarkerId(index);
                    markerIds.push(markerId);
                    writeSourceMapIndent(prevEmittedCol, markerId);
                    for (var i = prevEmittedCol; i < endColumn; i++) {
                        sourceMapRecorder.Write("^");
                    }
                    if (endContinues) {
                        sourceMapRecorder.Write("->");
                    }
                    sourceMapRecorder.WriteLine("");
                    spanMarkerContinues = endContinues;
                }
                function writeSourceMapSourceText(currentSpan, index) {
                    var sourcePos = tsLineMap[currentSpan.sourceMapSpan.sourceLine] + (currentSpan.sourceMapSpan.sourceCharacter);
                    var sourceText = "";
                    if (prevWrittenSourcePos < sourcePos) {
                        // Position that goes forward, get text
                        sourceText = tsCode.substring(prevWrittenSourcePos, sourcePos);
                    }
                    if (currentSpan.decodeErrors) {
                        // If there are decode errors, write
                        for (var _i = 0, _a = currentSpan.decodeErrors; _i < _a.length; _i++) {
                            var decodeError = _a[_i];
                            writeSourceMapIndent(prevEmittedCol, markerIds[index]);
                            sourceMapRecorder.WriteLine(decodeError);
                        }
                    }
                    var tsCodeLineMap = ts.computeLineStarts(sourceText);
                    for (var i = 0; i < tsCodeLineMap.length; i++) {
                        writeSourceMapIndent(prevEmittedCol, i === 0 ? markerIds[index] : "  >");
                        sourceMapRecorder.Write(getTextOfLine(i, tsCodeLineMap, sourceText));
                        if (i === tsCodeLineMap.length - 1) {
                            sourceMapRecorder.WriteLine("");
                        }
                    }
                    prevWrittenSourcePos = sourcePos;
                }
                function writeSpanDetails(currentSpan, index) {
                    sourceMapRecorder.WriteLine(markerIds[index] + getSourceMapSpanString(currentSpan.sourceMapSpan));
                }
                if (spansOnSingleLine.length) {
                    var currentJsLine = spansOnSingleLine[0].sourceMapSpan.generatedLine;
                    // Write js line
                    writeJsFileLines(currentJsLine + 1);
                    // Emit markers
                    iterateSpans(writeSourceMapMarker);
                    var jsFileText = getTextOfLine(currentJsLine + 1, jsLineMap, jsFile.text);
                    if (prevEmittedCol < jsFileText.length - 1) {
                        // There is remaining text on this line that will be part of next source span so write marker that continues
                        writeSourceMapMarker(/*currentSpan*/ undefined, spansOnSingleLine.length, /*endColumn*/ jsFileText.length - 1, /*endContinues*/ true); // TODO: GH#18217
                    }
                    // Emit Source text
                    iterateSpans(writeSourceMapSourceText);
                    // Emit column number etc
                    iterateSpans(writeSpanDetails);
                    sourceMapRecorder.WriteLine("---");
                }
            }
        })(SourceMapSpanWriter || (SourceMapSpanWriter = {}));
        function getSourceMapRecord(sourceMapDataList, program, jsFiles, declarationFiles) {
            var sourceMapRecorder = new Harness.Compiler.WriterAggregator();
            for (var i = 0; i < sourceMapDataList.length; i++) {
                var sourceMapData = sourceMapDataList[i];
                var prevSourceFile = void 0;
                var currentFile = void 0;
                if (ts.isDeclarationFileName(sourceMapData.sourceMap.file)) {
                    if (sourceMapDataList.length > jsFiles.length) {
                        currentFile = declarationFiles[Math.floor(i / 2)]; // When both kinds of source map are present, they alternate js/dts
                    }
                    else {
                        currentFile = declarationFiles[i];
                    }
                }
                else {
                    if (sourceMapDataList.length > jsFiles.length) {
                        currentFile = jsFiles[Math.floor(i / 2)];
                    }
                    else {
                        currentFile = jsFiles[i];
                    }
                }
                SourceMapSpanWriter.initializeSourceMapSpanWriter(sourceMapRecorder, sourceMapData.sourceMap, currentFile);
                var mapper = ts.decodeMappings(sourceMapData.sourceMap.mappings);
                for (var iterResult = mapper.next(); !iterResult.done; iterResult = mapper.next()) {
                    var decodedSourceMapping = iterResult.value;
                    var currentSourceFile = ts.isSourceMapping(decodedSourceMapping)
                        ? program.getSourceFile(sourceMapData.inputSourceFileNames[decodedSourceMapping.sourceIndex])
                        : undefined;
                    if (currentSourceFile !== prevSourceFile) {
                        if (currentSourceFile) {
                            SourceMapSpanWriter.recordNewSourceFileSpan(decodedSourceMapping, currentSourceFile.text);
                        }
                        prevSourceFile = currentSourceFile;
                    }
                    else {
                        SourceMapSpanWriter.recordSourceMapSpan(decodedSourceMapping);
                    }
                }
                SourceMapSpanWriter.close(); // If the last spans werent emitted, emit them
            }
            sourceMapRecorder.Close();
            return sourceMapRecorder.lines.join("\r\n");
        }
        SourceMapRecorder.getSourceMapRecord = getSourceMapRecord;
        function getSourceMapRecordWithSystem(sys, sourceMapFile) {
            var sourceMapRecorder = new Harness.Compiler.WriterAggregator();
            var prevSourceFile;
            var files = new ts.Map();
            var sourceMap = ts.tryParseRawSourceMap(sys.readFile(sourceMapFile, "utf8"));
            if (sourceMap) {
                var mapDirectory = ts.getDirectoryPath(sourceMapFile);
                var sourceRoot_1 = sourceMap.sourceRoot ? ts.getNormalizedAbsolutePath(sourceMap.sourceRoot, mapDirectory) : mapDirectory;
                var generatedAbsoluteFilePath = ts.getNormalizedAbsolutePath(sourceMap.file, mapDirectory);
                var sourceFileAbsolutePaths = sourceMap.sources.map(function (source) { return ts.getNormalizedAbsolutePath(source, sourceRoot_1); });
                var currentFile = getFile(generatedAbsoluteFilePath);
                SourceMapSpanWriter.initializeSourceMapSpanWriter(sourceMapRecorder, sourceMap, currentFile);
                var mapper = ts.decodeMappings(sourceMap.mappings);
                for (var iterResult = mapper.next(); !iterResult.done; iterResult = mapper.next()) {
                    var decodedSourceMapping = iterResult.value;
                    var currentSourceFile = ts.isSourceMapping(decodedSourceMapping)
                        ? getFile(sourceFileAbsolutePaths[decodedSourceMapping.sourceIndex])
                        : undefined;
                    if (currentSourceFile !== prevSourceFile) {
                        if (currentSourceFile) {
                            SourceMapSpanWriter.recordNewSourceFileSpan(decodedSourceMapping, currentSourceFile.text);
                        }
                        prevSourceFile = currentSourceFile;
                    }
                    else {
                        SourceMapSpanWriter.recordSourceMapSpan(decodedSourceMapping);
                    }
                }
                SourceMapSpanWriter.close(); // If the last spans werent emitted, emit them
            }
            sourceMapRecorder.Close();
            return sourceMapRecorder.lines.join("\r\n");
            function getFile(path) {
                var existing = files.get(path);
                if (existing)
                    return existing;
                var value = new documents.TextDocument(path, sys.readFile(path, "utf8"));
                files.set(path, value);
                return value;
            }
        }
        SourceMapRecorder.getSourceMapRecordWithSystem = getSourceMapRecordWithSystem;
    })(SourceMapRecorder = Harness.SourceMapRecorder || (Harness.SourceMapRecorder = {}));
})(Harness || (Harness = {}));
// Block scoped definitions work poorly for global variables, temporarily enable var
/* eslint-disable no-var */
var _chai = require("chai");
globalThis.assert = _chai.assert;
{
    // chai's builtin `assert.isFalse` is featureful but slow - we don't use those features,
    // so we'll just overwrite it as an alterative to migrating a bunch of code off of chai
    assert.isFalse = function (expr, msg) {
        if (expr !== false)
            throw new Error(msg);
    };
    var assertDeepImpl_1 = assert.deepEqual;
    assert.deepEqual = function (a, b, msg) {
        if (ts.isArray(a) && ts.isArray(b)) {
            assertDeepImpl_1(arrayExtraKeysObject(a), arrayExtraKeysObject(b), "Array extra keys differ");
        }
        assertDeepImpl_1(a, b, msg);
        function arrayExtraKeysObject(a) {
            var obj = {};
            for (var key in a) {
                if (Number.isNaN(Number(key))) {
                    obj[key] = a[key];
                }
            }
            return obj;
        }
    };
}
globalThis.expect = _chai.expect;
var Utils;
(function (Utils) {
    function encodeString(s) {
        return ts.sys.bufferFrom(s).toString("utf8");
    }
    Utils.encodeString = encodeString;
    function byteLength(s, encoding) {
        // stub implementation if Buffer is not available (in-browser case)
        return Buffer.byteLength(s, encoding);
    }
    Utils.byteLength = byteLength;
    function evalFile(fileContents, fileName, nodeContext) {
        var vm = require("vm");
        if (nodeContext) {
            vm.runInNewContext(fileContents, nodeContext, fileName);
        }
        else {
            vm.runInThisContext(fileContents, fileName);
        }
    }
    Utils.evalFile = evalFile;
    /** Splits the given string on \r\n, or on only \n if that fails, or on only \r if *that* fails. */
    function splitContentByNewlines(content) {
        // Split up the input file by line
        // Note: IE JS engine incorrectly handles consecutive delimiters here when using RegExp split, so
        // we have to use string-based splitting instead and try to figure out the delimiting chars
        var lines = content.split("\r\n");
        if (lines.length === 1) {
            lines = content.split("\n");
            if (lines.length === 1) {
                lines = content.split("\r");
            }
        }
        return lines;
    }
    Utils.splitContentByNewlines = splitContentByNewlines;
    /** Reads a file under /tests */
    function readTestFile(path) {
        if (path.indexOf("tests") < 0) {
            path = "tests/" + path;
        }
        var content;
        try {
            content = Harness.IO.readFile(Harness.userSpecifiedRoot + path);
        }
        catch (err) {
            return undefined;
        }
        return content;
    }
    Utils.readTestFile = readTestFile;
    function memoize(f, memoKey) {
        var cache = new ts.Map();
        return function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            var key = memoKey.apply(void 0, args);
            if (cache.has(key)) {
                return cache.get(key);
            }
            else {
                var value = f.apply(this, args);
                cache.set(key, value);
                return value;
            }
        };
    }
    Utils.memoize = memoize;
    Utils.canonicalizeForHarness = ts.createGetCanonicalFileName(/*caseSensitive*/ false); // This is done so tests work on windows _and_ linux
    function assertInvariants(node, parent) {
        var queue = [[node, parent]];
        for (var _i = 0, queue_1 = queue; _i < queue_1.length; _i++) {
            var _a = queue_1[_i], node_1 = _a[0], parent_1 = _a[1];
            assertInvariantsWorker(node_1, parent_1);
        }
        function assertInvariantsWorker(node, parent) {
            if (node) {
                assert.isFalse(node.pos < 0, "node.pos < 0");
                assert.isFalse(node.end < 0, "node.end < 0");
                assert.isFalse(node.end < node.pos, "node.end < node.pos");
                assert.equal(node.parent, parent, "node.parent !== parent");
                if (parent) {
                    // Make sure each child is contained within the parent.
                    assert.isFalse(node.pos < parent.pos, "node.pos < parent.pos");
                    assert.isFalse(node.end > parent.end, "node.end > parent.end");
                }
                ts.forEachChild(node, function (child) {
                    queue.push([child, node]);
                });
                // Make sure each of the children is in order.
                var currentPos_1 = 0;
                ts.forEachChild(node, function (child) {
                    assert.isFalse(child.pos < currentPos_1, "child.pos < currentPos");
                    currentPos_1 = child.end;
                }, function (array) {
                    assert.isFalse(array.pos < node.pos, "array.pos < node.pos");
                    assert.isFalse(array.end > node.end, "array.end > node.end");
                    assert.isFalse(array.pos < currentPos_1, "array.pos < currentPos");
                    for (var _i = 0, array_1 = array; _i < array_1.length; _i++) {
                        var item = array_1[_i];
                        assert.isFalse(item.pos < currentPos_1, "array[i].pos < currentPos");
                        currentPos_1 = item.end;
                    }
                    currentPos_1 = array.end;
                });
                var childNodesAndArrays_1 = [];
                ts.forEachChild(node, function (child) {
                    childNodesAndArrays_1.push(child);
                }, function (array) {
                    childNodesAndArrays_1.push(array);
                });
                for (var childName in node) {
                    if (childName === "parent" ||
                        childName === "nextContainer" ||
                        childName === "modifiers" ||
                        childName === "externalModuleIndicator" ||
                        // for now ignore jsdoc comments
                        childName === "jsDocComment" ||
                        childName === "checkJsDirective" ||
                        childName === "commonJsModuleIndicator" ||
                        // ignore nodes added only to report grammar errors
                        childName === "illegalInitializer" ||
                        childName === "illegalDecorators" ||
                        childName === "illegalModifiers" ||
                        childName === "illegalQuestionToken" ||
                        childName === "illegalExclamationToken" ||
                        childName === "illegalTypeParameters" ||
                        childName === "illegalType") {
                        continue;
                    }
                    var child = node[childName];
                    if (isNodeOrArray(child)) {
                        assert.isFalse(childNodesAndArrays_1.indexOf(child) < 0, "Missing child when forEach'ing over node: " + ts.Debug.formatSyntaxKind(node.kind) + "-" + childName);
                    }
                }
            }
        }
    }
    Utils.assertInvariants = assertInvariants;
    function isNodeOrArray(a) {
        return a !== undefined && typeof a.pos === "number";
    }
    function convertDiagnostics(diagnostics) {
        return diagnostics.map(convertDiagnostic);
    }
    Utils.convertDiagnostics = convertDiagnostics;
    function convertDiagnostic(diagnostic) {
        return {
            start: diagnostic.start,
            length: diagnostic.length,
            messageText: ts.flattenDiagnosticMessageText(diagnostic.messageText, Harness.IO.newLine()),
            category: ts.diagnosticCategoryName(diagnostic, /*lowerCase*/ false),
            code: diagnostic.code
        };
    }
    function sourceFileToJSON(file) {
        return JSON.stringify(file, function (_, v) { return isNodeOrArray(v) ? serializeNode(v) : v; }, "    ");
        function getKindName(k) {
            if (k === undefined || ts.isString(k)) {
                return k;
            }
            return ts.Debug.formatSyntaxKind(k);
        }
        function getNodeFlagName(f) {
            return ts.Debug.formatNodeFlags(f);
        }
        function serializeNode(n) {
            var o = { kind: getKindName(n.kind) };
            if (ts.containsParseError(n)) {
                o.containsParseError = true;
            }
            for (var _i = 0, _a = Object.getOwnPropertyNames(n); _i < _a.length; _i++) {
                var propertyName = _a[_i];
                switch (propertyName) {
                    case "parent":
                    case "symbol":
                    case "locals":
                    case "localSymbol":
                    case "kind":
                    case "id":
                    case "nodeCount":
                    case "symbolCount":
                    case "identifierCount":
                    case "scriptSnapshot":
                        // Blocklist of items we never put in the baseline file.
                        break;
                    case "originalKeywordKind":
                        o[propertyName] = getKindName(n[propertyName]);
                        break;
                    case "flags":
                        // Clear the flags that are produced by aggregating child values. That is ephemeral
                        // data we don't care about in the dump. We only care what the parser set directly
                        // on the AST.
                        var flags = n.flags & ~(262144 /* ts.NodeFlags.JavaScriptFile */ | 1048576 /* ts.NodeFlags.HasAggregatedChildData */);
                        if (flags) {
                            o[propertyName] = getNodeFlagName(flags);
                        }
                        break;
                    case "parseDiagnostics":
                        o[propertyName] = convertDiagnostics(n[propertyName]);
                        break;
                    case "nextContainer":
                        if (n.nextContainer) {
                            o[propertyName] = { kind: n.nextContainer.kind, pos: n.nextContainer.pos, end: n.nextContainer.end };
                        }
                        break;
                    case "text":
                        // Include 'text' field for identifiers/literals, but not for source files.
                        if (n.kind !== 308 /* ts.SyntaxKind.SourceFile */) {
                            o[propertyName] = n[propertyName];
                        }
                        break;
                    default:
                        o[propertyName] = n[propertyName];
                }
            }
            return o;
        }
    }
    Utils.sourceFileToJSON = sourceFileToJSON;
    function assertDiagnosticsEquals(array1, array2) {
        if (array1 === array2) {
            return;
        }
        assert(array1, "array1");
        assert(array2, "array2");
        assert.equal(array1.length, array2.length, "array1.length !== array2.length");
        for (var i = 0; i < array1.length; i++) {
            var d1 = array1[i];
            var d2 = array2[i];
            assert.equal(d1.start, d2.start, "d1.start !== d2.start");
            assert.equal(d1.length, d2.length, "d1.length !== d2.length");
            assert.equal(ts.flattenDiagnosticMessageText(d1.messageText, Harness.IO.newLine()), ts.flattenDiagnosticMessageText(d2.messageText, Harness.IO.newLine()), "d1.messageText !== d2.messageText");
            assert.equal(d1.category, d2.category, "d1.category !== d2.category");
            assert.equal(d1.code, d2.code, "d1.code !== d2.code");
        }
    }
    Utils.assertDiagnosticsEquals = assertDiagnosticsEquals;
    function assertStructuralEquals(node1, node2) {
        if (node1 === node2) {
            return;
        }
        assert(node1, "node1");
        assert(node2, "node2");
        assert.equal(node1.pos, node2.pos, "node1.pos !== node2.pos");
        assert.equal(node1.end, node2.end, "node1.end !== node2.end");
        assert.equal(node1.kind, node2.kind, "node1.kind !== node2.kind");
        // call this on both nodes to ensure all propagated flags have been set (and thus can be
        // compared).
        assert.equal(ts.containsParseError(node1), ts.containsParseError(node2));
        assert.equal(node1.flags & ~2816 /* ts.NodeFlags.ReachabilityAndEmitFlags */, node2.flags & ~2816 /* ts.NodeFlags.ReachabilityAndEmitFlags */, "node1.flags !== node2.flags");
        ts.forEachChild(node1, function (child1) {
            var childName = findChildName(node1, child1);
            var child2 = node2[childName];
            assertStructuralEquals(child1, child2);
        }, function (array1) {
            var childName = findChildName(node1, array1);
            var array2 = node2[childName];
            assertArrayStructuralEquals(array1, array2);
        });
    }
    Utils.assertStructuralEquals = assertStructuralEquals;
    function assertArrayStructuralEquals(array1, array2) {
        if (array1 === array2) {
            return;
        }
        assert(array1, "array1");
        assert(array2, "array2");
        assert.equal(array1.pos, array2.pos, "array1.pos !== array2.pos");
        assert.equal(array1.end, array2.end, "array1.end !== array2.end");
        assert.equal(array1.length, array2.length, "array1.length !== array2.length");
        for (var i = 0; i < array1.length; i++) {
            assertStructuralEquals(array1[i], array2[i]);
        }
    }
    function findChildName(parent, child) {
        for (var name in parent) {
            if (ts.hasProperty(parent, name) && parent[name] === child) {
                return name;
            }
        }
        throw new Error("Could not find child in parent");
    }
    var maxHarnessFrames = 1;
    function filterStack(error, stackTraceLimit) {
        if (stackTraceLimit === void 0) { stackTraceLimit = Infinity; }
        var stack = error.stack;
        if (stack) {
            var lines = stack.split(/\r\n?|\n/g);
            var filtered = [];
            var frameCount = 0;
            var harnessFrameCount = 0;
            for (var _i = 0, lines_2 = lines; _i < lines_2.length; _i++) {
                var line = lines_2[_i];
                if (isStackFrame(line)) {
                    if (frameCount >= stackTraceLimit
                        || isMocha(line)
                        || isNode(line)) {
                        continue;
                    }
                    if (isHarness(line)) {
                        if (harnessFrameCount >= maxHarnessFrames) {
                            continue;
                        }
                        harnessFrameCount++;
                    }
                    line = line.replace(/\bfile:\/\/\/(.*?)(?=(:\d+)*($|\)))/, function (_, path) { return ts.sys.resolvePath(path); });
                    frameCount++;
                }
                filtered.push(line);
            }
            error.stack = filtered.join(Harness.IO.newLine());
        }
        return error;
    }
    Utils.filterStack = filterStack;
    function isStackFrame(line) {
        return /^\s+at\s/.test(line);
    }
    function isMocha(line) {
        return /[\\/](node_modules|components)[\\/]mocha(js)?[\\/]|[\\/]mocha\.js/.test(line);
    }
    function isNode(line) {
        return /\((timers|events|node|module)\.js:/.test(line);
    }
    function isHarness(line) {
        return /[\\/]src[\\/]harness[\\/]|[\\/]run\.js/.test(line);
    }
})(Utils || (Utils = {}));
var Harness;
(function (Harness) {
    function setHarnessIO(io) {
        Harness.IO = io;
    }
    Harness.setHarnessIO = setHarnessIO;
    // harness always uses one kind of new line
    // But note that `parseTestData` in `fourslash.ts` uses "\n"
    Harness.harnessNewLine = "\r\n";
    // Root for file paths that are stored in a virtual file system
    Harness.virtualFileSystemRoot = "/";
    function createNodeIO() {
        var workspaceRoot = Utils.findUpRoot();
        var fs, pathModule;
        if (require) {
            fs = require("fs");
            pathModule = require("path");
        }
        else {
            fs = pathModule = {};
        }
        function deleteFile(path) {
            try {
                fs.unlinkSync(path);
            }
            catch ( /*ignore*/_a) { /*ignore*/ }
        }
        function directoryName(path) {
            var dirPath = pathModule.dirname(path);
            // Node will just continue to repeat the root path, rather than return null
            return dirPath === path ? undefined : dirPath;
        }
        function joinPath() {
            var components = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                components[_i] = arguments[_i];
            }
            return pathModule.join.apply(pathModule, components);
        }
        function enumerateTestFiles(runner) {
            return runner.getTestFiles();
        }
        function listFiles(path, spec, options) {
            if (options === void 0) { options = {}; }
            function filesInFolder(folder) {
                var paths = [];
                for (var _i = 0, _a = fs.readdirSync(folder); _i < _a.length; _i++) {
                    var file = _a[_i];
                    var pathToFile = pathModule.join(folder, file);
                    if (!fs.existsSync(pathToFile))
                        continue; // ignore invalid symlinks
                    var stat = fs.statSync(pathToFile);
                    if (options.recursive && stat.isDirectory()) {
                        paths = paths.concat(filesInFolder(pathToFile));
                    }
                    else if (stat.isFile() && (!spec || file.match(spec))) {
                        paths.push(pathToFile);
                    }
                }
                return paths;
            }
            return filesInFolder(path);
        }
        function getAccessibleFileSystemEntries(dirname) {
            try {
                var entries = fs.readdirSync(dirname || ".").sort(ts.sys.useCaseSensitiveFileNames ? ts.compareStringsCaseSensitive : ts.compareStringsCaseInsensitive);
                var files = [];
                var directories = [];
                for (var _i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
                    var entry = entries_1[_i];
                    if (entry === "." || entry === "..")
                        continue;
                    var name = vpath.combine(dirname, entry);
                    try {
                        var stat = fs.statSync(name);
                        if (!stat)
                            continue;
                        if (stat.isFile()) {
                            files.push(entry);
                        }
                        else if (stat.isDirectory()) {
                            directories.push(entry);
                        }
                    }
                    catch ( /*ignore*/_a) { /*ignore*/ }
                }
                return { files: files, directories: directories };
            }
            catch (e) {
                return { files: [], directories: [] };
            }
        }
        function createDirectory(path) {
            try {
                fs.mkdirSync(path);
            }
            catch (e) {
                if (e.code === "ENOENT") {
                    createDirectory(vpath.dirname(path));
                    createDirectory(path);
                }
                else if (!ts.sys.directoryExists(path)) {
                    throw e;
                }
            }
        }
        return {
            newLine: function () { return Harness.harnessNewLine; },
            getCurrentDirectory: function () { return ts.sys.getCurrentDirectory(); },
            useCaseSensitiveFileNames: function () { return ts.sys.useCaseSensitiveFileNames; },
            resolvePath: function (path) { return ts.sys.resolvePath(path); },
            getFileSize: function (path) { return ts.sys.getFileSize(path); },
            readFile: function (path) { return ts.sys.readFile(path); },
            writeFile: function (path, content) { return ts.sys.writeFile(path, content); },
            directoryName: directoryName,
            getDirectories: function (path) { return ts.sys.getDirectories(path); },
            createDirectory: createDirectory,
            fileExists: function (path) { return ts.sys.fileExists(path); },
            directoryExists: function (path) { return ts.sys.directoryExists(path); },
            deleteFile: deleteFile,
            listFiles: listFiles,
            enumerateTestFiles: enumerateTestFiles,
            log: function (s) { return console.log(s); },
            args: function () { return ts.sys.args; },
            getExecutingFilePath: function () { return ts.sys.getExecutingFilePath(); },
            getWorkspaceRoot: function () { return workspaceRoot; },
            exit: function (exitCode) { return ts.sys.exit(exitCode); },
            readDirectory: function (path, extension, exclude, include, depth) { return ts.sys.readDirectory(path, extension, exclude, include, depth); },
            getAccessibleFileSystemEntries: getAccessibleFileSystemEntries,
            tryEnableSourceMapsForHost: function () { return ts.sys.tryEnableSourceMapsForHost && ts.sys.tryEnableSourceMapsForHost(); },
            getMemoryUsage: function () { return ts.sys.getMemoryUsage && ts.sys.getMemoryUsage(); },
            getEnvironmentVariable: function (name) { return ts.sys.getEnvironmentVariable(name); },
            joinPath: joinPath
        };
    }
    function mockHash(s) {
        return "hash-".concat(s);
    }
    Harness.mockHash = mockHash;
    Harness.IO = createNodeIO();
    if (Harness.IO.tryEnableSourceMapsForHost && /^development$/i.test(Harness.IO.getEnvironmentVariable("NODE_ENV"))) {
        Harness.IO.tryEnableSourceMapsForHost();
    }
    Harness.libFolder = "built/local/";
    // Settings
    /* eslint-disable prefer-const */
    Harness.userSpecifiedRoot = "";
    Harness.lightMode = false;
    /* eslint-enable prefer-const */
    function setLightMode(flag) {
        Harness.lightMode = flag;
    }
    Harness.setLightMode = setLightMode;
    /** Functionality for compiling TypeScript code */
    var Compiler;
    (function (Compiler) {
        /** Aggregate various writes into a single array of lines. Useful for passing to the
         *  TypeScript compiler to fill with source code or errors.
         */
        var WriterAggregator = /** @class */ (function () {
            function WriterAggregator() {
                this.lines = [];
                this.currentLine = undefined;
            }
            WriterAggregator.prototype.Write = function (str) {
                // out of memory usage concerns avoid using + or += if we're going to do any manipulation of this string later
                this.currentLine = [(this.currentLine || ""), str].join("");
            };
            WriterAggregator.prototype.WriteLine = function (str) {
                // out of memory usage concerns avoid using + or += if we're going to do any manipulation of this string later
                this.lines.push([(this.currentLine || ""), str].join(""));
                this.currentLine = undefined;
            };
            WriterAggregator.prototype.Close = function () {
                if (this.currentLine !== undefined)
                    this.lines.push(this.currentLine);
                this.currentLine = undefined;
            };
            WriterAggregator.prototype.reset = function () {
                this.lines = [];
                this.currentLine = undefined;
            };
            return WriterAggregator;
        }());
        Compiler.WriterAggregator = WriterAggregator;
        function createSourceFileAndAssertInvariants(fileName, sourceText, languageVersion) {
            // We'll only assert invariants outside of light mode.
            var shouldAssertInvariants = !Harness.lightMode;
            // Only set the parent nodes if we're asserting invariants.  We don't need them otherwise.
            var result = ts.createSourceFile(fileName, sourceText, languageVersion, /*setParentNodes:*/ shouldAssertInvariants);
            if (shouldAssertInvariants) {
                Utils.assertInvariants(result, /*parent:*/ undefined);
            }
            return result;
        }
        Compiler.createSourceFileAndAssertInvariants = createSourceFileAndAssertInvariants;
        Compiler.defaultLibFileName = "lib.d.ts";
        Compiler.es2015DefaultLibFileName = "lib.es2015.d.ts";
        // Cache of lib files from "built/local"
        var libFileNameSourceFileMap;
        function getDefaultLibrarySourceFile(fileName) {
            var _a;
            if (fileName === void 0) { fileName = Compiler.defaultLibFileName; }
            if (!isDefaultLibraryFile(fileName)) {
                return undefined;
            }
            if (!libFileNameSourceFileMap) {
                libFileNameSourceFileMap = new ts.Map(ts.getEntries((_a = {},
                    _a[Compiler.defaultLibFileName] = createSourceFileAndAssertInvariants(Compiler.defaultLibFileName, Harness.IO.readFile(Harness.libFolder + "lib.es5.d.ts"), /*languageVersion*/ 99 /* ts.ScriptTarget.Latest */),
                    _a)));
            }
            var sourceFile = libFileNameSourceFileMap.get(fileName);
            if (!sourceFile) {
                libFileNameSourceFileMap.set(fileName, sourceFile = createSourceFileAndAssertInvariants(fileName, Harness.IO.readFile(Harness.libFolder + fileName), 99 /* ts.ScriptTarget.Latest */));
            }
            return sourceFile;
        }
        Compiler.getDefaultLibrarySourceFile = getDefaultLibrarySourceFile;
        function getDefaultLibFileName(options) {
            switch (ts.getEmitScriptTarget(options)) {
                case 99 /* ts.ScriptTarget.ESNext */:
                case 4 /* ts.ScriptTarget.ES2017 */:
                    return "lib.es2017.d.ts";
                case 3 /* ts.ScriptTarget.ES2016 */:
                    return "lib.es2016.d.ts";
                case 2 /* ts.ScriptTarget.ES2015 */:
                    return Compiler.es2015DefaultLibFileName;
                default:
                    return Compiler.defaultLibFileName;
            }
        }
        Compiler.getDefaultLibFileName = getDefaultLibFileName;
        // Cache these between executions so we don't have to re-parse them for every test
        Compiler.fourslashFileName = "fourslash.ts";
        function getCanonicalFileName(fileName) {
            return fileName;
        }
        Compiler.getCanonicalFileName = getCanonicalFileName;
        // Additional options not already in ts.optionDeclarations
        var harnessOptionDeclarations = [
            { name: "allowNonTsExtensions", type: "boolean", defaultValueDescription: false },
            { name: "useCaseSensitiveFileNames", type: "boolean", defaultValueDescription: false },
            { name: "baselineFile", type: "string" },
            { name: "includeBuiltFile", type: "string" },
            { name: "fileName", type: "string" },
            { name: "libFiles", type: "string" },
            { name: "noErrorTruncation", type: "boolean", defaultValueDescription: false },
            { name: "suppressOutputPathCheck", type: "boolean", defaultValueDescription: false },
            { name: "noImplicitReferences", type: "boolean", defaultValueDescription: false },
            { name: "currentDirectory", type: "string" },
            { name: "symlink", type: "string" },
            { name: "link", type: "string" },
            { name: "noTypesAndSymbols", type: "boolean", defaultValueDescription: false },
            // Emitted js baseline will print full paths for every output file
            { name: "fullEmitPaths", type: "boolean", defaultValueDescription: false },
        ];
        var optionsIndex;
        function getCommandLineOption(name) {
            if (!optionsIndex) {
                optionsIndex = new ts.Map();
                var optionDeclarations = harnessOptionDeclarations.concat(ts.optionDeclarations);
                for (var _i = 0, optionDeclarations_1 = optionDeclarations; _i < optionDeclarations_1.length; _i++) {
                    var option = optionDeclarations_1[_i];
                    optionsIndex.set(option.name.toLowerCase(), option);
                }
            }
            return optionsIndex.get(name.toLowerCase());
        }
        function setCompilerOptionsFromHarnessSetting(settings, options) {
            for (var name in settings) {
                if (ts.hasProperty(settings, name)) {
                    var value = settings[name];
                    if (value === undefined) {
                        throw new Error("Cannot have undefined value for compiler option '".concat(name, "'."));
                    }
                    var option = getCommandLineOption(name);
                    if (option) {
                        var errors = [];
                        options[option.name] = optionValue(option, value, errors);
                        if (errors.length > 0) {
                            throw new Error("Unknown value '".concat(value, "' for compiler option '").concat(name, "'."));
                        }
                    }
                    else {
                        throw new Error("Unknown compiler option '".concat(name, "'."));
                    }
                }
            }
        }
        Compiler.setCompilerOptionsFromHarnessSetting = setCompilerOptionsFromHarnessSetting;
        function optionValue(option, value, errors) {
            switch (option.type) {
                case "boolean":
                    return value.toLowerCase() === "true";
                case "string":
                    return value;
                case "number": {
                    var numverValue = parseInt(value, 10);
                    if (isNaN(numverValue)) {
                        throw new Error("Value must be a number, got: ".concat(JSON.stringify(value)));
                    }
                    return numverValue;
                }
                // If not a primitive, the possible types are specified in what is effectively a map of options.
                case "list":
                    return ts.parseListTypeOption(option, value, errors);
                default:
                    return ts.parseCustomTypeOption(option, value, errors);
            }
        }
        function compileFiles(inputFiles, otherFiles, harnessSettings, compilerOptions, 
        // Current directory is needed for rwcRunner to be able to use currentDirectory defined in json file
        currentDirectory, symlinks) {
            var options = compilerOptions ? ts.cloneCompilerOptions(compilerOptions) : { noResolve: false };
            options.target = ts.getEmitScriptTarget(options);
            options.newLine = options.newLine || 0 /* ts.NewLineKind.CarriageReturnLineFeed */;
            options.noErrorTruncation = true;
            options.skipDefaultLibCheck = typeof options.skipDefaultLibCheck === "undefined" ? true : options.skipDefaultLibCheck;
            if (typeof currentDirectory === "undefined") {
                currentDirectory = vfs.srcFolder;
            }
            // Parse settings
            if (harnessSettings) {
                setCompilerOptionsFromHarnessSetting(harnessSettings, options);
            }
            if (options.rootDirs) {
                options.rootDirs = ts.map(options.rootDirs, function (d) { return ts.getNormalizedAbsolutePath(d, currentDirectory); });
            }
            var useCaseSensitiveFileNames = options.useCaseSensitiveFileNames !== undefined ? options.useCaseSensitiveFileNames : true;
            var programFileNames = inputFiles.map(function (file) { return file.unitName; }).filter(function (fileName) { return !ts.fileExtensionIs(fileName, ".json" /* ts.Extension.Json */); });
            // Files from built\local that are requested by test "@includeBuiltFiles" to be in the context.
            // Treat them as library files, so include them in build, but not in baselines.
            if (options.includeBuiltFile) {
                programFileNames.push(vpath.combine(vfs.builtFolder, options.includeBuiltFile));
            }
            // Files from tests\lib that are requested by "@libFiles"
            if (options.libFiles) {
                for (var _i = 0, _a = options.libFiles.split(","); _i < _a.length; _i++) {
                    var fileName = _a[_i];
                    programFileNames.push(vpath.combine(vfs.testLibFolder, fileName));
                }
            }
            var docs = inputFiles.concat(otherFiles).map(documents.TextDocument.fromTestFile);
            var fs = vfs.createFromFileSystem(Harness.IO, !useCaseSensitiveFileNames, { documents: docs, cwd: currentDirectory });
            if (symlinks) {
                fs.apply(symlinks);
            }
            var host = new fakes.CompilerHost(fs, options);
            var result = compiler.compileFiles(host, programFileNames, options);
            result.symlinks = symlinks;
            return result;
        }
        Compiler.compileFiles = compileFiles;
        function prepareDeclarationCompilationContext(inputFiles, otherFiles, result, harnessSettings, options, 
        // Current directory is needed for rwcRunner to be able to use currentDirectory defined in json file
        currentDirectory) {
            if (options.declaration && result.diagnostics.length === 0) {
                if (options.emitDeclarationOnly) {
                    if (result.js.size > 0 || result.dts.size === 0) {
                        throw new Error("Only declaration files should be generated when emitDeclarationOnly:true");
                    }
                }
                else if (result.dts.size !== result.getNumberOfJsFiles(/*includeJson*/ false)) {
                    throw new Error("There were no errors and declFiles generated did not match number of js files generated");
                }
            }
            var declInputFiles = [];
            var declOtherFiles = [];
            // if the .d.ts is non-empty, confirm it compiles correctly as well
            if (options.declaration && result.diagnostics.length === 0 && result.dts.size > 0) {
                ts.forEach(inputFiles, function (file) { return addDtsFile(file, declInputFiles); });
                ts.forEach(otherFiles, function (file) { return addDtsFile(file, declOtherFiles); });
                return { declInputFiles: declInputFiles, declOtherFiles: declOtherFiles, harnessSettings: harnessSettings, options: options, currentDirectory: currentDirectory || harnessSettings.currentDirectory };
            }
            function addDtsFile(file, dtsFiles) {
                if (vpath.isDeclaration(file.unitName) || vpath.isJson(file.unitName)) {
                    dtsFiles.push(file);
                }
                else if (vpath.isTypeScript(file.unitName) || (vpath.isJavaScript(file.unitName) && ts.getAllowJSCompilerOption(options))) {
                    var declFile = findResultCodeFile(file.unitName);
                    if (declFile && !findUnit(declFile.file, declInputFiles) && !findUnit(declFile.file, declOtherFiles)) {
                        dtsFiles.push({ unitName: declFile.file, content: Utils.removeByteOrderMark(declFile.text) });
                    }
                }
            }
            function findResultCodeFile(fileName) {
                var sourceFile = result.program.getSourceFile(fileName);
                assert(sourceFile, "Program has no source file with name '" + fileName + "'");
                // Is this file going to be emitted separately
                var sourceFileName;
                var outFile = options.outFile || options.out;
                if (!outFile) {
                    if (options.outDir) {
                        var sourceFilePath = ts.getNormalizedAbsolutePath(sourceFile.fileName, result.vfs.cwd());
                        sourceFilePath = sourceFilePath.replace(result.program.getCommonSourceDirectory(), "");
                        sourceFileName = ts.combinePaths(options.outDir, sourceFilePath);
                    }
                    else {
                        sourceFileName = sourceFile.fileName;
                    }
                }
                else {
                    // Goes to single --out file
                    sourceFileName = outFile;
                }
                var dTsFileName = ts.removeFileExtension(sourceFileName) + ts.getDeclarationEmitExtensionForPath(sourceFileName);
                return result.dts.get(dTsFileName);
            }
            function findUnit(fileName, units) {
                return ts.forEach(units, function (unit) { return unit.unitName === fileName ? unit : undefined; });
            }
        }
        Compiler.prepareDeclarationCompilationContext = prepareDeclarationCompilationContext;
        function compileDeclarationFiles(context, symlinks) {
            if (!context) {
                return;
            }
            var declInputFiles = context.declInputFiles, declOtherFiles = context.declOtherFiles, harnessSettings = context.harnessSettings, options = context.options, currentDirectory = context.currentDirectory;
            var output = compileFiles(declInputFiles, declOtherFiles, harnessSettings, options, currentDirectory, symlinks);
            return { declInputFiles: declInputFiles, declOtherFiles: declOtherFiles, declResult: output };
        }
        Compiler.compileDeclarationFiles = compileDeclarationFiles;
        function minimalDiagnosticsToString(diagnostics, pretty) {
            var host = { getCanonicalFileName: getCanonicalFileName, getCurrentDirectory: function () { return ""; }, getNewLine: function () { return Harness.IO.newLine(); } };
            return (pretty ? ts.formatDiagnosticsWithColorAndContext : ts.formatDiagnostics)(diagnostics, host);
        }
        Compiler.minimalDiagnosticsToString = minimalDiagnosticsToString;
        function getErrorBaseline(inputFiles, diagnostics, pretty) {
            var _a;
            var outputLines = "";
            var gen = iterateErrorBaseline(inputFiles, diagnostics, { pretty: pretty });
            for (var _b = gen.next(), done = _b.done, value = _b.value; !done; _a = gen.next(), done = _a.done, value = _a.value) {
                var content = value[1];
                outputLines += content;
            }
            if (pretty) {
                outputLines += ts.getErrorSummaryText(ts.getErrorCountForSummary(diagnostics), ts.getFilesInErrorForSummary(diagnostics), Harness.IO.newLine(), { getCurrentDirectory: function () { return ""; } });
            }
            return outputLines;
        }
        Compiler.getErrorBaseline = getErrorBaseline;
        Compiler.diagnosticSummaryMarker = "__diagnosticSummary";
        Compiler.globalErrorsMarker = "__globalErrors";
        function iterateErrorBaseline(inputFiles, diagnostics, options) {
            function newLine() {
                if (firstLine) {
                    firstLine = false;
                    return "";
                }
                return "\r\n";
            }
            function outputErrorText(error) {
                var message = ts.flattenDiagnosticMessageText(error.messageText, Harness.IO.newLine());
                var errLines = Utils.removeTestPathPrefixes(message)
                    .split("\n")
                    .map(function (s) { return s.length > 0 && s.charAt(s.length - 1) === "\r" ? s.substr(0, s.length - 1) : s; })
                    .filter(function (s) { return s.length > 0; })
                    .map(function (s) { return "!!! " + ts.diagnosticCategoryName(error) + " TS" + error.code + ": " + s; });
                if (error.relatedInformation) {
                    for (var _i = 0, _a = error.relatedInformation; _i < _a.length; _i++) {
                        var info = _a[_i];
                        errLines.push("!!! related TS".concat(info.code).concat(info.file ? " " + ts.formatLocation(info.file, info.start, formatDiagnsoticHost, ts.identity) : "", ": ").concat(ts.flattenDiagnosticMessageText(info.messageText, Harness.IO.newLine())));
                    }
                }
                errLines.forEach(function (e) { return outputLines += (newLine() + e); });
                errorsReported++;
                // do not count errors from lib.d.ts here, they are computed separately as numLibraryDiagnostics
                // if lib.d.ts is explicitly included in input files and there are some errors in it (i.e. because of duplicate identifiers)
                // then they will be added twice thus triggering 'total errors' assertion with condition
                // 'totalErrorsReportedInNonLibraryFiles + numLibraryDiagnostics + numTest262HarnessDiagnostics, diagnostics.length
                if (!error.file || !isDefaultLibraryFile(error.file.fileName)) {
                    totalErrorsReportedInNonLibraryFiles++;
                }
            }
            var outputLines, totalErrorsReportedInNonLibraryFiles, errorsReported, firstLine, formatDiagnsoticHost, globalErrors, dupeCase, _loop_2, _i, _a, inputFile, numLibraryDiagnostics, numTest262HarnessDiagnostics;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        diagnostics = ts.sort(diagnostics, ts.compareDiagnostics);
                        outputLines = "";
                        totalErrorsReportedInNonLibraryFiles = 0;
                        errorsReported = 0;
                        firstLine = true;
                        formatDiagnsoticHost = {
                            getCurrentDirectory: function () { return options && options.currentDirectory ? options.currentDirectory : ""; },
                            getNewLine: function () { return Harness.IO.newLine(); },
                            getCanonicalFileName: ts.createGetCanonicalFileName(options && options.caseSensitive !== undefined ? options.caseSensitive : true),
                        };
                        return [4 /*yield*/, [Compiler.diagnosticSummaryMarker, Utils.removeTestPathPrefixes(minimalDiagnosticsToString(diagnostics, options && options.pretty)) + Harness.IO.newLine() + Harness.IO.newLine(), diagnostics.length]];
                    case 1:
                        _b.sent();
                        globalErrors = diagnostics.filter(function (err) { return !err.file; });
                        globalErrors.forEach(outputErrorText);
                        return [4 /*yield*/, [Compiler.globalErrorsMarker, outputLines, errorsReported]];
                    case 2:
                        _b.sent();
                        outputLines = "";
                        errorsReported = 0;
                        dupeCase = new ts.Map();
                        _loop_2 = function (inputFile) {
                            var fileErrors, markedErrorCount, lineStarts, lines, isDupe;
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0:
                                        fileErrors = diagnostics.filter(function (e) {
                                            var errFn = e.file;
                                            return !!errFn && ts.comparePaths(Utils.removeTestPathPrefixes(errFn.fileName), Utils.removeTestPathPrefixes(inputFile.unitName), options && options.currentDirectory || "", !(options && options.caseSensitive)) === 0 /* ts.Comparison.EqualTo */;
                                        });
                                        // Header
                                        outputLines += (newLine() + "==== " + inputFile.unitName + " (" + fileErrors.length + " errors) ====");
                                        markedErrorCount = 0;
                                        lineStarts = ts.computeLineStarts(inputFile.content);
                                        lines = inputFile.content.split("\n");
                                        if (lines.length === 1) {
                                            lines = lines[0].split("\r");
                                        }
                                        lines.forEach(function (line, lineIndex) {
                                            if (line.length > 0 && line.charAt(line.length - 1) === "\r") {
                                                line = line.substr(0, line.length - 1);
                                            }
                                            var thisLineStart = lineStarts[lineIndex];
                                            var nextLineStart;
                                            // On the last line of the file, fake the next line start number so that we handle errors on the last character of the file correctly
                                            if (lineIndex === lines.length - 1) {
                                                nextLineStart = inputFile.content.length;
                                            }
                                            else {
                                                nextLineStart = lineStarts[lineIndex + 1];
                                            }
                                            // Emit this line from the original file
                                            outputLines += (newLine() + "    " + line);
                                            fileErrors.forEach(function (errDiagnostic) {
                                                var err = errDiagnostic; // TODO: GH#18217
                                                // Does any error start or continue on to this line? Emit squiggles
                                                var end = ts.textSpanEnd(err);
                                                if ((end >= thisLineStart) && ((err.start < nextLineStart) || (lineIndex === lines.length - 1))) {
                                                    // How many characters from the start of this line the error starts at (could be positive or negative)
                                                    var relativeOffset = err.start - thisLineStart;
                                                    // How many characters of the error are on this line (might be longer than this line in reality)
                                                    var length = (end - err.start) - Math.max(0, thisLineStart - err.start);
                                                    // Calculate the start of the squiggle
                                                    var squiggleStart = Math.max(0, relativeOffset);
                                                    // TODO/REVIEW: this doesn't work quite right in the browser if a multi file test has files whose names are just the right length relative to one another
                                                    outputLines += (newLine() + "    " + line.substr(0, squiggleStart).replace(/[^\s]/g, " ") + new Array(Math.min(length, line.length - squiggleStart) + 1).join("~"));
                                                    // If the error ended here, or we're at the end of the file, emit its message
                                                    if ((lineIndex === lines.length - 1) || nextLineStart > end) {
                                                        // Just like above, we need to do a split on a string instead of on a regex
                                                        // because the JS engine does regexes wrong
                                                        outputErrorText(errDiagnostic);
                                                        markedErrorCount++;
                                                    }
                                                }
                                            });
                                        });
                                        // Verify we didn't miss any errors in this file
                                        assert.equal(markedErrorCount, fileErrors.length, "count of errors in " + inputFile.unitName);
                                        isDupe = dupeCase.has(sanitizeTestFilePath(inputFile.unitName));
                                        return [4 /*yield*/, [checkDuplicatedFileName(inputFile.unitName, dupeCase), outputLines, errorsReported]];
                                    case 1:
                                        _c.sent();
                                        if (isDupe && !(options && options.caseSensitive)) {
                                            // Case-duplicated files on a case-insensitive build will have errors reported in both the dupe and the original
                                            // thanks to the canse-insensitive path comparison on the error file path - We only want to count those errors once
                                            // for the assert below, so we subtract them here.
                                            totalErrorsReportedInNonLibraryFiles -= errorsReported;
                                        }
                                        outputLines = "";
                                        errorsReported = 0;
                                        return [2 /*return*/];
                                }
                            });
                        };
                        _i = 0, _a = inputFiles.filter(function (f) { return f.content !== undefined; });
                        _b.label = 3;
                    case 3:
                        if (!(_i < _a.length)) return [3 /*break*/, 6];
                        inputFile = _a[_i];
                        return [5 /*yield**/, _loop_2(inputFile)];
                    case 4:
                        _b.sent();
                        _b.label = 5;
                    case 5:
                        _i++;
                        return [3 /*break*/, 3];
                    case 6:
                        numLibraryDiagnostics = ts.countWhere(diagnostics, function (diagnostic) {
                            return !!diagnostic.file && (isDefaultLibraryFile(diagnostic.file.fileName) || isBuiltFile(diagnostic.file.fileName));
                        });
                        numTest262HarnessDiagnostics = ts.countWhere(diagnostics, function (diagnostic) {
                            // Count an error generated from tests262-harness folder.This should only apply for test262
                            return !!diagnostic.file && diagnostic.file.fileName.indexOf("test262-harness") >= 0;
                        });
                        // Verify we didn't miss any errors in total
                        assert.equal(totalErrorsReportedInNonLibraryFiles + numLibraryDiagnostics + numTest262HarnessDiagnostics, diagnostics.length, "total number of errors");
                        return [2 /*return*/];
                }
            });
        }
        Compiler.iterateErrorBaseline = iterateErrorBaseline;
        function doErrorBaseline(baselinePath, inputFiles, errors, pretty) {
            Baseline.runBaseline(baselinePath.replace(/\.tsx?$/, ".errors.txt"), !errors || (errors.length === 0) ? null : getErrorBaseline(inputFiles, errors, pretty)); // eslint-disable-line no-null/no-null
        }
        Compiler.doErrorBaseline = doErrorBaseline;
        function doTypeAndSymbolBaseline(baselinePath, program, allFiles, opts, multifile, skipTypeBaselines, skipSymbolBaselines, hasErrorBaseline) {
            // The full walker simulates the types that you would get from doing a full
            // compile.  The pull walker simulates the types you get when you just do
            // a type query for a random node (like how the LS would do it).  Most of the
            // time, these will be the same.  However, occasionally, they can be different.
            // Specifically, when the compiler internally depends on symbol IDs to order
            // things, then we may see different results because symbols can be created in a
            // different order with 'pull' operations, and thus can produce slightly differing
            // output.
            //
            // For example, with a full type check, we may see a type displayed as: number | string
            // But with a pull type check, we may see it as:                        string | number
            //
            // These types are equivalent, but depend on what order the compiler observed
            // certain parts of the program.
            var fullWalker = new Harness.TypeWriterWalker(program, !!hasErrorBaseline);
            // Produce baselines.  The first gives the types for all expressions.
            // The second gives symbols for all identifiers.
            var typesError, symbolsError;
            try {
                checkBaseLines(/*isSymbolBaseLine*/ false);
            }
            catch (e) {
                typesError = e;
            }
            try {
                checkBaseLines(/*isSymbolBaseLine*/ true);
            }
            catch (e) {
                symbolsError = e;
            }
            if (typesError && symbolsError) {
                throw new Error(typesError.stack + Harness.IO.newLine() + symbolsError.stack);
            }
            if (typesError) {
                throw typesError;
            }
            if (symbolsError) {
                throw symbolsError;
            }
            return;
            function checkBaseLines(isSymbolBaseLine) {
                var fullExtension = isSymbolBaseLine ? ".symbols" : ".types";
                // When calling this function from rwc-runner, the baselinePath will have no extension.
                // As rwc test- file is stored in json which ".json" will get stripped off.
                // When calling this function from compiler-runner, the baselinePath will then has either ".ts" or ".tsx" extension
                var outputFileName = ts.endsWith(baselinePath, ".ts" /* ts.Extension.Ts */) || ts.endsWith(baselinePath, ".tsx" /* ts.Extension.Tsx */) ?
                    baselinePath.replace(/\.tsx?/, "") : baselinePath;
                if (!multifile) {
                    var fullBaseLine = generateBaseLine(isSymbolBaseLine, isSymbolBaseLine ? skipSymbolBaselines : skipTypeBaselines);
                    Baseline.runBaseline(outputFileName + fullExtension, fullBaseLine, opts);
                }
                else {
                    Baseline.runMultifileBaseline(outputFileName, fullExtension, function () {
                        return iterateBaseLine(isSymbolBaseLine, isSymbolBaseLine ? skipSymbolBaselines : skipTypeBaselines);
                    }, opts);
                }
            }
            function generateBaseLine(isSymbolBaseline, skipBaseline) {
                var _a;
                var result = "";
                var gen = iterateBaseLine(isSymbolBaseline, skipBaseline);
                for (var _b = gen.next(), done = _b.done, value = _b.value; !done; _a = gen.next(), done = _a.done, value = _a.value) {
                    var content = value[1];
                    result += content;
                }
                return result || null; // eslint-disable-line no-null/no-null
            }
            function iterateBaseLine(isSymbolBaseline, skipBaseline) {
                var dupeCase, _i, allFiles_1, file, unitName, typeLines, codeLines, gen, lastIndexWritten, _a, done, result, typeOrSymbolString, formattedLine;
                var _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            if (skipBaseline) {
                                return [2 /*return*/];
                            }
                            dupeCase = new ts.Map();
                            _i = 0, allFiles_1 = allFiles;
                            _c.label = 1;
                        case 1:
                            if (!(_i < allFiles_1.length)) return [3 /*break*/, 4];
                            file = allFiles_1[_i];
                            unitName = file.unitName;
                            typeLines = "=== " + unitName + " ===\r\n";
                            codeLines = ts.flatMap(file.content.split(/\r?\n/g), function (e) { return e.split(/[\r\u2028\u2029]/g); });
                            gen = isSymbolBaseline ? fullWalker.getSymbols(unitName) : fullWalker.getTypes(unitName);
                            lastIndexWritten = void 0;
                            for (_a = gen.next(), done = _a.done, result = _a.value; !done; _b = gen.next(), done = _b.done, result = _b.value) {
                                if (isSymbolBaseline && !result.symbol) {
                                    return [2 /*return*/];
                                }
                                if (lastIndexWritten === undefined) {
                                    typeLines += codeLines.slice(0, result.line + 1).join("\r\n") + "\r\n";
                                }
                                else if (result.line !== lastIndexWritten) {
                                    if (!((lastIndexWritten + 1 < codeLines.length) && (codeLines[lastIndexWritten + 1].match(/^\s*[{|}]\s*$/) || codeLines[lastIndexWritten + 1].trim() === ""))) {
                                        typeLines += "\r\n";
                                    }
                                    typeLines += codeLines.slice(lastIndexWritten + 1, result.line + 1).join("\r\n") + "\r\n";
                                }
                                lastIndexWritten = result.line;
                                typeOrSymbolString = isSymbolBaseline ? result.symbol : result.type;
                                formattedLine = result.sourceText.replace(/\r?\n/g, "") + " : " + typeOrSymbolString;
                                typeLines += ">" + formattedLine + "\r\n";
                            }
                            lastIndexWritten !== null && lastIndexWritten !== void 0 ? lastIndexWritten : (lastIndexWritten = -1);
                            if (lastIndexWritten + 1 < codeLines.length) {
                                if (!((lastIndexWritten + 1 < codeLines.length) && (codeLines[lastIndexWritten + 1].match(/^\s*[{|}]\s*$/) || codeLines[lastIndexWritten + 1].trim() === ""))) {
                                    typeLines += "\r\n";
                                }
                                typeLines += codeLines.slice(lastIndexWritten + 1).join("\r\n");
                            }
                            typeLines += "\r\n";
                            return [4 /*yield*/, [checkDuplicatedFileName(unitName, dupeCase), Utils.removeTestPathPrefixes(typeLines)]];
                        case 2:
                            _c.sent();
                            _c.label = 3;
                        case 3:
                            _i++;
                            return [3 /*break*/, 1];
                        case 4: return [2 /*return*/];
                    }
                });
            }
        }
        Compiler.doTypeAndSymbolBaseline = doTypeAndSymbolBaseline;
        function doSourcemapBaseline(baselinePath, options, result, harnessSettings) {
            var declMaps = ts.getAreDeclarationMapsEnabled(options);
            if (options.inlineSourceMap) {
                if (result.maps.size > 0 && !declMaps) {
                    throw new Error("No sourcemap files should be generated if inlineSourceMaps was set.");
                }
                return;
            }
            else if (options.sourceMap || declMaps) {
                if (result.maps.size !== ((options.sourceMap ? result.getNumberOfJsFiles(/*includeJson*/ false) : 0) + (declMaps ? result.getNumberOfJsFiles(/*includeJson*/ true) : 0))) {
                    throw new Error("Number of sourcemap files should be same as js files.");
                }
                var sourceMapCode_1;
                if ((options.noEmitOnError && result.diagnostics.length !== 0) || result.maps.size === 0) {
                    // We need to return null here or the runBaseLine will actually create a empty file.
                    // Baselining isn't required here because there is no output.
                    sourceMapCode_1 = null; // eslint-disable-line no-null/no-null
                }
                else {
                    sourceMapCode_1 = "";
                    result.maps.forEach(function (sourceMap) {
                        if (sourceMapCode_1)
                            sourceMapCode_1 += "\r\n";
                        sourceMapCode_1 += fileOutput(sourceMap, harnessSettings);
                        if (!options.inlineSourceMap) {
                            sourceMapCode_1 += createSourceMapPreviewLink(sourceMap.text, result);
                        }
                    });
                }
                Baseline.runBaseline(baselinePath.replace(/\.tsx?/, ".js.map"), sourceMapCode_1);
            }
        }
        Compiler.doSourcemapBaseline = doSourcemapBaseline;
        function createSourceMapPreviewLink(sourcemap, result) {
            var sourcemapJSON = JSON.parse(sourcemap);
            var outputJSFile = result.outputs.find(function (td) { return td.file.endsWith(sourcemapJSON.file); });
            if (!outputJSFile)
                return "";
            var sourceTDs = ts.map(sourcemapJSON.sources, function (s) { return result.inputs.find(function (td) { return td.file.endsWith(s); }); });
            var anyUnfoundSources = ts.contains(sourceTDs, /*value*/ undefined);
            if (anyUnfoundSources)
                return "";
            var hash = "#base64," + ts.map([outputJSFile.text, sourcemap].concat(sourceTDs.map(function (td) { return td.text; })), function (s) { return ts.convertToBase64(decodeURIComponent(encodeURIComponent(s))); }).join(",");
            return "\n//// https://sokra.github.io/source-map-visualization" + hash + "\n";
        }
        function doJsEmitBaseline(baselinePath, header, options, result, tsConfigFiles, toBeCompiled, otherFiles, harnessSettings) {
            if (!options.noEmit && !options.emitDeclarationOnly && result.js.size === 0 && result.diagnostics.length === 0) {
                throw new Error("Expected at least one js file to be emitted or at least one error to be created.");
            }
            // check js output
            var tsCode = "";
            var tsSources = otherFiles.concat(toBeCompiled);
            if (tsSources.length > 1) {
                tsCode += "//// [" + header + "] ////\r\n\r\n";
            }
            for (var i = 0; i < tsSources.length; i++) {
                tsCode += "//// [" + ts.getBaseFileName(tsSources[i].unitName) + "]\r\n";
                tsCode += tsSources[i].content + (i < (tsSources.length - 1) ? "\r\n" : "");
            }
            var jsCode = "";
            result.js.forEach(function (file) {
                if (jsCode.length && jsCode.charCodeAt(jsCode.length - 1) !== 10 /* ts.CharacterCodes.lineFeed */) {
                    jsCode += "\r\n";
                }
                if (!result.diagnostics.length && !ts.endsWith(file.file, ".json" /* ts.Extension.Json */)) {
                    var fileParseResult = ts.createSourceFile(file.file, file.text, ts.getEmitScriptTarget(options), /*parentNodes*/ false, ts.endsWith(file.file, "x") ? 2 /* ts.ScriptKind.JSX */ : 1 /* ts.ScriptKind.JS */);
                    if (ts.length(fileParseResult.parseDiagnostics)) {
                        jsCode += getErrorBaseline([file.asTestFile()], fileParseResult.parseDiagnostics);
                        return;
                    }
                }
                jsCode += fileOutput(file, harnessSettings);
            });
            if (result.dts.size > 0) {
                jsCode += "\r\n\r\n";
                result.dts.forEach(function (declFile) {
                    jsCode += fileOutput(declFile, harnessSettings);
                });
            }
            var declFileContext = prepareDeclarationCompilationContext(toBeCompiled, otherFiles, result, harnessSettings, options, /*currentDirectory*/ undefined);
            var declFileCompilationResult = compileDeclarationFiles(declFileContext, result.symlinks);
            if (declFileCompilationResult && declFileCompilationResult.declResult.diagnostics.length) {
                jsCode += "\r\n\r\n//// [DtsFileErrors]\r\n";
                jsCode += "\r\n\r\n";
                jsCode += getErrorBaseline(tsConfigFiles.concat(declFileCompilationResult.declInputFiles, declFileCompilationResult.declOtherFiles), declFileCompilationResult.declResult.diagnostics);
            }
            // eslint-disable-next-line no-null/no-null
            Baseline.runBaseline(baselinePath.replace(/\.tsx?/, ".js" /* ts.Extension.Js */), jsCode.length > 0 ? tsCode + "\r\n\r\n" + jsCode : null);
        }
        Compiler.doJsEmitBaseline = doJsEmitBaseline;
        function fileOutput(file, harnessSettings) {
            var fileName = harnessSettings.fullEmitPaths ? Utils.removeTestPathPrefixes(file.file) : ts.getBaseFileName(file.file);
            return "//// [" + fileName + "]\r\n" + Utils.removeTestPathPrefixes(file.text);
        }
        function collateOutputs(outputFiles) {
            var _a;
            var gen = iterateOutputs(outputFiles);
            // Emit them
            var result = "";
            for (var _b = gen.next(), done = _b.done, value = _b.value; !done; _a = gen.next(), done = _a.done, value = _a.value) {
                // Some extra spacing if this isn't the first file
                if (result.length) {
                    result += "\r\n\r\n";
                }
                // FileName header + content
                var content = value[1];
                result += content;
            }
            return result;
        }
        Compiler.collateOutputs = collateOutputs;
        function iterateOutputs(outputFiles) {
            function cleanName(fn) {
                var lastSlash = ts.normalizeSlashes(fn).lastIndexOf("/");
                return fn.substr(lastSlash + 1).toLowerCase();
            }
            var files, dupeCase, _i, files_1, outputFile;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        files = Array.from(outputFiles);
                        files.slice().sort(function (a, b) { return ts.compareStringsCaseSensitive(cleanName(a.file), cleanName(b.file)); });
                        dupeCase = new ts.Map();
                        _i = 0, files_1 = files;
                        _a.label = 1;
                    case 1:
                        if (!(_i < files_1.length)) return [3 /*break*/, 4];
                        outputFile = files_1[_i];
                        return [4 /*yield*/, [checkDuplicatedFileName(outputFile.file, dupeCase), "/*====== " + outputFile.file + " ======*/\r\n" + Utils.removeByteOrderMark(outputFile.text)]];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/];
                }
            });
        }
        Compiler.iterateOutputs = iterateOutputs;
        function checkDuplicatedFileName(resultName, dupeCase) {
            resultName = sanitizeTestFilePath(resultName);
            if (dupeCase.has(resultName)) {
                // A different baseline filename should be manufactured if the names differ only in case, for windows compat
                var count = 1 + dupeCase.get(resultName);
                dupeCase.set(resultName, count);
                resultName = "".concat(resultName, ".dupe").concat(count);
            }
            else {
                dupeCase.set(resultName, 0);
            }
            return resultName;
        }
        function sanitizeTestFilePath(name) {
            var path = ts.toPath(ts.normalizeSlashes(name.replace(/[\^<>:"|?*%]/g, "_")).replace(/\.\.\//g, "__dotdot/"), "", Utils.canonicalizeForHarness);
            if (ts.startsWith(path, "/")) {
                return path.substring(1);
            }
            return path;
        }
        Compiler.sanitizeTestFilePath = sanitizeTestFilePath;
    })(Compiler = Harness.Compiler || (Harness.Compiler = {}));
    function splitVaryBySettingValue(text, varyBy) {
        if (!text)
            return undefined;
        var star = false;
        var includes = [];
        var excludes = [];
        for (var _i = 0, _a = text.split(/,/g); _i < _a.length; _i++) {
            var s = _a[_i];
            s = s.trim().toLowerCase();
            if (s.length === 0)
                continue;
            if (s === "*") {
                star = true;
            }
            else if (ts.startsWith(s, "-") || ts.startsWith(s, "!")) {
                excludes.push(s.slice(1));
            }
            else {
                includes.push(s);
            }
        }
        // do nothing if the setting has no variations
        if (includes.length <= 1 && !star && excludes.length === 0) {
            return undefined;
        }
        var variations = [];
        var values = getVaryByStarSettingValues(varyBy);
        var _loop_3 = function (include) {
            var value = values === null || values === void 0 ? void 0 : values.get(include);
            if (ts.findIndex(variations, function (v) { return v.key === include || value !== undefined && v.value === value; }) === -1) {
                variations.push({ key: include, value: value });
            }
        };
        // add (and deduplicate) all included entries
        for (var _b = 0, includes_1 = includes; _b < includes_1.length; _b++) {
            var include = includes_1[_b];
            _loop_3(include);
        }
        if (star && values) {
            var _loop_4 = function (key, value) {
                if (ts.findIndex(variations, function (v) { return v.key === key || v.value === value; }) === -1) {
                    variations.push({ key: key, value: value });
                }
            };
            // add all entries
            for (var _c = 0, _d = ts.arrayFrom(values.entries()); _c < _d.length; _c++) {
                var _e = _d[_c], key = _e[0], value = _e[1];
                _loop_4(key, value);
            }
        }
        var _loop_5 = function (exclude) {
            var value = values === null || values === void 0 ? void 0 : values.get(exclude);
            var index = void 0;
            while ((index = ts.findIndex(variations, function (v) { return v.key === exclude || value !== undefined && v.value === value; })) >= 0) {
                ts.orderedRemoveItemAt(variations, index);
            }
        };
        // remove all excluded entries
        for (var _f = 0, excludes_1 = excludes; _f < excludes_1.length; _f++) {
            var exclude = excludes_1[_f];
            _loop_5(exclude);
        }
        if (variations.length === 0) {
            throw new Error("Variations in test option '@".concat(varyBy, "' resulted in an empty set."));
        }
        return ts.map(variations, function (v) { return v.key; });
    }
    function computeFileBasedTestConfigurationVariations(configurations, variationState, varyByEntries, offset) {
        if (offset >= varyByEntries.length) {
            // make a copy of the current variation state
            configurations.push(__assign({}, variationState));
            return;
        }
        var _a = varyByEntries[offset], varyBy = _a[0], entries = _a[1];
        for (var _i = 0, entries_2 = entries; _i < entries_2.length; _i++) {
            var entry = entries_2[_i];
            // set or overwrite the variation, then compute the next variation
            variationState[varyBy] = entry;
            computeFileBasedTestConfigurationVariations(configurations, variationState, varyByEntries, offset + 1);
        }
    }
    var booleanVaryByStarSettingValues;
    function getVaryByStarSettingValues(varyBy) {
        var option = ts.forEach(ts.optionDeclarations, function (decl) { return ts.equateStringsCaseInsensitive(decl.name, varyBy) ? decl : undefined; });
        if (option) {
            if (typeof option.type === "object") {
                return option.type;
            }
            if (option.type === "boolean") {
                return booleanVaryByStarSettingValues || (booleanVaryByStarSettingValues = new ts.Map(ts.getEntries({
                    true: 1,
                    false: 0
                })));
            }
        }
    }
    /**
     * Compute FileBasedTestConfiguration variations based on a supplied list of variable settings.
     */
    function getFileBasedTestConfigurations(settings, varyBy) {
        var varyByEntries;
        var variationCount = 1;
        for (var _i = 0, varyBy_1 = varyBy; _i < varyBy_1.length; _i++) {
            var varyByKey = varyBy_1[_i];
            if (ts.hasProperty(settings, varyByKey)) {
                // we only consider variations when there are 2 or more variable entries.
                var entries = splitVaryBySettingValue(settings[varyByKey], varyByKey);
                if (entries) {
                    if (!varyByEntries)
                        varyByEntries = [];
                    variationCount *= entries.length;
                    if (variationCount > 25)
                        throw new Error("Provided test options exceeded the maximum number of variations: ".concat(varyBy.map(function (v) { return "'@".concat(v, "'"); }).join(", ")));
                    varyByEntries.push([varyByKey, entries]);
                }
            }
        }
        if (!varyByEntries)
            return undefined;
        var configurations = [];
        computeFileBasedTestConfigurationVariations(configurations, /*variationState*/ {}, varyByEntries, /*offset*/ 0);
        return configurations;
    }
    Harness.getFileBasedTestConfigurations = getFileBasedTestConfigurations;
    /**
     * Compute a description for this configuration based on its entries
     */
    function getFileBasedTestConfigurationDescription(configuration) {
        var name = "";
        if (configuration) {
            var keys = Object.keys(configuration).sort();
            for (var _i = 0, keys_1 = keys; _i < keys_1.length; _i++) {
                var key = keys_1[_i];
                if (name)
                    name += ", ";
                name += "@".concat(key, ": ").concat(configuration[key]);
            }
        }
        return name;
    }
    Harness.getFileBasedTestConfigurationDescription = getFileBasedTestConfigurationDescription;
    var TestCaseParser;
    (function (TestCaseParser) {
        // Regex for parsing options in the format "@Alpha: Value of any sort"
        var optionRegex = /^[\/]{2}\s*@(\w+)\s*:\s*([^\r\n]*)/gm; // multiple matches on multiple lines
        var linkRegex = /^[\/]{2}\s*@link\s*:\s*([^\r\n]*)\s*->\s*([^\r\n]*)/gm; // multiple matches on multiple lines
        function parseSymlinkFromTest(line, symlinks) {
            var linkMetaData = linkRegex.exec(line);
            linkRegex.lastIndex = 0;
            if (!linkMetaData)
                return undefined;
            if (!symlinks)
                symlinks = {};
            symlinks[linkMetaData[2].trim()] = new vfs.Symlink(linkMetaData[1].trim());
            return symlinks;
        }
        TestCaseParser.parseSymlinkFromTest = parseSymlinkFromTest;
        function extractCompilerSettings(content) {
            var opts = {};
            var match;
            while ((match = optionRegex.exec(content)) !== null) { // eslint-disable-line no-null/no-null
                opts[match[1]] = match[2].trim();
            }
            return opts;
        }
        TestCaseParser.extractCompilerSettings = extractCompilerSettings;
        /** Given a test file containing // @FileName directives, return an array of named units of code to be added to an existing compiler instance */
        function makeUnitsFromTest(code, fileName, rootDir, settings) {
            if (settings === void 0) { settings = extractCompilerSettings(code); }
            // List of all the subfiles we've parsed out
            var testUnitData = [];
            var lines = Utils.splitContentByNewlines(code);
            // Stuff related to the subfile we're parsing
            var currentFileContent;
            var currentFileOptions = {};
            var currentFileName;
            var refs = [];
            var symlinks;
            for (var _i = 0, lines_3 = lines; _i < lines_3.length; _i++) {
                var line = lines_3[_i];
                var testMetaData = void 0;
                var possiblySymlinks = parseSymlinkFromTest(line, symlinks);
                if (possiblySymlinks) {
                    symlinks = possiblySymlinks;
                }
                else if (testMetaData = optionRegex.exec(line)) {
                    // Comment line, check for global/file @options and record them
                    optionRegex.lastIndex = 0;
                    var metaDataName = testMetaData[1].toLowerCase();
                    currentFileOptions[testMetaData[1]] = testMetaData[2].trim();
                    if (metaDataName !== "filename") {
                        continue;
                    }
                    // New metadata statement after having collected some code to go with the previous metadata
                    if (currentFileName) {
                        // Store result file
                        var newTestFile = {
                            content: currentFileContent,
                            name: currentFileName,
                            fileOptions: currentFileOptions,
                            originalFilePath: fileName,
                            references: refs
                        };
                        testUnitData.push(newTestFile);
                        // Reset local data
                        currentFileContent = undefined;
                        currentFileOptions = {};
                        currentFileName = testMetaData[2].trim();
                        refs = [];
                    }
                    else {
                        // First metadata marker in the file
                        currentFileName = testMetaData[2].trim();
                    }
                }
                else {
                    // Subfile content line
                    // Append to the current subfile content, inserting a newline needed
                    if (currentFileContent === undefined) {
                        currentFileContent = "";
                    }
                    else if (currentFileContent !== "") {
                        // End-of-line
                        currentFileContent = currentFileContent + "\n";
                    }
                    currentFileContent = currentFileContent + line;
                }
            }
            // normalize the fileName for the single file case
            currentFileName = testUnitData.length > 0 || currentFileName ? currentFileName : ts.getBaseFileName(fileName);
            // EOF, push whatever remains
            var newTestFile2 = {
                content: currentFileContent || "",
                name: currentFileName,
                fileOptions: currentFileOptions,
                originalFilePath: fileName,
                references: refs
            };
            testUnitData.push(newTestFile2);
            // unit tests always list files explicitly
            var parseConfigHost = {
                useCaseSensitiveFileNames: false,
                readDirectory: function () { return []; },
                fileExists: function () { return true; },
                readFile: function (name) { return ts.forEach(testUnitData, function (data) { return data.name.toLowerCase() === name.toLowerCase() ? data.content : undefined; }); }
            };
            // check if project has tsconfig.json in the list of files
            var tsConfig;
            var tsConfigFileUnitData;
            for (var i = 0; i < testUnitData.length; i++) {
                var data = testUnitData[i];
                if (getConfigNameFromFileName(data.name)) {
                    var configJson = ts.parseJsonText(data.name, data.content);
                    assert.isTrue(configJson.endOfFileToken !== undefined);
                    var baseDir = ts.normalizePath(ts.getDirectoryPath(data.name));
                    if (rootDir) {
                        baseDir = ts.getNormalizedAbsolutePath(baseDir, rootDir);
                    }
                    tsConfig = ts.parseJsonSourceFileConfigFileContent(configJson, parseConfigHost, baseDir);
                    tsConfig.options.configFilePath = data.name;
                    tsConfigFileUnitData = data;
                    // delete entry from the list
                    ts.orderedRemoveItemAt(testUnitData, i);
                    break;
                }
            }
            return { settings: settings, testUnitData: testUnitData, tsConfig: tsConfig, tsConfigFileUnitData: tsConfigFileUnitData, symlinks: symlinks };
        }
        TestCaseParser.makeUnitsFromTest = makeUnitsFromTest;
    })(TestCaseParser = Harness.TestCaseParser || (Harness.TestCaseParser = {}));
    /** Support class for baseline files */
    var Baseline;
    (function (Baseline) {
        var noContent = "<no content>";
        function localPath(fileName, baselineFolder, subfolder) {
            if (baselineFolder === undefined) {
                return baselinePath(fileName, "local", "tests/baselines", subfolder);
            }
            else {
                return baselinePath(fileName, "local", baselineFolder, subfolder);
            }
        }
        Baseline.localPath = localPath;
        function referencePath(fileName, baselineFolder, subfolder) {
            if (baselineFolder === undefined) {
                return baselinePath(fileName, "reference", "tests/baselines", subfolder);
            }
            else {
                return baselinePath(fileName, "reference", baselineFolder, subfolder);
            }
        }
        function baselinePath(fileName, type, baselineFolder, subfolder) {
            if (subfolder !== undefined) {
                return Harness.userSpecifiedRoot + baselineFolder + "/" + subfolder + "/" + type + "/" + fileName;
            }
            else {
                return Harness.userSpecifiedRoot + baselineFolder + "/" + type + "/" + fileName;
            }
        }
        var fileCache = {};
        function compareToBaseline(actual, relativeFileName, opts) {
            // actual is now either undefined (the generator had an error), null (no file requested),
            // or some real output of the function
            if (actual === undefined) {
                // Nothing to do
                return undefined; // TODO: GH#18217
            }
            var refFileName = referencePath(relativeFileName, opts && opts.Baselinefolder, opts && opts.Subfolder);
            // eslint-disable-next-line no-null/no-null
            if (actual === null) {
                actual = noContent;
            }
            var expected = "<no content>";
            if (Harness.IO.fileExists(refFileName)) {
                expected = Harness.IO.readFile(refFileName); // TODO: GH#18217
            }
            return { expected: expected, actual: actual };
        }
        function writeComparison(expected, actual, relativeFileName, actualFileName, opts) {
            // For now this is written using TypeScript, because sys is not available when running old test cases.
            // But we need to move to sys once we have
            // Creates the directory including its parent if not already present
            function createDirectoryStructure(dirName) {
                if (fileCache[dirName] || Harness.IO.directoryExists(dirName)) {
                    fileCache[dirName] = true;
                    return;
                }
                var parentDirectory = Harness.IO.directoryName(dirName); // TODO: GH#18217
                if (parentDirectory !== "" && parentDirectory !== dirName) {
                    createDirectoryStructure(parentDirectory);
                }
                Harness.IO.createDirectory(dirName);
                fileCache[dirName] = true;
            }
            // Create folders if needed
            createDirectoryStructure(Harness.IO.directoryName(actualFileName)); // TODO: GH#18217
            // Delete the actual file in case it fails
            if (Harness.IO.fileExists(actualFileName)) {
                Harness.IO.deleteFile(actualFileName);
            }
            var encodedActual = Utils.encodeString(actual);
            if (expected !== encodedActual) {
                if (actual === noContent) {
                    Harness.IO.writeFile(actualFileName + ".delete", "");
                }
                else {
                    Harness.IO.writeFile(actualFileName, encodedActual);
                }
                var errorMessage = getBaselineFileChangedErrorMessage(relativeFileName);
                if (!!require && opts && opts.PrintDiff) {
                    var Diff = require("diff");
                    var patch = Diff.createTwoFilesPatch("Expected", "Actual", expected, actual, "The current baseline", "The new version");
                    throw new Error("".concat(errorMessage).concat(ts.ForegroundColorEscapeSequences.Grey, "\n\n").concat(patch));
                }
                else {
                    if (!Harness.IO.fileExists(expected)) {
                        throw new Error("New baseline created at ".concat(Harness.IO.joinPath("tests", "baselines", "local", relativeFileName)));
                    }
                    else {
                        throw new Error(errorMessage);
                    }
                }
            }
        }
        function getBaselineFileChangedErrorMessage(relativeFileName) {
            return "The baseline file ".concat(relativeFileName, " has changed. (Run \"gulp baseline-accept\" if the new baseline is correct.)");
        }
        function runBaseline(relativeFileName, actual, opts) {
            var actualFileName = localPath(relativeFileName, opts && opts.Baselinefolder, opts && opts.Subfolder);
            if (actual === undefined) {
                throw new Error("The generated content was \"undefined\". Return \"null\" if no baselining is required.\"");
            }
            var comparison = compareToBaseline(actual, relativeFileName, opts);
            writeComparison(comparison.expected, comparison.actual, relativeFileName, actualFileName, opts);
        }
        Baseline.runBaseline = runBaseline;
        function runMultifileBaseline(relativeFileBase, extension, generateContent, opts, referencedExtensions) {
            var _a;
            var gen = generateContent();
            var writtenFiles = new ts.Map();
            var errors = [];
            // eslint-disable-next-line no-null/no-null
            if (gen !== null) {
                for (var _b = gen.next(), done = _b.done, value = _b.value; !done; _a = gen.next(), done = _a.done, value = _a.value) {
                    var _c = value, name = _c[0], content = _c[1], count = _c[2];
                    if (count === 0)
                        continue; // Allow error reporter to skip writing files without errors
                    var relativeFileName = relativeFileBase + "/" + name + extension;
                    var actualFileName = localPath(relativeFileName, opts && opts.Baselinefolder, opts && opts.Subfolder);
                    var comparison = compareToBaseline(content, relativeFileName, opts);
                    try {
                        writeComparison(comparison.expected, comparison.actual, relativeFileName, actualFileName);
                    }
                    catch (e) {
                        errors.push(e);
                    }
                    writtenFiles.set(relativeFileName, true);
                }
            }
            var referenceDir = referencePath(relativeFileBase, opts && opts.Baselinefolder, opts && opts.Subfolder);
            var existing = Harness.IO.readDirectory(referenceDir, referencedExtensions || [extension]);
            if (extension === ".ts" || referencedExtensions && referencedExtensions.indexOf(".ts") > -1 && referencedExtensions.indexOf(".d.ts") === -1) {
                // special-case and filter .d.ts out of .ts results
                existing = existing.filter(function (f) { return !ts.endsWith(f, ".d.ts"); });
            }
            var missing = [];
            for (var _i = 0, existing_1 = existing; _i < existing_1.length; _i++) {
                var name = existing_1[_i];
                var localCopy = name.substring(referenceDir.length - relativeFileBase.length);
                if (!writtenFiles.has(localCopy)) {
                    missing.push(localCopy);
                }
            }
            if (missing.length) {
                for (var _d = 0, missing_1 = missing; _d < missing_1.length; _d++) {
                    var file = missing_1[_d];
                    Harness.IO.writeFile(localPath(file + ".delete", opts && opts.Baselinefolder, opts && opts.Subfolder), "");
                }
            }
            if (errors.length || missing.length) {
                var errorMsg = "";
                if (errors.length) {
                    errorMsg += "The baseline for ".concat(relativeFileBase, " in ").concat(errors.length, " files has changed:").concat("\n    " + errors.slice(0, 5).map(function (e) { return e.message; }).join("\n    ") + (errors.length > 5 ? "\n" + "    and ".concat(errors.length - 5, " more") : ""));
                }
                if (errors.length && missing.length) {
                    errorMsg += "\n";
                }
                if (missing.length) {
                    var writtenFilesArray = ts.arrayFrom(writtenFiles.keys());
                    errorMsg += "Baseline missing ".concat(missing.length, " files:").concat("\n    " + missing.slice(0, 5).join("\n    ") + (missing.length > 5 ? "\n" + "    and ".concat(missing.length - 5, " more") : "") + "\n", "Written ").concat(writtenFiles.size, " files:").concat("\n    " + writtenFilesArray.slice(0, 5).join("\n    ") + (writtenFilesArray.length > 5 ? "\n" + "    and ".concat(writtenFilesArray.length - 5, " more") : ""));
                }
                throw new Error(errorMsg);
            }
        }
        Baseline.runMultifileBaseline = runMultifileBaseline;
    })(Baseline = Harness.Baseline || (Harness.Baseline = {}));
    function isDefaultLibraryFile(filePath) {
        // We need to make sure that the filePath is prefixed with "lib." not just containing "lib." and end with ".d.ts"
        var fileName = ts.getBaseFileName(ts.normalizeSlashes(filePath));
        return ts.startsWith(fileName, "lib.") && ts.endsWith(fileName, ".d.ts" /* ts.Extension.Dts */);
    }
    Harness.isDefaultLibraryFile = isDefaultLibraryFile;
    function isBuiltFile(filePath) {
        return filePath.indexOf(Harness.libFolder) === 0 ||
            filePath.indexOf(vpath.addTrailingSeparator(vfs.builtFolder)) === 0;
    }
    Harness.isBuiltFile = isBuiltFile;
    function getDefaultLibraryFile(filePath, io) {
        var libFile = Harness.userSpecifiedRoot + Harness.libFolder + ts.getBaseFileName(ts.normalizeSlashes(filePath));
        return { unitName: libFile, content: io.readFile(libFile) };
    }
    Harness.getDefaultLibraryFile = getDefaultLibraryFile;
    function getConfigNameFromFileName(filename) {
        var flc = ts.getBaseFileName(filename).toLowerCase();
        return ts.find(["tsconfig.json", "jsconfig.json"], function (x) { return x === flc; });
    }
    Harness.getConfigNameFromFileName = getConfigNameFromFileName;
    if (Error)
        Error.stackTraceLimit = 100;
})(Harness || (Harness = {}));
var Harness;
(function (Harness) {
    var LanguageService;
    (function (LanguageService) {
        function makeDefaultProxy(info) {
            var proxy = Object.create(/*prototype*/ null); // eslint-disable-line no-null/no-null
            var langSvc = info.languageService;
            var _loop_6 = function (k) {
                // eslint-disable-next-line local/only-arrow-functions
                proxy[k] = function () {
                    return langSvc[k].apply(langSvc, arguments);
                };
            };
            for (var _i = 0, _a = Object.keys(langSvc); _i < _a.length; _i++) {
                var k = _a[_i];
                _loop_6(k);
            }
            return proxy;
        }
        LanguageService.makeDefaultProxy = makeDefaultProxy;
        var ScriptInfo = /** @class */ (function () {
            function ScriptInfo(fileName, content, isRootFile) {
                this.fileName = fileName;
                this.content = content;
                this.isRootFile = isRootFile;
                this.version = 1;
                this.editRanges = [];
                this.setContent(content);
            }
            ScriptInfo.prototype.setContent = function (content) {
                this.content = content;
                this.lineMap = undefined;
            };
            ScriptInfo.prototype.getLineMap = function () {
                return this.lineMap || (this.lineMap = ts.computeLineStarts(this.content));
            };
            ScriptInfo.prototype.updateContent = function (content) {
                this.editRanges = [];
                this.setContent(content);
                this.version++;
            };
            ScriptInfo.prototype.editContent = function (start, end, newText) {
                // Apply edits
                var prefix = this.content.substring(0, start);
                var middle = newText;
                var suffix = this.content.substring(end);
                this.setContent(prefix + middle + suffix);
                // Store edit range + new length of script
                this.editRanges.push({
                    length: this.content.length,
                    textChangeRange: ts.createTextChangeRange(ts.createTextSpanFromBounds(start, end), newText.length)
                });
                // Update version #
                this.version++;
            };
            ScriptInfo.prototype.getTextChangeRangeBetweenVersions = function (startVersion, endVersion) {
                if (startVersion === endVersion) {
                    // No edits!
                    return ts.unchangedTextChangeRange;
                }
                var initialEditRangeIndex = this.editRanges.length - (this.version - startVersion);
                var lastEditRangeIndex = this.editRanges.length - (this.version - endVersion);
                var entries = this.editRanges.slice(initialEditRangeIndex, lastEditRangeIndex);
                return ts.collapseTextChangeRangesAcrossMultipleVersions(entries.map(function (e) { return e.textChangeRange; }));
            };
            return ScriptInfo;
        }());
        LanguageService.ScriptInfo = ScriptInfo;
        var ScriptSnapshot = /** @class */ (function () {
            function ScriptSnapshot(scriptInfo) {
                this.scriptInfo = scriptInfo;
                this.textSnapshot = scriptInfo.content;
                this.version = scriptInfo.version;
            }
            ScriptSnapshot.prototype.getText = function (start, end) {
                return this.textSnapshot.substring(start, end);
            };
            ScriptSnapshot.prototype.getLength = function () {
                return this.textSnapshot.length;
            };
            ScriptSnapshot.prototype.getChangeRange = function (oldScript) {
                var oldShim = oldScript;
                return this.scriptInfo.getTextChangeRangeBetweenVersions(oldShim.version, this.version);
            };
            return ScriptSnapshot;
        }());
        var ScriptSnapshotProxy = /** @class */ (function () {
            function ScriptSnapshotProxy(scriptSnapshot) {
                this.scriptSnapshot = scriptSnapshot;
            }
            ScriptSnapshotProxy.prototype.getText = function (start, end) {
                return this.scriptSnapshot.getText(start, end);
            };
            ScriptSnapshotProxy.prototype.getLength = function () {
                return this.scriptSnapshot.getLength();
            };
            ScriptSnapshotProxy.prototype.getChangeRange = function (oldScript) {
                var range = this.scriptSnapshot.getChangeRange(oldScript.scriptSnapshot);
                return range && JSON.stringify(range);
            };
            return ScriptSnapshotProxy;
        }());
        var DefaultHostCancellationToken = /** @class */ (function () {
            function DefaultHostCancellationToken() {
            }
            DefaultHostCancellationToken.prototype.isCancellationRequested = function () {
                return false;
            };
            DefaultHostCancellationToken.instance = new DefaultHostCancellationToken();
            return DefaultHostCancellationToken;
        }());
        var LanguageServiceAdapterHost = /** @class */ (function () {
            function LanguageServiceAdapterHost(cancellationToken, settings) {
                if (cancellationToken === void 0) { cancellationToken = DefaultHostCancellationToken.instance; }
                if (settings === void 0) { settings = ts.getDefaultCompilerOptions(); }
                this.cancellationToken = cancellationToken;
                this.settings = settings;
                this.sys = new fakes.System(new vfs.FileSystem(/*ignoreCase*/ true, { cwd: Harness.virtualFileSystemRoot }));
                this.scriptInfos = new collections.SortedMap({ comparer: this.vfs.stringComparer, sort: "insertion" });
            }
            Object.defineProperty(LanguageServiceAdapterHost.prototype, "vfs", {
                get: function () {
                    return this.sys.vfs;
                },
                enumerable: false,
                configurable: true
            });
            LanguageServiceAdapterHost.prototype.getNewLine = function () {
                return Harness.harnessNewLine;
            };
            LanguageServiceAdapterHost.prototype.getFilenames = function () {
                var fileNames = [];
                this.scriptInfos.forEach(function (scriptInfo) {
                    if (scriptInfo.isRootFile) {
                        // only include root files here
                        // usually it means that we won't include lib.d.ts in the list of root files so it won't mess the computation of compilation root dir.
                        fileNames.push(scriptInfo.fileName);
                    }
                });
                return fileNames;
            };
            LanguageServiceAdapterHost.prototype.realpath = function (path) {
                try {
                    return this.vfs.realpathSync(path);
                }
                catch (_a) {
                    return path;
                }
            };
            LanguageServiceAdapterHost.prototype.fileExists = function (path) {
                try {
                    return this.vfs.existsSync(path);
                }
                catch (_a) {
                    return false;
                }
            };
            LanguageServiceAdapterHost.prototype.readFile = function (path) {
                try {
                    return this.vfs.readFileSync(path).toString();
                }
                catch (_a) {
                    return undefined;
                }
            };
            LanguageServiceAdapterHost.prototype.directoryExists = function (path) {
                return this.vfs.statSync(path).isDirectory();
            };
            LanguageServiceAdapterHost.prototype.getScriptInfo = function (fileName) {
                return this.scriptInfos.get(vpath.resolve(this.vfs.cwd(), fileName));
            };
            LanguageServiceAdapterHost.prototype.addScript = function (fileName, content, isRootFile) {
                this.vfs.mkdirpSync(vpath.dirname(fileName));
                this.vfs.writeFileSync(fileName, content);
                this.scriptInfos.set(vpath.resolve(this.vfs.cwd(), fileName), new ScriptInfo(fileName, content, isRootFile));
            };
            LanguageServiceAdapterHost.prototype.renameFileOrDirectory = function (oldPath, newPath) {
                var _this = this;
                this.vfs.mkdirpSync(ts.getDirectoryPath(newPath));
                this.vfs.renameSync(oldPath, newPath);
                var updater = ts.getPathUpdater(oldPath, newPath, ts.createGetCanonicalFileName(this.useCaseSensitiveFileNames()), /*sourceMapper*/ undefined);
                this.scriptInfos.forEach(function (scriptInfo, key) {
                    var newFileName = updater(key);
                    if (newFileName !== undefined) {
                        _this.scriptInfos.delete(key);
                        _this.scriptInfos.set(newFileName, scriptInfo);
                        scriptInfo.fileName = newFileName;
                    }
                });
            };
            LanguageServiceAdapterHost.prototype.editScript = function (fileName, start, end, newText) {
                var script = this.getScriptInfo(fileName);
                if (script) {
                    script.editContent(start, end, newText);
                    this.vfs.mkdirpSync(vpath.dirname(fileName));
                    this.vfs.writeFileSync(fileName, script.content);
                    return;
                }
                throw new Error("No script with name '" + fileName + "'");
            };
            LanguageServiceAdapterHost.prototype.openFile = function (_fileName, _content, _scriptKindName) { };
            /**
             * @param line 0 based index
             * @param col 0 based index
             */
            LanguageServiceAdapterHost.prototype.positionToLineAndCharacter = function (fileName, position) {
                var script = this.getScriptInfo(fileName);
                assert.isOk(script);
                return ts.computeLineAndCharacterOfPosition(script.getLineMap(), position);
            };
            LanguageServiceAdapterHost.prototype.lineAndCharacterToPosition = function (fileName, lineAndCharacter) {
                var script = this.getScriptInfo(fileName);
                assert.isOk(script);
                return ts.computePositionOfLineAndCharacter(script.getLineMap(), lineAndCharacter.line, lineAndCharacter.character);
            };
            LanguageServiceAdapterHost.prototype.useCaseSensitiveFileNames = function () {
                return !this.vfs.ignoreCase;
            };
            return LanguageServiceAdapterHost;
        }());
        LanguageService.LanguageServiceAdapterHost = LanguageServiceAdapterHost;
        /// Native adapter
        var NativeLanguageServiceHost = /** @class */ (function (_super) {
            __extends(NativeLanguageServiceHost, _super);
            function NativeLanguageServiceHost() {
                var _this = _super !== null && _super.apply(this, arguments) || this;
                _this.installPackage = ts.notImplemented;
                _this.log = ts.noop;
                _this.trace = ts.noop;
                _this.error = ts.noop;
                return _this;
            }
            NativeLanguageServiceHost.prototype.isKnownTypesPackageName = function (name) {
                return !!this.typesRegistry && this.typesRegistry.has(name);
            };
            NativeLanguageServiceHost.prototype.getGlobalTypingsCacheLocation = function () {
                return "/Library/Caches/typescript";
            };
            NativeLanguageServiceHost.prototype.getCompilationSettings = function () { return this.settings; };
            NativeLanguageServiceHost.prototype.getCancellationToken = function () { return this.cancellationToken; };
            NativeLanguageServiceHost.prototype.getDirectories = function (path) {
                return this.sys.getDirectories(path);
            };
            NativeLanguageServiceHost.prototype.getCurrentDirectory = function () { return Harness.virtualFileSystemRoot; };
            NativeLanguageServiceHost.prototype.getDefaultLibFileName = function () { return Harness.Compiler.defaultLibFileName; };
            NativeLanguageServiceHost.prototype.getScriptFileNames = function () {
                return this.getFilenames().filter(ts.isAnySupportedFileExtension);
            };
            NativeLanguageServiceHost.prototype.getScriptSnapshot = function (fileName) {
                var script = this.getScriptInfo(fileName);
                return script ? new ScriptSnapshot(script) : undefined;
            };
            NativeLanguageServiceHost.prototype.getScriptKind = function () { return 0 /* ts.ScriptKind.Unknown */; };
            NativeLanguageServiceHost.prototype.getScriptVersion = function (fileName) {
                var script = this.getScriptInfo(fileName);
                return script ? script.version.toString() : undefined; // TODO: GH#18217
            };
            NativeLanguageServiceHost.prototype.directoryExists = function (dirName) {
                return this.sys.directoryExists(dirName);
            };
            NativeLanguageServiceHost.prototype.fileExists = function (fileName) {
                return this.sys.fileExists(fileName);
            };
            NativeLanguageServiceHost.prototype.readDirectory = function (path, extensions, exclude, include, depth) {
                return this.sys.readDirectory(path, extensions, exclude, include, depth);
            };
            NativeLanguageServiceHost.prototype.readFile = function (path) {
                return this.sys.readFile(path);
            };
            NativeLanguageServiceHost.prototype.realpath = function (path) {
                return this.sys.realpath(path);
            };
            NativeLanguageServiceHost.prototype.getTypeRootsVersion = function () {
                return 0;
            };
            return NativeLanguageServiceHost;
        }(LanguageServiceAdapterHost));
        var NativeLanguageServiceAdapter = /** @class */ (function () {
            function NativeLanguageServiceAdapter(cancellationToken, options) {
                this.host = new NativeLanguageServiceHost(cancellationToken, options);
            }
            NativeLanguageServiceAdapter.prototype.getHost = function () { return this.host; };
            NativeLanguageServiceAdapter.prototype.getLanguageService = function () { return ts.createLanguageService(this.host); };
            NativeLanguageServiceAdapter.prototype.getClassifier = function () { return ts.createClassifier(); };
            NativeLanguageServiceAdapter.prototype.getPreProcessedFileInfo = function (fileName, fileContents) { return ts.preProcessFile(fileContents, /* readImportFiles */ true, ts.hasJSFileExtension(fileName)); };
            return NativeLanguageServiceAdapter;
        }());
        LanguageService.NativeLanguageServiceAdapter = NativeLanguageServiceAdapter;
        /// Shim adapter
        var ShimLanguageServiceHost = /** @class */ (function (_super) {
            __extends(ShimLanguageServiceHost, _super);
            function ShimLanguageServiceHost(preprocessToResolve, cancellationToken, options) {
                var _this = _super.call(this, cancellationToken, options) || this;
                _this.readDirectory = ts.notImplemented;
                _this.readDirectoryNames = ts.notImplemented;
                _this.readFileNames = ts.notImplemented;
                _this.nativeHost = new NativeLanguageServiceHost(cancellationToken, options);
                if (preprocessToResolve) {
                    var compilerOptions_1 = _this.nativeHost.getCompilationSettings();
                    var moduleResolutionHost_1 = {
                        fileExists: function (fileName) { return _this.getScriptInfo(fileName) !== undefined; },
                        readFile: function (fileName) {
                            var scriptInfo = _this.getScriptInfo(fileName);
                            return scriptInfo && scriptInfo.content;
                        },
                        useCaseSensitiveFileNames: _this.useCaseSensitiveFileNames()
                    };
                    _this.getModuleResolutionsForFile = function (fileName) {
                        var scriptInfo = _this.getScriptInfo(fileName);
                        var preprocessInfo = ts.preProcessFile(scriptInfo.content, /*readImportFiles*/ true);
                        var imports = {};
                        for (var _i = 0, _a = preprocessInfo.importedFiles; _i < _a.length; _i++) {
                            var module_1 = _a[_i];
                            var resolutionInfo = ts.resolveModuleName(module_1.fileName, fileName, compilerOptions_1, moduleResolutionHost_1);
                            if (resolutionInfo.resolvedModule) {
                                imports[module_1.fileName] = resolutionInfo.resolvedModule.resolvedFileName;
                            }
                        }
                        return JSON.stringify(imports);
                    };
                    _this.getTypeReferenceDirectiveResolutionsForFile = function (fileName) {
                        var scriptInfo = _this.getScriptInfo(fileName);
                        if (scriptInfo) {
                            var preprocessInfo = ts.preProcessFile(scriptInfo.content, /*readImportFiles*/ false);
                            var resolutions = {};
                            var settings = _this.nativeHost.getCompilationSettings();
                            for (var _i = 0, _a = preprocessInfo.typeReferenceDirectives; _i < _a.length; _i++) {
                                var typeReferenceDirective = _a[_i];
                                var resolutionInfo = ts.resolveTypeReferenceDirective(typeReferenceDirective.fileName, fileName, settings, moduleResolutionHost_1);
                                if (resolutionInfo.resolvedTypeReferenceDirective.resolvedFileName) {
                                    resolutions[typeReferenceDirective.fileName] = resolutionInfo.resolvedTypeReferenceDirective;
                                }
                            }
                            return JSON.stringify(resolutions);
                        }
                        else {
                            return "[]";
                        }
                    };
                }
                return _this;
            }
            ShimLanguageServiceHost.prototype.getFilenames = function () { return this.nativeHost.getFilenames(); };
            ShimLanguageServiceHost.prototype.getScriptInfo = function (fileName) { return this.nativeHost.getScriptInfo(fileName); };
            ShimLanguageServiceHost.prototype.addScript = function (fileName, content, isRootFile) { this.nativeHost.addScript(fileName, content, isRootFile); };
            ShimLanguageServiceHost.prototype.editScript = function (fileName, start, end, newText) { this.nativeHost.editScript(fileName, start, end, newText); };
            ShimLanguageServiceHost.prototype.positionToLineAndCharacter = function (fileName, position) { return this.nativeHost.positionToLineAndCharacter(fileName, position); };
            ShimLanguageServiceHost.prototype.getCompilationSettings = function () { return JSON.stringify(this.nativeHost.getCompilationSettings()); };
            ShimLanguageServiceHost.prototype.getCancellationToken = function () { return this.nativeHost.getCancellationToken(); };
            ShimLanguageServiceHost.prototype.getCurrentDirectory = function () { return this.nativeHost.getCurrentDirectory(); };
            ShimLanguageServiceHost.prototype.getDirectories = function (path) { return JSON.stringify(this.nativeHost.getDirectories(path)); };
            ShimLanguageServiceHost.prototype.getDefaultLibFileName = function () { return this.nativeHost.getDefaultLibFileName(); };
            ShimLanguageServiceHost.prototype.getScriptFileNames = function () { return JSON.stringify(this.nativeHost.getScriptFileNames()); };
            ShimLanguageServiceHost.prototype.getScriptSnapshot = function (fileName) {
                var nativeScriptSnapshot = this.nativeHost.getScriptSnapshot(fileName); // TODO: GH#18217
                return nativeScriptSnapshot && new ScriptSnapshotProxy(nativeScriptSnapshot);
            };
            ShimLanguageServiceHost.prototype.getScriptKind = function () { return this.nativeHost.getScriptKind(); };
            ShimLanguageServiceHost.prototype.getScriptVersion = function (fileName) { return this.nativeHost.getScriptVersion(fileName); };
            ShimLanguageServiceHost.prototype.getLocalizedDiagnosticMessages = function () { return JSON.stringify({}); };
            ShimLanguageServiceHost.prototype.fileExists = function (fileName) { return this.getScriptInfo(fileName) !== undefined; };
            ShimLanguageServiceHost.prototype.readFile = function (fileName) {
                var snapshot = this.nativeHost.getScriptSnapshot(fileName);
                return snapshot && ts.getSnapshotText(snapshot);
            };
            ShimLanguageServiceHost.prototype.log = function (s) { this.nativeHost.log(s); };
            ShimLanguageServiceHost.prototype.trace = function (s) { this.nativeHost.trace(s); };
            ShimLanguageServiceHost.prototype.error = function (s) { this.nativeHost.error(s); };
            ShimLanguageServiceHost.prototype.directoryExists = function () {
                // for tests pessimistically assume that directory always exists
                return true;
            };
            return ShimLanguageServiceHost;
        }(LanguageServiceAdapterHost));
        var ClassifierShimProxy = /** @class */ (function () {
            function ClassifierShimProxy(shim) {
                this.shim = shim;
            }
            ClassifierShimProxy.prototype.getEncodedLexicalClassifications = function (_text, _lexState, _classifyKeywordsInGenerics) {
                return ts.notImplemented();
            };
            ClassifierShimProxy.prototype.getClassificationsForLine = function (text, lexState, classifyKeywordsInGenerics) {
                var result = this.shim.getClassificationsForLine(text, lexState, classifyKeywordsInGenerics).split("\n");
                var entries = [];
                var i = 0;
                var position = 0;
                for (; i < result.length - 1; i += 2) {
                    var t = entries[i / 2] = {
                        length: parseInt(result[i]),
                        classification: parseInt(result[i + 1])
                    };
                    assert.isTrue(t.length > 0, "Result length should be greater than 0, got :" + t.length);
                    position += t.length;
                }
                var finalLexState = parseInt(result[result.length - 1]);
                assert.equal(position, text.length, "Expected cumulative length of all entries to match the length of the source. expected: " + text.length + ", but got: " + position);
                return {
                    finalLexState: finalLexState,
                    entries: entries
                };
            };
            return ClassifierShimProxy;
        }());
        function unwrapJSONCallResult(result) {
            var parsedResult = JSON.parse(result);
            if (parsedResult.error) {
                throw new Error("Language Service Shim Error: " + JSON.stringify(parsedResult.error));
            }
            else if (parsedResult.canceled) {
                throw new ts.OperationCanceledException();
            }
            return parsedResult.result;
        }
        var LanguageServiceShimProxy = /** @class */ (function () {
            function LanguageServiceShimProxy(shim) {
                this.shim = shim;
                this.getCombinedCodeFix = ts.notImplemented;
                this.applyCodeActionCommand = ts.notImplemented;
            }
            LanguageServiceShimProxy.prototype.cleanupSemanticCache = function () {
                this.shim.cleanupSemanticCache();
            };
            LanguageServiceShimProxy.prototype.getSyntacticDiagnostics = function (fileName) {
                return unwrapJSONCallResult(this.shim.getSyntacticDiagnostics(fileName));
            };
            LanguageServiceShimProxy.prototype.getSemanticDiagnostics = function (fileName) {
                return unwrapJSONCallResult(this.shim.getSemanticDiagnostics(fileName));
            };
            LanguageServiceShimProxy.prototype.getSuggestionDiagnostics = function (fileName) {
                return unwrapJSONCallResult(this.shim.getSuggestionDiagnostics(fileName));
            };
            LanguageServiceShimProxy.prototype.getCompilerOptionsDiagnostics = function () {
                return unwrapJSONCallResult(this.shim.getCompilerOptionsDiagnostics());
            };
            LanguageServiceShimProxy.prototype.getSyntacticClassifications = function (fileName, span) {
                return unwrapJSONCallResult(this.shim.getSyntacticClassifications(fileName, span.start, span.length));
            };
            LanguageServiceShimProxy.prototype.getSemanticClassifications = function (fileName, span, format) {
                return unwrapJSONCallResult(this.shim.getSemanticClassifications(fileName, span.start, span.length, format));
            };
            LanguageServiceShimProxy.prototype.getEncodedSyntacticClassifications = function (fileName, span) {
                return unwrapJSONCallResult(this.shim.getEncodedSyntacticClassifications(fileName, span.start, span.length));
            };
            LanguageServiceShimProxy.prototype.getEncodedSemanticClassifications = function (fileName, span, format) {
                var responseFormat = format || "original" /* ts.SemanticClassificationFormat.Original */;
                return unwrapJSONCallResult(this.shim.getEncodedSemanticClassifications(fileName, span.start, span.length, responseFormat));
            };
            LanguageServiceShimProxy.prototype.getCompletionsAtPosition = function (fileName, position, preferences, formattingSettings) {
                return unwrapJSONCallResult(this.shim.getCompletionsAtPosition(fileName, position, preferences, formattingSettings));
            };
            LanguageServiceShimProxy.prototype.getCompletionEntryDetails = function (fileName, position, entryName, formatOptions, source, preferences, data) {
                return unwrapJSONCallResult(this.shim.getCompletionEntryDetails(fileName, position, entryName, JSON.stringify(formatOptions), source, preferences, data));
            };
            LanguageServiceShimProxy.prototype.getCompletionEntrySymbol = function () {
                throw new Error("getCompletionEntrySymbol not implemented across the shim layer.");
            };
            LanguageServiceShimProxy.prototype.getQuickInfoAtPosition = function (fileName, position) {
                return unwrapJSONCallResult(this.shim.getQuickInfoAtPosition(fileName, position));
            };
            LanguageServiceShimProxy.prototype.getNameOrDottedNameSpan = function (fileName, startPos, endPos) {
                return unwrapJSONCallResult(this.shim.getNameOrDottedNameSpan(fileName, startPos, endPos));
            };
            LanguageServiceShimProxy.prototype.getBreakpointStatementAtPosition = function (fileName, position) {
                return unwrapJSONCallResult(this.shim.getBreakpointStatementAtPosition(fileName, position));
            };
            LanguageServiceShimProxy.prototype.getSignatureHelpItems = function (fileName, position, options) {
                return unwrapJSONCallResult(this.shim.getSignatureHelpItems(fileName, position, options));
            };
            LanguageServiceShimProxy.prototype.getRenameInfo = function (fileName, position, preferences) {
                return unwrapJSONCallResult(this.shim.getRenameInfo(fileName, position, preferences));
            };
            LanguageServiceShimProxy.prototype.getSmartSelectionRange = function (fileName, position) {
                return unwrapJSONCallResult(this.shim.getSmartSelectionRange(fileName, position));
            };
            LanguageServiceShimProxy.prototype.findRenameLocations = function (fileName, position, findInStrings, findInComments, providePrefixAndSuffixTextForRename) {
                return unwrapJSONCallResult(this.shim.findRenameLocations(fileName, position, findInStrings, findInComments, providePrefixAndSuffixTextForRename));
            };
            LanguageServiceShimProxy.prototype.getDefinitionAtPosition = function (fileName, position) {
                return unwrapJSONCallResult(this.shim.getDefinitionAtPosition(fileName, position));
            };
            LanguageServiceShimProxy.prototype.getDefinitionAndBoundSpan = function (fileName, position) {
                return unwrapJSONCallResult(this.shim.getDefinitionAndBoundSpan(fileName, position));
            };
            LanguageServiceShimProxy.prototype.getTypeDefinitionAtPosition = function (fileName, position) {
                return unwrapJSONCallResult(this.shim.getTypeDefinitionAtPosition(fileName, position));
            };
            LanguageServiceShimProxy.prototype.getImplementationAtPosition = function (fileName, position) {
                return unwrapJSONCallResult(this.shim.getImplementationAtPosition(fileName, position));
            };
            LanguageServiceShimProxy.prototype.getReferencesAtPosition = function (fileName, position) {
                return unwrapJSONCallResult(this.shim.getReferencesAtPosition(fileName, position));
            };
            LanguageServiceShimProxy.prototype.findReferences = function (fileName, position) {
                return unwrapJSONCallResult(this.shim.findReferences(fileName, position));
            };
            LanguageServiceShimProxy.prototype.getFileReferences = function (fileName) {
                return unwrapJSONCallResult(this.shim.getFileReferences(fileName));
            };
            LanguageServiceShimProxy.prototype.getOccurrencesAtPosition = function (fileName, position) {
                return unwrapJSONCallResult(this.shim.getOccurrencesAtPosition(fileName, position));
            };
            LanguageServiceShimProxy.prototype.getDocumentHighlights = function (fileName, position, filesToSearch) {
                return unwrapJSONCallResult(this.shim.getDocumentHighlights(fileName, position, JSON.stringify(filesToSearch)));
            };
            LanguageServiceShimProxy.prototype.getNavigateToItems = function (searchValue) {
                return unwrapJSONCallResult(this.shim.getNavigateToItems(searchValue));
            };
            LanguageServiceShimProxy.prototype.getNavigationBarItems = function (fileName) {
                return unwrapJSONCallResult(this.shim.getNavigationBarItems(fileName));
            };
            LanguageServiceShimProxy.prototype.getNavigationTree = function (fileName) {
                return unwrapJSONCallResult(this.shim.getNavigationTree(fileName));
            };
            LanguageServiceShimProxy.prototype.getOutliningSpans = function (fileName) {
                return unwrapJSONCallResult(this.shim.getOutliningSpans(fileName));
            };
            LanguageServiceShimProxy.prototype.getTodoComments = function (fileName, descriptors) {
                return unwrapJSONCallResult(this.shim.getTodoComments(fileName, JSON.stringify(descriptors)));
            };
            LanguageServiceShimProxy.prototype.getBraceMatchingAtPosition = function (fileName, position) {
                return unwrapJSONCallResult(this.shim.getBraceMatchingAtPosition(fileName, position));
            };
            LanguageServiceShimProxy.prototype.getIndentationAtPosition = function (fileName, position, options) {
                return unwrapJSONCallResult(this.shim.getIndentationAtPosition(fileName, position, JSON.stringify(options)));
            };
            LanguageServiceShimProxy.prototype.getFormattingEditsForRange = function (fileName, start, end, options) {
                return unwrapJSONCallResult(this.shim.getFormattingEditsForRange(fileName, start, end, JSON.stringify(options)));
            };
            LanguageServiceShimProxy.prototype.getFormattingEditsForDocument = function (fileName, options) {
                return unwrapJSONCallResult(this.shim.getFormattingEditsForDocument(fileName, JSON.stringify(options)));
            };
            LanguageServiceShimProxy.prototype.getFormattingEditsAfterKeystroke = function (fileName, position, key, options) {
                return unwrapJSONCallResult(this.shim.getFormattingEditsAfterKeystroke(fileName, position, key, JSON.stringify(options)));
            };
            LanguageServiceShimProxy.prototype.getDocCommentTemplateAtPosition = function (fileName, position, options) {
                return unwrapJSONCallResult(this.shim.getDocCommentTemplateAtPosition(fileName, position, options));
            };
            LanguageServiceShimProxy.prototype.isValidBraceCompletionAtPosition = function (fileName, position, openingBrace) {
                return unwrapJSONCallResult(this.shim.isValidBraceCompletionAtPosition(fileName, position, openingBrace));
            };
            LanguageServiceShimProxy.prototype.getJsxClosingTagAtPosition = function () {
                throw new Error("Not supported on the shim.");
            };
            LanguageServiceShimProxy.prototype.getSpanOfEnclosingComment = function (fileName, position, onlyMultiLine) {
                return unwrapJSONCallResult(this.shim.getSpanOfEnclosingComment(fileName, position, onlyMultiLine));
            };
            LanguageServiceShimProxy.prototype.getCodeFixesAtPosition = function () {
                throw new Error("Not supported on the shim.");
            };
            LanguageServiceShimProxy.prototype.getCodeFixDiagnostics = function () {
                throw new Error("Not supported on the shim.");
            };
            LanguageServiceShimProxy.prototype.getEditsForRefactor = function () {
                throw new Error("Not supported on the shim.");
            };
            LanguageServiceShimProxy.prototype.getApplicableRefactors = function () {
                throw new Error("Not supported on the shim.");
            };
            LanguageServiceShimProxy.prototype.organizeImports = function (_args, _formatOptions) {
                throw new Error("Not supported on the shim.");
            };
            LanguageServiceShimProxy.prototype.getEditsForFileRename = function () {
                throw new Error("Not supported on the shim.");
            };
            LanguageServiceShimProxy.prototype.prepareCallHierarchy = function (fileName, position) {
                return unwrapJSONCallResult(this.shim.prepareCallHierarchy(fileName, position));
            };
            LanguageServiceShimProxy.prototype.provideCallHierarchyIncomingCalls = function (fileName, position) {
                return unwrapJSONCallResult(this.shim.provideCallHierarchyIncomingCalls(fileName, position));
            };
            LanguageServiceShimProxy.prototype.provideCallHierarchyOutgoingCalls = function (fileName, position) {
                return unwrapJSONCallResult(this.shim.provideCallHierarchyOutgoingCalls(fileName, position));
            };
            LanguageServiceShimProxy.prototype.provideInlayHints = function (fileName, span, preference) {
                return unwrapJSONCallResult(this.shim.provideInlayHints(fileName, span, preference));
            };
            LanguageServiceShimProxy.prototype.getEmitOutput = function (fileName) {
                return unwrapJSONCallResult(this.shim.getEmitOutput(fileName));
            };
            LanguageServiceShimProxy.prototype.getProgram = function () {
                throw new Error("Program can not be marshaled across the shim layer.");
            };
            LanguageServiceShimProxy.prototype.getCurrentProgram = function () {
                throw new Error("Program can not be marshaled across the shim layer.");
            };
            LanguageServiceShimProxy.prototype.getAutoImportProvider = function () {
                throw new Error("Program can not be marshaled across the shim layer.");
            };
            LanguageServiceShimProxy.prototype.updateIsDefinitionOfReferencedSymbols = function (_referencedSymbols, _knownSymbolSpans) {
                return ts.notImplemented();
            };
            LanguageServiceShimProxy.prototype.getNonBoundSourceFile = function () {
                throw new Error("SourceFile can not be marshaled across the shim layer.");
            };
            LanguageServiceShimProxy.prototype.getSourceFile = function () {
                throw new Error("SourceFile can not be marshaled across the shim layer.");
            };
            LanguageServiceShimProxy.prototype.getSourceMapper = function () {
                return ts.notImplemented();
            };
            LanguageServiceShimProxy.prototype.clearSourceMapperCache = function () {
                return ts.notImplemented();
            };
            LanguageServiceShimProxy.prototype.toggleLineComment = function (fileName, textRange) {
                return unwrapJSONCallResult(this.shim.toggleLineComment(fileName, textRange));
            };
            LanguageServiceShimProxy.prototype.toggleMultilineComment = function (fileName, textRange) {
                return unwrapJSONCallResult(this.shim.toggleMultilineComment(fileName, textRange));
            };
            LanguageServiceShimProxy.prototype.commentSelection = function (fileName, textRange) {
                return unwrapJSONCallResult(this.shim.commentSelection(fileName, textRange));
            };
            LanguageServiceShimProxy.prototype.uncommentSelection = function (fileName, textRange) {
                return unwrapJSONCallResult(this.shim.uncommentSelection(fileName, textRange));
            };
            LanguageServiceShimProxy.prototype.dispose = function () { this.shim.dispose({}); };
            return LanguageServiceShimProxy;
        }());
        var ShimLanguageServiceAdapter = /** @class */ (function () {
            function ShimLanguageServiceAdapter(preprocessToResolve, cancellationToken, options) {
                this.host = new ShimLanguageServiceHost(preprocessToResolve, cancellationToken, options);
                this.factory = new ts.TypeScriptServicesFactory();
            }
            ShimLanguageServiceAdapter.prototype.getHost = function () { return this.host; };
            ShimLanguageServiceAdapter.prototype.getLanguageService = function () { return new LanguageServiceShimProxy(this.factory.createLanguageServiceShim(this.host)); };
            ShimLanguageServiceAdapter.prototype.getClassifier = function () { return new ClassifierShimProxy(this.factory.createClassifierShim(this.host)); };
            ShimLanguageServiceAdapter.prototype.getPreProcessedFileInfo = function (fileName, fileContents) {
                var coreServicesShim = this.factory.createCoreServicesShim(this.host);
                var shimResult = unwrapJSONCallResult(coreServicesShim.getPreProcessedFileInfo(fileName, ts.ScriptSnapshot.fromString(fileContents)));
                var convertResult = {
                    referencedFiles: [],
                    importedFiles: [],
                    ambientExternalModules: [],
                    isLibFile: shimResult.isLibFile,
                    typeReferenceDirectives: [],
                    libReferenceDirectives: []
                };
                ts.forEach(shimResult.referencedFiles, function (refFile) {
                    convertResult.referencedFiles.push({
                        fileName: refFile.path,
                        pos: refFile.position,
                        end: refFile.position + refFile.length
                    });
                });
                ts.forEach(shimResult.importedFiles, function (importedFile) {
                    convertResult.importedFiles.push({
                        fileName: importedFile.path,
                        pos: importedFile.position,
                        end: importedFile.position + importedFile.length
                    });
                });
                ts.forEach(shimResult.typeReferenceDirectives, function (typeRefDirective) {
                    convertResult.importedFiles.push({
                        fileName: typeRefDirective.path,
                        pos: typeRefDirective.position,
                        end: typeRefDirective.position + typeRefDirective.length
                    });
                });
                return convertResult;
            };
            return ShimLanguageServiceAdapter;
        }());
        LanguageService.ShimLanguageServiceAdapter = ShimLanguageServiceAdapter;
        // Server adapter
        var SessionClientHost = /** @class */ (function (_super) {
            __extends(SessionClientHost, _super);
            function SessionClientHost(cancellationToken, settings) {
                var _this = _super.call(this, cancellationToken, settings) || this;
                _this.onMessage = ts.noop;
                _this.writeMessage = ts.noop;
                return _this;
            }
            SessionClientHost.prototype.setClient = function (client) {
                this.client = client;
            };
            SessionClientHost.prototype.openFile = function (fileName, content, scriptKindName) {
                _super.prototype.openFile.call(this, fileName, content, scriptKindName);
                this.client.openFile(fileName, content, scriptKindName);
            };
            SessionClientHost.prototype.editScript = function (fileName, start, end, newText) {
                var changeArgs = this.client.createChangeFileRequestArgs(fileName, start, end, newText);
                _super.prototype.editScript.call(this, fileName, start, end, newText);
                this.client.changeFile(fileName, changeArgs);
            };
            return SessionClientHost;
        }(NativeLanguageServiceHost));
        var SessionServerHost = /** @class */ (function () {
            function SessionServerHost(host) {
                this.host = host;
                this.args = [];
                this.useCaseSensitiveFileNames = false;
                this.onMessage = ts.noop;
                this.writeMessage = ts.noop; // overridden
                this.writeFile = ts.noop;
                this.exit = ts.noop;
                this.close = ts.noop;
                this.newLine = this.host.getNewLine();
            }
            SessionServerHost.prototype.write = function (message) {
                this.writeMessage(message);
            };
            SessionServerHost.prototype.readFile = function (fileName) {
                if (ts.stringContains(fileName, Harness.Compiler.defaultLibFileName)) {
                    fileName = Harness.Compiler.defaultLibFileName;
                }
                // System FS would follow symlinks, even though snapshots are stored by original file name
                var snapshot = this.host.getScriptSnapshot(fileName) || this.host.getScriptSnapshot(this.realpath(fileName));
                return snapshot && ts.getSnapshotText(snapshot);
            };
            SessionServerHost.prototype.realpath = function (path) {
                return this.host.realpath(path);
            };
            SessionServerHost.prototype.resolvePath = function (path) {
                return path;
            };
            SessionServerHost.prototype.fileExists = function (path) {
                return this.host.fileExists(path);
            };
            SessionServerHost.prototype.directoryExists = function () {
                // for tests assume that directory exists
                return true;
            };
            SessionServerHost.prototype.getExecutingFilePath = function () {
                return "";
            };
            SessionServerHost.prototype.createDirectory = function (_directoryName) {
                return ts.notImplemented();
            };
            SessionServerHost.prototype.getCurrentDirectory = function () {
                return this.host.getCurrentDirectory();
            };
            SessionServerHost.prototype.getDirectories = function (path) {
                return this.host.getDirectories(path);
            };
            SessionServerHost.prototype.getEnvironmentVariable = function (name) {
                return ts.sys.getEnvironmentVariable(name);
            };
            SessionServerHost.prototype.readDirectory = function (path, extensions, exclude, include, depth) {
                return this.host.readDirectory(path, extensions, exclude, include, depth);
            };
            SessionServerHost.prototype.watchFile = function () {
                return { close: ts.noop };
            };
            SessionServerHost.prototype.watchDirectory = function () {
                return { close: ts.noop };
            };
            SessionServerHost.prototype.info = function (message) {
                this.host.log(message);
            };
            SessionServerHost.prototype.msg = function (message) {
                this.host.log(message);
            };
            SessionServerHost.prototype.loggingEnabled = function () {
                return true;
            };
            SessionServerHost.prototype.getLogFileName = function () {
                return undefined;
            };
            SessionServerHost.prototype.hasLevel = function () {
                return false;
            };
            SessionServerHost.prototype.startGroup = function () { throw ts.notImplemented(); };
            SessionServerHost.prototype.endGroup = function () { throw ts.notImplemented(); };
            SessionServerHost.prototype.perftrc = function (message) {
                return this.host.log(message);
            };
            SessionServerHost.prototype.setTimeout = function (callback, ms) {
                var args = [];
                for (var _i = 2; _i < arguments.length; _i++) {
                    args[_i - 2] = arguments[_i];
                }
                // eslint-disable-next-line no-restricted-globals
                return setTimeout.apply(void 0, __spreadArray([callback, ms], args, false));
            };
            SessionServerHost.prototype.clearTimeout = function (timeoutId) {
                // eslint-disable-next-line no-restricted-globals
                clearTimeout(timeoutId);
            };
            SessionServerHost.prototype.setImmediate = function (callback, _ms) {
                var args = [];
                for (var _i = 2; _i < arguments.length; _i++) {
                    args[_i - 2] = arguments[_i];
                }
                // eslint-disable-next-line no-restricted-globals
                return setImmediate(callback, args);
            };
            SessionServerHost.prototype.clearImmediate = function (timeoutId) {
                // eslint-disable-next-line no-restricted-globals
                clearImmediate(timeoutId);
            };
            SessionServerHost.prototype.createHash = function (s) {
                return Harness.mockHash(s);
            };
            SessionServerHost.prototype.require = function (_initialDir, _moduleName) {
                switch (_moduleName) {
                    // Adds to the Quick Info a fixed string and a string from the config file
                    // and replaces the first display part
                    case "quickinfo-augmeneter":
                        return {
                            module: function () { return ({
                                create: function (info) {
                                    var proxy = makeDefaultProxy(info);
                                    var langSvc = info.languageService;
                                    // eslint-disable-next-line local/only-arrow-functions
                                    proxy.getQuickInfoAtPosition = function () {
                                        var parts = langSvc.getQuickInfoAtPosition.apply(langSvc, arguments);
                                        if (parts.displayParts.length > 0) {
                                            parts.displayParts[0].text = "Proxied";
                                        }
                                        parts.displayParts.push({ text: info.config.message, kind: "punctuation" });
                                        return parts;
                                    };
                                    return proxy;
                                }
                            }); },
                            error: undefined
                        };
                    // Throws during initialization
                    case "create-thrower":
                        return {
                            module: function () { return ({
                                create: function () {
                                    throw new Error("I am not a well-behaved plugin");
                                }
                            }); },
                            error: undefined
                        };
                    // Adds another diagnostic
                    case "diagnostic-adder":
                        return {
                            module: function () { return ({
                                create: function (info) {
                                    var proxy = makeDefaultProxy(info);
                                    proxy.getSemanticDiagnostics = function (filename) {
                                        var prev = info.languageService.getSemanticDiagnostics(filename);
                                        var sourceFile = info.project.getSourceFile(ts.toPath(filename, /*basePath*/ undefined, ts.createGetCanonicalFileName(info.serverHost.useCaseSensitiveFileNames)));
                                        prev.push({
                                            category: ts.DiagnosticCategory.Warning,
                                            file: sourceFile,
                                            code: 9999,
                                            length: 3,
                                            messageText: "Plugin diagnostic",
                                            start: 0
                                        });
                                        return prev;
                                    };
                                    return proxy;
                                }
                            }); },
                            error: undefined
                        };
                    // Accepts configurations
                    case "configurable-diagnostic-adder":
                        var customMessage_1 = "default message";
                        return {
                            module: function () { return ({
                                create: function (info) {
                                    customMessage_1 = info.config.message;
                                    var proxy = makeDefaultProxy(info);
                                    proxy.getSemanticDiagnostics = function (filename) {
                                        var prev = info.languageService.getSemanticDiagnostics(filename);
                                        var sourceFile = info.project.getSourceFile(ts.toPath(filename, /*basePath*/ undefined, ts.createGetCanonicalFileName(info.serverHost.useCaseSensitiveFileNames)));
                                        prev.push({
                                            category: ts.DiagnosticCategory.Error,
                                            file: sourceFile,
                                            code: 9999,
                                            length: 3,
                                            messageText: customMessage_1,
                                            start: 0
                                        });
                                        return prev;
                                    };
                                    return proxy;
                                },
                                onConfigurationChanged: function (config) {
                                    customMessage_1 = config.message;
                                }
                            }); },
                            error: undefined
                        };
                    default:
                        return {
                            module: undefined,
                            error: new Error("Could not resolve module")
                        };
                }
            };
            return SessionServerHost;
        }());
        var FourslashSession = /** @class */ (function (_super) {
            __extends(FourslashSession, _super);
            function FourslashSession() {
                return _super !== null && _super.apply(this, arguments) || this;
            }
            FourslashSession.prototype.getText = function (fileName) {
                return ts.getSnapshotText(this.projectService.getDefaultProjectForFile(ts.server.toNormalizedPath(fileName), /*ensureProject*/ true).getScriptSnapshot(fileName));
            };
            return FourslashSession;
        }(ts.server.Session));
        var ServerLanguageServiceAdapter = /** @class */ (function () {
            function ServerLanguageServiceAdapter(cancellationToken, options) {
                // This is the main host that tests use to direct tests
                var clientHost = new SessionClientHost(cancellationToken, options);
                var client = new ts.server.SessionClient(clientHost);
                // This host is just a proxy for the clientHost, it uses the client
                // host to answer server queries about files on disk
                var serverHost = new SessionServerHost(clientHost);
                var opts = {
                    host: serverHost,
                    cancellationToken: ts.server.nullCancellationToken,
                    useSingleInferredProject: false,
                    useInferredProjectPerProjectRoot: false,
                    typingsInstaller: __assign(__assign({}, ts.server.nullTypingsInstaller), { globalTypingsCacheLocation: "/Library/Caches/typescript" }),
                    byteLength: Utils.byteLength,
                    hrtime: process.hrtime,
                    logger: serverHost,
                    canUseEvents: true
                };
                this.server = new FourslashSession(opts);
                // Fake the connection between the client and the server
                serverHost.writeMessage = client.onMessage.bind(client);
                clientHost.writeMessage = this.server.onMessage.bind(this.server);
                // Wire the client to the host to get notifications when a file is open
                // or edited.
                clientHost.setClient(client);
                // Set the properties
                this.client = client;
                this.host = clientHost;
            }
            ServerLanguageServiceAdapter.prototype.getHost = function () { return this.host; };
            ServerLanguageServiceAdapter.prototype.getLanguageService = function () { return this.client; };
            ServerLanguageServiceAdapter.prototype.getClassifier = function () { throw new Error("getClassifier is not available using the server interface."); };
            ServerLanguageServiceAdapter.prototype.getPreProcessedFileInfo = function () { throw new Error("getPreProcessedFileInfo is not available using the server interface."); };
            ServerLanguageServiceAdapter.prototype.assertTextConsistent = function (fileName) {
                var serverText = this.server.getText(fileName);
                var clientText = this.host.readFile(fileName);
                ts.Debug.assert(serverText === clientText, [
                    "Server and client text are inconsistent.",
                    "",
                    "\x1b[1mServer\x1b[0m\x1b[31m:",
                    serverText,
                    "",
                    "\x1b[1mClient\x1b[0m\x1b[31m:",
                    clientText,
                    "",
                    "This probably means something is wrong with the fourslash infrastructure, not with the test."
                ].join(ts.sys.newLine));
            };
            return ServerLanguageServiceAdapter;
        }());
        LanguageService.ServerLanguageServiceAdapter = ServerLanguageServiceAdapter;
    })(LanguageService = Harness.LanguageService || (Harness.LanguageService = {}));
})(Harness || (Harness = {}));
var ts;
(function (ts) {
    var TestFSWithWatch;
    (function (TestFSWithWatch) {
        TestFSWithWatch.libFile = {
            path: "/a/lib/lib.d.ts",
            content: "/// <reference no-default-lib=\"true\"/>\ninterface Boolean {}\ninterface Function {}\ninterface CallableFunction {}\ninterface NewableFunction {}\ninterface IArguments {}\ninterface Number { toExponential: any; }\ninterface Object {}\ninterface RegExp {}\ninterface String { charAt: any; }\ninterface Array<T> { length: number; [n: number]: T; }"
        };
        function getExecutingFilePathFromLibFile() {
            return ts.combinePaths(ts.getDirectoryPath(TestFSWithWatch.libFile.path), "tsc.js");
        }
        function createWatchedSystem(fileOrFolderList, params) {
            return new TestServerHost(fileOrFolderList, params);
        }
        TestFSWithWatch.createWatchedSystem = createWatchedSystem;
        function createServerHost(fileOrFolderList, params) {
            var host = new TestServerHost(fileOrFolderList, params);
            // Just like sys, patch the host to use writeFile
            ts.patchWriteFileEnsuringDirectory(host);
            return host;
        }
        TestFSWithWatch.createServerHost = createServerHost;
        function isFile(fileOrFolderOrSymLink) {
            return ts.isString(fileOrFolderOrSymLink.content);
        }
        TestFSWithWatch.isFile = isFile;
        function isSymLink(fileOrFolderOrSymLink) {
            return ts.isString(fileOrFolderOrSymLink.symLink);
        }
        TestFSWithWatch.isSymLink = isSymLink;
        function isFsFolder(s) {
            return !!s && ts.isArray(s.entries);
        }
        function isFsFile(s) {
            return !!s && ts.isString(s.content);
        }
        function isFsSymLink(s) {
            return !!s && ts.isString(s.symLink);
        }
        function invokeWatcherCallbacks(callbacks, invokeCallback) {
            if (callbacks) {
                // The array copy is made to ensure that even if one of the callback removes the callbacks,
                // we dont miss any callbacks following it
                var cbs = callbacks.slice();
                for (var _i = 0, cbs_1 = cbs; _i < cbs_1.length; _i++) {
                    var cb = cbs_1[_i];
                    invokeCallback(cb);
                }
            }
        }
        function createWatcher(map, path, callback) {
            map.add(path, callback);
            var closed = false;
            return {
                close: function () {
                    ts.Debug.assert(!closed);
                    map.remove(path, callback);
                    closed = true;
                }
            };
        }
        function getDiffInKeys(map, expectedKeys) {
            if (map.size === expectedKeys.length) {
                return "";
            }
            var notInActual = [];
            var duplicates = [];
            var seen = new ts.Map();
            ts.forEach(expectedKeys, function (expectedKey) {
                if (seen.has(expectedKey)) {
                    duplicates.push(expectedKey);
                    return;
                }
                seen.set(expectedKey, true);
                if (!map.has(expectedKey)) {
                    notInActual.push(expectedKey);
                }
            });
            var inActualNotExpected = [];
            map.forEach(function (_value, key) {
                if (!seen.has(key)) {
                    inActualNotExpected.push(key);
                }
                seen.set(key, true);
            });
            return "\n\nNotInActual: ".concat(notInActual, "\nDuplicates: ").concat(duplicates, "\nInActualButNotInExpected: ").concat(inActualNotExpected);
        }
        TestFSWithWatch.getDiffInKeys = getDiffInKeys;
        function verifyMapSize(caption, map, expectedKeys) {
            assert.equal(map.size, expectedKeys.length, "".concat(caption, ": incorrect size of map: Actual keys: ").concat(ts.arrayFrom(map.keys()), " Expected: ").concat(expectedKeys).concat(getDiffInKeys(map, expectedKeys)));
        }
        TestFSWithWatch.verifyMapSize = verifyMapSize;
        function checkMap(caption, actual, expectedKeysMapOrArray, eachKeyCountOrValueTester, valueTester) {
            var expectedKeys = ts.isArray(expectedKeysMapOrArray) ? ts.arrayToMap(expectedKeysMapOrArray, function (s) { return s; }, function () { return eachKeyCountOrValueTester; }) : expectedKeysMapOrArray;
            verifyMapSize(caption, actual, ts.isArray(expectedKeysMapOrArray) ? expectedKeysMapOrArray : ts.arrayFrom(expectedKeys.keys()));
            if (!ts.isNumber(eachKeyCountOrValueTester)) {
                valueTester = eachKeyCountOrValueTester;
            }
            var _a = valueTester || [undefined, undefined], expectedValues = _a[0], valueMapper = _a[1];
            expectedKeys.forEach(function (count, name) {
                assert.isTrue(actual.has(name), "".concat(caption, ": expected to contain ").concat(name, ", actual keys: ").concat(ts.arrayFrom(actual.keys())));
                // Check key information only if eachKeyCount is provided
                if (!ts.isArray(expectedKeysMapOrArray) || eachKeyCountOrValueTester !== undefined) {
                    assert.equal(actual.get(name).length, count, "".concat(caption, ": Expected to be have ").concat(count, " entries for ").concat(name, ". Actual entry: ").concat(JSON.stringify(actual.get(name))));
                    if (expectedValues) {
                        assert.deepEqual(actual.get(name).map(valueMapper), expectedValues.get(name), "".concat(caption, ":: expected values mismatch for ").concat(name));
                    }
                }
            });
        }
        TestFSWithWatch.checkMap = checkMap;
        function checkArray(caption, actual, expected) {
            checkMap(caption, ts.arrayToMap(actual, ts.identity), expected, /*eachKeyCount*/ undefined);
        }
        TestFSWithWatch.checkArray = checkArray;
        function checkOutputContains(host, expected) {
            var mapExpected = new ts.Set(expected);
            var mapSeen = new ts.Set();
            for (var _i = 0, _a = host.getOutput(); _i < _a.length; _i++) {
                var f = _a[_i];
                assert.isFalse(mapSeen.has(f), "Already found ".concat(f, " in ").concat(JSON.stringify(host.getOutput())));
                if (mapExpected.has(f)) {
                    mapExpected.delete(f);
                    mapSeen.add(f);
                }
            }
            assert.equal(mapExpected.size, 0, "Output has missing ".concat(JSON.stringify(ts.arrayFrom(mapExpected.keys())), " in ").concat(JSON.stringify(host.getOutput())));
        }
        TestFSWithWatch.checkOutputContains = checkOutputContains;
        function checkOutputDoesNotContain(host, expectedToBeAbsent) {
            var mapExpectedToBeAbsent = new ts.Set(expectedToBeAbsent);
            for (var _i = 0, _a = host.getOutput(); _i < _a.length; _i++) {
                var f = _a[_i];
                assert.isFalse(mapExpectedToBeAbsent.has(f), "Contains ".concat(f, " in ").concat(JSON.stringify(host.getOutput())));
            }
        }
        TestFSWithWatch.checkOutputDoesNotContain = checkOutputDoesNotContain;
        var Callbacks = /** @class */ (function () {
            function Callbacks(host) {
                this.host = host;
                this.map = [];
                this.nextId = 1;
            }
            Callbacks.prototype.getNextId = function () {
                return this.nextId;
            };
            Callbacks.prototype.register = function (cb, args, ms) {
                var timeoutId = this.nextId;
                this.nextId++;
                this.map[timeoutId] = { cb: cb, args: args, ms: ms, time: this.host.getTime() };
                return timeoutId;
            };
            Callbacks.prototype.unregister = function (id) {
                if (typeof id === "number") {
                    delete this.map[id];
                }
            };
            Callbacks.prototype.count = function () {
                var n = 0;
                for (var _ in this.map) {
                    n++;
                }
                return n;
            };
            Callbacks.prototype.invokeCallback = function (_a) {
                var cb = _a.cb, args = _a.args, ms = _a.ms, time = _a.time;
                if (ms !== undefined) {
                    var newTime = ms + time;
                    if (this.host.getTime() < newTime) {
                        this.host.setTime(newTime);
                    }
                }
                cb.apply(void 0, args);
            };
            Callbacks.prototype.invoke = function (invokeKey) {
                if (invokeKey) {
                    this.invokeCallback(this.map[invokeKey]);
                    delete this.map[invokeKey];
                    return;
                }
                // Note: invoking a callback may result in new callbacks been queued,
                // so do not clear the entire callback list regardless. Only remove the
                // ones we have invoked.
                for (var key in this.map) {
                    this.invokeCallback(this.map[key]);
                    delete this.map[key];
                }
            };
            return Callbacks;
        }());
        var Tsc_WatchFile;
        (function (Tsc_WatchFile) {
            Tsc_WatchFile["DynamicPolling"] = "DynamicPriorityPolling";
        })(Tsc_WatchFile = TestFSWithWatch.Tsc_WatchFile || (TestFSWithWatch.Tsc_WatchFile = {}));
        var Tsc_WatchDirectory;
        (function (Tsc_WatchDirectory) {
            Tsc_WatchDirectory["WatchFile"] = "RecursiveDirectoryUsingFsWatchFile";
            Tsc_WatchDirectory["NonRecursiveWatchDirectory"] = "RecursiveDirectoryUsingNonRecursiveWatchDirectory";
            Tsc_WatchDirectory["DynamicPolling"] = "RecursiveDirectoryUsingDynamicPriorityPolling";
        })(Tsc_WatchDirectory = TestFSWithWatch.Tsc_WatchDirectory || (TestFSWithWatch.Tsc_WatchDirectory = {}));
        TestFSWithWatch.timeIncrements = 1000;
        var TestServerHost = /** @class */ (function () {
            function TestServerHost(fileOrFolderorSymLinkList, _a) {
                var _b = _a === void 0 ? {} : _a, useCaseSensitiveFileNames = _b.useCaseSensitiveFileNames, executingFilePath = _b.executingFilePath, currentDirectory = _b.currentDirectory, newLine = _b.newLine, windowsStyleRoot = _b.windowsStyleRoot, environmentVariables = _b.environmentVariables, runWithoutRecursiveWatches = _b.runWithoutRecursiveWatches, runWithFallbackPolling = _b.runWithFallbackPolling, inodeWatching = _b.inodeWatching;
                var _this = this;
                this.args = [];
                this.output = [];
                this.fs = new ts.Map();
                this.time = TestFSWithWatch.timeIncrements;
                this.timeoutCallbacks = new Callbacks(this);
                this.immediateCallbacks = new Callbacks(this);
                this.screenClears = [];
                this.watchedFiles = ts.createMultiMap();
                this.fsWatches = ts.createMultiMap();
                this.fsWatchesRecursive = ts.createMultiMap();
                this.storeFilesChangingSignatureDuringEmit = true;
                this.nextInode = 0;
                this.exitMessage = "System Exit";
                this.resolvePath = function (s) { return s; };
                this.getExecutingFilePath = function () { return _this.executingFilePath; };
                this.getCurrentDirectory = function () { return _this.currentDirectory; };
                this.useCaseSensitiveFileNames = !!useCaseSensitiveFileNames;
                this.newLine = newLine || "\n";
                this.windowsStyleRoot = windowsStyleRoot;
                this.environmentVariables = environmentVariables;
                currentDirectory = currentDirectory || "/";
                this.getCanonicalFileName = ts.createGetCanonicalFileName(!!useCaseSensitiveFileNames);
                this.toPath = function (s) { return ts.toPath(s, currentDirectory, _this.getCanonicalFileName); };
                this.executingFilePath = this.getHostSpecificPath(executingFilePath || getExecutingFilePathFromLibFile());
                this.currentDirectory = this.getHostSpecificPath(currentDirectory);
                this.runWithFallbackPolling = !!runWithFallbackPolling;
                var tscWatchFile = this.environmentVariables && this.environmentVariables.get("TSC_WATCHFILE");
                var tscWatchDirectory = this.environmentVariables && this.environmentVariables.get("TSC_WATCHDIRECTORY");
                if (inodeWatching) {
                    this.inodeWatching = true;
                    this.inodes = new ts.Map();
                }
                var _c = ts.createSystemWatchFunctions({
                    // We dont have polling watch file
                    // it is essentially fsWatch but lets get that separate from fsWatch and
                    // into watchedFiles for easier testing
                    pollingWatchFileWorker: this.watchFileWorker.bind(this),
                    getModifiedTime: this.getModifiedTime.bind(this),
                    setTimeout: this.setTimeout.bind(this),
                    clearTimeout: this.clearTimeout.bind(this),
                    fsWatchWorker: this.fsWatchWorker.bind(this),
                    fileSystemEntryExists: this.fileSystemEntryExists.bind(this),
                    useCaseSensitiveFileNames: this.useCaseSensitiveFileNames,
                    getCurrentDirectory: this.getCurrentDirectory.bind(this),
                    fsSupportsRecursiveFsWatch: tscWatchDirectory ? false : !runWithoutRecursiveWatches,
                    getAccessibleSortedChildDirectories: function (path) { return _this.getDirectories(path); },
                    realpath: this.realpath.bind(this),
                    tscWatchFile: tscWatchFile,
                    tscWatchDirectory: tscWatchDirectory,
                    inodeWatching: !!this.inodeWatching,
                    sysLog: function (s) { return _this.write(s + _this.newLine); },
                }), watchFile = _c.watchFile, watchDirectory = _c.watchDirectory;
                this.watchFile = watchFile;
                this.watchDirectory = watchDirectory;
                this.reloadFS(fileOrFolderorSymLinkList);
            }
            TestServerHost.prototype.setInode = function (path) {
                if (this.inodes)
                    this.inodes.set(path, this.nextInode++);
            };
            // Output is pretty
            TestServerHost.prototype.writeOutputIsTTY = function () {
                return true;
            };
            TestServerHost.prototype.getNewLine = function () {
                return this.newLine;
            };
            TestServerHost.prototype.toNormalizedAbsolutePath = function (s) {
                return ts.getNormalizedAbsolutePath(s, this.currentDirectory);
            };
            TestServerHost.prototype.toFullPath = function (s) {
                return this.toPath(this.toNormalizedAbsolutePath(s));
            };
            TestServerHost.prototype.getHostSpecificPath = function (s) {
                if (this.windowsStyleRoot && s.startsWith(ts.directorySeparator)) {
                    return this.windowsStyleRoot + s.substring(1);
                }
                return s;
            };
            TestServerHost.prototype.now = function () {
                this.time += TestFSWithWatch.timeIncrements;
                return new Date(this.time);
            };
            TestServerHost.prototype.getTime = function () {
                return this.time;
            };
            TestServerHost.prototype.setTime = function (time) {
                this.time = time;
            };
            TestServerHost.prototype.reloadFS = function (fileOrFolderOrSymLinkList) {
                var _this = this;
                ts.Debug.assert(this.fs.size === 0);
                if (ts.isArray(fileOrFolderOrSymLinkList)) {
                    fileOrFolderOrSymLinkList.forEach(function (f) { return _this.ensureFileOrFolder(!_this.windowsStyleRoot ?
                        f : __assign(__assign({}, f), { path: _this.getHostSpecificPath(f.path) })); });
                }
                else {
                    for (var key in fileOrFolderOrSymLinkList) {
                        if (ts.hasProperty(fileOrFolderOrSymLinkList, key)) {
                            var path = this.getHostSpecificPath(key);
                            var value = fileOrFolderOrSymLinkList[key];
                            if (ts.isString(value)) {
                                this.ensureFileOrFolder({ path: path, content: value });
                            }
                            else {
                                this.ensureFileOrFolder(__assign({ path: path }, value));
                            }
                        }
                    }
                }
            };
            TestServerHost.prototype.modifyFile = function (filePath, content, options) {
                var path = this.toFullPath(filePath);
                var currentEntry = this.fs.get(path);
                if (!currentEntry || !isFsFile(currentEntry)) {
                    throw new Error("file not present: ".concat(filePath));
                }
                if (options && options.invokeFileDeleteCreateAsPartInsteadOfChange) {
                    this.removeFileOrFolder(currentEntry, /*isRenaming*/ false, options);
                    this.ensureFileOrFolder({ path: filePath, content: content }, /*ignoreWatchInvokedWithTriggerAsFileCreate*/ undefined, /*ignoreParentWatch*/ undefined, options);
                }
                else {
                    currentEntry.content = content;
                    currentEntry.modifiedTime = this.now();
                    this.fs.get(ts.getDirectoryPath(currentEntry.path)).modifiedTime = this.now();
                    if (options && options.invokeDirectoryWatcherInsteadOfFileChanged) {
                        var directoryFullPath = ts.getDirectoryPath(currentEntry.fullPath);
                        this.invokeFileWatcher(directoryFullPath, ts.FileWatcherEventKind.Changed, currentEntry.modifiedTime);
                        this.invokeFsWatchesCallbacks(directoryFullPath, "rename", currentEntry.modifiedTime, currentEntry.fullPath, options.useTildeAsSuffixInRenameEventFileName);
                        this.invokeRecursiveFsWatches(directoryFullPath, "rename", currentEntry.modifiedTime, currentEntry.fullPath, options.useTildeAsSuffixInRenameEventFileName);
                    }
                    else {
                        this.invokeFileAndFsWatches(currentEntry.fullPath, ts.FileWatcherEventKind.Changed, currentEntry.modifiedTime, options === null || options === void 0 ? void 0 : options.useTildeAsSuffixInRenameEventFileName);
                    }
                }
            };
            TestServerHost.prototype.renameFile = function (fileName, newFileName) {
                var fullPath = ts.getNormalizedAbsolutePath(fileName, this.currentDirectory);
                var path = this.toPath(fullPath);
                var file = this.fs.get(path);
                ts.Debug.assert(!!file);
                // Only remove the file
                this.removeFileOrFolder(file, /*isRenaming*/ true);
                // Add updated folder with new folder name
                var newFullPath = ts.getNormalizedAbsolutePath(newFileName, this.currentDirectory);
                var newFile = this.toFsFile({ path: newFullPath, content: file.content });
                var newPath = newFile.path;
                var basePath = ts.getDirectoryPath(path);
                ts.Debug.assert(basePath !== path);
                ts.Debug.assert(basePath === ts.getDirectoryPath(newPath));
                var baseFolder = this.fs.get(basePath);
                this.addFileOrFolderInFolder(baseFolder, newFile);
            };
            TestServerHost.prototype.renameFolder = function (folderName, newFolderName) {
                var fullPath = ts.getNormalizedAbsolutePath(folderName, this.currentDirectory);
                var path = this.toPath(fullPath);
                var folder = this.fs.get(path);
                ts.Debug.assert(!!folder);
                // Only remove the folder
                this.removeFileOrFolder(folder, /*isRenaming*/ true);
                // Add updated folder with new folder name
                var newFullPath = ts.getNormalizedAbsolutePath(newFolderName, this.currentDirectory);
                var newFolder = this.toFsFolder(newFullPath);
                var newPath = newFolder.path;
                var basePath = ts.getDirectoryPath(path);
                ts.Debug.assert(basePath !== path);
                ts.Debug.assert(basePath === ts.getDirectoryPath(newPath));
                var baseFolder = this.fs.get(basePath);
                this.addFileOrFolderInFolder(baseFolder, newFolder);
                // Invoke watches for files in the folder as deleted (from old path)
                this.renameFolderEntries(folder, newFolder);
            };
            TestServerHost.prototype.renameFolderEntries = function (oldFolder, newFolder) {
                for (var _i = 0, _a = oldFolder.entries; _i < _a.length; _i++) {
                    var entry = _a[_i];
                    this.fs.delete(entry.path);
                    this.invokeFileAndFsWatches(entry.fullPath, ts.FileWatcherEventKind.Deleted);
                    entry.fullPath = ts.combinePaths(newFolder.fullPath, ts.getBaseFileName(entry.fullPath));
                    entry.path = this.toPath(entry.fullPath);
                    if (newFolder !== oldFolder) {
                        newFolder.entries.push(entry);
                    }
                    this.fs.set(entry.path, entry);
                    this.setInode(entry.path);
                    this.invokeFileAndFsWatches(entry.fullPath, ts.FileWatcherEventKind.Created);
                    if (isFsFolder(entry)) {
                        this.renameFolderEntries(entry, entry);
                    }
                }
            };
            TestServerHost.prototype.ensureFileOrFolder = function (fileOrDirectoryOrSymLink, ignoreWatchInvokedWithTriggerAsFileCreate, ignoreParentWatch, options) {
                if (isFile(fileOrDirectoryOrSymLink)) {
                    var file = this.toFsFile(fileOrDirectoryOrSymLink);
                    // file may already exist when updating existing type declaration file
                    if (!this.fs.get(file.path)) {
                        var baseFolder = this.ensureFolder(ts.getDirectoryPath(file.fullPath), ignoreParentWatch, options);
                        this.addFileOrFolderInFolder(baseFolder, file, ignoreWatchInvokedWithTriggerAsFileCreate, options);
                    }
                }
                else if (isSymLink(fileOrDirectoryOrSymLink)) {
                    var symLink = this.toFsSymLink(fileOrDirectoryOrSymLink);
                    ts.Debug.assert(!this.fs.get(symLink.path));
                    var baseFolder = this.ensureFolder(ts.getDirectoryPath(symLink.fullPath), ignoreParentWatch, options);
                    this.addFileOrFolderInFolder(baseFolder, symLink, ignoreWatchInvokedWithTriggerAsFileCreate, options);
                }
                else {
                    var fullPath = ts.getNormalizedAbsolutePath(fileOrDirectoryOrSymLink.path, this.currentDirectory);
                    this.ensureFolder(ts.getDirectoryPath(fullPath), ignoreParentWatch, options);
                    this.ensureFolder(fullPath, ignoreWatchInvokedWithTriggerAsFileCreate, options);
                }
            };
            TestServerHost.prototype.ensureFolder = function (fullPath, ignoreWatch, options) {
                var path = this.toPath(fullPath);
                var folder = this.fs.get(path);
                if (!folder) {
                    folder = this.toFsFolder(fullPath);
                    var baseFullPath = ts.getDirectoryPath(fullPath);
                    if (fullPath !== baseFullPath) {
                        // Add folder in the base folder
                        var baseFolder = this.ensureFolder(baseFullPath, ignoreWatch, options);
                        this.addFileOrFolderInFolder(baseFolder, folder, ignoreWatch, options);
                    }
                    else {
                        // root folder
                        ts.Debug.assert(this.fs.size === 0 || !!this.windowsStyleRoot);
                        this.fs.set(path, folder);
                        this.setInode(path);
                    }
                }
                ts.Debug.assert(isFsFolder(folder));
                return folder;
            };
            TestServerHost.prototype.addFileOrFolderInFolder = function (folder, fileOrDirectory, ignoreWatch, options) {
                if (!this.fs.has(fileOrDirectory.path)) {
                    ts.insertSorted(folder.entries, fileOrDirectory, function (a, b) { return ts.compareStringsCaseSensitive(ts.getBaseFileName(a.path), ts.getBaseFileName(b.path)); });
                }
                folder.modifiedTime = this.now();
                this.fs.set(fileOrDirectory.path, fileOrDirectory);
                this.setInode(fileOrDirectory.path);
                if (ignoreWatch) {
                    return;
                }
                var inodeWatching = this.inodeWatching;
                if (options === null || options === void 0 ? void 0 : options.skipInodeCheckOnCreate)
                    this.inodeWatching = false;
                this.invokeFileAndFsWatches(fileOrDirectory.fullPath, ts.FileWatcherEventKind.Created, fileOrDirectory.modifiedTime, options === null || options === void 0 ? void 0 : options.useTildeAsSuffixInRenameEventFileName);
                this.invokeFileAndFsWatches(folder.fullPath, ts.FileWatcherEventKind.Changed, fileOrDirectory.modifiedTime, options === null || options === void 0 ? void 0 : options.useTildeAsSuffixInRenameEventFileName);
                this.inodeWatching = inodeWatching;
            };
            TestServerHost.prototype.removeFileOrFolder = function (fileOrDirectory, isRenaming, options) {
                var _a;
                var basePath = ts.getDirectoryPath(fileOrDirectory.path);
                var baseFolder = this.fs.get(basePath);
                if (basePath !== fileOrDirectory.path) {
                    ts.Debug.assert(!!baseFolder);
                    baseFolder.modifiedTime = this.now();
                    ts.filterMutate(baseFolder.entries, function (entry) { return entry !== fileOrDirectory; });
                }
                this.fs.delete(fileOrDirectory.path);
                if (isFsFolder(fileOrDirectory)) {
                    ts.Debug.assert(fileOrDirectory.entries.length === 0 || isRenaming);
                }
                if (!(options === null || options === void 0 ? void 0 : options.ignoreDelete))
                    this.invokeFileAndFsWatches(fileOrDirectory.fullPath, ts.FileWatcherEventKind.Deleted, /*modifiedTime*/ undefined, options === null || options === void 0 ? void 0 : options.useTildeAsSuffixInRenameEventFileName);
                (_a = this.inodes) === null || _a === void 0 ? void 0 : _a.delete(fileOrDirectory.path);
                if (!(options === null || options === void 0 ? void 0 : options.ignoreDelete))
                    this.invokeFileAndFsWatches(baseFolder.fullPath, ts.FileWatcherEventKind.Changed, baseFolder.modifiedTime, options === null || options === void 0 ? void 0 : options.useTildeAsSuffixInRenameEventFileName);
            };
            TestServerHost.prototype.deleteFile = function (filePath) {
                var path = this.toFullPath(filePath);
                var currentEntry = this.fs.get(path);
                ts.Debug.assert(isFsFile(currentEntry));
                this.removeFileOrFolder(currentEntry);
            };
            TestServerHost.prototype.deleteFolder = function (folderPath, recursive) {
                var _this = this;
                var path = this.toFullPath(folderPath);
                var currentEntry = this.fs.get(path);
                ts.Debug.assert(isFsFolder(currentEntry));
                if (recursive && currentEntry.entries.length) {
                    var subEntries = currentEntry.entries.slice();
                    subEntries.forEach(function (fsEntry) {
                        if (isFsFolder(fsEntry)) {
                            _this.deleteFolder(fsEntry.fullPath, recursive);
                        }
                        else {
                            _this.removeFileOrFolder(fsEntry);
                        }
                    });
                }
                this.removeFileOrFolder(currentEntry);
            };
            TestServerHost.prototype.watchFileWorker = function (fileName, cb, pollingInterval) {
                return createWatcher(this.watchedFiles, this.toFullPath(fileName), { cb: cb, pollingInterval: pollingInterval });
            };
            TestServerHost.prototype.fsWatchWorker = function (fileOrDirectory, recursive, cb) {
                var _a, _b;
                if (this.runWithFallbackPolling)
                    throw new Error("Need to use fallback polling instead of file system native watching");
                var path = this.toFullPath(fileOrDirectory);
                // Error if the path does not exist
                if (this.inodeWatching && !((_a = this.inodes) === null || _a === void 0 ? void 0 : _a.has(path)))
                    throw new Error();
                var result = createWatcher(recursive ? this.fsWatchesRecursive : this.fsWatches, path, {
                    cb: cb,
                    inode: (_b = this.inodes) === null || _b === void 0 ? void 0 : _b.get(path)
                });
                result.on = ts.noop;
                return result;
            };
            TestServerHost.prototype.invokeFileWatcher = function (fileFullPath, eventKind, modifiedTime) {
                invokeWatcherCallbacks(this.watchedFiles.get(this.toPath(fileFullPath)), function (_a) {
                    var cb = _a.cb;
                    return cb(fileFullPath, eventKind, modifiedTime);
                });
            };
            TestServerHost.prototype.fsWatchCallback = function (map, fullPath, eventName, modifiedTime, entryFullPath, useTildeSuffix) {
                var _this = this;
                var _a;
                var path = this.toPath(fullPath);
                var currentInode = (_a = this.inodes) === null || _a === void 0 ? void 0 : _a.get(path);
                invokeWatcherCallbacks(map.get(path), function (_a) {
                    var cb = _a.cb, inode = _a.inode;
                    // TODO::
                    if (_this.inodeWatching && inode !== undefined && inode !== currentInode)
                        return;
                    var relativeFileName = (entryFullPath ? _this.getRelativePathToDirectory(fullPath, entryFullPath) : "");
                    if (useTildeSuffix)
                        relativeFileName = (relativeFileName ? relativeFileName : ts.getBaseFileName(fullPath)) + "~";
                    cb(eventName, relativeFileName, modifiedTime);
                });
            };
            TestServerHost.prototype.invokeFsWatchesCallbacks = function (fullPath, eventName, modifiedTime, entryFullPath, useTildeSuffix) {
                this.fsWatchCallback(this.fsWatches, fullPath, eventName, modifiedTime, entryFullPath, useTildeSuffix);
            };
            TestServerHost.prototype.invokeFsWatchesRecursiveCallbacks = function (fullPath, eventName, modifiedTime, entryFullPath, useTildeSuffix) {
                this.fsWatchCallback(this.fsWatchesRecursive, fullPath, eventName, modifiedTime, entryFullPath, useTildeSuffix);
            };
            TestServerHost.prototype.getRelativePathToDirectory = function (directoryFullPath, fileFullPath) {
                return ts.getRelativePathToDirectoryOrUrl(directoryFullPath, fileFullPath, this.currentDirectory, this.getCanonicalFileName, /*isAbsolutePathAnUrl*/ false);
            };
            TestServerHost.prototype.invokeRecursiveFsWatches = function (fullPath, eventName, modifiedTime, entryFullPath, useTildeSuffix) {
                this.invokeFsWatchesRecursiveCallbacks(fullPath, eventName, modifiedTime, entryFullPath, useTildeSuffix);
                var basePath = ts.getDirectoryPath(fullPath);
                if (this.getCanonicalFileName(fullPath) !== this.getCanonicalFileName(basePath)) {
                    this.invokeRecursiveFsWatches(basePath, eventName, modifiedTime, entryFullPath || fullPath, useTildeSuffix);
                }
            };
            TestServerHost.prototype.invokeFsWatches = function (fullPath, eventName, modifiedTime, useTildeSuffix) {
                this.invokeFsWatchesCallbacks(fullPath, eventName, modifiedTime, fullPath, useTildeSuffix);
                this.invokeFsWatchesCallbacks(ts.getDirectoryPath(fullPath), eventName, modifiedTime, fullPath, useTildeSuffix);
                this.invokeRecursiveFsWatches(fullPath, eventName, modifiedTime, /*entryFullPath*/ undefined, useTildeSuffix);
            };
            TestServerHost.prototype.invokeFileAndFsWatches = function (fileOrFolderFullPath, eventKind, modifiedTime, useTildeSuffix) {
                this.invokeFileWatcher(fileOrFolderFullPath, eventKind, modifiedTime);
                this.invokeFsWatches(fileOrFolderFullPath, eventKind === ts.FileWatcherEventKind.Changed ? "change" : "rename", modifiedTime, useTildeSuffix);
            };
            TestServerHost.prototype.toFsEntry = function (path) {
                var fullPath = ts.getNormalizedAbsolutePath(path, this.currentDirectory);
                return {
                    path: this.toPath(fullPath),
                    fullPath: fullPath,
                    modifiedTime: this.now()
                };
            };
            TestServerHost.prototype.toFsFile = function (file) {
                var fsFile = this.toFsEntry(file.path);
                fsFile.content = file.content;
                fsFile.fileSize = file.fileSize;
                return fsFile;
            };
            TestServerHost.prototype.toFsSymLink = function (symLink) {
                var fsSymLink = this.toFsEntry(symLink.path);
                fsSymLink.symLink = ts.getNormalizedAbsolutePath(symLink.symLink, ts.getDirectoryPath(fsSymLink.fullPath));
                return fsSymLink;
            };
            TestServerHost.prototype.toFsFolder = function (path) {
                var fsFolder = this.toFsEntry(path);
                fsFolder.entries = []; // https://github.com/Microsoft/TypeScript/issues/19873
                return fsFolder;
            };
            TestServerHost.prototype.getRealFsEntry = function (isFsEntry, path, fsEntry) {
                if (fsEntry === void 0) { fsEntry = this.fs.get(path); }
                if (isFsEntry(fsEntry)) {
                    return fsEntry;
                }
                if (isFsSymLink(fsEntry)) {
                    return this.getRealFsEntry(isFsEntry, this.toPath(fsEntry.symLink));
                }
                if (fsEntry) {
                    // This fs entry is something else
                    return undefined;
                }
                var realpath = this.toPath(this.realpath(path));
                if (path !== realpath) {
                    return this.getRealFsEntry(isFsEntry, realpath);
                }
                return undefined;
            };
            TestServerHost.prototype.isFsFile = function (fsEntry) {
                return !!this.getRealFile(fsEntry.path, fsEntry);
            };
            TestServerHost.prototype.getRealFile = function (path, fsEntry) {
                return this.getRealFsEntry(isFsFile, path, fsEntry);
            };
            TestServerHost.prototype.isFsFolder = function (fsEntry) {
                return !!this.getRealFolder(fsEntry.path, fsEntry);
            };
            TestServerHost.prototype.getRealFolder = function (path, fsEntry) {
                if (fsEntry === void 0) { fsEntry = this.fs.get(path); }
                return this.getRealFsEntry(isFsFolder, path, fsEntry);
            };
            TestServerHost.prototype.fileSystemEntryExists = function (s, entryKind) {
                return entryKind === 0 /* FileSystemEntryKind.File */ ? this.fileExists(s) : this.directoryExists(s);
            };
            TestServerHost.prototype.fileExists = function (s) {
                var path = this.toFullPath(s);
                return !!this.getRealFile(path);
            };
            TestServerHost.prototype.getModifiedTime = function (s) {
                var path = this.toFullPath(s);
                var fsEntry = this.fs.get(path);
                return (fsEntry && fsEntry.modifiedTime); // TODO: GH#18217
            };
            TestServerHost.prototype.setModifiedTime = function (s, date) {
                var path = this.toFullPath(s);
                var fsEntry = this.fs.get(path);
                if (fsEntry) {
                    fsEntry.modifiedTime = date;
                    this.invokeFileAndFsWatches(fsEntry.fullPath, ts.FileWatcherEventKind.Changed, fsEntry.modifiedTime);
                }
            };
            TestServerHost.prototype.readFile = function (s) {
                var fsEntry = this.getRealFile(this.toFullPath(s));
                return fsEntry ? fsEntry.content : undefined;
            };
            TestServerHost.prototype.getFileSize = function (s) {
                var path = this.toFullPath(s);
                var entry = this.fs.get(path);
                if (isFsFile(entry)) {
                    return entry.fileSize ? entry.fileSize : entry.content.length;
                }
                return undefined; // TODO: GH#18217
            };
            TestServerHost.prototype.directoryExists = function (s) {
                var path = this.toFullPath(s);
                return !!this.getRealFolder(path);
            };
            TestServerHost.prototype.getDirectories = function (s) {
                var _this = this;
                var path = this.toFullPath(s);
                var folder = this.getRealFolder(path);
                if (folder) {
                    return ts.mapDefined(folder.entries, function (entry) { return _this.isFsFolder(entry) ? ts.getBaseFileName(entry.fullPath) : undefined; });
                }
                ts.Debug.fail(folder ? "getDirectories called on file" : "getDirectories called on missing folder");
                return [];
            };
            TestServerHost.prototype.readDirectory = function (path, extensions, exclude, include, depth) {
                var _this = this;
                return ts.matchFiles(path, extensions, exclude, include, this.useCaseSensitiveFileNames, this.getCurrentDirectory(), depth, function (dir) {
                    var directories = [];
                    var files = [];
                    var folder = _this.getRealFolder(_this.toPath(dir));
                    if (folder) {
                        folder.entries.forEach(function (entry) {
                            if (_this.isFsFolder(entry)) {
                                directories.push(ts.getBaseFileName(entry.fullPath));
                            }
                            else if (_this.isFsFile(entry)) {
                                files.push(ts.getBaseFileName(entry.fullPath));
                            }
                            else {
                                ts.Debug.fail("Unknown entry");
                            }
                        });
                    }
                    return { directories: directories, files: files };
                }, function (path) { return _this.realpath(path); });
            };
            TestServerHost.prototype.createHash = function (s) {
                return "".concat(ts.generateDjb2Hash(s), "-").concat(s);
            };
            TestServerHost.prototype.createSHA256Hash = function (s) {
                return ts.sys.createSHA256Hash(s);
            };
            // TOOD: record and invoke callbacks to simulate timer events
            TestServerHost.prototype.setTimeout = function (callback, ms) {
                var args = [];
                for (var _i = 2; _i < arguments.length; _i++) {
                    args[_i - 2] = arguments[_i];
                }
                return this.timeoutCallbacks.register(callback, args, ms);
            };
            TestServerHost.prototype.getNextTimeoutId = function () {
                return this.timeoutCallbacks.getNextId();
            };
            TestServerHost.prototype.clearTimeout = function (timeoutId) {
                this.timeoutCallbacks.unregister(timeoutId);
            };
            TestServerHost.prototype.clearScreen = function () {
                this.screenClears.push(this.output.length);
            };
            TestServerHost.prototype.checkTimeoutQueueLengthAndRun = function (expected) {
                this.checkTimeoutQueueLength(expected);
                this.runQueuedTimeoutCallbacks();
            };
            TestServerHost.prototype.checkTimeoutQueueLength = function (expected) {
                var callbacksCount = this.timeoutCallbacks.count();
                assert.equal(callbacksCount, expected, "expected ".concat(expected, " timeout callbacks queued but found ").concat(callbacksCount, "."));
            };
            TestServerHost.prototype.runQueuedTimeoutCallbacks = function (timeoutId) {
                try {
                    this.timeoutCallbacks.invoke(timeoutId);
                }
                catch (e) {
                    if (e.message === this.exitMessage) {
                        return;
                    }
                    throw e;
                }
            };
            TestServerHost.prototype.runQueuedImmediateCallbacks = function (checkCount) {
                if (checkCount !== undefined) {
                    assert.equal(this.immediateCallbacks.count(), checkCount);
                }
                this.immediateCallbacks.invoke();
            };
            TestServerHost.prototype.setImmediate = function (callback) {
                var args = [];
                for (var _i = 1; _i < arguments.length; _i++) {
                    args[_i - 1] = arguments[_i];
                }
                return this.immediateCallbacks.register(callback, args);
            };
            TestServerHost.prototype.clearImmediate = function (timeoutId) {
                this.immediateCallbacks.unregister(timeoutId);
            };
            TestServerHost.prototype.createDirectory = function (directoryName) {
                var folder = this.toFsFolder(directoryName);
                // base folder has to be present
                var base = ts.getDirectoryPath(folder.path);
                var baseFolder = this.fs.get(base);
                ts.Debug.assert(isFsFolder(baseFolder));
                ts.Debug.assert(!this.fs.get(folder.path));
                this.addFileOrFolderInFolder(baseFolder, folder);
            };
            TestServerHost.prototype.writeFile = function (path, content) {
                var file = this.toFsFile({ path: path, content: content });
                // base folder has to be present
                var base = ts.getDirectoryPath(file.path);
                var folder = ts.Debug.checkDefined(this.getRealFolder(base));
                if (folder.path === base) {
                    if (!this.fs.has(file.path)) {
                        this.addFileOrFolderInFolder(folder, file);
                    }
                    else {
                        this.modifyFile(path, content);
                    }
                }
                else {
                    this.writeFile(this.realpath(path), content);
                }
            };
            TestServerHost.prototype.prependFile = function (path, content, options) {
                this.modifyFile(path, content + this.readFile(path), options);
            };
            TestServerHost.prototype.appendFile = function (path, content, options) {
                this.modifyFile(path, this.readFile(path) + content, options);
            };
            TestServerHost.prototype.write = function (message) {
                if (ts.Debug.isDebugging)
                    console.log(message);
                this.output.push(message);
            };
            TestServerHost.prototype.getOutput = function () {
                return this.output;
            };
            TestServerHost.prototype.clearOutput = function () {
                ts.clear(this.output);
                this.screenClears.length = 0;
            };
            TestServerHost.prototype.serializeOutput = function (baseline) {
                var output = this.getOutput();
                var start = 0;
                baseline.push("Output::");
                for (var _i = 0, _a = this.screenClears; _i < _a.length; _i++) {
                    var screenClear = _a[_i];
                    baselineOutputs(baseline, output, start, screenClear);
                    start = screenClear;
                    baseline.push(">> Screen clear");
                }
                baselineOutputs(baseline, output, start);
                baseline.push("");
                this.clearOutput();
            };
            TestServerHost.prototype.snap = function () {
                var result = new ts.Map();
                this.fs.forEach(function (value, key) {
                    var cloneValue = ts.clone(value);
                    if (isFsFolder(cloneValue)) {
                        cloneValue.entries = cloneValue.entries.map(ts.clone);
                    }
                    result.set(key, cloneValue);
                });
                return result;
            };
            TestServerHost.prototype.diff = function (baseline, base) {
                var _this = this;
                if (base === void 0) { base = new ts.Map(); }
                this.fs.forEach(function (newFsEntry, path) {
                    var _a;
                    diffFsEntry(baseline, base.get(path), newFsEntry, (_a = _this.inodes) === null || _a === void 0 ? void 0 : _a.get(path), _this.writtenFiles);
                });
                base.forEach(function (oldFsEntry, path) {
                    var _a;
                    var newFsEntry = _this.fs.get(path);
                    if (!newFsEntry) {
                        diffFsEntry(baseline, oldFsEntry, newFsEntry, (_a = _this.inodes) === null || _a === void 0 ? void 0 : _a.get(path), _this.writtenFiles);
                    }
                });
                baseline.push("");
            };
            TestServerHost.prototype.serializeWatches = function (baseline) {
                if (baseline === void 0) { baseline = []; }
                serializeMultiMap(baseline, "PolledWatches", this.watchedFiles);
                baseline.push("");
                serializeMultiMap(baseline, "FsWatches", this.fsWatches);
                baseline.push("");
                serializeMultiMap(baseline, "FsWatchesRecursive", this.fsWatchesRecursive);
                baseline.push("");
                return baseline;
            };
            TestServerHost.prototype.realpath = function (s) {
                var fullPath = this.toNormalizedAbsolutePath(s);
                var path = this.toPath(fullPath);
                if (ts.getDirectoryPath(path) === path) {
                    // Root
                    return s;
                }
                var dirFullPath = this.realpath(ts.getDirectoryPath(fullPath));
                var realFullPath = ts.combinePaths(dirFullPath, ts.getBaseFileName(fullPath));
                var fsEntry = this.fs.get(this.toPath(realFullPath));
                if (isFsSymLink(fsEntry)) {
                    return this.realpath(fsEntry.symLink);
                }
                // realpath supports non-existent files, so there may not be an fsEntry
                return (fsEntry === null || fsEntry === void 0 ? void 0 : fsEntry.fullPath) || realFullPath;
            };
            TestServerHost.prototype.exit = function (exitCode) {
                this.exitCode = exitCode;
                throw new Error(this.exitMessage);
            };
            TestServerHost.prototype.getEnvironmentVariable = function (name) {
                return this.environmentVariables && this.environmentVariables.get(name) || "";
            };
            return TestServerHost;
        }());
        TestFSWithWatch.TestServerHost = TestServerHost;
        function diffFsFile(baseline, fsEntry, newInode) {
            baseline.push("//// [".concat(fsEntry.fullPath, "]").concat(inodeString(newInode), "\r\n").concat(fsEntry.content), "");
        }
        function diffFsSymLink(baseline, fsEntry, newInode) {
            baseline.push("//// [".concat(fsEntry.fullPath, "] symlink(").concat(fsEntry.symLink, ")").concat(inodeString(newInode)));
        }
        function inodeString(inode) {
            return inode !== undefined ? " Inode:: ".concat(inode) : "";
        }
        function diffFsEntry(baseline, oldFsEntry, newFsEntry, newInode, writtenFiles) {
            var file = newFsEntry && newFsEntry.fullPath;
            if (isFsFile(oldFsEntry)) {
                if (isFsFile(newFsEntry)) {
                    if (oldFsEntry.content !== newFsEntry.content) {
                        diffFsFile(baseline, newFsEntry, newInode);
                    }
                    else if (oldFsEntry.modifiedTime !== newFsEntry.modifiedTime) {
                        if (oldFsEntry.fullPath !== newFsEntry.fullPath) {
                            baseline.push("//// [".concat(file, "] file was renamed from file ").concat(oldFsEntry.fullPath).concat(inodeString(newInode)));
                        }
                        else if (writtenFiles && !writtenFiles.has(newFsEntry.path)) {
                            baseline.push("//// [".concat(file, "] file changed its modified time").concat(inodeString(newInode)));
                        }
                        else {
                            baseline.push("//// [".concat(file, "] file written with same contents").concat(inodeString(newInode)));
                        }
                    }
                }
                else {
                    baseline.push("//// [".concat(oldFsEntry.fullPath, "] deleted"));
                    if (isFsSymLink(newFsEntry)) {
                        diffFsSymLink(baseline, newFsEntry, newInode);
                    }
                }
            }
            else if (isFsSymLink(oldFsEntry)) {
                if (isFsSymLink(newFsEntry)) {
                    if (oldFsEntry.symLink !== newFsEntry.symLink) {
                        diffFsSymLink(baseline, newFsEntry, newInode);
                    }
                    else if (oldFsEntry.modifiedTime !== newFsEntry.modifiedTime) {
                        if (oldFsEntry.fullPath !== newFsEntry.fullPath) {
                            baseline.push("//// [".concat(file, "] symlink was renamed from symlink ").concat(oldFsEntry.fullPath).concat(inodeString(newInode)));
                        }
                        else if (writtenFiles && !writtenFiles.has(newFsEntry.path)) {
                            baseline.push("//// [".concat(file, "] symlink changed its modified time").concat(inodeString(newInode)));
                        }
                        else {
                            baseline.push("//// [".concat(file, "] symlink written with same link").concat(inodeString(newInode)));
                        }
                    }
                }
                else {
                    baseline.push("//// [".concat(oldFsEntry.fullPath, "] deleted symlink"));
                    if (isFsFile(newFsEntry)) {
                        diffFsFile(baseline, newFsEntry, newInode);
                    }
                }
            }
            else if (isFsFile(newFsEntry)) {
                diffFsFile(baseline, newFsEntry, newInode);
            }
            else if (isFsSymLink(newFsEntry)) {
                diffFsSymLink(baseline, newFsEntry, newInode);
            }
        }
        function serializeMultiMap(baseline, caption, multiMap) {
            baseline.push("".concat(caption, "::"));
            multiMap.forEach(function (values, key) {
                baseline.push("".concat(key, ":"));
                for (var _i = 0, values_1 = values; _i < values_1.length; _i++) {
                    var value = values_1[_i];
                    baseline.push("  ".concat(JSON.stringify(value)));
                }
            });
        }
        function baselineOutputs(baseline, output, start, end) {
            if (end === void 0) { end = output.length; }
            var baselinedOutput;
            for (var i = start; i < end; i++) {
                (baselinedOutput || (baselinedOutput = [])).push(output[i].replace(/Elapsed::\s[0-9]+(?:\.\d+)?ms/g, "Elapsed:: *ms"));
            }
            if (baselinedOutput)
                baseline.push(baselinedOutput.join(""));
        }
        function changeToHostTrackingWrittenFiles(inputHost) {
            var host = inputHost;
            var originalWriteFile = host.writeFile;
            host.writtenFiles = new ts.Map();
            host.writeFile = function (fileName, content) {
                originalWriteFile.call(host, fileName, content);
                var path = host.toFullPath(fileName);
                host.writtenFiles.set(path, (host.writtenFiles.get(path) || 0) + 1);
            };
            return host;
        }
        TestFSWithWatch.changeToHostTrackingWrittenFiles = changeToHostTrackingWrittenFiles;
        TestFSWithWatch.tsbuildProjectsLocation = "/user/username/projects";
        function getTsBuildProjectFilePath(project, file) {
            return "".concat(TestFSWithWatch.tsbuildProjectsLocation, "/").concat(project, "/").concat(file);
        }
        TestFSWithWatch.getTsBuildProjectFilePath = getTsBuildProjectFilePath;
        function getTsBuildProjectFile(project, file) {
            return {
                path: getTsBuildProjectFilePath(project, file),
                content: Harness.IO.readFile("".concat(Harness.IO.getWorkspaceRoot(), "/tests/projects/").concat(project, "/").concat(file))
            };
        }
        TestFSWithWatch.getTsBuildProjectFile = getTsBuildProjectFile;
    })(TestFSWithWatch = ts.TestFSWithWatch || (ts.TestFSWithWatch = {}));
})(ts || (ts = {}));
var FourSlash;
(function (FourSlash) {
    var FourSlashTestType;
    (function (FourSlashTestType) {
        FourSlashTestType[FourSlashTestType["Native"] = 0] = "Native";
        FourSlashTestType[FourSlashTestType["Shims"] = 1] = "Shims";
        FourSlashTestType[FourSlashTestType["ShimsWithPreprocess"] = 2] = "ShimsWithPreprocess";
        FourSlashTestType[FourSlashTestType["Server"] = 3] = "Server";
    })(FourSlashTestType = FourSlash.FourSlashTestType || (FourSlash.FourSlashTestType = {}));
    // Name of testcase metadata including ts.CompilerOptions properties that will be used by globalOptions
    // To add additional option, add property into the testOptMetadataNames, refer the property in either globalMetadataNames or fileMetadataNames
    // Add cases into convertGlobalOptionsToCompilationsSettings function for the compiler to acknowledge such option from meta data
    var MetadataOptionNames;
    (function (MetadataOptionNames) {
        MetadataOptionNames["baselineFile"] = "baselinefile";
        MetadataOptionNames["emitThisFile"] = "emitthisfile";
        MetadataOptionNames["fileName"] = "filename";
        MetadataOptionNames["resolveReference"] = "resolvereference";
        MetadataOptionNames["symlink"] = "symlink";
    })(MetadataOptionNames || (MetadataOptionNames = {}));
    // List of allowed metadata names
    var fileMetadataNames = ["filename" /* MetadataOptionNames.fileName */, "emitthisfile" /* MetadataOptionNames.emitThisFile */, "resolvereference" /* MetadataOptionNames.resolveReference */, "symlink" /* MetadataOptionNames.symlink */];
    function convertGlobalOptionsToCompilerOptions(globalOptions) {
        var settings = { target: 1 /* ts.ScriptTarget.ES5 */ };
        Harness.Compiler.setCompilerOptionsFromHarnessSetting(globalOptions, settings);
        return settings;
    }
    var TestCancellationToken = /** @class */ (function () {
        function TestCancellationToken() {
            this.numberOfCallsBeforeCancellation = TestCancellationToken.notCanceled;
        }
        TestCancellationToken.prototype.isCancellationRequested = function () {
            if (this.numberOfCallsBeforeCancellation < 0) {
                return false;
            }
            if (this.numberOfCallsBeforeCancellation > 0) {
                this.numberOfCallsBeforeCancellation--;
                return false;
            }
            return true;
        };
        TestCancellationToken.prototype.setCancelled = function (numberOfCalls) {
            if (numberOfCalls === void 0) { numberOfCalls = 0; }
            ts.Debug.assert(numberOfCalls >= 0);
            this.numberOfCallsBeforeCancellation = numberOfCalls;
        };
        TestCancellationToken.prototype.resetCancelled = function () {
            this.numberOfCallsBeforeCancellation = TestCancellationToken.notCanceled;
        };
        // 0 - cancelled
        // >0 - not cancelled
        // <0 - not cancelled and value denotes number of isCancellationRequested after which token become cancelled
        TestCancellationToken.notCanceled = -1;
        return TestCancellationToken;
    }());
    FourSlash.TestCancellationToken = TestCancellationToken;
    function verifyOperationIsCancelled(f) {
        try {
            f();
        }
        catch (e) {
            if (e instanceof ts.OperationCanceledException) {
                return;
            }
        }
        throw new Error("Operation should be cancelled");
    }
    FourSlash.verifyOperationIsCancelled = verifyOperationIsCancelled;
    function ignoreInterpolations(diagnostic) {
        return { template: typeof diagnostic === "string" ? diagnostic : diagnostic.message };
    }
    FourSlash.ignoreInterpolations = ignoreInterpolations;
    // This function creates IScriptSnapshot object for testing getPreProcessedFileInfo
    // Return object may lack some functionalities for other purposes.
    function createScriptSnapShot(sourceText) {
        return ts.ScriptSnapshot.fromString(sourceText);
    }
    var CallHierarchyItemDirection;
    (function (CallHierarchyItemDirection) {
        CallHierarchyItemDirection[CallHierarchyItemDirection["Root"] = 0] = "Root";
        CallHierarchyItemDirection[CallHierarchyItemDirection["Incoming"] = 1] = "Incoming";
        CallHierarchyItemDirection[CallHierarchyItemDirection["Outgoing"] = 2] = "Outgoing";
    })(CallHierarchyItemDirection || (CallHierarchyItemDirection = {}));
    var TestState = /** @class */ (function () {
        function TestState(originalInputFileName, basePath, testType, testData) {
            var _a;
            var _this = this;
            var _b, _c;
            this.originalInputFileName = originalInputFileName;
            this.basePath = basePath;
            this.testType = testType;
            this.testData = testData;
            // The current caret position in the active file
            this.currentCaretPosition = 0;
            // The position of the end of the current selection, or -1 if nothing is selected
            this.selectionEnd = -1;
            // Whether or not we should format on keystrokes
            this.enableFormatting = true;
            this.inputFiles = new ts.Map(); // Map between inputFile's fileName and its content for easily looking up when resolving references
            this.alignmentForExtraInfo = 50;
            // Create a new Services Adapter
            this.cancellationToken = new TestCancellationToken();
            var compilationOptions = convertGlobalOptionsToCompilerOptions(this.testData.globalOptions);
            compilationOptions.skipDefaultLibCheck = true;
            // Initialize the language service with all the scripts
            var startResolveFileRef;
            var configFileName;
            for (var _i = 0, _d = testData.files; _i < _d.length; _i++) {
                var file = _d[_i];
                // Create map between fileName and its content for easily looking up when resolveReference flag is specified
                this.inputFiles.set(file.fileName, file.content);
                if (isConfig(file)) {
                    var configJson = ts.parseConfigFileTextToJson(file.fileName, file.content);
                    if (configJson.config === undefined) {
                        throw new Error("Failed to parse test ".concat(file.fileName, ": ").concat(configJson.error.messageText));
                    }
                    // Extend our existing compiler options so that we can also support tsconfig only options
                    if (configJson.config.compilerOptions) {
                        var baseDirectory = ts.normalizePath(ts.getDirectoryPath(file.fileName));
                        var tsConfig = ts.convertCompilerOptionsFromJson(configJson.config.compilerOptions, baseDirectory, file.fileName);
                        if (!tsConfig.errors || !tsConfig.errors.length) {
                            compilationOptions = ts.extend(tsConfig.options, compilationOptions);
                        }
                    }
                    configFileName = file.fileName;
                }
                if (!startResolveFileRef && file.fileOptions["resolvereference" /* MetadataOptionNames.resolveReference */] === "true") {
                    startResolveFileRef = file;
                }
                else if (startResolveFileRef) {
                    // If entry point for resolving file references is already specified, report duplication error
                    throw new Error("There exists a Fourslash file which has resolveReference flag specified; remove duplicated resolveReference flag");
                }
            }
            var configParseResult;
            if (configFileName) {
                var baseDir = ts.normalizePath(ts.getDirectoryPath(configFileName));
                var files_2 = (_a = {}, _a[baseDir] = {}, _a);
                this.inputFiles.forEach(function (data, path) {
                    var scriptInfo = new Harness.LanguageService.ScriptInfo(path, undefined, /*isRootFile*/ false); // TODO: GH#18217
                    files_2[path] = new vfs.File(data, { meta: { scriptInfo: scriptInfo } });
                });
                var fs = new vfs.FileSystem(/*ignoreCase*/ true, { cwd: baseDir, files: files_2 });
                var host = new fakes.ParseConfigHost(fs);
                var jsonSourceFile = ts.parseJsonText(configFileName, this.inputFiles.get(configFileName));
                configParseResult = ts.parseJsonSourceFileConfigFileContent(jsonSourceFile, host, baseDir, compilationOptions, configFileName);
                compilationOptions = configParseResult.options;
            }
            if (compilationOptions.typeRoots) {
                compilationOptions.typeRoots = compilationOptions.typeRoots.map(function (p) { return ts.getNormalizedAbsolutePath(p, _this.basePath); });
            }
            var languageServiceAdapter = this.getLanguageServiceAdapter(testType, this.cancellationToken, compilationOptions);
            this.languageServiceAdapterHost = languageServiceAdapter.getHost();
            this.languageService = memoWrap(languageServiceAdapter.getLanguageService(), this); // Wrap the LS to cache some expensive operations certain tests call repeatedly
            if (this.testType === 3 /* FourSlashTestType.Server */) {
                this.assertTextConsistent = function (fileName) { return languageServiceAdapter.assertTextConsistent(fileName); };
            }
            if (startResolveFileRef) {
                // Add the entry-point file itself into the languageServiceShimHost
                this.languageServiceAdapterHost.addScript(startResolveFileRef.fileName, startResolveFileRef.content, /*isRootFile*/ true);
                var resolvedResult = languageServiceAdapter.getPreProcessedFileInfo(startResolveFileRef.fileName, startResolveFileRef.content);
                var referencedFiles = resolvedResult.referencedFiles;
                var importedFiles = resolvedResult.importedFiles;
                // Add triple reference files into language-service host
                ts.forEach(referencedFiles, function (referenceFile) {
                    // Fourslash insert tests/cases/fourslash into inputFile.unitName so we will properly append the same base directory to refFile path
                    var referenceFilePath = _this.basePath + "/" + referenceFile.fileName;
                    _this.addMatchedInputFile(referenceFilePath, /* extensions */ undefined);
                });
                var exts_1 = ts.flatten(ts.getSupportedExtensions(compilationOptions));
                // Add import files into language-service host
                ts.forEach(importedFiles, function (importedFile) {
                    // Fourslash insert tests/cases/fourslash into inputFile.unitName and import statement doesn't require ".ts"
                    // so convert them before making appropriate comparison
                    var importedFilePath = _this.basePath + "/" + importedFile.fileName;
                    _this.addMatchedInputFile(importedFilePath, exts_1);
                });
                // Check if no-default-lib flag is false and if so add default library
                if (!resolvedResult.isLibFile) {
                    this.languageServiceAdapterHost.addScript(Harness.Compiler.defaultLibFileName, Harness.Compiler.getDefaultLibrarySourceFile().text, /*isRootFile*/ false);
                    (_b = compilationOptions.lib) === null || _b === void 0 ? void 0 : _b.forEach(function (fileName) {
                        var libFile = Harness.Compiler.getDefaultLibrarySourceFile(fileName);
                        ts.Debug.assertIsDefined(libFile, "Could not find lib file '".concat(fileName, "'"));
                        if (libFile) {
                            _this.languageServiceAdapterHost.addScript(fileName, libFile.text, /*isRootFile*/ false);
                        }
                    });
                }
            }
            else {
                // resolveReference file-option is not specified then do not resolve any files and include all inputFiles
                this.inputFiles.forEach(function (file, fileName) {
                    if (!Harness.isDefaultLibraryFile(fileName)) {
                        // all files if config file not specified, otherwise root files from the config and typings cache files are root files
                        var isRootFile = !configParseResult ||
                            ts.contains(configParseResult.fileNames, fileName) ||
                            (ts.isDeclarationFileName(fileName) && ts.containsPath("/Library/Caches/typescript", fileName));
                        _this.languageServiceAdapterHost.addScript(fileName, file, isRootFile);
                    }
                });
                if (!compilationOptions.noLib) {
                    var seen_1 = new Set();
                    var addSourceFile_1 = function (fileName) {
                        if (seen_1.has(fileName))
                            return;
                        seen_1.add(fileName);
                        var libFile = Harness.Compiler.getDefaultLibrarySourceFile(fileName);
                        ts.Debug.assertIsDefined(libFile, "Could not find lib file '".concat(fileName, "'"));
                        _this.languageServiceAdapterHost.addScript(fileName, libFile.text, /*isRootFile*/ false);
                        if (!ts.some(libFile.libReferenceDirectives))
                            return;
                        for (var _i = 0, _a = libFile.libReferenceDirectives; _i < _a.length; _i++) {
                            var directive = _a[_i];
                            addSourceFile_1("lib.".concat(directive.fileName, ".d.ts"));
                        }
                    };
                    addSourceFile_1(Harness.Compiler.defaultLibFileName);
                    (_c = compilationOptions.lib) === null || _c === void 0 ? void 0 : _c.forEach(addSourceFile_1);
                }
            }
            var _loop_7 = function (file) {
                ts.forEach(file.symlinks, function (link) {
                    _this.languageServiceAdapterHost.vfs.mkdirpSync(vpath.dirname(link));
                    _this.languageServiceAdapterHost.vfs.symlinkSync(file.fileName, link);
                });
            };
            for (var _e = 0, _f = testData.files; _e < _f.length; _e++) {
                var file = _f[_e];
                _loop_7(file);
            }
            if (testData.symlinks) {
                this.languageServiceAdapterHost.vfs.apply(testData.symlinks);
            }
            this.formatCodeSettings = ts.testFormatSettings;
            // Open the first file by default
            this.openFile(0);
            function memoWrap(ls, target) {
                var cacheableMembers = [
                    "getCompletionEntryDetails",
                    "getCompletionEntrySymbol",
                    "getQuickInfoAtPosition",
                    "getReferencesAtPosition",
                    "getDocumentHighlights",
                ];
                var proxy = {};
                var keys = ts.getAllKeys(ls);
                var _loop_8 = function (k) {
                    var key = k;
                    if (cacheableMembers.indexOf(key) === -1) {
                        proxy[key] = function () {
                            var args = [];
                            for (var _i = 0; _i < arguments.length; _i++) {
                                args[_i] = arguments[_i];
                            }
                            return ls[key].apply(ls, args);
                        };
                        return "continue";
                    }
                    var memo = Utils.memoize(function (_version, _active, _caret, _selectEnd, _marker) {
                        var args = [];
                        for (var _i = 5; _i < arguments.length; _i++) {
                            args[_i - 5] = arguments[_i];
                        }
                        return ls[key].apply(ls, args);
                    }, function () {
                        var args = [];
                        for (var _i = 0; _i < arguments.length; _i++) {
                            args[_i] = arguments[_i];
                        }
                        return args.map(function (a) { return a && typeof a === "object" ? JSON.stringify(a) : a; }).join("|,|");
                    });
                    proxy[key] = function () {
                        var args = [];
                        for (var _i = 0; _i < arguments.length; _i++) {
                            args[_i] = arguments[_i];
                        }
                        return memo.apply(void 0, __spreadArray([target.languageServiceAdapterHost.getScriptInfo(target.activeFile.fileName).version,
                            target.activeFile.fileName,
                            target.currentCaretPosition,
                            target.selectionEnd,
                            target.lastKnownMarker], args, false));
                    };
                };
                for (var _i = 0, keys_2 = keys; _i < keys_2.length; _i++) {
                    var k = keys_2[_i];
                    _loop_8(k);
                }
                return proxy;
            }
        }
        TestState.getDisplayPartsJson = function (displayParts) {
            var result = "";
            ts.forEach(displayParts, function (part) {
                if (result) {
                    result += ",\n    ";
                }
                else {
                    result = "[\n    ";
                }
                result += JSON.stringify(part);
            });
            if (result) {
                result += "\n]";
            }
            return result;
        };
        // Add input file which has matched file name with the given reference-file path.
        // This is necessary when resolveReference flag is specified
        TestState.prototype.addMatchedInputFile = function (referenceFilePath, extensions) {
            var inputFiles = this.inputFiles;
            var languageServiceAdapterHost = this.languageServiceAdapterHost;
            var didAdd = tryAdd(referenceFilePath);
            if (extensions && !didAdd) {
                ts.forEach(extensions, function (ext) { return tryAdd(referenceFilePath + ext); });
            }
            function tryAdd(path) {
                var inputFile = inputFiles.get(path);
                if (inputFile && !Harness.isDefaultLibraryFile(path)) {
                    languageServiceAdapterHost.addScript(path, inputFile, /*isRootFile*/ true);
                    return true;
                }
            }
        };
        TestState.prototype.getLanguageServiceAdapter = function (testType, cancellationToken, compilationOptions) {
            switch (testType) {
                case 0 /* FourSlashTestType.Native */:
                    return new Harness.LanguageService.NativeLanguageServiceAdapter(cancellationToken, compilationOptions);
                case 1 /* FourSlashTestType.Shims */:
                    return new Harness.LanguageService.ShimLanguageServiceAdapter(/*preprocessToResolve*/ false, cancellationToken, compilationOptions);
                case 2 /* FourSlashTestType.ShimsWithPreprocess */:
                    return new Harness.LanguageService.ShimLanguageServiceAdapter(/*preprocessToResolve*/ true, cancellationToken, compilationOptions);
                case 3 /* FourSlashTestType.Server */:
                    return new Harness.LanguageService.ServerLanguageServiceAdapter(cancellationToken, compilationOptions);
                default:
                    throw new Error("Unknown FourSlash test type: ");
            }
        };
        TestState.prototype.getFileContent = function (fileName) {
            return ts.Debug.checkDefined(this.tryGetFileContent(fileName));
        };
        TestState.prototype.tryGetFileContent = function (fileName) {
            var script = this.languageServiceAdapterHost.getScriptInfo(fileName);
            return script && script.content;
        };
        // Entry points from fourslash.ts
        TestState.prototype.goToMarker = function (name) {
            if (name === void 0) { name = ""; }
            var marker = ts.isString(name) ? this.getMarkerByName(name) : name;
            if (this.activeFile.fileName !== marker.fileName) {
                this.openFile(marker.fileName);
            }
            var content = this.getFileContent(marker.fileName);
            if (marker.position === -1 || marker.position > content.length) {
                throw new Error("Marker \"".concat(name, "\" has been invalidated by unrecoverable edits to the file."));
            }
            var mName = ts.isString(name) ? name : this.markerName(marker);
            this.lastKnownMarker = mName;
            this.goToPosition(marker.position);
        };
        TestState.prototype.goToEachMarker = function (markers, action) {
            assert(markers.length);
            for (var i = 0; i < markers.length; i++) {
                this.goToMarker(markers[i]);
                action(markers[i], i);
            }
        };
        TestState.prototype.goToEachRange = function (action) {
            var ranges = this.getRanges();
            assert(ranges.length);
            for (var _i = 0, ranges_1 = ranges; _i < ranges_1.length; _i++) {
                var range = ranges_1[_i];
                this.selectRange(range);
                action(range);
            }
        };
        TestState.prototype.markerName = function (m) {
            return ts.forEachEntry(this.testData.markerPositions, function (marker, name) {
                if (marker === m) {
                    return name;
                }
            });
        };
        TestState.prototype.goToPosition = function (positionOrLineAndCharacter) {
            var pos = typeof positionOrLineAndCharacter === "number"
                ? positionOrLineAndCharacter
                : this.languageServiceAdapterHost.lineAndCharacterToPosition(this.activeFile.fileName, positionOrLineAndCharacter);
            this.currentCaretPosition = pos;
            this.selectionEnd = -1;
        };
        TestState.prototype.select = function (startMarker, endMarker) {
            var start = this.getMarkerByName(startMarker), end = this.getMarkerByName(endMarker);
            ts.Debug.assert(start.fileName === end.fileName);
            if (this.activeFile.fileName !== start.fileName) {
                this.openFile(start.fileName);
            }
            this.goToPosition(start.position);
            this.selectionEnd = end.position;
        };
        TestState.prototype.selectAllInFile = function (fileName) {
            this.openFile(fileName);
            this.goToPosition(0);
            this.selectionEnd = this.activeFile.content.length;
        };
        TestState.prototype.selectRange = function (range) {
            this.goToRangeStart(range);
            this.selectionEnd = range.end;
        };
        TestState.prototype.selectLine = function (index) {
            var lineStart = this.languageServiceAdapterHost.lineAndCharacterToPosition(this.activeFile.fileName, { line: index, character: 0 });
            var lineEnd = lineStart + this.getLineContent(index).length;
            this.selectRange({ fileName: this.activeFile.fileName, pos: lineStart, end: lineEnd });
        };
        TestState.prototype.moveCaretRight = function (count) {
            if (count === void 0) { count = 1; }
            this.currentCaretPosition += count;
            this.currentCaretPosition = Math.min(this.currentCaretPosition, this.getFileContent(this.activeFile.fileName).length);
            this.selectionEnd = -1;
        };
        // Opens a file given its 0-based index or fileName
        TestState.prototype.openFile = function (indexOrName, content, scriptKindName) {
            var fileToOpen = this.findFile(indexOrName);
            fileToOpen.fileName = ts.normalizeSlashes(fileToOpen.fileName);
            this.activeFile = fileToOpen;
            // Let the host know that this file is now open
            this.languageServiceAdapterHost.openFile(fileToOpen.fileName, content, scriptKindName);
        };
        TestState.prototype.verifyErrorExistsBetweenMarkers = function (startMarkerName, endMarkerName, shouldExist) {
            var startMarker = this.getMarkerByName(startMarkerName);
            var endMarker = this.getMarkerByName(endMarkerName);
            var predicate = function (errorMinChar, errorLimChar, startPos, endPos) {
                return ((errorMinChar === startPos) && (errorLimChar === endPos)) ? true : false;
            };
            var exists = this.anyErrorInRange(predicate, startMarker, endMarker);
            if (exists !== shouldExist) {
                this.printErrorLog(shouldExist, this.getAllDiagnostics());
                throw new Error("".concat(shouldExist ? "Expected" : "Did not expect", " failure between markers: '").concat(startMarkerName, "', '").concat(endMarkerName, "'"));
            }
        };
        TestState.prototype.verifyOrganizeImports = function (newContent, mode) {
            var changes = this.languageService.organizeImports({ fileName: this.activeFile.fileName, type: "file", mode: mode }, this.formatCodeSettings, ts.emptyOptions);
            this.applyChanges(changes);
            this.verifyFileContent(this.activeFile.fileName, newContent);
        };
        TestState.prototype.raiseError = function (message) {
            throw new Error(this.messageAtLastKnownMarker(message));
        };
        TestState.prototype.messageAtLastKnownMarker = function (message) {
            var locationDescription = this.lastKnownMarker !== undefined ? this.lastKnownMarker : this.getLineColStringAtPosition(this.currentCaretPosition);
            return "At marker '".concat(locationDescription, "': ").concat(message);
        };
        TestState.prototype.assertionMessageAtLastKnownMarker = function (msg) {
            return "\nMarker: " + this.lastKnownMarker + "\nChecking: " + msg + "\n\n";
        };
        TestState.prototype.getDiagnostics = function (fileName, includeSuggestions) {
            if (includeSuggestions === void 0) { includeSuggestions = false; }
            return __spreadArray(__spreadArray(__spreadArray([], this.languageService.getSyntacticDiagnostics(fileName), true), this.languageService.getSemanticDiagnostics(fileName), true), (includeSuggestions ? this.languageService.getSuggestionDiagnostics(fileName) : ts.emptyArray), true);
        };
        TestState.prototype.getAllDiagnostics = function () {
            var _this = this;
            return ts.flatMap(this.languageServiceAdapterHost.getFilenames(), function (fileName) {
                if (!ts.isAnySupportedFileExtension(fileName)) {
                    return [];
                }
                var baseName = ts.getBaseFileName(fileName);
                if (baseName === "package.json" || baseName === "tsconfig.json" || baseName === "jsconfig.json") {
                    return [];
                }
                return _this.getDiagnostics(fileName);
            });
        };
        TestState.prototype.verifyErrorExistsAfterMarker = function (markerName, shouldExist, after) {
            var marker = this.getMarkerByName(markerName);
            var predicate;
            if (after) {
                predicate = function (errorMinChar, errorLimChar, startPos) {
                    return ((errorMinChar >= startPos) && (errorLimChar >= startPos)) ? true : false;
                };
            }
            else {
                predicate = function (errorMinChar, errorLimChar, startPos) {
                    return ((errorMinChar <= startPos) && (errorLimChar <= startPos)) ? true : false;
                };
            }
            var exists = this.anyErrorInRange(predicate, marker);
            var diagnostics = this.getAllDiagnostics();
            if (exists !== shouldExist) {
                this.printErrorLog(shouldExist, diagnostics);
                throw new Error("".concat(shouldExist ? "Expected" : "Did not expect", " failure at marker '").concat(markerName, "'"));
            }
        };
        TestState.prototype.anyErrorInRange = function (predicate, startMarker, endMarker) {
            return this.getDiagnostics(startMarker.fileName).some(function (_a) {
                var start = _a.start, length = _a.length;
                return predicate(start, start + length, startMarker.position, endMarker === undefined ? undefined : endMarker.position);
            }); // TODO: GH#18217
        };
        TestState.prototype.printErrorLog = function (expectErrors, errors) {
            if (expectErrors) {
                Harness.IO.log("Expected error not found.  Error list is:");
            }
            else {
                Harness.IO.log("Unexpected error(s) found.  Error list is:");
            }
            for (var _i = 0, errors_1 = errors; _i < errors_1.length; _i++) {
                var _a = errors_1[_i], start = _a.start, length = _a.length, messageText = _a.messageText, file = _a.file;
                Harness.IO.log("  " + this.formatRange(file, start, length) + // TODO: GH#18217
                    ", message: " + ts.flattenDiagnosticMessageText(messageText, Harness.IO.newLine()) + "\n");
            }
        };
        TestState.prototype.formatRange = function (file, start, length) {
            if (file) {
                return "from: ".concat(this.formatLineAndCharacterOfPosition(file, start), ", to: ").concat(this.formatLineAndCharacterOfPosition(file, start + length));
            }
            return "global";
        };
        TestState.prototype.formatLineAndCharacterOfPosition = function (file, pos) {
            if (file) {
                var _a = ts.getLineAndCharacterOfPosition(file, pos), line = _a.line, character = _a.character;
                return "".concat(line, ":").concat(character);
            }
            return "global";
        };
        TestState.prototype.formatPosition = function (file, pos) {
            if (file) {
                return file.fileName + "@" + pos;
            }
            return "global";
        };
        TestState.prototype.verifyNoErrors = function () {
            var _this = this;
            ts.forEachKey(this.inputFiles, function (fileName) {
                if (!ts.isAnySupportedFileExtension(fileName)
                    || Harness.getConfigNameFromFileName(fileName)
                    // Can't get a Program in Server tests
                    || _this.testType !== 3 /* FourSlashTestType.Server */ && !ts.getAllowJSCompilerOption(_this.getProgram().getCompilerOptions()) && !ts.resolutionExtensionIsTSOrJson(ts.extensionFromPath(fileName))
                    || ts.getBaseFileName(fileName) === "package.json")
                    return;
                var errors = _this.getDiagnostics(fileName).filter(function (e) { return e.category !== ts.DiagnosticCategory.Suggestion; });
                if (errors.length) {
                    _this.printErrorLog(/*expectErrors*/ false, errors);
                    var error = errors[0];
                    var message = typeof error.messageText === "string" ? error.messageText : error.messageText.messageText;
                    _this.raiseError("Found an error: ".concat(_this.formatPosition(error.file, error.start), ": ").concat(message));
                }
            });
        };
        TestState.prototype.verifyErrorExistsAtRange = function (range, code, expectedMessage) {
            var span = ts.createTextSpanFromRange(range);
            var hasMatchingError = ts.some(this.getDiagnostics(range.fileName), function (_a) {
                var code = _a.code, messageText = _a.messageText, start = _a.start, length = _a.length;
                return code === code &&
                    (!expectedMessage || expectedMessage === messageText) &&
                    ts.isNumber(start) && ts.isNumber(length) &&
                    ts.textSpansEqual(span, { start: start, length: length });
            });
            if (!hasMatchingError) {
                this.raiseError("No error with code ".concat(code, " found at provided range."));
            }
        };
        TestState.prototype.verifyNumberOfErrorsInCurrentFile = function (expected) {
            var errors = this.getDiagnostics(this.activeFile.fileName);
            var actual = errors.length;
            if (actual !== expected) {
                this.printErrorLog(/*expectErrors*/ false, errors);
                var errorMsg = "Actual number of errors (" + actual + ") does not match expected number (" + expected + ")";
                Harness.IO.log(errorMsg);
                this.raiseError(errorMsg);
            }
        };
        TestState.prototype.verifyEval = function (expr, value) {
            var emit = this.languageService.getEmitOutput(this.activeFile.fileName);
            if (emit.outputFiles.length !== 1) {
                throw new Error("Expected exactly one output from emit of " + this.activeFile.fileName);
            }
            var evaluation = new Function("".concat(emit.outputFiles[0].text, ";\r\nreturn (").concat(expr, ");"))(); // eslint-disable-line no-new-func
            if (evaluation !== value) {
                this.raiseError("Expected evaluation of expression \"".concat(expr, "\" to equal \"").concat(value, "\", but got \"").concat(evaluation, "\""));
            }
        };
        TestState.prototype.verifyGoToDefinitionIs = function (endMarker) {
            var _this = this;
            this.verifyGoToXWorker(/*startMarker*/ undefined, toArray(endMarker), function () { return _this.getGoToDefinition(); });
        };
        TestState.prototype.verifyGoToDefinition = function (arg0, endMarkerNames) {
            var _this = this;
            this.verifyGoToX(arg0, endMarkerNames, function () { return _this.getGoToDefinitionAndBoundSpan(); });
        };
        TestState.prototype.verifyGoToSourceDefinition = function (startMarkerNames, end) {
            var _this = this;
            if (this.testType !== 3 /* FourSlashTestType.Server */) {
                this.raiseError("goToSourceDefinition may only be used in fourslash/server tests.");
            }
            this.verifyGoToX(startMarkerNames, end, function () { return _this.languageService.getSourceDefinitionAndBoundSpan(_this.activeFile.fileName, _this.currentCaretPosition); });
        };
        TestState.prototype.getGoToDefinition = function () {
            return this.languageService.getDefinitionAtPosition(this.activeFile.fileName, this.currentCaretPosition);
        };
        TestState.prototype.getGoToDefinitionAndBoundSpan = function () {
            return this.languageService.getDefinitionAndBoundSpan(this.activeFile.fileName, this.currentCaretPosition);
        };
        TestState.prototype.verifyGoToType = function (arg0, endMarkerNames) {
            var _this = this;
            this.verifyGoToX(arg0, endMarkerNames, function () {
                return _this.languageService.getTypeDefinitionAtPosition(_this.activeFile.fileName, _this.currentCaretPosition);
            });
        };
        TestState.prototype.verifyGoToX = function (arg0, endMarkerNames, getDefs) {
            if (endMarkerNames) {
                this.verifyGoToXPlain(arg0, endMarkerNames, getDefs);
            }
            else if (ts.isArray(arg0)) {
                var pairs = arg0;
                for (var _i = 0, pairs_1 = pairs; _i < pairs_1.length; _i++) {
                    var _a = pairs_1[_i], start = _a[0], end = _a[1];
                    this.verifyGoToXPlain(start, end, getDefs);
                }
            }
            else {
                var obj = arg0;
                for (var startMarkerName in obj) {
                    if (ts.hasProperty(obj, startMarkerName)) {
                        this.verifyGoToXPlain(startMarkerName, obj[startMarkerName], getDefs);
                    }
                }
            }
        };
        TestState.prototype.verifyGoToXPlain = function (startMarkerNames, endMarkerNames, getDefs) {
            for (var _i = 0, _a = toArray(startMarkerNames); _i < _a.length; _i++) {
                var start = _a[_i];
                this.verifyGoToXSingle(start, endMarkerNames, getDefs);
            }
        };
        TestState.prototype.verifyGoToDefinitionForMarkers = function (markerNames) {
            var _this = this;
            for (var _i = 0, markerNames_1 = markerNames; _i < markerNames_1.length; _i++) {
                var markerName = markerNames_1[_i];
                this.verifyGoToXSingle("".concat(markerName, "Reference"), "".concat(markerName, "Definition"), function () { return _this.getGoToDefinition(); });
            }
        };
        TestState.prototype.verifyGoToXSingle = function (startMarkerName, endMarkerNames, getDefs) {
            this.goToMarker(startMarkerName);
            this.verifyGoToXWorker(startMarkerName, toArray(endMarkerNames), getDefs, startMarkerName);
        };
        TestState.prototype.verifyGoToXWorker = function (startMarker, endMarkers, getDefs, startMarkerName) {
            var _this = this;
            var defs = getDefs();
            var definitions;
            var testName;
            if (!defs || ts.isArray(defs)) {
                definitions = defs || [];
                testName = "goToDefinitions";
            }
            else {
                this.verifyDefinitionTextSpan(defs, startMarkerName);
                definitions = defs.definitions; // TODO: GH#18217
                testName = "goToDefinitionsAndBoundSpan";
            }
            if (endMarkers.length !== definitions.length) {
                var markers = definitions.map(function (d) { return ({ text: "HERE", fileName: d.fileName, position: d.textSpan.start }); });
                var actual = this.renderMarkers(markers);
                this.raiseError("".concat(testName, " failed - expected to find ").concat(endMarkers.length, " definitions but got ").concat(definitions.length, "\n\n").concat(actual));
            }
            ts.zipWith(endMarkers, definitions, function (endMarkerOrFileResult, definition, i) {
                var markerName = typeof endMarkerOrFileResult === "string" ? endMarkerOrFileResult : endMarkerOrFileResult.marker;
                var marker = markerName !== undefined ? _this.getMarkerByName(markerName) : undefined;
                var expectedFileName = (marker === null || marker === void 0 ? void 0 : marker.fileName) || typeof endMarkerOrFileResult !== "string" && endMarkerOrFileResult.file;
                ts.Debug.assert(typeof expectedFileName === "string");
                var expectedPosition = (marker === null || marker === void 0 ? void 0 : marker.position) || 0;
                if (ts.comparePaths(expectedFileName, definition.fileName, /*ignoreCase*/ true) !== 0 /* ts.Comparison.EqualTo */ || expectedPosition !== definition.textSpan.start) {
                    var markers = [{ text: "EXPECTED", fileName: expectedFileName, position: expectedPosition }, { text: "ACTUAL", fileName: definition.fileName, position: definition.textSpan.start }];
                    var text = _this.renderMarkers(markers);
                    _this.raiseError("".concat(testName, " failed for definition ").concat(markerName || expectedFileName, " (").concat(i, "): expected ").concat(expectedFileName, " at ").concat(expectedPosition, ", got ").concat(definition.fileName, " at ").concat(definition.textSpan.start, "\n\n").concat(text, "\n"));
                }
                if (definition.unverified && (typeof endMarkerOrFileResult === "string" || !endMarkerOrFileResult.unverified)) {
                    var isFileResult = typeof endMarkerOrFileResult !== "string" && !!endMarkerOrFileResult.file;
                    _this.raiseError("".concat(testName, " failed for definition ").concat(markerName || expectedFileName, " (").concat(i, "): The actual definition was an `unverified` result. Use:\n\n") +
                        "    verify.goToDefinition(".concat(startMarker === undefined ? "startMarker" : "\"".concat(startMarker, "\""), ", { ").concat(isFileResult ? "file: \"".concat(expectedFileName, "\"") : "marker: \"".concat(markerName, "\""), ", unverified: true })\n\n") +
                        "if this is expected.");
                }
            });
        };
        TestState.prototype.renderMarkers = function (markers) {
            var _this = this;
            var filesToDisplay = ts.deduplicate(markers.map(function (m) { return m.fileName; }), ts.equateValues);
            return filesToDisplay.map(function (fileName) {
                var markersToRender = markers.filter(function (m) { return m.fileName === fileName; }).sort(function (a, b) { return b.position - a.position; });
                var fileContent = _this.tryGetFileContent(fileName) || "";
                for (var _i = 0, markersToRender_1 = markersToRender; _i < markersToRender_1.length; _i++) {
                    var marker = markersToRender_1[_i];
                    fileContent = fileContent.slice(0, marker.position) + "\u001B[1;4m/*".concat(marker.text, "*/\u001B[0;31m") + fileContent.slice(marker.position);
                }
                return "// @Filename: ".concat(fileName, "\n").concat(fileContent);
            }).join("\n\n");
        };
        TestState.prototype.verifyDefinitionTextSpan = function (defs, startMarkerName) {
            var _this = this;
            var range = this.testData.ranges.find(function (range) { return _this.markerName(range.marker) === startMarkerName; });
            if (!range && !defs.textSpan) {
                return;
            }
            if (!range) {
                var marker = this.getMarkerByName(startMarkerName);
                var startFile = marker.fileName;
                var fileContent = this.getFileContent(startFile);
                var spanContent = fileContent.slice(defs.textSpan.start, ts.textSpanEnd(defs.textSpan));
                var spanContentWithMarker = spanContent.slice(0, marker.position - defs.textSpan.start) + "/*".concat(startMarkerName, "*/") + spanContent.slice(marker.position - defs.textSpan.start);
                var suggestedFileContent = (fileContent.slice(0, defs.textSpan.start) + "\u001B[1;4m[|".concat(spanContentWithMarker, "|]\u001B[0;31m") + fileContent.slice(ts.textSpanEnd(defs.textSpan)))
                    .split(/\r?\n/).map(function (line) { return " ".repeat(6) + line; }).join(ts.sys.newLine);
                this.raiseError("goToDefinitionsAndBoundSpan failed. Found a starting TextSpan around '".concat(spanContent, "' in '").concat(startFile, "' (at position ").concat(defs.textSpan.start, "). ")
                    + "If this is the correct input span, put a fourslash range around it: \n\n".concat(suggestedFileContent, "\n"));
            }
            else {
                this.assertTextSpanEqualsRange(defs.textSpan, range, "goToDefinitionsAndBoundSpan failed");
            }
        };
        TestState.prototype.verifyGetEmitOutputForCurrentFile = function (expected) {
            var emit = this.languageService.getEmitOutput(this.activeFile.fileName);
            if (emit.outputFiles.length !== 1) {
                throw new Error("Expected exactly one output from emit of " + this.activeFile.fileName);
            }
            var actual = emit.outputFiles[0].text;
            if (actual !== expected) {
                this.raiseError("Expected emit output to be \"".concat(expected, "\", but got \"").concat(actual, "\""));
            }
        };
        TestState.prototype.verifyGetEmitOutputContentsForCurrentFile = function (expected) {
            var emit = this.languageService.getEmitOutput(this.activeFile.fileName);
            assert.equal(emit.outputFiles.length, expected.length, "Number of emit output files");
            ts.zipWith(emit.outputFiles, expected, function (outputFile, expected) {
                assert.equal(outputFile.name, expected.name, "FileName");
                assert.equal(outputFile.text, expected.text, "Content");
            });
        };
        TestState.prototype.verifyInlayHints = function (expected, span, preference) {
            if (span === void 0) { span = { start: 0, length: this.activeFile.content.length }; }
            var hints = this.languageService.provideInlayHints(this.activeFile.fileName, span, preference);
            assert.equal(hints.length, expected.length, "Number of hints");
            var sortHints = function (a, b) {
                return a.position - b.position;
            };
            ts.zipWith(hints.sort(sortHints), __spreadArray([], expected, true).sort(sortHints), function (actual, expected) {
                assert.equal(actual.text, expected.text, "Text");
                assert.equal(actual.position, expected.position, "Position");
                assert.equal(actual.kind, expected.kind, "Kind");
                assert.equal(actual.whitespaceBefore, expected.whitespaceBefore, "whitespaceBefore");
                assert.equal(actual.whitespaceAfter, expected.whitespaceAfter, "whitespaceAfter");
            });
        };
        TestState.prototype.verifyCompletions = function (options) {
            if (options.marker === undefined) {
                this.verifyCompletionsWorker(options);
            }
            else {
                for (var _i = 0, _a = toArray(options.marker); _i < _a.length; _i++) {
                    var marker = _a[_i];
                    this.goToMarker(marker);
                    this.verifyCompletionsWorker(__assign(__assign({}, options), { marker: marker }));
                }
            }
        };
        TestState.prototype.verifyCompletionsWorker = function (options) {
            var actualCompletions = this.getCompletionListAtCaret(__assign(__assign({}, options.preferences), { triggerCharacter: options.triggerCharacter }));
            if (!actualCompletions) {
                if (ts.hasProperty(options, "exact") && (options.exact === undefined || ts.isArray(options.exact) && !options.exact.length)) {
                    return;
                }
                this.raiseError("No completions at position '".concat(this.currentCaretPosition, "'."));
            }
            if (actualCompletions.isNewIdentifierLocation !== (options.isNewIdentifierLocation || false)) {
                this.raiseError("Expected 'isNewIdentifierLocation' to be ".concat(options.isNewIdentifierLocation || false, ", got ").concat(actualCompletions.isNewIdentifierLocation));
            }
            if (ts.hasProperty(options, "isGlobalCompletion") && actualCompletions.isGlobalCompletion !== options.isGlobalCompletion) {
                this.raiseError("Expected 'isGlobalCompletion to be ".concat(options.isGlobalCompletion, ", got ").concat(actualCompletions.isGlobalCompletion));
            }
            if (ts.hasProperty(options, "optionalReplacementSpan")) {
                assert.deepEqual(actualCompletions.optionalReplacementSpan && actualCompletions.optionalReplacementSpan, options.optionalReplacementSpan && ts.createTextSpanFromRange(options.optionalReplacementSpan), "Expected 'optionalReplacementSpan' properties to match");
            }
            var nameToEntries = new ts.Map();
            var _loop_9 = function (entry) {
                var entries = nameToEntries.get(entry.name);
                if (!entries) {
                    nameToEntries.set(entry.name, [entry]);
                }
                else {
                    if (entries.some(function (e) {
                        var _a, _b, _c, _d, _e, _f, _g, _h;
                        return e.source === entry.source &&
                            ((_a = e.data) === null || _a === void 0 ? void 0 : _a.exportName) === ((_b = entry.data) === null || _b === void 0 ? void 0 : _b.exportName) &&
                            ((_c = e.data) === null || _c === void 0 ? void 0 : _c.fileName) === ((_d = entry.data) === null || _d === void 0 ? void 0 : _d.fileName) &&
                            ((_e = e.data) === null || _e === void 0 ? void 0 : _e.moduleSpecifier) === ((_f = entry.data) === null || _f === void 0 ? void 0 : _f.moduleSpecifier) &&
                            ((_g = e.data) === null || _g === void 0 ? void 0 : _g.ambientModuleName) === ((_h = entry.data) === null || _h === void 0 ? void 0 : _h.ambientModuleName);
                    })) {
                        this_1.raiseError("Duplicate completions for ".concat(entry.name));
                    }
                    entries.push(entry);
                }
            };
            var this_1 = this;
            for (var _i = 0, _a = actualCompletions.entries; _i < _a.length; _i++) {
                var entry = _a[_i];
                _loop_9(entry);
            }
            if (ts.hasProperty(options, "exact")) {
                ts.Debug.assert(!ts.hasProperty(options, "includes") && !ts.hasProperty(options, "excludes") && !ts.hasProperty(options, "unsorted"));
                if (options.exact === undefined)
                    throw this.raiseError("Expected no completions");
                this.verifyCompletionsAreExactly(actualCompletions.entries, options.exact, options.marker);
            }
            else if (options.unsorted) {
                ts.Debug.assert(!ts.hasProperty(options, "includes") && !ts.hasProperty(options, "excludes"));
                for (var _b = 0, _c = options.unsorted; _b < _c.length; _b++) {
                    var expectedEntry = _c[_b];
                    var name = typeof expectedEntry === "string" ? expectedEntry : expectedEntry.name;
                    var found = nameToEntries.get(name);
                    if (!found)
                        throw this.raiseError("Unsorted: completion '".concat(name, "' not found."));
                    if (!found.length)
                        throw this.raiseError("Unsorted: no completions with name '".concat(name, "' remain unmatched."));
                    this.verifyCompletionEntry(found.shift(), expectedEntry);
                }
                if (actualCompletions.entries.length !== options.unsorted.length) {
                    var unmatched_1 = [];
                    nameToEntries.forEach(function (entries) {
                        unmatched_1.push.apply(unmatched_1, entries.map(function (e) { return e.name; }));
                    });
                    this.raiseError("Additional completions found not included in 'unsorted': ".concat(unmatched_1.join("\n")));
                }
            }
            else {
                if (options.includes) {
                    for (var _d = 0, _e = toArray(options.includes); _d < _e.length; _d++) {
                        var include = _e[_d];
                        var name = typeof include === "string" ? include : include.name;
                        var found = nameToEntries.get(name);
                        if (!found)
                            throw this.raiseError("Includes: completion '".concat(name, "' not found."));
                        if (!found.length)
                            throw this.raiseError("Includes: no completions with name '".concat(name, "' remain unmatched."));
                        this.verifyCompletionEntry(found.shift(), include);
                    }
                }
                if (options.excludes) {
                    for (var _f = 0, _g = toArray(options.excludes); _f < _g.length; _f++) {
                        var exclude = _g[_f];
                        assert(typeof exclude === "string");
                        if (nameToEntries.has(exclude)) {
                            this.raiseError("Excludes: unexpected completion '".concat(exclude, "' found."));
                        }
                    }
                }
            }
        };
        TestState.prototype.verifyCompletionEntry = function (actual, expected) {
            var _a, _b, _c, _d;
            expected = typeof expected === "string" ? { name: expected } : expected;
            if (actual.insertText !== expected.insertText) {
                this.raiseError("At entry ".concat(actual.name, ": Completion insert text did not match: ").concat(showTextDiff(expected.insertText || "", actual.insertText || "")));
            }
            var convertedReplacementSpan = expected.replacementSpan && ts.createTextSpanFromRange(expected.replacementSpan);
            if (convertedReplacementSpan === null || convertedReplacementSpan === void 0 ? void 0 : convertedReplacementSpan.length) {
                try {
                    assert.deepEqual(actual.replacementSpan, convertedReplacementSpan);
                }
                catch (_e) {
                    this.raiseError("At entry ".concat(actual.name, ": Expected completion replacementSpan to be ").concat(stringify(convertedReplacementSpan), ", got ").concat(stringify(actual.replacementSpan)));
                }
            }
            if (expected.kind !== undefined || expected.kindModifiers !== undefined) {
                assert.equal(actual.kind, expected.kind, "At entry ".concat(actual.name, ": Expected 'kind' for ").concat(actual.name, " to match"));
                assert.equal(actual.kindModifiers, expected.kindModifiers || "", "At entry ".concat(actual.name, ":  Expected 'kindModifiers' for ").concat(actual.name, " to match"));
            }
            if (expected.isFromUncheckedFile !== undefined) {
                assert.equal(actual.isFromUncheckedFile, expected.isFromUncheckedFile, "At entry ".concat(actual.name, ": Expected 'isFromUncheckedFile' properties to match"));
            }
            if (expected.isPackageJsonImport !== undefined) {
                assert.equal(actual.isPackageJsonImport, expected.isPackageJsonImport, "At entry ".concat(actual.name, ": Expected 'isPackageJsonImport' properties to match"));
            }
            assert.equal((_a = actual.labelDetails) === null || _a === void 0 ? void 0 : _a.description, (_b = expected.labelDetails) === null || _b === void 0 ? void 0 : _b.description, "At entry ".concat(actual.name, ": Expected 'labelDetails.description' properties to match"));
            assert.equal((_c = actual.labelDetails) === null || _c === void 0 ? void 0 : _c.detail, (_d = expected.labelDetails) === null || _d === void 0 ? void 0 : _d.detail, "At entry ".concat(actual.name, ": Expected 'labelDetails.detail' properties to match"));
            assert.equal(actual.hasAction, expected.hasAction, "At entry ".concat(actual.name, ": Expected 'hasAction' properties to match"));
            assert.equal(actual.isRecommended, expected.isRecommended, "At entry ".concat(actual.name, ": Expected 'isRecommended' properties to match'"));
            assert.equal(actual.isSnippet, expected.isSnippet, "At entry ".concat(actual.name, ": Expected 'isSnippet' properties to match"));
            assert.equal(actual.source, expected.source, "At entry ".concat(actual.name, ": Expected 'source' values to match"));
            assert.equal(actual.sortText, expected.sortText || ts.Completions.SortText.LocationPriority, "At entry ".concat(actual.name, ": Expected 'sortText' properties to match"));
            if (expected.sourceDisplay && actual.sourceDisplay) {
                assert.equal(ts.displayPartsToString(actual.sourceDisplay), expected.sourceDisplay, "At entry ".concat(actual.name, ": Expected 'sourceDisplay' properties to match"));
            }
            if (expected.text !== undefined) {
                var actualDetails = ts.Debug.checkDefined(this.getCompletionEntryDetails(actual.name, actual.source, actual.data), "No completion details available for name '".concat(actual.name, "' and source '").concat(actual.source, "'"));
                assert.equal(ts.displayPartsToString(actualDetails.displayParts), expected.text, "Expected 'text' property to match 'displayParts' string");
                assert.equal(ts.displayPartsToString(actualDetails.documentation), expected.documentation || "", "Expected 'documentation' property to match 'documentation' display parts string");
                // TODO: GH#23587
                // assert.equal(actualDetails.kind, actual.kind);
                assert.equal(actualDetails.kindModifiers, actual.kindModifiers, "Expected 'kindModifiers' properties to match");
                assert.equal(actualDetails.source && ts.displayPartsToString(actualDetails.source), expected.sourceDisplay, "Expected 'sourceDisplay' property to match 'source' display parts string");
                if (!actual.sourceDisplay) {
                    assert.equal(actualDetails.sourceDisplay && ts.displayPartsToString(actualDetails.sourceDisplay), expected.sourceDisplay, "Expected 'sourceDisplay' property to match 'sourceDisplay' display parts string");
                }
                assert.deepEqual(actualDetails.tags, expected.tags);
            }
            else {
                assert(expected.documentation === undefined && expected.tags === undefined, "If specifying completion details, should specify 'text'");
            }
        };
        TestState.prototype.verifyCompletionsAreExactly = function (actual, expected, marker) {
            var _this = this;
            if (!ts.isArray(expected)) {
                expected = [expected];
            }
            // First pass: test that names are right. Then we'll test details.
            assert.deepEqual(actual.map(function (a) { return a.name; }), expected.map(function (e) { return typeof e === "string" ? e : e.name; }), marker ? "At marker " + JSON.stringify(marker) : undefined);
            ts.zipWith(actual, expected, function (completion, expectedCompletion, index) {
                var name = typeof expectedCompletion === "string" ? expectedCompletion : expectedCompletion.name;
                if (completion.name !== name) {
                    _this.raiseError("".concat(marker ? JSON.stringify(marker) : "", " Expected completion at index ").concat(index, " to be ").concat(name, ", got ").concat(completion.name));
                }
                _this.verifyCompletionEntry(completion, expectedCompletion);
            });
            // All completions were correct in the sort order given. If that order was produced by a function
            // like `completion.globalsPlus`, ensure the "plus" array was sorted in the same way.
            var _a = expected, plusArgument = _a.plusArgument, plusFunctionName = _a.plusFunctionName;
            if (plusArgument) {
                assert.deepEqual(plusArgument, expected.filter(function (entry) { return plusArgument.includes(entry); }), "At marker ".concat(JSON.stringify(marker), ": Argument to '").concat(plusFunctionName, "' was incorrectly sorted."));
            }
        };
        TestState.prototype.getProgram = function () {
            if (!this._program)
                this._program = this.languageService.getProgram() || "missing";
            if (this._program === "missing")
                ts.Debug.fail("Could not retrieve program from language service");
            return this._program;
        };
        TestState.prototype.getChecker = function () {
            return this._checker || (this._checker = this.getProgram().getTypeChecker());
        };
        TestState.prototype.getSourceFile = function () {
            var fileName = this.activeFile.fileName;
            var result = this.getProgram().getSourceFile(fileName);
            if (!result) {
                throw new Error("Could not get source file ".concat(fileName));
            }
            return result;
        };
        TestState.prototype.getNode = function () {
            return ts.getTouchingPropertyName(this.getSourceFile(), this.currentCaretPosition);
        };
        TestState.prototype.goToAndGetNode = function (range) {
            this.goToRangeStart(range);
            var node = this.getNode();
            this.verifyRange("touching property name", range, node);
            return node;
        };
        TestState.prototype.verifyRange = function (desc, expected, actual) {
            var actualStart = actual.getStart();
            var actualEnd = actual.getEnd();
            if (actualStart !== expected.pos || actualEnd !== expected.end) {
                this.raiseError("".concat(desc, " should be ").concat(expected.pos, "-").concat(expected.end, ", got ").concat(actualStart, "-").concat(actualEnd));
            }
        };
        TestState.prototype.verifySymbol = function (symbol, declarationRanges) {
            var _this = this;
            var declarations = symbol.declarations;
            if ((declarations === null || declarations === void 0 ? void 0 : declarations.length) !== declarationRanges.length) {
                this.raiseError("Expected to get ".concat(declarationRanges.length, " declarations, got ").concat(declarations === null || declarations === void 0 ? void 0 : declarations.length));
            }
            ts.zipWith(declarations, declarationRanges, function (decl, range) {
                _this.verifyRange("symbol declaration", range, decl);
            });
        };
        TestState.prototype.verifySymbolAtLocation = function (startRange, declarationRanges) {
            var node = this.goToAndGetNode(startRange);
            var symbol = this.getChecker().getSymbolAtLocation(node);
            if (!symbol) {
                this.raiseError("Could not get symbol at location");
            }
            this.verifySymbol(symbol, declarationRanges);
        };
        TestState.prototype.symbolsInScope = function (range) {
            var node = this.goToAndGetNode(range);
            return this.getChecker().getSymbolsInScope(node, 111551 /* ts.SymbolFlags.Value */ | 788968 /* ts.SymbolFlags.Type */ | 1920 /* ts.SymbolFlags.Namespace */);
        };
        TestState.prototype.setTypesRegistry = function (map) {
            this.languageServiceAdapterHost.typesRegistry = new ts.Map(ts.getEntries(map));
        };
        TestState.prototype.verifyTypeOfSymbolAtLocation = function (range, symbol, expected) {
            var node = this.goToAndGetNode(range);
            var checker = this.getChecker();
            var type = checker.getTypeOfSymbolAtLocation(symbol, node);
            var actual = checker.typeToString(type);
            if (actual !== expected) {
                this.raiseError(displayExpectedAndActualString(expected, actual));
            }
        };
        TestState.prototype.verifyBaselineFindAllReferences = function () {
            var markerNames = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                markerNames[_i] = arguments[_i];
            }
            ts.Debug.assert(markerNames.length > 0, "Must pass at least one marker name to `verifyBaselineFindAllReferences()`");
            this.verifyBaselineFindAllReferencesWorker("", markerNames);
        };
        // Used when a single test needs to produce multiple baselines
        TestState.prototype.verifyBaselineFindAllReferencesMulti = function (seq) {
            var markerNames = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                markerNames[_i - 1] = arguments[_i];
            }
            ts.Debug.assert(markerNames.length > 0, "Must pass at least one marker name to `baselineFindAllReferences()`");
            this.verifyBaselineFindAllReferencesWorker(".".concat(seq), markerNames);
        };
        TestState.prototype.verifyBaselineFindAllReferencesWorker = function (suffix, markerNames) {
            var _this = this;
            var baseline = markerNames.map(function (markerName) {
                _this.goToMarker(markerName);
                var marker = _this.getMarkerByName(markerName);
                var references = _this.languageService.findReferences(marker.fileName, marker.position);
                var refsByFile = references
                    ? ts.group(ts.sort(ts.flatMap(references, function (r) { return r.references; }), function (a, b) { return a.textSpan.start - b.textSpan.start; }), function (ref) { return ref.fileName; })
                    : ts.emptyArray;
                // Write input files
                var baselineContent = _this.getBaselineContentForGroupedReferences(refsByFile, markerName);
                // Write response JSON
                return baselineContent + JSON.stringify(references, undefined, 2);
            }).join("\n\n");
            Harness.Baseline.runBaseline(this.getBaselineFileNameForContainingTestFile("".concat(suffix, ".baseline.jsonc")), baseline);
        };
        TestState.prototype.verifyBaselineGetFileReferences = function (fileName) {
            var references = this.languageService.getFileReferences(fileName);
            var refsByFile = references
                ? ts.group(ts.sort(references, function (a, b) { return a.textSpan.start - b.textSpan.start; }), function (ref) { return ref.fileName; })
                : ts.emptyArray;
            // Write input files
            var baselineContent = this.getBaselineContentForGroupedReferences(refsByFile);
            // Write response JSON
            baselineContent += JSON.stringify(references, undefined, 2);
            Harness.Baseline.runBaseline(this.getBaselineFileNameForContainingTestFile(".baseline.jsonc"), baselineContent);
        };
        TestState.prototype.getBaselineContentForGroupedReferences = function (refsByFile, markerName) {
            var marker = markerName !== undefined ? this.getMarkerByName(markerName) : undefined;
            var baselineContent = "";
            for (var _i = 0, refsByFile_1 = refsByFile; _i < refsByFile_1.length; _i++) {
                var group = refsByFile_1[_i];
                baselineContent += getBaselineContentForFile(group[0].fileName, this.getFileContent(group[0].fileName));
                baselineContent += "\n\n";
            }
            return baselineContent;
            function getBaselineContentForFile(fileName, content) {
                var _a;
                var newContent = "=== ".concat(fileName, " ===\n");
                var pos = 0;
                for (var _i = 0, _b = (_a = refsByFile.find(function (refs) { return refs[0].fileName === fileName; })) !== null && _a !== void 0 ? _a : ts.emptyArray; _i < _b.length; _i++) {
                    var textSpan = _b[_i].textSpan;
                    var end = textSpan.start + textSpan.length;
                    if (fileName === (marker === null || marker === void 0 ? void 0 : marker.fileName) && pos <= marker.position && marker.position < textSpan.start) {
                        newContent += content.slice(pos, marker.position);
                        newContent += "/*FIND ALL REFS*/";
                        pos = marker.position;
                    }
                    newContent += content.slice(pos, textSpan.start);
                    pos = textSpan.start;
                    // It's easier to read if the /*FIND ALL REFS*/ comment is outside the range markers, which makes
                    // this code a bit more verbose than it would be if I were less picky about the baseline format.
                    if (fileName === (marker === null || marker === void 0 ? void 0 : marker.fileName) && marker.position === textSpan.start) {
                        newContent += "/*FIND ALL REFS*/";
                        newContent += "[|";
                    }
                    else if (fileName === (marker === null || marker === void 0 ? void 0 : marker.fileName) && ts.textSpanContainsPosition(textSpan, marker.position)) {
                        newContent += "[|";
                        newContent += content.slice(pos, marker.position);
                        newContent += "/*FIND ALL REFS*/";
                        pos = marker.position;
                    }
                    else {
                        newContent += "[|";
                    }
                    newContent += content.slice(pos, end);
                    newContent += "|]";
                    pos = end;
                }
                if ((marker === null || marker === void 0 ? void 0 : marker.fileName) === fileName && marker.position >= pos) {
                    newContent += content.slice(pos, marker.position);
                    newContent += "/*FIND ALL REFS*/";
                    pos = marker.position;
                }
                newContent += content.slice(pos);
                return newContent.split(/\r?\n/).map(function (l) { return "// " + l; }).join("\n");
            }
        };
        TestState.prototype.assertObjectsEqual = function (fullActual, fullExpected, msgPrefix) {
            var _this = this;
            if (msgPrefix === void 0) { msgPrefix = ""; }
            var recur = function (actual, expected, path) {
                var fail = function (msg) {
                    _this.raiseError("".concat(msgPrefix, " At ").concat(path, ": ").concat(msg, " ").concat(displayExpectedAndActualString(stringify(fullExpected), stringify(fullActual))));
                };
                if ((actual === undefined) !== (expected === undefined)) {
                    fail("Expected ".concat(stringify(expected), ", got ").concat(stringify(actual)));
                }
                for (var key in actual) {
                    if (ts.hasProperty(actual, key)) {
                        var ak = actual[key], ek = expected[key];
                        if (typeof ak === "object" && typeof ek === "object") {
                            recur(ak, ek, path ? path + "." + key : key);
                        }
                        else if (ak !== ek) {
                            fail("Expected '".concat(key, "' to be '").concat(stringify(ek), "', got '").concat(stringify(ak), "'"));
                        }
                    }
                }
                for (var key in expected) {
                    if (ts.hasProperty(expected, key)) {
                        if (!ts.hasProperty(actual, key)) {
                            fail("".concat(msgPrefix, "Missing property '").concat(key, "'"));
                        }
                    }
                }
            };
            if (fullActual === undefined || fullExpected === undefined) {
                if (fullActual === fullExpected) {
                    return;
                }
                this.raiseError("".concat(msgPrefix, " ").concat(displayExpectedAndActualString(stringify(fullExpected), stringify(fullActual))));
            }
            recur(fullActual, fullExpected, "");
        };
        TestState.prototype.verifyDisplayPartsOfReferencedSymbol = function (expected) {
            var referencedSymbols = this.findReferencesAtCaret();
            if (referencedSymbols.length === 0) {
                this.raiseError("No referenced symbols found at current caret position");
            }
            else if (referencedSymbols.length > 1) {
                this.raiseError("More than one referenced symbol found");
            }
            assert.equal(TestState.getDisplayPartsJson(referencedSymbols[0].definition.displayParts), TestState.getDisplayPartsJson(expected), this.messageAtLastKnownMarker("referenced symbol definition display parts"));
        };
        TestState.prototype.configure = function (preferences) {
            if (this.testType === 3 /* FourSlashTestType.Server */) {
                this.languageService.configure(preferences);
            }
        };
        TestState.prototype.getCompletionListAtCaret = function (options) {
            if (options) {
                this.configure(options);
            }
            return this.languageService.getCompletionsAtPosition(this.activeFile.fileName, this.currentCaretPosition, options, this.formatCodeSettings);
        };
        TestState.prototype.getCompletionEntryDetails = function (entryName, source, data, preferences) {
            if (preferences) {
                this.configure(preferences);
            }
            return this.languageService.getCompletionEntryDetails(this.activeFile.fileName, this.currentCaretPosition, entryName, this.formatCodeSettings, source, preferences, data);
        };
        TestState.prototype.findReferencesAtCaret = function () {
            return this.languageService.findReferences(this.activeFile.fileName, this.currentCaretPosition);
        };
        TestState.prototype.getSyntacticDiagnostics = function (expected) {
            var diagnostics = this.languageService.getSyntacticDiagnostics(this.activeFile.fileName);
            this.testDiagnostics(expected, diagnostics, "error");
        };
        TestState.prototype.getSemanticDiagnostics = function (expected) {
            var diagnostics = this.languageService.getSemanticDiagnostics(this.activeFile.fileName);
            this.testDiagnostics(expected, diagnostics, "error");
        };
        TestState.prototype.getSuggestionDiagnostics = function (expected) {
            this.testDiagnostics(expected, this.languageService.getSuggestionDiagnostics(this.activeFile.fileName), "suggestion");
        };
        TestState.prototype.testDiagnostics = function (expected, diagnostics, category) {
            var _this = this;
            assert.deepEqual(ts.realizeDiagnostics(diagnostics, "\n"), expected.map(function (e) {
                var range = e.range || _this.getRangesInFile()[0];
                if (!range) {
                    _this.raiseError("Must provide a range for each expected diagnostic, or have one range in the fourslash source.");
                }
                return __assign(__assign({ message: e.message, category: category, code: e.code }, ts.createTextSpanFromRange(range)), { reportsUnnecessary: e.reportsUnnecessary, reportsDeprecated: e.reportsDeprecated });
            }));
        };
        TestState.prototype.verifyQuickInfoAt = function (markerName, expectedText, expectedDocumentation, expectedTags) {
            if (typeof markerName === "string")
                this.goToMarker(markerName);
            else
                this.goToRangeStart(markerName);
            this.verifyQuickInfoString(expectedText, expectedDocumentation, expectedTags);
        };
        TestState.prototype.verifyQuickInfos = function (namesAndTexts) {
            for (var name in namesAndTexts) {
                if (ts.hasProperty(namesAndTexts, name)) {
                    var text = namesAndTexts[name];
                    if (ts.isArray(text)) {
                        assert(text.length === 2);
                        var expectedText = text[0], expectedDocumentation = text[1];
                        this.verifyQuickInfoAt(name, expectedText, expectedDocumentation);
                    }
                    else {
                        this.verifyQuickInfoAt(name, text);
                    }
                }
            }
        };
        TestState.prototype.verifyQuickInfoString = function (expectedText, expectedDocumentation, expectedTags) {
            var _this = this;
            var _a;
            if (expectedDocumentation === "") {
                throw new Error("Use 'undefined' instead of empty string for `expectedDocumentation`");
            }
            var actualQuickInfo = this.languageService.getQuickInfoAtPosition(this.activeFile.fileName, this.currentCaretPosition);
            var actualQuickInfoText = ts.displayPartsToString(actualQuickInfo === null || actualQuickInfo === void 0 ? void 0 : actualQuickInfo.displayParts);
            var actualQuickInfoDocumentation = ts.displayPartsToString(actualQuickInfo === null || actualQuickInfo === void 0 ? void 0 : actualQuickInfo.documentation);
            var actualQuickInfoTags = (_a = actualQuickInfo === null || actualQuickInfo === void 0 ? void 0 : actualQuickInfo.tags) === null || _a === void 0 ? void 0 : _a.map(function (tag) { return ({ name: tag.name, text: ts.displayPartsToString(tag.text) }); });
            assert.equal(actualQuickInfoText, expectedText, this.messageAtLastKnownMarker("quick info text"));
            assert.equal(actualQuickInfoDocumentation, expectedDocumentation || "", this.assertionMessageAtLastKnownMarker("quick info doc"));
            if (!expectedTags) {
                // Skip if `expectedTags` is not given
            }
            else if (!actualQuickInfoTags) {
                assert.equal(actualQuickInfoTags, expectedTags, this.messageAtLastKnownMarker("QuickInfo tags"));
            }
            else {
                ts.zipWith(expectedTags, actualQuickInfoTags, function (expectedTag, actualTag) {
                    assert.equal(expectedTag.name, actualTag.name);
                    assert.equal(expectedTag.text, actualTag.text, _this.messageAtLastKnownMarker("QuickInfo tag " + actualTag.name));
                });
            }
        };
        TestState.prototype.verifyQuickInfoDisplayParts = function (kind, kindModifiers, textSpan, displayParts, documentation, tags) {
            var _this = this;
            var actualQuickInfo = this.languageService.getQuickInfoAtPosition(this.activeFile.fileName, this.currentCaretPosition);
            assert.equal(actualQuickInfo.kind, kind, this.messageAtLastKnownMarker("QuickInfo kind"));
            assert.equal(actualQuickInfo.kindModifiers, kindModifiers, this.messageAtLastKnownMarker("QuickInfo kindModifiers"));
            assert.equal(JSON.stringify(actualQuickInfo.textSpan), JSON.stringify(textSpan), this.messageAtLastKnownMarker("QuickInfo textSpan"));
            assert.equal(TestState.getDisplayPartsJson(actualQuickInfo.displayParts), TestState.getDisplayPartsJson(displayParts), this.messageAtLastKnownMarker("QuickInfo displayParts"));
            assert.equal(TestState.getDisplayPartsJson(actualQuickInfo.documentation), TestState.getDisplayPartsJson(documentation), this.messageAtLastKnownMarker("QuickInfo documentation"));
            if (!actualQuickInfo.tags || !tags) {
                assert.equal(actualQuickInfo.tags, tags, this.messageAtLastKnownMarker("QuickInfo tags"));
            }
            else {
                assert.equal(actualQuickInfo.tags.length, tags.length, this.messageAtLastKnownMarker("QuickInfo tags"));
                ts.zipWith(tags, actualQuickInfo.tags, function (expectedTag, actualTag) {
                    assert.equal(expectedTag.name, actualTag.name);
                    assert.equal(expectedTag.text, actualTag.text, _this.messageAtLastKnownMarker("QuickInfo tag " + actualTag.name));
                });
            }
        };
        TestState.prototype.verifyRangesAreRenameLocations = function (options) {
            if (ts.isArray(options)) {
                this.verifyRenameLocations(options, options);
            }
            else {
                var ranges = options && options.ranges || this.getRanges();
                this.verifyRenameLocations(ranges, __assign({ ranges: ranges }, options));
            }
        };
        TestState.prototype.verifyRenameLocations = function (startRanges, options) {
            var _this = this;
            var _a = ts.isArray(options)
                ? { findInStrings: false, findInComments: false, ranges: options, providePrefixAndSuffixTextForRename: true }
                : options, _b = _a.findInStrings, findInStrings = _b === void 0 ? false : _b, _c = _a.findInComments, findInComments = _c === void 0 ? false : _c, _d = _a.ranges, ranges = _d === void 0 ? this.getRanges() : _d, _e = _a.providePrefixAndSuffixTextForRename, providePrefixAndSuffixTextForRename = _e === void 0 ? true : _e;
            var _startRanges = toArray(startRanges);
            assert(_startRanges.length);
            for (var _i = 0, _startRanges_1 = _startRanges; _i < _startRanges_1.length; _i++) {
                var startRange = _startRanges_1[_i];
                this.goToRangeStart(startRange);
                var renameInfo = this.languageService.getRenameInfo(this.activeFile.fileName, this.currentCaretPosition, { providePrefixAndSuffixTextForRename: providePrefixAndSuffixTextForRename });
                if (!renameInfo.canRename) {
                    this.raiseError("Expected rename to succeed, but it actually failed.");
                    break;
                }
                var references = this.languageService.findRenameLocations(this.activeFile.fileName, this.currentCaretPosition, findInStrings, findInComments, providePrefixAndSuffixTextForRename);
                var sort = function (locations) {
                    return locations && ts.sort(locations, function (r1, r2) { return ts.compareStringsCaseSensitive(r1.fileName, r2.fileName) || r1.textSpan.start - r2.textSpan.start; });
                };
                assert.deepEqual(sort(references), sort(ranges.map(function (rangeOrOptions) {
                    var _a = "range" in rangeOrOptions ? rangeOrOptions : { range: rangeOrOptions }, range = _a.range, prefixSuffixText = __rest(_a, ["range"]); // eslint-disable-line local/no-in-operator
                    var _b = (range.marker && range.marker.data || {}), contextRangeIndex = _b.contextRangeIndex, contextRangeDelta = _b.contextRangeDelta, contextRangeId = _b.contextRangeId;
                    var contextSpan;
                    if (contextRangeDelta !== undefined) {
                        var allRanges = _this.getRanges();
                        var index = allRanges.indexOf(range);
                        if (index !== -1) {
                            contextSpan = ts.createTextSpanFromRange(allRanges[index + contextRangeDelta]);
                        }
                    }
                    else if (contextRangeId !== undefined) {
                        var allRanges = _this.getRanges();
                        var contextRange = ts.find(allRanges, function (range) { var _a, _b; return ((_b = (_a = range.marker) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.id) === contextRangeId; });
                        if (contextRange) {
                            contextSpan = ts.createTextSpanFromRange(contextRange);
                        }
                    }
                    else if (contextRangeIndex !== undefined) {
                        contextSpan = ts.createTextSpanFromRange(_this.getRanges()[contextRangeIndex]);
                    }
                    return __assign(__assign({ fileName: range.fileName, textSpan: ts.createTextSpanFromRange(range) }, (contextSpan ? { contextSpan: contextSpan } : undefined)), prefixSuffixText);
                })));
            }
        };
        TestState.prototype.baselineRename = function (marker, options) {
            var _this = this;
            var _a, _b;
            var _c = this.getMarkerByName(marker), fileName = _c.fileName, position = _c.position;
            var locations = this.languageService.findRenameLocations(fileName, position, (_a = options.findInStrings) !== null && _a !== void 0 ? _a : false, (_b = options.findInComments) !== null && _b !== void 0 ? _b : false, options.providePrefixAndSuffixTextForRename);
            if (!locations) {
                this.raiseError("baselineRename failed. Could not rename at the provided position.");
            }
            var renamesByFile = ts.group(locations, function (l) { return l.fileName; });
            var baselineContent = renamesByFile.map(function (renames) {
                var fileName = renames[0].fileName;
                var sortedRenames = ts.sort(renames, function (a, b) { return b.textSpan.start - a.textSpan.start; });
                var baselineFileContent = _this.getFileContent(fileName);
                for (var _i = 0, sortedRenames_1 = sortedRenames; _i < sortedRenames_1.length; _i++) {
                    var textSpan = sortedRenames_1[_i].textSpan;
                    var isOriginalSpan = fileName === _this.activeFile.fileName && ts.textSpanIntersectsWithPosition(textSpan, position);
                    baselineFileContent =
                        baselineFileContent.slice(0, textSpan.start) +
                            (isOriginalSpan ? "[|RENAME|]" : "RENAME") +
                            baselineFileContent.slice(textSpan.start + textSpan.length);
                }
                return "/*====== ".concat(fileName, " ======*/\n\n").concat(baselineFileContent);
            }).join("\n\n") + "\n";
            Harness.Baseline.runBaseline(this.getBaselineFileNameForContainingTestFile(), baselineContent);
        };
        TestState.prototype.verifyQuickInfoExists = function (negative) {
            var actualQuickInfo = this.languageService.getQuickInfoAtPosition(this.activeFile.fileName, this.currentCaretPosition);
            if (negative) {
                if (actualQuickInfo) {
                    this.raiseError("verifyQuickInfoExists failed. Expected quick info NOT to exist");
                }
            }
            else {
                if (!actualQuickInfo) {
                    this.raiseError("verifyQuickInfoExists failed. Expected quick info to exist");
                }
            }
        };
        TestState.prototype.verifySignatureHelpPresence = function (expectPresent, triggerReason, markers) {
            if (markers.length) {
                for (var _i = 0, markers_1 = markers; _i < markers_1.length; _i++) {
                    var marker = markers_1[_i];
                    this.goToMarker(marker);
                    this.verifySignatureHelpPresence(expectPresent, triggerReason, ts.emptyArray);
                }
                return;
            }
            var actual = this.getSignatureHelp({ triggerReason: triggerReason });
            if (expectPresent !== !!actual) {
                if (actual) {
                    this.raiseError("Expected no signature help, but got \"".concat(stringify(actual), "\""));
                }
                else {
                    this.raiseError("Expected signature help, but none was returned.");
                }
            }
        };
        TestState.prototype.verifySignatureHelp = function (optionses) {
            for (var _i = 0, optionses_1 = optionses; _i < optionses_1.length; _i++) {
                var options = optionses_1[_i];
                if (options.marker === undefined) {
                    this.verifySignatureHelpWorker(options);
                }
                else {
                    for (var _a = 0, _b = toArray(options.marker); _a < _b.length; _a++) {
                        var marker = _b[_a];
                        this.goToMarker(marker);
                        this.verifySignatureHelpWorker(options);
                    }
                }
            }
        };
        TestState.prototype.verifySignatureHelpWorker = function (options) {
            var _this = this;
            var _a;
            var help = this.getSignatureHelp({ triggerReason: options.triggerReason });
            if (!help) {
                this.raiseError("Could not get a help signature");
            }
            var selectedItem = help.items[(_a = options.overrideSelectedItemIndex) !== null && _a !== void 0 ? _a : help.selectedItemIndex];
            // Argument index may exceed number of parameters
            var currentParameter = selectedItem.parameters[help.argumentIndex];
            assert.equal(help.items.length, options.overloadsCount || 1, this.assertionMessageAtLastKnownMarker("signature help overloads count"));
            assert.equal(ts.displayPartsToString(selectedItem.documentation), options.docComment || "", this.assertionMessageAtLastKnownMarker("current signature help doc comment"));
            if (options.text !== undefined) {
                assert.equal(ts.displayPartsToString(selectedItem.prefixDisplayParts) +
                    selectedItem.parameters.map(function (p) { return ts.displayPartsToString(p.displayParts); }).join(ts.displayPartsToString(selectedItem.separatorDisplayParts)) +
                    ts.displayPartsToString(selectedItem.suffixDisplayParts), options.text);
            }
            if (options.parameterName !== undefined) {
                assert.equal(currentParameter.name, options.parameterName);
            }
            if (options.parameterSpan !== undefined) {
                assert.equal(ts.displayPartsToString(currentParameter.displayParts), options.parameterSpan);
            }
            if (currentParameter) {
                assert.equal(ts.displayPartsToString(currentParameter.documentation), options.parameterDocComment || "", this.assertionMessageAtLastKnownMarker("current parameter Help DocComment"));
            }
            if (options.parameterCount !== undefined) {
                assert.equal(selectedItem.parameters.length, options.parameterCount);
            }
            if (options.argumentCount !== undefined) {
                assert.equal(help.argumentCount, options.argumentCount);
            }
            assert.equal(selectedItem.isVariadic, !!options.isVariadic);
            var actualTags = selectedItem.tags;
            assert.equal(actualTags.length, (options.tags || ts.emptyArray).length, this.assertionMessageAtLastKnownMarker("signature help tags"));
            ts.zipWith((options.tags || ts.emptyArray), actualTags, function (expectedTag, actualTag) {
                assert.equal(actualTag.name, expectedTag.name);
                assert.deepEqual(actualTag.text, expectedTag.text, _this.assertionMessageAtLastKnownMarker("signature help tag " + actualTag.name));
            });
            var allKeys = [
                "marker",
                "triggerReason",
                "overloadsCount",
                "docComment",
                "text",
                "parameterName",
                "parameterSpan",
                "parameterDocComment",
                "parameterCount",
                "isVariadic",
                "tags",
                "argumentCount",
                "overrideSelectedItemIndex"
            ];
            for (var key in options) {
                if (!ts.contains(allKeys, key)) {
                    ts.Debug.fail("Unexpected key " + key);
                }
            }
        };
        TestState.prototype.validate = function (name, expected, actual) {
            if (expected && expected !== actual) {
                this.raiseError("Expected " + name + " '" + expected + "'.  Got '" + actual + "' instead.");
            }
        };
        TestState.prototype.verifyRenameInfoSucceeded = function (displayName, fullDisplayName, kind, kindModifiers, fileToRename, expectedRange, preferences) {
            var renameInfo = this.languageService.getRenameInfo(this.activeFile.fileName, this.currentCaretPosition, preferences || { allowRenameOfImportPath: true });
            if (!renameInfo.canRename) {
                throw this.raiseError("Rename did not succeed");
            }
            this.validate("displayName", displayName, renameInfo.displayName);
            this.validate("fullDisplayName", fullDisplayName, renameInfo.fullDisplayName);
            this.validate("kind", kind, renameInfo.kind);
            this.validate("kindModifiers", kindModifiers, renameInfo.kindModifiers);
            this.validate("fileToRename", fileToRename, renameInfo.fileToRename);
            if (!expectedRange) {
                if (this.getRanges().length !== 1) {
                    this.raiseError("Expected a single range to be selected in the test file.");
                }
                expectedRange = this.getRanges()[0];
            }
            if (renameInfo.triggerSpan.start !== expectedRange.pos ||
                ts.textSpanEnd(renameInfo.triggerSpan) !== expectedRange.end) {
                this.raiseError("Expected triggerSpan [" + expectedRange.pos + "," + expectedRange.end + ").  Got [" +
                    renameInfo.triggerSpan.start + "," + ts.textSpanEnd(renameInfo.triggerSpan) + ") instead.");
            }
        };
        TestState.prototype.verifyRenameInfoFailed = function (message, preferences) {
            var allowRenameOfImportPath = (preferences === null || preferences === void 0 ? void 0 : preferences.allowRenameOfImportPath) === undefined ? true : preferences.allowRenameOfImportPath;
            var renameInfo = this.languageService.getRenameInfo(this.activeFile.fileName, this.currentCaretPosition, __assign(__assign({}, preferences), { allowRenameOfImportPath: allowRenameOfImportPath }));
            if (renameInfo.canRename) {
                throw this.raiseError("Rename was expected to fail");
            }
            this.validate("error", message, renameInfo.localizedErrorMessage);
        };
        TestState.prototype.spanLines = function (file, spanInfo, _a) {
            var _b = _a === void 0 ? {} : _a, _c = _b.selection, selection = _c === void 0 ? false : _c, _d = _b.fullLines, fullLines = _d === void 0 ? false : _d, _e = _b.lineNumbers, lineNumbers = _e === void 0 ? false : _e;
            if (selection) {
                fullLines = true;
            }
            var contextStartPos = spanInfo.start;
            var contextEndPos = contextStartPos + spanInfo.length;
            if (fullLines) {
                if (contextStartPos > 0) {
                    while (contextStartPos > 1) {
                        var ch = file.content.charCodeAt(contextStartPos - 1);
                        if (ch === 10 /* ts.CharacterCodes.lineFeed */ || ch === 13 /* ts.CharacterCodes.carriageReturn */) {
                            break;
                        }
                        contextStartPos--;
                    }
                }
                if (contextEndPos < file.content.length) {
                    while (contextEndPos < file.content.length - 1) {
                        var ch = file.content.charCodeAt(contextEndPos);
                        if (ch === 10 /* ts.CharacterCodes.lineFeed */ || ch === 13 /* ts.CharacterCodes.carriageReturn */) {
                            break;
                        }
                        contextEndPos++;
                    }
                }
            }
            var contextString;
            var contextLineMap;
            var contextStart;
            var contextEnd;
            var selectionStart;
            var selectionEnd;
            var lineNumberPrefixLength;
            if (lineNumbers) {
                contextString = file.content;
                contextLineMap = ts.computeLineStarts(contextString);
                contextStart = ts.computeLineAndCharacterOfPosition(contextLineMap, contextStartPos);
                contextEnd = ts.computeLineAndCharacterOfPosition(contextLineMap, contextEndPos);
                selectionStart = ts.computeLineAndCharacterOfPosition(contextLineMap, spanInfo.start);
                selectionEnd = ts.computeLineAndCharacterOfPosition(contextLineMap, ts.textSpanEnd(spanInfo));
                lineNumberPrefixLength = (contextEnd.line + 1).toString().length + 2;
            }
            else {
                contextString = file.content.substring(contextStartPos, contextEndPos);
                contextLineMap = ts.computeLineStarts(contextString);
                contextStart = { line: 0, character: 0 };
                contextEnd = { line: contextLineMap.length - 1, character: 0 };
                selectionStart = selection ? ts.computeLineAndCharacterOfPosition(contextLineMap, spanInfo.start - contextStartPos) : contextStart;
                selectionEnd = selection ? ts.computeLineAndCharacterOfPosition(contextLineMap, ts.textSpanEnd(spanInfo) - contextStartPos) : contextEnd;
                lineNumberPrefixLength = 0;
            }
            var output = [];
            for (var lineNumber = contextStart.line; lineNumber <= contextEnd.line; lineNumber++) {
                var spanLine = contextString.substring(contextLineMap[lineNumber], contextLineMap[lineNumber + 1]);
                output.push(lineNumbers ? "".concat(ts.padLeft("".concat(lineNumber + 1, ": "), lineNumberPrefixLength)).concat(spanLine) : spanLine);
                if (selection) {
                    if (lineNumber < selectionStart.line || lineNumber > selectionEnd.line) {
                        continue;
                    }
                    var isEmpty = selectionStart.line === selectionEnd.line && selectionStart.character === selectionEnd.character;
                    var selectionPadLength = lineNumber === selectionStart.line ? selectionStart.character : 0;
                    var selectionPad = " ".repeat(selectionPadLength + lineNumberPrefixLength);
                    var selectionLength = isEmpty ? 0 : Math.max(lineNumber < selectionEnd.line ? spanLine.trimRight().length - selectionPadLength : selectionEnd.character - selectionPadLength, 1);
                    var selectionLine = isEmpty ? "<" : "^".repeat(selectionLength);
                    output.push("".concat(selectionPad).concat(selectionLine));
                }
            }
            return output;
        };
        TestState.prototype.spanInfoToString = function (spanInfo, prefixString, file) {
            if (file === void 0) { file = this.activeFile; }
            var resultString = "SpanInfo: " + JSON.stringify(spanInfo);
            if (spanInfo) {
                var spanLines = this.spanLines(file, spanInfo);
                for (var i = 0; i < spanLines.length; i++) {
                    if (!i) {
                        resultString += "\n";
                    }
                    resultString += prefixString + spanLines[i];
                }
                resultString += "\n" + prefixString + ":=> (" + this.getLineColStringAtPosition(spanInfo.start, file) + ") to (" + this.getLineColStringAtPosition(ts.textSpanEnd(spanInfo), file) + ")";
            }
            return resultString;
        };
        TestState.prototype.baselineCurrentFileLocations = function (getSpanAtPos) {
            var _this = this;
            var fileLineMap = ts.computeLineStarts(this.activeFile.content);
            var nextLine = 0;
            var resultString = "";
            var currentLine;
            var previousSpanInfo;
            var startColumn;
            var length;
            var prefixString = "    >";
            var pos = 0;
            var addSpanInfoString = function () {
                if (previousSpanInfo) {
                    resultString += currentLine;
                    var thisLineMarker = ts.repeatString(" ", startColumn) + ts.repeatString("~", length);
                    thisLineMarker += ts.repeatString(" ", _this.alignmentForExtraInfo - thisLineMarker.length - prefixString.length + 1);
                    resultString += thisLineMarker;
                    resultString += "=> Pos: (" + (pos - length) + " to " + (pos - 1) + ") ";
                    resultString += " " + previousSpanInfo;
                    previousSpanInfo = undefined;
                }
            };
            for (; pos < this.activeFile.content.length; pos++) {
                if (pos === 0 || pos === fileLineMap[nextLine]) {
                    nextLine++;
                    addSpanInfoString();
                    if (resultString.length) {
                        resultString += "\n--------------------------------";
                    }
                    currentLine = "\n" + nextLine.toString() + ts.repeatString(" ", 3 - nextLine.toString().length) + ">" + this.activeFile.content.substring(pos, fileLineMap[nextLine]) + "\n    ";
                    startColumn = 0;
                    length = 0;
                }
                var spanInfo = this.spanInfoToString(getSpanAtPos(pos), prefixString);
                if (previousSpanInfo && previousSpanInfo !== spanInfo) {
                    addSpanInfoString();
                    previousSpanInfo = spanInfo;
                    startColumn = startColumn + length;
                    length = 1;
                }
                else {
                    previousSpanInfo = spanInfo;
                    length++;
                }
            }
            addSpanInfoString();
            return resultString;
        };
        TestState.prototype.getBreakpointStatementLocation = function (pos) {
            return this.languageService.getBreakpointStatementAtPosition(this.activeFile.fileName, pos);
        };
        TestState.prototype.baselineCurrentFileBreakpointLocations = function () {
            var _this = this;
            var baselineFile = this.getBaselineFileNameForInternalFourslashFile().replace("breakpointValidation", "bpSpan");
            Harness.Baseline.runBaseline(baselineFile, this.baselineCurrentFileLocations(function (pos) { return _this.getBreakpointStatementLocation(pos); }));
        };
        TestState.prototype.getEmitFiles = function () {
            // Find file to be emitted
            var emitFiles = []; // List of FourSlashFile that has emitThisFile flag on
            var allFourSlashFiles = this.testData.files;
            for (var _i = 0, allFourSlashFiles_1 = allFourSlashFiles; _i < allFourSlashFiles_1.length; _i++) {
                var file = allFourSlashFiles_1[_i];
                if (file.fileOptions["emitthisfile" /* MetadataOptionNames.emitThisFile */] === "true") {
                    // Find a file with the flag emitThisFile turned on
                    emitFiles.push(file);
                }
            }
            // If there is not emiThisFile flag specified in the test file, throw an error
            if (emitFiles.length === 0) {
                this.raiseError("No emitThisFile is specified in the test file");
            }
            return emitFiles;
        };
        TestState.prototype.verifyGetEmitOutput = function (expectedOutputFiles) {
            var _this = this;
            var outputFiles = ts.flatMap(this.getEmitFiles(), function (e) { return _this.languageService.getEmitOutput(e.fileName).outputFiles; });
            assert.deepEqual(outputFiles.map(function (f) { return f.name; }), expectedOutputFiles);
            for (var _i = 0, outputFiles_1 = outputFiles; _i < outputFiles_1.length; _i++) {
                var _a = outputFiles_1[_i], name = _a.name, text = _a.text;
                var fromTestFile = this.getFileContent(name);
                if (fromTestFile !== text) {
                    this.raiseError("Emit output for ".concat(name, " is not as expected: ").concat(showTextDiff(fromTestFile, text)));
                }
            }
        };
        TestState.prototype.baselineGetEmitOutput = function () {
            var resultString = "";
            // Loop through all the emittedFiles and emit them one by one
            for (var _i = 0, _a = this.getEmitFiles(); _i < _a.length; _i++) {
                var emitFile = _a[_i];
                var emitOutput = this.languageService.getEmitOutput(emitFile.fileName);
                // Print emitOutputStatus in readable format
                resultString += "EmitSkipped: " + emitOutput.emitSkipped + Harness.IO.newLine();
                if (emitOutput.emitSkipped) {
                    resultString += "Diagnostics:" + Harness.IO.newLine();
                    var diagnostics = ts.getPreEmitDiagnostics(this.languageService.getProgram()); // TODO: GH#18217
                    for (var _b = 0, diagnostics_1 = diagnostics; _b < diagnostics_1.length; _b++) {
                        var diagnostic = diagnostics_1[_b];
                        if (!ts.isString(diagnostic.messageText)) {
                            resultString += this.flattenChainedMessage(diagnostic.messageText);
                        }
                        else {
                            resultString += "  " + diagnostic.messageText + Harness.IO.newLine();
                        }
                    }
                }
                for (var _c = 0, _d = emitOutput.outputFiles; _c < _d.length; _c++) {
                    var outputFile = _d[_c];
                    var fileName = "FileName : " + outputFile.name + Harness.IO.newLine();
                    resultString = resultString + Harness.IO.newLine() + fileName + outputFile.text;
                }
                resultString += Harness.IO.newLine();
            }
            Harness.Baseline.runBaseline(ts.Debug.checkDefined(this.testData.globalOptions["baselinefile" /* MetadataOptionNames.baselineFile */]), resultString);
        };
        TestState.prototype.flattenChainedMessage = function (diag, indent) {
            if (indent === void 0) { indent = " "; }
            var result = "";
            result += indent + diag.messageText + Harness.IO.newLine();
            if (diag.next) {
                for (var _i = 0, _a = diag.next; _i < _a.length; _i++) {
                    var kid = _a[_i];
                    result += this.flattenChainedMessage(kid, indent + " ");
                }
            }
            return result;
        };
        TestState.prototype.baselineSyntacticDiagnostics = function () {
            var files = this.getCompilerTestFiles();
            var result = this.getSyntacticDiagnosticBaselineText(files);
            Harness.Baseline.runBaseline(this.getBaselineFileNameForContainingTestFile(), result);
        };
        TestState.prototype.getCompilerTestFiles = function () {
            return ts.map(this.testData.files, function (_a) {
                var content = _a.content, fileName = _a.fileName;
                return ({
                    content: content,
                    unitName: fileName
                });
            });
        };
        TestState.prototype.baselineSyntacticAndSemanticDiagnostics = function () {
            var files = ts.filter(this.getCompilerTestFiles(), function (f) { return !ts.endsWith(f.unitName, ".json"); });
            var result = this.getSyntacticDiagnosticBaselineText(files)
                + Harness.IO.newLine()
                + Harness.IO.newLine()
                + this.getSemanticDiagnosticBaselineText(files);
            Harness.Baseline.runBaseline(this.getBaselineFileNameForContainingTestFile(), result);
        };
        TestState.prototype.getSyntacticDiagnosticBaselineText = function (files) {
            var _this = this;
            var diagnostics = ts.flatMap(files, function (file) { return _this.languageService.getSyntacticDiagnostics(file.unitName); });
            var result = "Syntactic Diagnostics for file '".concat(this.originalInputFileName, "':")
                + Harness.IO.newLine()
                + Harness.Compiler.getErrorBaseline(files, diagnostics, /*pretty*/ false);
            return result;
        };
        TestState.prototype.getSemanticDiagnosticBaselineText = function (files) {
            var _this = this;
            var diagnostics = ts.flatMap(files, function (file) { return _this.languageService.getSemanticDiagnostics(file.unitName); });
            var result = "Semantic Diagnostics for file '".concat(this.originalInputFileName, "':")
                + Harness.IO.newLine()
                + Harness.Compiler.getErrorBaseline(files, diagnostics, /*pretty*/ false);
            return result;
        };
        TestState.prototype.baselineQuickInfo = function () {
            var _this = this;
            var baselineFile = this.getBaselineFileNameForContainingTestFile();
            var result = ts.arrayFrom(this.testData.markerPositions.entries(), function (_a) {
                var name = _a[0], marker = _a[1];
                return ({
                    marker: __assign(__assign({}, marker), { name: name }),
                    quickInfo: _this.languageService.getQuickInfoAtPosition(marker.fileName, marker.position)
                });
            });
            Harness.Baseline.runBaseline(baselineFile, stringify(result));
        };
        TestState.prototype.baselineSignatureHelp = function () {
            var _this = this;
            var baselineFile = this.getBaselineFileNameForContainingTestFile();
            var result = ts.arrayFrom(this.testData.markerPositions.entries(), function (_a) {
                var name = _a[0], marker = _a[1];
                return ({
                    marker: __assign(__assign({}, marker), { name: name }),
                    signatureHelp: _this.languageService.getSignatureHelpItems(marker.fileName, marker.position, /*options*/ undefined)
                });
            });
            Harness.Baseline.runBaseline(baselineFile, stringify(result));
        };
        TestState.prototype.baselineCompletions = function (preferences) {
            var _this = this;
            var baselineFile = this.getBaselineFileNameForContainingTestFile();
            var result = ts.arrayFrom(this.testData.markerPositions.entries(), function (_a) {
                var name = _a[0], marker = _a[1];
                _this.goToMarker(marker);
                var completions = _this.getCompletionListAtCaret(preferences);
                return {
                    marker: __assign(__assign({}, marker), { name: name }),
                    completionList: __assign(__assign({}, completions), { entries: completions === null || completions === void 0 ? void 0 : completions.entries.map(function (entry) { return (__assign(__assign({}, entry), _this.getCompletionEntryDetails(entry.name, entry.source, entry.data, preferences))); }) })
                };
            });
            Harness.Baseline.runBaseline(baselineFile, stringify(result));
        };
        TestState.prototype.baselineSmartSelection = function () {
            var _this = this;
            var n = "\n";
            var baselineFile = this.getBaselineFileNameForContainingTestFile();
            var markers = this.getMarkers();
            var fileContent = this.activeFile.content;
            var text = markers.map(function (marker) {
                var baselineContent = [fileContent.slice(0, marker.position) + "/**/" + fileContent.slice(marker.position) + n];
                var selectionRange = _this.languageService.getSmartSelectionRange(_this.activeFile.fileName, marker.position);
                var _loop_10 = function () {
                    var textSpan = selectionRange.textSpan;
                    var masked = Array.from(fileContent).map(function (char, index) {
                        var charCode = char.charCodeAt(0);
                        if (index >= textSpan.start && index < ts.textSpanEnd(textSpan)) {
                            return char === " " ? "•" : ts.isLineBreak(charCode) ? "\u21B2".concat(n) : char;
                        }
                        return ts.isLineBreak(charCode) ? char : " ";
                    }).join("");
                    masked = masked.replace(/^\s*$\r?\n?/gm, ""); // Remove blank lines
                    var isRealCharacter = function (char) { return char !== "•" && char !== "↲" && !ts.isWhiteSpaceLike(char.charCodeAt(0)); };
                    var leadingWidth = Array.from(masked).findIndex(isRealCharacter);
                    var trailingWidth = ts.findLastIndex(Array.from(masked), isRealCharacter);
                    masked = masked.slice(0, leadingWidth)
                        + masked.slice(leadingWidth, trailingWidth).replace(/•/g, " ").replace(/↲/g, "")
                        + masked.slice(trailingWidth);
                    baselineContent.push(masked);
                    selectionRange = selectionRange.parent;
                };
                while (selectionRange) {
                    _loop_10();
                }
                return baselineContent.join(fileContent.includes("\n") ? n + n : n);
            }).join(n.repeat(2) + "=".repeat(80) + n.repeat(2));
            Harness.Baseline.runBaseline(baselineFile, text);
        };
        TestState.prototype.printBreakpointLocation = function (pos) {
            Harness.IO.log("\n**Pos: " + pos + " " + this.spanInfoToString(this.getBreakpointStatementLocation(pos), "  "));
        };
        TestState.prototype.printBreakpointAtCurrentLocation = function () {
            this.printBreakpointLocation(this.currentCaretPosition);
        };
        TestState.prototype.printCurrentParameterHelp = function () {
            var help = this.languageService.getSignatureHelpItems(this.activeFile.fileName, this.currentCaretPosition, /*options*/ undefined);
            Harness.IO.log(stringify(help));
        };
        TestState.prototype.printCurrentQuickInfo = function () {
            var quickInfo = this.languageService.getQuickInfoAtPosition(this.activeFile.fileName, this.currentCaretPosition);
            Harness.IO.log("Quick Info: " + quickInfo.displayParts.map(function (part) { return part.text; }).join(""));
        };
        TestState.prototype.printErrorList = function () {
            var syntacticErrors = this.languageService.getSyntacticDiagnostics(this.activeFile.fileName);
            var semanticErrors = this.languageService.getSemanticDiagnostics(this.activeFile.fileName);
            var errorList = ts.concatenate(syntacticErrors, semanticErrors);
            Harness.IO.log("Error list (".concat(errorList.length, " errors)"));
            if (errorList.length) {
                errorList.forEach(function (err) {
                    Harness.IO.log("start: " + err.start +
                        ", length: " + err.length +
                        ", message: " + ts.flattenDiagnosticMessageText(err.messageText, Harness.IO.newLine()));
                });
            }
        };
        TestState.prototype.printCurrentFileState = function (showWhitespace, makeCaretVisible) {
            for (var _i = 0, _a = this.testData.files; _i < _a.length; _i++) {
                var file = _a[_i];
                var active = (this.activeFile === file);
                Harness.IO.log("=== Script (".concat(file.fileName, ") ").concat((active ? "(active, cursor at |)" : ""), " ==="));
                var content = this.getFileContent(file.fileName);
                if (active) {
                    content = content.substr(0, this.currentCaretPosition) + (makeCaretVisible ? "|" : "") + content.substr(this.currentCaretPosition);
                }
                if (showWhitespace) {
                    content = makeWhitespaceVisible(content);
                }
                Harness.IO.log(content);
            }
        };
        TestState.prototype.printCurrentSignatureHelp = function () {
            var help = this.getSignatureHelp(ts.emptyOptions);
            Harness.IO.log(stringify(help.items[help.selectedItemIndex]));
        };
        TestState.prototype.getBaselineFileNameForInternalFourslashFile = function (ext) {
            if (ext === void 0) { ext = ".baseline"; }
            return this.testData.globalOptions["baselinefile" /* MetadataOptionNames.baselineFile */] ||
                ts.getBaseFileName(this.activeFile.fileName).replace(".ts" /* ts.Extension.Ts */, ext);
        };
        TestState.prototype.getBaselineFileNameForContainingTestFile = function (ext) {
            if (ext === void 0) { ext = ".baseline"; }
            return this.testData.globalOptions["baselinefile" /* MetadataOptionNames.baselineFile */] ||
                ts.getBaseFileName(this.originalInputFileName).replace(".ts" /* ts.Extension.Ts */, ext);
        };
        TestState.prototype.getSignatureHelp = function (_a) {
            var triggerReason = _a.triggerReason;
            return this.languageService.getSignatureHelpItems(this.activeFile.fileName, this.currentCaretPosition, {
                triggerReason: triggerReason
            });
        };
        TestState.prototype.printCompletionListMembers = function (preferences) {
            var completions = this.getCompletionListAtCaret(preferences);
            this.printMembersOrCompletions(completions);
        };
        TestState.prototype.printMembersOrCompletions = function (info) {
            if (info === undefined)
                return "No completion info.";
            var entries = info.entries;
            function pad(s, length) {
                return s + new Array(length - s.length + 1).join(" ");
            }
            function max(arr, selector) {
                return arr.reduce(function (prev, x) { return Math.max(prev, selector(x)); }, 0);
            }
            var longestNameLength = max(entries, function (m) { return m.name.length; });
            var longestKindLength = max(entries, function (m) { return m.kind.length; });
            entries.sort(function (m, n) { return m.sortText > n.sortText ? 1 : m.sortText < n.sortText ? -1 : m.name > n.name ? 1 : m.name < n.name ? -1 : 0; });
            var membersString = entries.map(function (m) { return "".concat(pad(m.name, longestNameLength), " ").concat(pad(m.kind, longestKindLength), " ").concat(m.kindModifiers, " ").concat(m.isRecommended ? "recommended " : "").concat(m.source === undefined ? "" : m.source); }).join("\n");
            Harness.IO.log(membersString);
        };
        TestState.prototype.printContext = function () {
            ts.forEach(this.languageServiceAdapterHost.getFilenames(), Harness.IO.log);
        };
        TestState.prototype.deleteChar = function (count) {
            if (count === void 0) { count = 1; }
            var offset = this.currentCaretPosition;
            var ch = "";
            var checkCadence = (count >> 2) + 1;
            for (var i = 0; i < count; i++) {
                this.editScriptAndUpdateMarkers(this.activeFile.fileName, offset, offset + 1, ch);
                if (i % checkCadence === 0) {
                    this.checkPostEditInvariants();
                }
                // Handle post-keystroke formatting
                if (this.enableFormatting) {
                    var edits = this.languageService.getFormattingEditsAfterKeystroke(this.activeFile.fileName, offset, ch, this.formatCodeSettings);
                    if (edits.length) {
                        offset += this.applyEdits(this.activeFile.fileName, edits);
                    }
                }
            }
            this.checkPostEditInvariants();
        };
        TestState.prototype.replace = function (start, length, text) {
            this.editScriptAndUpdateMarkers(this.activeFile.fileName, start, start + length, text);
            this.checkPostEditInvariants();
        };
        TestState.prototype.deleteLineRange = function (startIndex, endIndexInclusive) {
            var startPos = this.languageServiceAdapterHost.lineAndCharacterToPosition(this.activeFile.fileName, { line: startIndex, character: 0 });
            var endPos = this.languageServiceAdapterHost.lineAndCharacterToPosition(this.activeFile.fileName, { line: endIndexInclusive + 1, character: 0 });
            this.replace(startPos, endPos - startPos, "");
        };
        TestState.prototype.deleteCharBehindMarker = function (count) {
            if (count === void 0) { count = 1; }
            var offset = this.currentCaretPosition;
            var ch = "";
            var checkCadence = (count >> 2) + 1;
            for (var i = 0; i < count; i++) {
                this.currentCaretPosition--;
                offset--;
                this.editScriptAndUpdateMarkers(this.activeFile.fileName, offset, offset + 1, ch);
                if (i % checkCadence === 0) {
                    this.checkPostEditInvariants();
                }
                // Don't need to examine formatting because there are no formatting changes on backspace.
            }
            this.checkPostEditInvariants();
        };
        // Enters lines of text at the current caret position
        TestState.prototype.type = function (text, highFidelity) {
            if (highFidelity === void 0) { highFidelity = false; }
            var offset = this.currentCaretPosition;
            var prevChar = " ";
            var checkCadence = (text.length >> 2) + 1;
            var selection = this.getSelection();
            this.replace(selection.pos, selection.end - selection.pos, "");
            for (var i = 0; i < text.length; i++) {
                var ch = text.charAt(i);
                this.editScriptAndUpdateMarkers(this.activeFile.fileName, offset, offset, ch);
                if (highFidelity) {
                    this.languageService.getBraceMatchingAtPosition(this.activeFile.fileName, offset);
                }
                this.currentCaretPosition++;
                offset++;
                if (highFidelity) {
                    if (ch === "(" || ch === "," || ch === "<") {
                        /* Signature help*/
                        this.languageService.getSignatureHelpItems(this.activeFile.fileName, offset, {
                            triggerReason: {
                                kind: "characterTyped",
                                triggerCharacter: ch
                            }
                        });
                    }
                    else if (prevChar === " " && /A-Za-z_/.test(ch)) {
                        /* Completions */
                        this.languageService.getCompletionsAtPosition(this.activeFile.fileName, offset, ts.emptyOptions);
                    }
                    if (i % checkCadence === 0) {
                        this.checkPostEditInvariants();
                    }
                }
                // Handle post-keystroke formatting
                if (this.enableFormatting) {
                    var edits = this.languageService.getFormattingEditsAfterKeystroke(this.activeFile.fileName, offset, ch, this.formatCodeSettings);
                    if (edits.length) {
                        offset += this.applyEdits(this.activeFile.fileName, edits);
                    }
                }
            }
            this.checkPostEditInvariants();
        };
        // Enters text as if the user had pasted it
        TestState.prototype.paste = function (text) {
            var start = this.currentCaretPosition;
            this.editScriptAndUpdateMarkers(this.activeFile.fileName, this.currentCaretPosition, this.currentCaretPosition, text);
            this.checkPostEditInvariants();
            var offset = this.currentCaretPosition += text.length;
            // Handle formatting
            if (this.enableFormatting) {
                var edits = this.languageService.getFormattingEditsForRange(this.activeFile.fileName, start, offset, this.formatCodeSettings);
                if (edits.length) {
                    this.applyEdits(this.activeFile.fileName, edits);
                }
            }
            this.checkPostEditInvariants();
        };
        TestState.prototype.checkPostEditInvariants = function () {
            var _a, _b;
            if (this.testType !== 0 /* FourSlashTestType.Native */) {
                // getSourcefile() results can not be serialized. Only perform these verifications
                // if running against a native LS object.
                return;
            }
            var incrementalSourceFile = this.languageService.getNonBoundSourceFile(this.activeFile.fileName);
            Utils.assertInvariants(incrementalSourceFile, /*parent:*/ undefined);
            var incrementalSyntaxDiagnostics = incrementalSourceFile.parseDiagnostics;
            // Check syntactic structure
            var content = this.getFileContent(this.activeFile.fileName);
            var options = {
                languageVersion: 99 /* ts.ScriptTarget.Latest */,
                impliedNodeFormat: ts.getImpliedNodeFormatForFile(ts.toPath(this.activeFile.fileName, this.languageServiceAdapterHost.sys.getCurrentDirectory(), ts.hostGetCanonicalFileName(this.languageServiceAdapterHost)), 
                /*cache*/ undefined, this.languageServiceAdapterHost, ((_a = this.languageService.getProgram()) === null || _a === void 0 ? void 0 : _a.getCompilerOptions()) || {}),
                setExternalModuleIndicator: ts.getSetExternalModuleIndicator(((_b = this.languageService.getProgram()) === null || _b === void 0 ? void 0 : _b.getCompilerOptions()) || {}),
            };
            var referenceSourceFile = ts.createLanguageServiceSourceFile(this.activeFile.fileName, createScriptSnapShot(content), options, /*version:*/ "0", /*setNodeParents:*/ false);
            var referenceSyntaxDiagnostics = referenceSourceFile.parseDiagnostics;
            Utils.assertDiagnosticsEquals(incrementalSyntaxDiagnostics, referenceSyntaxDiagnostics);
            Utils.assertStructuralEquals(incrementalSourceFile, referenceSourceFile);
        };
        /**
         * @returns The number of characters added to the file as a result of the edits.
         * May be negative.
         */
        TestState.prototype.applyEdits = function (fileName, edits) {
            var _this = this;
            var runningOffset = 0;
            forEachTextChange(edits, function (edit) {
                var offsetStart = edit.span.start;
                var offsetEnd = offsetStart + edit.span.length;
                _this.editScriptAndUpdateMarkers(fileName, offsetStart, offsetEnd, edit.newText);
                var editDelta = edit.newText.length - edit.span.length;
                if (offsetStart <= _this.currentCaretPosition) {
                    if (offsetEnd <= _this.currentCaretPosition) {
                        // The entirety of the edit span falls before the caret position, shift the caret accordingly
                        _this.currentCaretPosition += editDelta;
                    }
                    else {
                        // The span being replaced includes the caret position, place the caret at the beginning of the span
                        _this.currentCaretPosition = offsetStart;
                    }
                }
                runningOffset += editDelta;
            });
            return runningOffset;
        };
        TestState.prototype.copyFormatOptions = function () {
            return ts.clone(this.formatCodeSettings);
        };
        TestState.prototype.setFormatOptions = function (formatCodeOptions) {
            var oldFormatCodeOptions = this.formatCodeSettings;
            this.formatCodeSettings = ts.toEditorSettings(formatCodeOptions);
            if (this.testType === 3 /* FourSlashTestType.Server */) {
                this.languageService.setFormattingOptions(this.formatCodeSettings);
            }
            return oldFormatCodeOptions;
        };
        TestState.prototype.formatDocument = function () {
            var edits = this.languageService.getFormattingEditsForDocument(this.activeFile.fileName, this.formatCodeSettings);
            this.applyEdits(this.activeFile.fileName, edits);
        };
        TestState.prototype.formatSelection = function (start, end) {
            var edits = this.languageService.getFormattingEditsForRange(this.activeFile.fileName, start, end, this.formatCodeSettings);
            this.applyEdits(this.activeFile.fileName, edits);
        };
        TestState.prototype.formatOnType = function (pos, key) {
            var edits = this.languageService.getFormattingEditsAfterKeystroke(this.activeFile.fileName, pos, key, this.formatCodeSettings);
            this.applyEdits(this.activeFile.fileName, edits);
        };
        TestState.prototype.editScriptAndUpdateMarkers = function (fileName, editStart, editEnd, newText) {
            this.languageServiceAdapterHost.editScript(fileName, editStart, editEnd, newText);
            if (this.assertTextConsistent) {
                this.assertTextConsistent(fileName);
            }
            for (var _i = 0, _a = this.testData.markers; _i < _a.length; _i++) {
                var marker = _a[_i];
                if (marker.fileName === fileName) {
                    marker.position = updatePosition(marker.position, editStart, editEnd, newText);
                }
            }
            for (var _b = 0, _c = this.testData.ranges; _b < _c.length; _b++) {
                var range = _c[_b];
                if (range.fileName === fileName) {
                    range.pos = updatePosition(range.pos, editStart, editEnd, newText);
                    range.end = updatePosition(range.end, editStart, editEnd, newText);
                }
            }
            this.testData.rangesByText = undefined;
        };
        TestState.prototype.removeWhitespace = function (text) {
            return text.replace(/\s/g, "");
        };
        TestState.prototype.goToBOF = function () {
            this.goToPosition(0);
        };
        TestState.prototype.goToEOF = function () {
            var len = this.getFileContent(this.activeFile.fileName).length;
            this.goToPosition(len);
        };
        TestState.prototype.goToRangeStart = function (_a) {
            var fileName = _a.fileName, pos = _a.pos;
            this.openFile(fileName);
            this.goToPosition(pos);
        };
        TestState.prototype.goToTypeDefinition = function (definitionIndex) {
            var definitions = this.languageService.getTypeDefinitionAtPosition(this.activeFile.fileName, this.currentCaretPosition);
            if (!definitions || !definitions.length) {
                this.raiseError("goToTypeDefinition failed - expected to find at least one definition location but got 0");
            }
            if (definitionIndex >= definitions.length) {
                this.raiseError("goToTypeDefinition failed - definitionIndex value (".concat(definitionIndex, ") exceeds definition list size (").concat(definitions.length, ")"));
            }
            var definition = definitions[definitionIndex];
            this.openFile(definition.fileName);
            this.currentCaretPosition = definition.textSpan.start;
        };
        TestState.prototype.verifyTypeDefinitionsCount = function (negative, expectedCount) {
            var assertFn = negative ? assert.notEqual : assert.equal;
            var definitions = this.languageService.getTypeDefinitionAtPosition(this.activeFile.fileName, this.currentCaretPosition);
            var actualCount = definitions && definitions.length || 0;
            assertFn(actualCount, expectedCount, this.messageAtLastKnownMarker("Type definitions Count"));
        };
        TestState.prototype.verifyImplementationListIsEmpty = function (negative) {
            var implementations = this.languageService.getImplementationAtPosition(this.activeFile.fileName, this.currentCaretPosition);
            if (negative) {
                assert.isTrue(implementations && implementations.length > 0, "Expected at least one implementation but got 0");
            }
            else {
                assert.isUndefined(implementations, "Expected implementation list to be empty but implementations returned");
            }
        };
        TestState.prototype.verifyGoToDefinitionName = function (expectedName, expectedContainerName) {
            var definitions = this.languageService.getDefinitionAtPosition(this.activeFile.fileName, this.currentCaretPosition);
            var actualDefinitionName = definitions && definitions.length ? definitions[0].name : "";
            var actualDefinitionContainerName = definitions && definitions.length ? definitions[0].containerName : "";
            assert.equal(actualDefinitionName, expectedName, this.messageAtLastKnownMarker("Definition Info Name"));
            assert.equal(actualDefinitionContainerName, expectedContainerName, this.messageAtLastKnownMarker("Definition Info Container Name"));
        };
        TestState.prototype.goToImplementation = function () {
            var implementations = this.languageService.getImplementationAtPosition(this.activeFile.fileName, this.currentCaretPosition);
            if (!implementations || !implementations.length) {
                this.raiseError("goToImplementation failed - expected to find at least one implementation location but got 0");
            }
            if (implementations.length > 1) {
                this.raiseError("goToImplementation failed - more than 1 implementation returned (".concat(implementations.length, ")"));
            }
            var implementation = implementations[0];
            this.openFile(implementation.fileName);
            this.currentCaretPosition = implementation.textSpan.start;
        };
        TestState.prototype.verifyRangesInImplementationList = function (markerName) {
            this.goToMarker(markerName);
            var implementations = this.languageService.getImplementationAtPosition(this.activeFile.fileName, this.currentCaretPosition);
            if (!implementations || !implementations.length) {
                this.raiseError("verifyRangesInImplementationList failed - expected to find at least one implementation location but got 0");
            }
            var duplicate = findDuplicatedElement(implementations, ts.documentSpansEqual);
            if (duplicate) {
                var textSpan = duplicate.textSpan, fileName = duplicate.fileName;
                this.raiseError("Duplicate implementations returned for range (".concat(textSpan.start, ", ").concat(ts.textSpanEnd(textSpan), ") in ").concat(fileName));
            }
            var ranges = this.getRanges();
            if (!ranges || !ranges.length) {
                this.raiseError("verifyRangesInImplementationList failed - expected to find at least one range in test source");
            }
            var unsatisfiedRanges = [];
            var delayedErrors = [];
            var _loop_11 = function (range) {
                var length = range.end - range.pos;
                var matchingImpl = ts.find(implementations, function (impl) {
                    return range.fileName === impl.fileName && range.pos === impl.textSpan.start && length === impl.textSpan.length;
                });
                if (matchingImpl) {
                    if (range.marker && range.marker.data) {
                        var expected = range.marker.data;
                        if (expected.displayParts) {
                            if (!ts.arrayIsEqualTo(expected.displayParts, matchingImpl.displayParts, displayPartIsEqualTo)) {
                                delayedErrors.push("Mismatched display parts: expected ".concat(JSON.stringify(expected.displayParts), ", actual ").concat(JSON.stringify(matchingImpl.displayParts)));
                            }
                        }
                        else if (expected.parts) {
                            var actualParts = matchingImpl.displayParts.map(function (p) { return p.text; });
                            if (!ts.arrayIsEqualTo(expected.parts, actualParts)) {
                                delayedErrors.push("Mismatched non-tagged display parts: expected ".concat(JSON.stringify(expected.parts), ", actual ").concat(JSON.stringify(actualParts)));
                            }
                        }
                        if (expected.kind !== undefined) {
                            if (expected.kind !== matchingImpl.kind) {
                                delayedErrors.push("Mismatched kind: expected ".concat(JSON.stringify(expected.kind), ", actual ").concat(JSON.stringify(matchingImpl.kind)));
                            }
                        }
                    }
                    matchingImpl.matched = true;
                }
                else {
                    unsatisfiedRanges.push(range);
                }
            };
            for (var _i = 0, ranges_2 = ranges; _i < ranges_2.length; _i++) {
                var range = ranges_2[_i];
                _loop_11(range);
            }
            if (delayedErrors.length) {
                this.raiseError(delayedErrors.join("\n"));
            }
            var unmatchedImplementations = implementations.filter(function (impl) { return !impl.matched; });
            if (unmatchedImplementations.length || unsatisfiedRanges.length) {
                var error = "Not all ranges or implementations are satisfied";
                if (unsatisfiedRanges.length) {
                    error += "\nUnsatisfied ranges:";
                    for (var _a = 0, unsatisfiedRanges_1 = unsatisfiedRanges; _a < unsatisfiedRanges_1.length; _a++) {
                        var range = unsatisfiedRanges_1[_a];
                        error += "\n    (".concat(range.pos, ", ").concat(range.end, ") in ").concat(range.fileName, ": ").concat(this.rangeText(range));
                    }
                }
                if (unmatchedImplementations.length) {
                    error += "\nUnmatched implementations:";
                    for (var _b = 0, unmatchedImplementations_1 = unmatchedImplementations; _b < unmatchedImplementations_1.length; _b++) {
                        var impl = unmatchedImplementations_1[_b];
                        var end = impl.textSpan.start + impl.textSpan.length;
                        error += "\n    (".concat(impl.textSpan.start, ", ").concat(end, ") in ").concat(impl.fileName, ": ").concat(this.getFileContent(impl.fileName).slice(impl.textSpan.start, end));
                    }
                }
                this.raiseError(error);
            }
            function displayPartIsEqualTo(a, b) {
                return a.kind === b.kind && a.text === b.text;
            }
        };
        TestState.prototype.getMarkers = function () {
            //  Return a copy of the list
            return this.testData.markers.slice(0);
        };
        TestState.prototype.getMarkerNames = function () {
            return ts.arrayFrom(this.testData.markerPositions.keys());
        };
        TestState.prototype.getRanges = function () {
            return this.testData.ranges;
        };
        TestState.prototype.getRangesInFile = function (fileName) {
            if (fileName === void 0) { fileName = this.activeFile.fileName; }
            return this.getRanges().filter(function (r) { return r.fileName === fileName; });
        };
        TestState.prototype.rangesByText = function () {
            if (this.testData.rangesByText)
                return this.testData.rangesByText;
            var result = ts.createMultiMap();
            this.testData.rangesByText = result;
            for (var _i = 0, _a = this.getRanges(); _i < _a.length; _i++) {
                var range = _a[_i];
                var text = this.rangeText(range);
                result.add(text, range);
            }
            return result;
        };
        TestState.prototype.rangeText = function (_a) {
            var fileName = _a.fileName, pos = _a.pos, end = _a.end;
            return this.getFileContent(fileName).slice(pos, end);
        };
        TestState.prototype.verifyCaretAtMarker = function (markerName) {
            if (markerName === void 0) { markerName = ""; }
            var pos = this.getMarkerByName(markerName);
            if (pos.fileName !== this.activeFile.fileName) {
                throw new Error("verifyCaretAtMarker failed - expected to be in file \"".concat(pos.fileName, "\", but was in file \"").concat(this.activeFile.fileName, "\""));
            }
            if (pos.position !== this.currentCaretPosition) {
                throw new Error("verifyCaretAtMarker failed - expected to be at marker \"/*".concat(markerName, "*/, but was at position ").concat(this.currentCaretPosition, "(").concat(this.getLineColStringAtPosition(this.currentCaretPosition), ")"));
            }
        };
        TestState.prototype.getIndentation = function (fileName, position, indentStyle, baseIndentSize) {
            var formatOptions = ts.clone(this.formatCodeSettings);
            formatOptions.indentStyle = indentStyle;
            formatOptions.baseIndentSize = baseIndentSize;
            return this.languageService.getIndentationAtPosition(fileName, position, formatOptions);
        };
        TestState.prototype.verifyIndentationAtCurrentPosition = function (numberOfSpaces, indentStyle, baseIndentSize) {
            if (indentStyle === void 0) { indentStyle = ts.IndentStyle.Smart; }
            if (baseIndentSize === void 0) { baseIndentSize = 0; }
            var actual = this.getIndentation(this.activeFile.fileName, this.currentCaretPosition, indentStyle, baseIndentSize);
            var lineCol = this.getLineColStringAtPosition(this.currentCaretPosition);
            if (actual !== numberOfSpaces) {
                this.raiseError("verifyIndentationAtCurrentPosition failed at ".concat(lineCol, " - expected: ").concat(numberOfSpaces, ", actual: ").concat(actual));
            }
        };
        TestState.prototype.verifyIndentationAtPosition = function (fileName, position, numberOfSpaces, indentStyle, baseIndentSize) {
            if (indentStyle === void 0) { indentStyle = ts.IndentStyle.Smart; }
            if (baseIndentSize === void 0) { baseIndentSize = 0; }
            var actual = this.getIndentation(fileName, position, indentStyle, baseIndentSize);
            var lineCol = this.getLineColStringAtPosition(position);
            if (actual !== numberOfSpaces) {
                this.raiseError("verifyIndentationAtPosition failed at ".concat(lineCol, " - expected: ").concat(numberOfSpaces, ", actual: ").concat(actual));
            }
        };
        TestState.prototype.verifyCurrentLineContent = function (text) {
            var actual = this.getCurrentLineContent();
            if (actual !== text) {
                throw new Error("verifyCurrentLineContent\n" + displayExpectedAndActualString(text, actual, /* quoted */ true));
            }
        };
        TestState.prototype.verifyCurrentFileContent = function (text) {
            this.verifyFileContent(this.activeFile.fileName, text);
        };
        TestState.prototype.verifyFileContent = function (fileName, text) {
            var actual = this.getFileContent(fileName);
            if (actual !== text) {
                throw new Error("verifyFileContent failed:\n".concat(showTextDiff(text, actual)));
            }
        };
        TestState.prototype.verifyFormatDocumentChangesNothing = function () {
            var fileName = this.activeFile.fileName;
            var before = this.getFileContent(fileName);
            this.formatDocument();
            this.verifyFileContent(fileName, before);
        };
        TestState.prototype.verifyTextAtCaretIs = function (text) {
            var actual = this.getFileContent(this.activeFile.fileName).substring(this.currentCaretPosition, this.currentCaretPosition + text.length);
            if (actual !== text) {
                throw new Error("verifyTextAtCaretIs\n" + displayExpectedAndActualString(text, actual, /* quoted */ true));
            }
        };
        TestState.prototype.verifyCurrentNameOrDottedNameSpanText = function (text) {
            var span = this.languageService.getNameOrDottedNameSpan(this.activeFile.fileName, this.currentCaretPosition, this.currentCaretPosition);
            if (!span) {
                return this.raiseError("verifyCurrentNameOrDottedNameSpanText\n" + displayExpectedAndActualString("\"" + text + "\"", "undefined"));
            }
            var actual = this.getFileContent(this.activeFile.fileName).substring(span.start, ts.textSpanEnd(span));
            if (actual !== text) {
                this.raiseError("verifyCurrentNameOrDottedNameSpanText\n" + displayExpectedAndActualString(text, actual, /* quoted */ true));
            }
        };
        TestState.prototype.getNameOrDottedNameSpan = function (pos) {
            return this.languageService.getNameOrDottedNameSpan(this.activeFile.fileName, pos, pos);
        };
        TestState.prototype.baselineCurrentFileNameOrDottedNameSpans = function () {
            var _this = this;
            Harness.Baseline.runBaseline(this.testData.globalOptions["baselinefile" /* MetadataOptionNames.baselineFile */], this.baselineCurrentFileLocations(function (pos) { return _this.getNameOrDottedNameSpan(pos); }));
        };
        TestState.prototype.printNameOrDottedNameSpans = function (pos) {
            Harness.IO.log(this.spanInfoToString(this.getNameOrDottedNameSpan(pos), "**"));
        };
        TestState.prototype.classificationToIdentifier = function (classification) {
            var tokenTypes = [];
            tokenTypes[0 /* ts.classifier.v2020.TokenType.class */] = "class";
            tokenTypes[1 /* ts.classifier.v2020.TokenType.enum */] = "enum";
            tokenTypes[2 /* ts.classifier.v2020.TokenType.interface */] = "interface";
            tokenTypes[3 /* ts.classifier.v2020.TokenType.namespace */] = "namespace";
            tokenTypes[4 /* ts.classifier.v2020.TokenType.typeParameter */] = "typeParameter";
            tokenTypes[5 /* ts.classifier.v2020.TokenType.type */] = "type";
            tokenTypes[6 /* ts.classifier.v2020.TokenType.parameter */] = "parameter";
            tokenTypes[7 /* ts.classifier.v2020.TokenType.variable */] = "variable";
            tokenTypes[8 /* ts.classifier.v2020.TokenType.enumMember */] = "enumMember";
            tokenTypes[9 /* ts.classifier.v2020.TokenType.property */] = "property";
            tokenTypes[10 /* ts.classifier.v2020.TokenType.function */] = "function";
            tokenTypes[11 /* ts.classifier.v2020.TokenType.member */] = "member";
            var tokenModifiers = [];
            tokenModifiers[2 /* ts.classifier.v2020.TokenModifier.async */] = "async";
            tokenModifiers[0 /* ts.classifier.v2020.TokenModifier.declaration */] = "declaration";
            tokenModifiers[3 /* ts.classifier.v2020.TokenModifier.readonly */] = "readonly";
            tokenModifiers[1 /* ts.classifier.v2020.TokenModifier.static */] = "static";
            tokenModifiers[5 /* ts.classifier.v2020.TokenModifier.local */] = "local";
            tokenModifiers[4 /* ts.classifier.v2020.TokenModifier.defaultLibrary */] = "defaultLibrary";
            function getTokenTypeFromClassification(tsClassification) {
                if (tsClassification > 255 /* ts.classifier.v2020.TokenEncodingConsts.modifierMask */) {
                    return (tsClassification >> 8 /* ts.classifier.v2020.TokenEncodingConsts.typeOffset */) - 1;
                }
                return undefined;
            }
            function getTokenModifierFromClassification(tsClassification) {
                return tsClassification & 255 /* ts.classifier.v2020.TokenEncodingConsts.modifierMask */;
            }
            var typeIdx = getTokenTypeFromClassification(classification) || 0;
            var modSet = getTokenModifierFromClassification(classification);
            return __spreadArray([tokenTypes[typeIdx]], tokenModifiers.filter(function (_, i) { return modSet & 1 << i; }), true).join(".");
        };
        TestState.prototype.verifyClassifications = function (expected, actual, sourceFileText) {
            var _this = this;
            if (actual.length !== expected.length) {
                this.raiseError("verifyClassifications failed - expected total classifications to be " + expected.length +
                    ", but was " + actual.length +
                    jsonMismatchString());
            }
            ts.zipWith(expected, actual, function (expectedClassification, actualClassification) {
                var expectedType = expectedClassification.classificationType;
                var actualType = typeof actualClassification.classificationType === "number" ? _this.classificationToIdentifier(actualClassification.classificationType) : actualClassification.classificationType;
                if (expectedType !== actualType) {
                    _this.raiseError("verifyClassifications failed - expected classifications type to be " +
                        expectedType + ", but was " +
                        actualType +
                        jsonMismatchString());
                }
                var expectedSpan = expectedClassification.textSpan;
                var actualSpan = actualClassification.textSpan;
                if (expectedSpan) {
                    var expectedLength = expectedSpan.end - expectedSpan.start;
                    if (expectedSpan.start !== actualSpan.start || expectedLength !== actualSpan.length) {
                        _this.raiseError("verifyClassifications failed - expected span of text to be " +
                            "{start=" + expectedSpan.start + ", length=" + expectedLength + "}, but was " +
                            "{start=" + actualSpan.start + ", length=" + actualSpan.length + "}" +
                            jsonMismatchString());
                    }
                }
                var actualText = _this.activeFile.content.substr(actualSpan.start, actualSpan.length);
                if (expectedClassification.text !== actualText) {
                    _this.raiseError("verifyClassifications failed - expected classified text to be " +
                        expectedClassification.text + ", but was " +
                        actualText +
                        jsonMismatchString());
                }
            });
            function jsonMismatchString() {
                var showActual = actual.map(function (_a) {
                    var classificationType = _a.classificationType, textSpan = _a.textSpan;
                    return ({ classificationType: classificationType, text: sourceFileText.slice(textSpan.start, textSpan.start + textSpan.length) });
                });
                return Harness.IO.newLine() +
                    "expected: '" + Harness.IO.newLine() + stringify(expected) + "'" + Harness.IO.newLine() +
                    "actual:   '" + Harness.IO.newLine() + stringify(showActual) + "'";
            }
        };
        TestState.prototype.verifyProjectInfo = function (expected) {
            var _this = this;
            if (this.testType === 3 /* FourSlashTestType.Server */) {
                var actual = this.languageService.getProjectInfo(this.activeFile.fileName, 
                /* needFileNameList */ true);
                assert.equal(expected.join(","), actual.fileNames.map(function (file) {
                    return file.replace(_this.basePath + "/", "");
                }).join(","));
            }
        };
        TestState.prototype.replaceWithSemanticClassifications = function (format) {
            var actual = this.languageService.getSemanticClassifications(this.activeFile.fileName, ts.createTextSpan(0, this.activeFile.content.length), format);
            var replacement = ["const c2 = classification(\"2020\");", "verify.semanticClassificationsAre(\"2020\","];
            for (var _i = 0, actual_1 = actual; _i < actual_1.length; _i++) {
                var a = actual_1[_i];
                var identifier = this.classificationToIdentifier(a.classificationType);
                var text = this.activeFile.content.slice(a.textSpan.start, a.textSpan.start + a.textSpan.length);
                replacement.push("    c2.semanticToken(\"".concat(identifier, "\", \"").concat(text, "\"), "));
            }
            replacement.push(");");
            throw new Error("You need to change the source code of fourslash test to use replaceWithSemanticClassifications");
            // const fs = require("fs");
            // const testfilePath = this.originalInputFileName.slice(1);
            // const testfile = fs.readFileSync(testfilePath, "utf8");
            // const newfile = testfile.replace("verify.replaceWithSemanticClassifications(\"2020\")", replacement.join("\n"));
            // fs.writeFileSync(testfilePath, newfile);
        };
        TestState.prototype.verifyEncodedSyntacticClassificationsLength = function (expected) {
            var actual = this.languageService.getEncodedSyntacticClassifications(this.activeFile.fileName, ts.createTextSpan(0, this.activeFile.content.length));
            if (actual.spans.length !== expected) {
                this.raiseError("encodedSyntacticClassificationsLength failed - expected total spans to be ".concat(expected, " got ").concat(actual.spans.length));
            }
        };
        TestState.prototype.verifyEncodedSemanticClassificationsLength = function (format, expected) {
            var actual = this.languageService.getEncodedSemanticClassifications(this.activeFile.fileName, ts.createTextSpan(0, this.activeFile.content.length), format);
            if (actual.spans.length !== expected) {
                this.raiseError("encodedSemanticClassificationsLength failed - expected total spans to be ".concat(expected, " got ").concat(actual.spans.length));
            }
        };
        TestState.prototype.verifySemanticClassifications = function (format, expected) {
            var actual = this.languageService.getSemanticClassifications(this.activeFile.fileName, ts.createTextSpan(0, this.activeFile.content.length), format);
            this.verifyClassifications(expected, actual, this.activeFile.content);
        };
        TestState.prototype.verifySyntacticClassifications = function (expected) {
            var actual = this.languageService.getSyntacticClassifications(this.activeFile.fileName, ts.createTextSpan(0, this.activeFile.content.length));
            this.verifyClassifications(expected, actual, this.activeFile.content);
        };
        TestState.prototype.printOutliningSpans = function () {
            var spans = this.languageService.getOutliningSpans(this.activeFile.fileName);
            Harness.IO.log("Outlining spans (".concat(spans.length, " items)\nResults:"));
            Harness.IO.log(stringify(spans));
            this.printOutliningSpansInline(spans);
        };
        TestState.prototype.printOutliningSpansInline = function (spans) {
            var allSpanInsets = [];
            var annotated = this.activeFile.content;
            ts.forEach(spans, function (span) {
                allSpanInsets.push({ text: "[|", pos: span.textSpan.start });
                allSpanInsets.push({ text: "|]", pos: span.textSpan.start + span.textSpan.length });
            });
            var reverseSpans = allSpanInsets.sort(function (l, r) { return r.pos - l.pos; });
            ts.forEach(reverseSpans, function (span) {
                annotated = annotated.slice(0, span.pos) + span.text + annotated.slice(span.pos);
            });
            Harness.IO.log("\nMockup:\n".concat(annotated));
        };
        TestState.prototype.verifyOutliningSpans = function (spans, kind) {
            var _this = this;
            var actual = this.languageService.getOutliningSpans(this.activeFile.fileName);
            var filterActual = ts.filter(actual, function (f) { return kind === undefined ? true : f.kind === kind; });
            if (filterActual.length !== spans.length) {
                this.raiseError("verifyOutliningSpans failed - expected total spans to be ".concat(spans.length, ", but was ").concat(actual.length, "\n\nFound Spans:\n\n").concat(this.printOutliningSpansInline(actual)));
            }
            ts.zipWith(spans, filterActual, function (expectedSpan, actualSpan, i) {
                if (expectedSpan.pos !== actualSpan.textSpan.start || expectedSpan.end !== ts.textSpanEnd(actualSpan.textSpan)) {
                    return _this.raiseError("verifyOutliningSpans failed - span ".concat((i + 1), " expected: (").concat(expectedSpan.pos, ",").concat(expectedSpan.end, "),  actual: (").concat(actualSpan.textSpan.start, ",").concat(ts.textSpanEnd(actualSpan.textSpan), ")"));
                }
                if (kind !== undefined && actualSpan.kind !== kind) {
                    return _this.raiseError("verifyOutliningSpans failed - span ".concat((i + 1), " expected kind: ('").concat(kind, "'),  actual: ('").concat(actualSpan.kind, "')"));
                }
            });
        };
        TestState.prototype.verifyOutliningHintSpans = function (spans) {
            var _this = this;
            var actual = this.languageService.getOutliningSpans(this.activeFile.fileName);
            if (actual.length !== spans.length) {
                this.raiseError("verifyOutliningHintSpans failed - expected total spans to be ".concat(spans.length, ", but was ").concat(actual.length));
            }
            ts.zipWith(spans, actual, function (expectedSpan, actualSpan, i) {
                if (expectedSpan.pos !== actualSpan.hintSpan.start || expectedSpan.end !== ts.textSpanEnd(actualSpan.hintSpan)) {
                    return _this.raiseError("verifyOutliningSpans failed - span ".concat((i + 1), " expected: (").concat(expectedSpan.pos, ",").concat(expectedSpan.end, "),  actual: (").concat(actualSpan.hintSpan.start, ",").concat(ts.textSpanEnd(actualSpan.hintSpan), ")"));
                }
            });
        };
        TestState.prototype.verifyTodoComments = function (descriptors, spans) {
            var _this = this;
            var actual = this.languageService.getTodoComments(this.activeFile.fileName, descriptors.map(function (d) { return ({ text: d, priority: 0 }); }));
            if (actual.length !== spans.length) {
                this.raiseError("verifyTodoComments failed - expected total spans to be ".concat(spans.length, ", but was ").concat(actual.length));
            }
            ts.zipWith(spans, actual, function (expectedSpan, actualComment, i) {
                var actualCommentSpan = ts.createTextSpan(actualComment.position, actualComment.message.length);
                if (expectedSpan.pos !== actualCommentSpan.start || expectedSpan.end !== ts.textSpanEnd(actualCommentSpan)) {
                    _this.raiseError("verifyOutliningSpans failed - span ".concat((i + 1), " expected: (").concat(expectedSpan.pos, ",").concat(expectedSpan.end, "),  actual: (").concat(actualCommentSpan.start, ",").concat(ts.textSpanEnd(actualCommentSpan), ")"));
                }
            });
        };
        /**
         * Finds and applies a code action corresponding to the supplied parameters.
         * If index is undefined, applies the unique code action available.
         * @param errorCode The error code that generated the code action.
         * @param index The nth (0-index-based) codeaction available generated by errorCode.
         */
        TestState.prototype.getAndApplyCodeActions = function (errorCode, index) {
            var fileName = this.activeFile.fileName;
            var fixes = this.getCodeFixes(fileName, errorCode);
            if (index === undefined) {
                if (!(fixes && fixes.length === 1)) {
                    this.raiseError("Should find exactly one codefix, but ".concat(fixes ? fixes.length : "none", " found. ").concat(fixes ? fixes.map(function (a) { return "".concat(Harness.IO.newLine(), " \"").concat(a.description, "\""); }) : ""));
                }
                index = 0;
            }
            else {
                if (!(fixes && fixes.length >= index + 1)) {
                    this.raiseError("Should find at least ".concat(index + 1, " codefix(es), but ").concat(fixes ? fixes.length : "none", " found."));
                }
            }
            this.applyChanges(fixes[index].changes);
        };
        TestState.prototype.applyCodeActionFromCompletion = function (markerName, options) {
            var _a, _b;
            this.goToMarker(markerName);
            var details = this.getCompletionEntryDetails(options.name, options.source, options.data, options.preferences);
            if (!details) {
                var completions = (_a = this.getCompletionListAtCaret(options.preferences)) === null || _a === void 0 ? void 0 : _a.entries;
                var matchingName = completions === null || completions === void 0 ? void 0 : completions.filter(function (e) { return e.name === options.name; });
                var detailMessage = (matchingName === null || matchingName === void 0 ? void 0 : matchingName.length)
                    ? "\n  Found ".concat(matchingName.length, " with name '").concat(options.name, "' from source(s) ").concat(matchingName.map(function (e) { return "'".concat(e.source, "'"); }).join(", "), ".")
                    : " (In fact, there were no completions with name '".concat(options.name, "' at all.)");
                return this.raiseError("No completions were found for the given name, source/data, and preferences." + detailMessage);
            }
            var codeActions = details.codeActions;
            if ((codeActions === null || codeActions === void 0 ? void 0 : codeActions.length) !== 1) {
                this.raiseError("Expected one code action, got ".concat((_b = codeActions === null || codeActions === void 0 ? void 0 : codeActions.length) !== null && _b !== void 0 ? _b : 0));
            }
            var codeAction = ts.first(codeActions);
            if (codeAction.description !== options.description) {
                this.raiseError("Expected description to be:\n".concat(options.description, "\ngot:\n").concat(codeActions[0].description));
            }
            this.applyChanges(codeAction.changes);
            this.verifyNewContentAfterChange(options, ts.flatMap(codeActions, function (a) { return a.changes.map(function (c) { return c.fileName; }); }));
        };
        TestState.prototype.verifyRangeIs = function (expectedText, includeWhiteSpace) {
            this.verifyTextMatches(this.rangeText(this.getOnlyRange()), !!includeWhiteSpace, expectedText);
        };
        TestState.prototype.getOnlyRange = function () {
            var ranges = this.getRanges();
            if (ranges.length !== 1) {
                this.raiseError("Exactly one range should be specified in the testfile.");
            }
            return ts.first(ranges);
        };
        TestState.prototype.verifyTextMatches = function (actualText, includeWhitespace, expectedText) {
            var _this = this;
            var removeWhitespace = function (s) { return includeWhitespace ? s : _this.removeWhitespace(s); };
            if (removeWhitespace(actualText) !== removeWhitespace(expectedText)) {
                this.raiseError("Actual range text doesn't match expected text.\n".concat(showTextDiff(expectedText, actualText)));
            }
        };
        /**
         * Compares expected text to the text that would be in the sole range
         * (ie: [|...|]) in the file after applying the codefix sole codefix
         * in the source file.
         */
        TestState.prototype.verifyRangeAfterCodeFix = function (expectedText, includeWhiteSpace, errorCode, index) {
            this.getAndApplyCodeActions(errorCode, index);
            this.verifyRangeIs(expectedText, includeWhiteSpace);
        };
        TestState.prototype.verifyCodeFixAll = function (_a) {
            var _this = this;
            var fixId = _a.fixId, fixAllDescription = _a.fixAllDescription, newFileContent = _a.newFileContent, expectedCommands = _a.commands;
            var fixWithId = ts.find(this.getCodeFixes(this.activeFile.fileName), function (a) { return a.fixId === fixId; });
            ts.Debug.assert(fixWithId !== undefined, "No available code fix has the expected id. Fix All is not available if there is only one potentially fixable diagnostic present.", function () {
                return "Expected '".concat(fixId, "'. Available actions:\n").concat(ts.mapDefined(_this.getCodeFixes(_this.activeFile.fileName), function (a) { return "".concat(a.fixName, " (").concat(a.fixId || "no fix id", ")"); }).join("\n"));
            });
            ts.Debug.assertEqual(fixWithId.fixAllDescription, fixAllDescription);
            var _b = this.languageService.getCombinedCodeFix({ type: "file", fileName: this.activeFile.fileName }, fixId, this.formatCodeSettings, ts.emptyOptions), changes = _b.changes, commands = _b.commands;
            assert.deepEqual(commands, expectedCommands);
            this.verifyNewContent({ newFileContent: newFileContent }, changes);
        };
        TestState.prototype.verifyCodeFix = function (options) {
            var fileName = this.activeFile.fileName;
            var actions = this.getCodeFixes(fileName, options.errorCode, options.preferences);
            var index = options.index;
            if (index === undefined) {
                if (!(actions && actions.length === 1)) {
                    this.raiseError("Should find exactly one codefix, but ".concat(actions ? actions.length : "none", " found. ").concat(actions ? actions.map(function (a) { return "".concat(Harness.IO.newLine(), " \"").concat(a.description, "\""); }) : ""));
                }
                index = 0;
            }
            else {
                if (!(actions && actions.length >= index + 1)) {
                    this.raiseError("Should find at least ".concat(index + 1, " codefix(es), but ").concat(actions ? actions.length : "none", " found."));
                }
            }
            var action = actions[index];
            if (typeof options.description === "string") {
                assert.equal(action.description, options.description);
            }
            else if (Array.isArray(options.description)) {
                var description = ts.formatStringFromArgs(options.description[0], options.description, 1);
                assert.equal(action.description, description);
            }
            else {
                assert.match(action.description, templateToRegExp(options.description.template));
            }
            assert.deepEqual(action.commands, options.commands);
            if (options.applyChanges) {
                for (var _i = 0, _a = action.changes; _i < _a.length; _i++) {
                    var change = _a[_i];
                    this.applyEdits(change.fileName, change.textChanges);
                }
                this.verifyNewContentAfterChange(options, action.changes.map(function (c) { return c.fileName; }));
            }
            else {
                this.verifyNewContent(options, action.changes);
            }
        };
        TestState.prototype.verifyNewContent = function (_a, changes) {
            var _b;
            var newFileContent = _a.newFileContent, newRangeContent = _a.newRangeContent;
            if (newRangeContent !== undefined) {
                assert(newFileContent === undefined);
                assert(changes.length === 1, "Affected 0 or more than 1 file, must use 'newFileContent' instead of 'newRangeContent'");
                var change = ts.first(changes);
                assert(change.fileName = this.activeFile.fileName);
                var newText = ts.textChanges.applyChanges(this.getFileContent(this.activeFile.fileName), change.textChanges);
                var newRange = updateTextRangeForTextChanges(this.getOnlyRange(), change.textChanges);
                var actualText = newText.slice(newRange.pos, newRange.end);
                this.verifyTextMatches(actualText, /*includeWhitespace*/ true, newRangeContent);
            }
            else {
                if (newFileContent === undefined)
                    throw ts.Debug.fail();
                if (typeof newFileContent !== "object")
                    newFileContent = (_b = {}, _b[this.activeFile.fileName] = newFileContent, _b);
                for (var _i = 0, changes_1 = changes; _i < changes_1.length; _i++) {
                    var change = changes_1[_i];
                    var expectedNewContent = newFileContent[change.fileName];
                    if (expectedNewContent === undefined) {
                        ts.Debug.fail("Did not expect a change in ".concat(change.fileName));
                    }
                    var oldText = this.tryGetFileContent(change.fileName);
                    ts.Debug.assert(!!change.isNewFile === (oldText === undefined));
                    var newContent = change.isNewFile ? ts.first(change.textChanges).newText : ts.textChanges.applyChanges(oldText, change.textChanges);
                    this.verifyTextMatches(newContent, /*includeWhitespace*/ true, expectedNewContent);
                }
                var _loop_12 = function (newFileName) {
                    ts.Debug.assert(changes.some(function (c) { return c.fileName === newFileName; }), "No change in file", function () { return newFileName; });
                };
                for (var newFileName in newFileContent) {
                    _loop_12(newFileName);
                }
            }
        };
        TestState.prototype.verifyNewContentAfterChange = function (_a, changedFiles) {
            var newFileContent = _a.newFileContent, newRangeContent = _a.newRangeContent;
            var assertedChangedFiles = !newFileContent || typeof newFileContent === "string"
                ? [this.activeFile.fileName]
                : ts.getOwnKeys(newFileContent);
            assert.deepEqual(assertedChangedFiles, changedFiles);
            if (newFileContent !== undefined) {
                assert(!newRangeContent);
                if (typeof newFileContent === "string") {
                    this.verifyCurrentFileContent(newFileContent);
                }
                else {
                    for (var fileName in newFileContent) {
                        this.verifyFileContent(fileName, newFileContent[fileName]);
                    }
                }
            }
            else {
                this.verifyRangeIs(newRangeContent, /*includeWhitespace*/ true);
            }
        };
        /**
         * Rerieves a codefix satisfying the parameters, or undefined if no such codefix is found.
         * @param fileName Path to file where error should be retrieved from.
         */
        TestState.prototype.getCodeFixes = function (fileName, errorCode, preferences, position) {
            var _this = this;
            if (preferences === void 0) { preferences = ts.emptyOptions; }
            var diagnosticsForCodeFix = this.getDiagnostics(fileName, /*includeSuggestions*/ true).map(function (diagnostic) { return ({
                start: diagnostic.start,
                length: diagnostic.length,
                code: diagnostic.code
            }); });
            return ts.flatMap(ts.deduplicate(diagnosticsForCodeFix, ts.equalOwnProperties), function (diagnostic) {
                if (errorCode !== undefined && errorCode !== diagnostic.code) {
                    return;
                }
                if (position !== undefined && diagnostic.start !== undefined && diagnostic.length !== undefined) {
                    var span = ts.createTextRangeFromSpan({ start: diagnostic.start, length: diagnostic.length });
                    if (!ts.textRangeContainsPositionInclusive(span, position)) {
                        return;
                    }
                }
                return _this.languageService.getCodeFixesAtPosition(fileName, diagnostic.start, diagnostic.start + diagnostic.length, [diagnostic.code], _this.formatCodeSettings, preferences);
            });
        };
        TestState.prototype.applyChanges = function (changes) {
            for (var _i = 0, changes_2 = changes; _i < changes_2.length; _i++) {
                var change = changes_2[_i];
                this.applyEdits(change.fileName, change.textChanges);
            }
        };
        TestState.prototype.verifyImportFixAtPosition = function (expectedTextArray, errorCode, preferences) {
            var _this = this;
            var fileName = this.activeFile.fileName;
            var ranges = this.getRanges().filter(function (r) { return r.fileName === fileName; });
            if (ranges.length > 1) {
                this.raiseError("Exactly one range should be specified in the testfile.");
            }
            var range = ts.firstOrUndefined(ranges);
            if (preferences) {
                this.configure(preferences);
            }
            var codeFixes = this.getCodeFixes(fileName, errorCode, preferences).filter(function (f) { return f.fixName === ts.codefix.importFixName; });
            if (codeFixes.length === 0) {
                if (expectedTextArray.length !== 0) {
                    this.raiseError("No codefixes returned.");
                }
                return;
            }
            var actualTextArray = [];
            var scriptInfo = this.languageServiceAdapterHost.getScriptInfo(fileName);
            var originalContent = scriptInfo.content;
            for (var _i = 0, codeFixes_1 = codeFixes; _i < codeFixes_1.length; _i++) {
                var codeFix = codeFixes_1[_i];
                ts.Debug.assert(codeFix.changes.length === 1);
                var change = ts.first(codeFix.changes);
                ts.Debug.assert(change.fileName === fileName);
                this.applyEdits(change.fileName, change.textChanges);
                var text = range ? this.rangeText(range) : this.getFileContent(fileName);
                actualTextArray.push(text);
                // Undo changes to perform next fix
                var span = change.textChanges[0].span;
                var deletedText = originalContent.substr(span.start, change.textChanges[0].span.length);
                var insertedText = change.textChanges[0].newText;
                this.editScriptAndUpdateMarkers(fileName, span.start, span.start + insertedText.length, deletedText);
            }
            if (expectedTextArray.length !== actualTextArray.length) {
                this.raiseError("Expected ".concat(expectedTextArray.length, " import fixes, got ").concat(actualTextArray.length, ":\n\n").concat(actualTextArray.join("\n\n" + "-".repeat(20) + "\n\n")));
            }
            ts.zipWith(expectedTextArray, actualTextArray, function (expected, actual, index) {
                if (expected !== actual) {
                    _this.raiseError("Import fix at index ".concat(index, " doesn't match.\n").concat(showTextDiff(expected, actual)));
                }
            });
        };
        TestState.prototype.verifyImportFixModuleSpecifiers = function (markerName, moduleSpecifiers, preferences) {
            var marker = this.getMarkerByName(markerName);
            var codeFixes = this.getCodeFixes(marker.fileName, ts.Diagnostics.Cannot_find_name_0.code, __assign({ includeCompletionsForModuleExports: true, includeCompletionsWithInsertText: true }, preferences), marker.position).filter(function (f) { return f.fixName === ts.codefix.importFixName; });
            var actualModuleSpecifiers = ts.mapDefined(codeFixes, function (fix) {
                return ts.forEach(ts.flatMap(fix.changes, function (c) { return c.textChanges; }), function (c) {
                    var match = /(?:from |require\()(['"])((?:(?!\1).)*)\1/.exec(c.newText);
                    return match === null || match === void 0 ? void 0 : match[2];
                });
            });
            assert.deepEqual(actualModuleSpecifiers, moduleSpecifiers);
        };
        TestState.prototype.verifyDocCommentTemplate = function (expected, options) {
            var name = "verifyDocCommentTemplate";
            var actual = this.languageService.getDocCommentTemplateAtPosition(this.activeFile.fileName, this.currentCaretPosition, options || { generateReturnInDocTemplate: true });
            if (expected === undefined) {
                if (actual) {
                    this.raiseError("".concat(name, " failed - expected no template but got {newText: \"").concat(actual.newText, "\", caretOffset: ").concat(actual.caretOffset, "}"));
                }
                return;
            }
            else {
                if (actual === undefined) {
                    this.raiseError("".concat(name, " failed - expected the template {newText: \"").concat(expected.newText, "\", caretOffset: \"").concat(expected.caretOffset, "\"} but got nothing instead"));
                }
                if (actual.newText !== expected.newText) {
                    this.raiseError("".concat(name, " failed for expected insertion.\n").concat(showTextDiff(expected.newText, actual.newText)));
                }
                if (actual.caretOffset !== expected.caretOffset) {
                    this.raiseError("".concat(name, " failed - expected caretOffset: ").concat(expected.caretOffset, "\nactual caretOffset:").concat(actual.caretOffset));
                }
            }
        };
        TestState.prototype.verifyBraceCompletionAtPosition = function (negative, openingBrace) {
            var openBraceMap = new ts.Map(ts.getEntries({
                "(": 40 /* ts.CharacterCodes.openParen */,
                "{": 123 /* ts.CharacterCodes.openBrace */,
                "[": 91 /* ts.CharacterCodes.openBracket */,
                "'": 39 /* ts.CharacterCodes.singleQuote */,
                '"': 34 /* ts.CharacterCodes.doubleQuote */,
                "`": 96 /* ts.CharacterCodes.backtick */,
                "<": 60 /* ts.CharacterCodes.lessThan */
            }));
            var charCode = openBraceMap.get(openingBrace);
            if (!charCode) {
                throw this.raiseError("Invalid openingBrace '".concat(openingBrace, "' specified."));
            }
            var position = this.currentCaretPosition;
            var validBraceCompletion = this.languageService.isValidBraceCompletionAtPosition(this.activeFile.fileName, position, charCode);
            if (!negative && !validBraceCompletion) {
                this.raiseError("".concat(position, " is not a valid brace completion position for ").concat(openingBrace));
            }
            if (negative && validBraceCompletion) {
                this.raiseError("".concat(position, " is a valid brace completion position for ").concat(openingBrace));
            }
        };
        TestState.prototype.verifyJsxClosingTag = function (map) {
            for (var markerName in map) {
                this.goToMarker(markerName);
                var actual = this.languageService.getJsxClosingTagAtPosition(this.activeFile.fileName, this.currentCaretPosition);
                assert.deepEqual(actual, map[markerName], markerName);
            }
        };
        TestState.prototype.verifyMatchingBracePosition = function (bracePosition, expectedMatchPosition) {
            var actual = this.languageService.getBraceMatchingAtPosition(this.activeFile.fileName, bracePosition);
            if (actual.length !== 2) {
                this.raiseError("verifyMatchingBracePosition failed - expected result to contain 2 spans, but it had ".concat(actual.length));
            }
            var actualMatchPosition = -1;
            if (bracePosition === actual[0].start) {
                actualMatchPosition = actual[1].start;
            }
            else if (bracePosition === actual[1].start) {
                actualMatchPosition = actual[0].start;
            }
            else {
                this.raiseError("verifyMatchingBracePosition failed - could not find the brace position: ".concat(bracePosition, " in the returned list: (").concat(actual[0].start, ",").concat(ts.textSpanEnd(actual[0]), ") and (").concat(actual[1].start, ",").concat(ts.textSpanEnd(actual[1]), ")"));
            }
            if (actualMatchPosition !== expectedMatchPosition) {
                this.raiseError("verifyMatchingBracePosition failed - expected: ".concat(actualMatchPosition, ",  actual: ").concat(expectedMatchPosition));
            }
        };
        TestState.prototype.verifyNoMatchingBracePosition = function (bracePosition) {
            var actual = this.languageService.getBraceMatchingAtPosition(this.activeFile.fileName, bracePosition);
            if (actual.length !== 0) {
                this.raiseError("verifyNoMatchingBracePosition failed - expected: 0 spans, actual: " + actual.length);
            }
        };
        TestState.prototype.verifySpanOfEnclosingComment = function (negative, onlyMultiLineDiverges) {
            var expected = !negative;
            var position = this.currentCaretPosition;
            var fileName = this.activeFile.fileName;
            var actual = !!this.languageService.getSpanOfEnclosingComment(fileName, position, /*onlyMultiLine*/ false);
            var actualOnlyMultiLine = !!this.languageService.getSpanOfEnclosingComment(fileName, position, /*onlyMultiLine*/ true);
            if (expected !== actual || onlyMultiLineDiverges === (actual === actualOnlyMultiLine)) {
                this.raiseError("verifySpanOfEnclosingComment failed:\n                position: '".concat(position, "'\n                fileName: '").concat(fileName, "'\n                onlyMultiLineDiverges: '").concat(onlyMultiLineDiverges, "'\n                actual: '").concat(actual, "'\n                actualOnlyMultiLine: '").concat(actualOnlyMultiLine, "'\n                expected: '").concat(expected, "'."));
            }
        };
        TestState.prototype.verifyNavigateTo = function (options) {
            for (var _i = 0, options_1 = options; _i < options_1.length; _i++) {
                var _a = options_1[_i], pattern = _a.pattern, expected = _a.expected, fileName = _a.fileName;
                var items = this.languageService.getNavigateToItems(pattern, /*maxResultCount*/ undefined, fileName);
                this.assertObjectsEqual(items, expected.map(function (e) { return ({
                    name: e.name,
                    kind: e.kind,
                    kindModifiers: e.kindModifiers || "",
                    matchKind: e.matchKind || "exact",
                    isCaseSensitive: e.isCaseSensitive === undefined ? true : e.isCaseSensitive,
                    fileName: e.range.fileName,
                    textSpan: ts.createTextSpanFromRange(e.range),
                    containerName: e.containerName || "",
                    containerKind: e.containerKind || "" /* ts.ScriptElementKind.unknown */,
                }); }));
            }
        };
        TestState.prototype.verifyNavigationBar = function (json, options) {
            this.verifyNavigationTreeOrBar(json, this.languageService.getNavigationBarItems(this.activeFile.fileName), "Bar", options);
        };
        TestState.prototype.verifyNavigationTree = function (json, options) {
            this.verifyNavigationTreeOrBar(json, this.languageService.getNavigationTree(this.activeFile.fileName), "Tree", options);
        };
        TestState.prototype.verifyNavigationTreeOrBar = function (json, tree, name, options) {
            if (JSON.stringify(tree, replacer) !== JSON.stringify(json)) {
                this.raiseError("verifyNavigation".concat(name, " failed - \n").concat(showTextDiff(stringify(json), stringify(tree, replacer))));
            }
            function replacer(key, value) {
                switch (key) {
                    case "spans":
                    case "nameSpan":
                        return options && options.checkSpans ? value : undefined;
                    case "start":
                    case "length":
                        // Never omit the values in a span, even if they are 0.
                        return value;
                    case "childItems":
                        return !value || value.length === 0 ? undefined : value;
                    default:
                        // Omit falsy values, those are presumed to be the default.
                        return value || undefined;
                }
            }
        };
        TestState.prototype.printNavigationItems = function (searchValue) {
            var items = this.languageService.getNavigateToItems(searchValue);
            Harness.IO.log("NavigationItems list (".concat(items.length, " items)"));
            for (var _i = 0, items_1 = items; _i < items_1.length; _i++) {
                var item = items_1[_i];
                Harness.IO.log("name: ".concat(item.name, ", kind: ").concat(item.kind, ", parentName: ").concat(item.containerName, ", fileName: ").concat(item.fileName));
            }
        };
        TestState.prototype.printNavigationBar = function () {
            var items = this.languageService.getNavigationBarItems(this.activeFile.fileName);
            Harness.IO.log("Navigation bar (".concat(items.length, " items)"));
            for (var _i = 0, items_2 = items; _i < items_2.length; _i++) {
                var item = items_2[_i];
                Harness.IO.log("".concat(ts.repeatString(" ", item.indent), "name: ").concat(item.text, ", kind: ").concat(item.kind, ", childItems: ").concat(item.childItems.map(function (child) { return child.text; })));
            }
        };
        TestState.prototype.getOccurrencesAtCurrentPosition = function () {
            return this.languageService.getOccurrencesAtPosition(this.activeFile.fileName, this.currentCaretPosition);
        };
        TestState.prototype.verifyOccurrencesAtPositionListContains = function (fileName, start, end, isWriteAccess) {
            var occurrences = this.getOccurrencesAtCurrentPosition();
            if (!occurrences || occurrences.length === 0) {
                return this.raiseError("verifyOccurrencesAtPositionListContains failed - found 0 references, expected at least one.");
            }
            for (var _i = 0, occurrences_1 = occurrences; _i < occurrences_1.length; _i++) {
                var occurrence = occurrences_1[_i];
                if (occurrence && occurrence.fileName === fileName && occurrence.textSpan.start === start && ts.textSpanEnd(occurrence.textSpan) === end) {
                    if (typeof isWriteAccess !== "undefined" && occurrence.isWriteAccess !== isWriteAccess) {
                        this.raiseError("verifyOccurrencesAtPositionListContains failed - item isWriteAccess value does not match, actual: ".concat(occurrence.isWriteAccess, ", expected: ").concat(isWriteAccess, "."));
                    }
                    return;
                }
            }
            var missingItem = { fileName: fileName, start: start, end: end, isWriteAccess: isWriteAccess };
            this.raiseError("verifyOccurrencesAtPositionListContains failed - could not find the item: ".concat(stringify(missingItem), " in the returned list: (").concat(stringify(occurrences), ")"));
        };
        TestState.prototype.verifyOccurrencesAtPositionListCount = function (expectedCount) {
            var occurrences = this.getOccurrencesAtCurrentPosition();
            var actualCount = occurrences ? occurrences.length : 0;
            if (expectedCount !== actualCount) {
                this.raiseError("verifyOccurrencesAtPositionListCount failed - actual: ".concat(actualCount, ", expected:").concat(expectedCount));
            }
        };
        TestState.prototype.getDocumentHighlightsAtCurrentPosition = function (fileNamesToSearch) {
            var _this = this;
            var filesToSearch = fileNamesToSearch.map(function (name) { return ts.combinePaths(_this.basePath, name); });
            return this.languageService.getDocumentHighlights(this.activeFile.fileName, this.currentCaretPosition, filesToSearch);
        };
        TestState.prototype.verifyRangesAreOccurrences = function (isWriteAccess, ranges) {
            ranges = ranges || this.getRanges();
            assert(ranges.length);
            for (var _i = 0, ranges_3 = ranges; _i < ranges_3.length; _i++) {
                var r = ranges_3[_i];
                this.goToRangeStart(r);
                this.verifyOccurrencesAtPositionListCount(ranges.length);
                for (var _a = 0, ranges_4 = ranges; _a < ranges_4.length; _a++) {
                    var range = ranges_4[_a];
                    this.verifyOccurrencesAtPositionListContains(range.fileName, range.pos, range.end, isWriteAccess);
                }
            }
        };
        TestState.prototype.verifyRangesWithSameTextAreRenameLocations = function () {
            var _this = this;
            var texts = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                texts[_i] = arguments[_i];
            }
            if (texts.length) {
                texts.forEach(function (text) { return _this.verifyRangesAreRenameLocations(_this.rangesByText().get(text)); });
            }
            else {
                this.rangesByText().forEach(function (ranges) { return _this.verifyRangesAreRenameLocations(ranges); });
            }
        };
        TestState.prototype.verifyRangesWithSameTextAreDocumentHighlights = function () {
            var _this = this;
            this.rangesByText().forEach(function (ranges) { return _this.verifyRangesAreDocumentHighlights(ranges, /*options*/ undefined); });
        };
        TestState.prototype.verifyDocumentHighlightsOf = function (startRange, ranges, options) {
            var fileNames = options && options.filesToSearch || unique(ranges, function (range) { return range.fileName; });
            this.goToRangeStart(startRange);
            this.verifyDocumentHighlights(ranges, fileNames);
        };
        TestState.prototype.verifyRangesAreDocumentHighlights = function (ranges, options) {
            ranges = ranges || this.getRanges();
            assert(ranges.length);
            var fileNames = options && options.filesToSearch || unique(ranges, function (range) { return range.fileName; });
            for (var _i = 0, ranges_5 = ranges; _i < ranges_5.length; _i++) {
                var range = ranges_5[_i];
                this.goToRangeStart(range);
                this.verifyDocumentHighlights(ranges, fileNames);
            }
        };
        TestState.prototype.verifyNoDocumentHighlights = function (startRange) {
            this.goToRangeStart(startRange);
            var documentHighlights = this.getDocumentHighlightsAtCurrentPosition([this.activeFile.fileName]);
            var numHighlights = ts.length(documentHighlights);
            if (numHighlights > 0) {
                this.raiseError("verifyNoDocumentHighlights failed - unexpectedly got ".concat(numHighlights, " highlights"));
            }
        };
        TestState.prototype.verifyDocumentHighlights = function (expectedRanges, fileNames) {
            var _this = this;
            if (fileNames === void 0) { fileNames = [this.activeFile.fileName]; }
            fileNames = ts.map(fileNames, ts.normalizePath);
            var documentHighlights = this.getDocumentHighlightsAtCurrentPosition(fileNames) || [];
            for (var _i = 0, documentHighlights_1 = documentHighlights; _i < documentHighlights_1.length; _i++) {
                var dh = documentHighlights_1[_i];
                if (fileNames.indexOf(dh.fileName) === -1) {
                    this.raiseError("verifyDocumentHighlights failed - got highlights in unexpected file name ".concat(dh.fileName));
                }
            }
            var _loop_13 = function (fileName) {
                var expectedRangesInFile = expectedRanges.filter(function (r) { return ts.normalizePath(r.fileName) === fileName; });
                var highlights = ts.find(documentHighlights, function (dh) { return dh.fileName === fileName; });
                var spansInFile = highlights ? highlights.highlightSpans.sort(function (s1, s2) { return s1.textSpan.start - s2.textSpan.start; }) : [];
                if (expectedRangesInFile.length !== spansInFile.length) {
                    this_2.raiseError("verifyDocumentHighlights failed - In ".concat(fileName, ", expected ").concat(expectedRangesInFile.length, " highlights, got ").concat(spansInFile.length));
                }
                ts.zipWith(expectedRangesInFile, spansInFile, function (expectedRange, span) {
                    if (span.textSpan.start !== expectedRange.pos || ts.textSpanEnd(span.textSpan) !== expectedRange.end) {
                        _this.raiseError("verifyDocumentHighlights failed - span does not match, actual: ".concat(stringify(span.textSpan), ", expected: ").concat(expectedRange.pos, "--").concat(expectedRange.end));
                    }
                });
            };
            var this_2 = this;
            for (var _a = 0, fileNames_1 = fileNames; _a < fileNames_1.length; _a++) {
                var fileName = fileNames_1[_a];
                _loop_13(fileName);
            }
        };
        TestState.prototype.verifyCodeFixAvailable = function (negative, expected) {
            var codeFixes = this.getCodeFixes(this.activeFile.fileName);
            if (negative) {
                if (typeof expected === "undefined") {
                    this.assertObjectsEqual(codeFixes, ts.emptyArray);
                }
                else if (typeof expected === "string") {
                    if (codeFixes.some(function (fix) { return fix.fixName === expected; })) {
                        this.raiseError("Expected not to find a fix with the name '".concat(expected, "', but one exists."));
                    }
                }
                else {
                    assert(typeof expected === "undefined" || typeof expected === "string", "With a negated assertion, 'expected' must be undefined or a string value of a codefix name.");
                }
            }
            else if (typeof expected === "string") {
                this.assertObjectsEqual(codeFixes.map(function (fix) { return fix.fixName; }), [expected]);
            }
            else {
                var actuals = codeFixes.map(function (fix) { return ({ description: fix.description, commands: fix.commands }); });
                this.assertObjectsEqual(actuals, negative ? ts.emptyArray : expected);
            }
        };
        TestState.prototype.verifyCodeFixAllAvailable = function (negative, fixName) {
            var availableFixes = this.getCodeFixes(this.activeFile.fileName);
            var hasFix = availableFixes.some(function (fix) { return fix.fixName === fixName && fix.fixId; });
            if (negative && hasFix) {
                this.raiseError("Expected not to find a fix with the name '".concat(fixName, "', but one exists."));
            }
            else if (!negative && !hasFix) {
                if (availableFixes.some(function (fix) { return fix.fixName === fixName; })) {
                    this.raiseError("Found a fix with the name '".concat(fixName, "', but fix-all is not available."));
                }
                this.raiseError("Expected to find a fix with the name '".concat(fixName, "', but none exists.") +
                    availableFixes.length
                    ? " Available fixes: ".concat(availableFixes.map(function (fix) { return "".concat(fix.fixName, " (").concat(fix.fixId ? "with" : "without", " fix-all)"); }).join(", "))
                    : "");
            }
        };
        TestState.prototype.verifyApplicableRefactorAvailableAtMarker = function (negative, markerName) {
            var isAvailable = this.getApplicableRefactors(this.getMarkerByName(markerName)).length > 0;
            if (negative && isAvailable) {
                this.raiseError("verifyApplicableRefactorAvailableAtMarker failed - expected no refactor at marker ".concat(markerName, " but found some."));
            }
            if (!negative && !isAvailable) {
                this.raiseError("verifyApplicableRefactorAvailableAtMarker failed - expected a refactor at marker ".concat(markerName, " but found none."));
            }
        };
        TestState.prototype.getSelection = function () {
            return {
                pos: this.currentCaretPosition,
                end: this.selectionEnd === -1 ? this.currentCaretPosition : this.selectionEnd
            };
        };
        TestState.prototype.verifyRefactorAvailable = function (negative, triggerReason, name, actionName, actionDescription) {
            var refactors = this.getApplicableRefactorsAtSelection(triggerReason);
            refactors = refactors.filter(function (r) { return r.name === name; });
            if (actionName !== undefined) {
                refactors.forEach(function (r) { return r.actions = r.actions.filter(function (a) { return a.name === actionName; }); });
            }
            if (actionDescription !== undefined) {
                refactors.forEach(function (r) { return r.actions = r.actions.filter(function (a) { return a.description === actionDescription; }); });
            }
            refactors = refactors.filter(function (r) { return r.actions.length > 0; });
            var isAvailable = refactors.length > 0;
            if (negative) {
                if (isAvailable) {
                    this.raiseError("verifyApplicableRefactorAvailableForRange failed - expected no refactor but found: ".concat(refactors.map(function (r) { return r.name; }).join(", ")));
                }
            }
            else {
                if (!isAvailable) {
                    this.raiseError("verifyApplicableRefactorAvailableForRange failed - expected a refactor but found none.");
                }
                if (refactors.length > 1) {
                    this.raiseError("".concat(refactors.length, " available refactors both have name ").concat(name, " and action ").concat(actionName));
                }
            }
        };
        TestState.prototype.verifyRefactorKindsAvailable = function (kind, expected, preferences) {
            if (preferences === void 0) { preferences = ts.emptyOptions; }
            var refactors = this.getApplicableRefactorsAtSelection("invoked", kind, preferences);
            var availableKinds = ts.flatMap(refactors, function (refactor) { return refactor.actions; }).map(function (action) { return action.kind; });
            assert.deepEqual(availableKinds.sort(), expected.sort(), "Expected kinds to be equal");
        };
        TestState.prototype.verifyRefactorsAvailable = function (names) {
            assert.deepEqual(unique(this.getApplicableRefactorsAtSelection(), function (r) { return r.name; }), names);
        };
        TestState.prototype.verifyApplicableRefactorAvailableForRange = function (negative) {
            var ranges = this.getRanges();
            if (!(ranges && ranges.length === 1)) {
                throw new Error("Exactly one refactor range is allowed per test.");
            }
            var isAvailable = this.getApplicableRefactors(ts.first(ranges)).length > 0;
            if (negative && isAvailable) {
                this.raiseError("verifyApplicableRefactorAvailableForRange failed - expected no refactor but found some.");
            }
            if (!negative && !isAvailable) {
                this.raiseError("verifyApplicableRefactorAvailableForRange failed - expected a refactor but found none.");
            }
        };
        TestState.prototype.applyRefactor = function (_a) {
            var _b;
            var refactorName = _a.refactorName, actionName = _a.actionName, actionDescription = _a.actionDescription, newContentWithRenameMarker = _a.newContent, triggerReason = _a.triggerReason;
            var range = this.getSelection();
            var refactors = this.getApplicableRefactorsAtSelection(triggerReason);
            var refactorsWithName = refactors.filter(function (r) { return r.name === refactorName; });
            if (refactorsWithName.length === 0) {
                this.raiseError("The expected refactor: ".concat(refactorName, " is not available at the marker location.\nAvailable refactors: ").concat(refactors.map(function (r) { return r.name; })));
            }
            var action = ts.firstDefined(refactorsWithName, function (refactor) { return refactor.actions.find(function (a) { return a.name === actionName; }); });
            if (!action) {
                throw this.raiseError("The expected action: ".concat(actionName, " is not included in: ").concat(ts.flatMap(refactorsWithName, function (r) { return r.actions.map(function (a) { return a.name; }); })));
            }
            if (action.description !== actionDescription) {
                this.raiseError("Expected action description to be ".concat(JSON.stringify(actionDescription), ", got: ").concat(JSON.stringify(action.description)));
            }
            var editInfo = this.languageService.getEditsForRefactor(this.activeFile.fileName, this.formatCodeSettings, range, refactorName, actionName, ts.emptyOptions);
            for (var _i = 0, _c = editInfo.edits; _i < _c.length; _i++) {
                var edit = _c[_i];
                this.applyEdits(edit.fileName, edit.textChanges);
            }
            var renameFilename;
            var renamePosition;
            var newFileContents = typeof newContentWithRenameMarker === "string" ? (_b = {}, _b[this.activeFile.fileName] = newContentWithRenameMarker, _b) : newContentWithRenameMarker;
            for (var fileName in newFileContents) {
                var _d = TestState.parseNewContent(newFileContents[fileName]), rp = _d.renamePosition, newContent = _d.newContent;
                if (renamePosition === undefined) {
                    renameFilename = fileName;
                    renamePosition = rp;
                }
                else {
                    ts.Debug.assert(rp === undefined);
                }
                this.verifyFileContent(fileName, newContent);
            }
            if (renamePosition === undefined) {
                if (editInfo.renameLocation !== undefined) {
                    this.raiseError("Did not expect a rename location, got ".concat(editInfo.renameLocation));
                }
            }
            else {
                this.assertObjectsEqual(editInfo.renameFilename, renameFilename);
                if (renamePosition !== editInfo.renameLocation) {
                    this.raiseError("Expected rename position of ".concat(renamePosition, ", but got ").concat(editInfo.renameLocation));
                }
            }
        };
        TestState.parseNewContent = function (newContentWithRenameMarker) {
            var renamePosition = newContentWithRenameMarker.indexOf("/*RENAME*/");
            if (renamePosition === -1) {
                return { renamePosition: undefined, newContent: newContentWithRenameMarker };
            }
            else {
                var newContent = newContentWithRenameMarker.slice(0, renamePosition) + newContentWithRenameMarker.slice(renamePosition + "/*RENAME*/".length);
                return { renamePosition: renamePosition, newContent: newContent };
            }
        };
        TestState.prototype.noMoveToNewFile = function () {
            var ranges = this.getRanges();
            assert(ranges.length);
            for (var _i = 0, ranges_6 = ranges; _i < ranges_6.length; _i++) {
                var range = ranges_6[_i];
                for (var _a = 0, _b = this.getApplicableRefactors(range, { allowTextChangesInNewFiles: true }); _a < _b.length; _a++) {
                    var refactor = _b[_a];
                    if (refactor.name === "Move to a new file") {
                        ts.Debug.fail("Did not expect to get 'move to a new file' refactor");
                    }
                }
            }
        };
        TestState.prototype.moveToNewFile = function (options) {
            assert(this.getRanges().length === 1, "Must have exactly one fourslash range (source enclosed between '[|' and '|]' delimiters) in the source file");
            var range = this.getRanges()[0];
            var refactor = ts.find(this.getApplicableRefactors(range, { allowTextChangesInNewFiles: true }), function (r) { return r.name === "Move to a new file"; });
            assert(refactor.actions.length === 1);
            var action = ts.first(refactor.actions);
            assert(action.name === "Move to a new file" && action.description === "Move to a new file");
            var editInfo = this.languageService.getEditsForRefactor(range.fileName, this.formatCodeSettings, range, refactor.name, action.name, options.preferences || ts.emptyOptions);
            this.verifyNewContent({ newFileContent: options.newFileContents }, editInfo.edits);
        };
        TestState.prototype.testNewFileContents = function (edits, newFileContents, description) {
            for (var _i = 0, edits_1 = edits; _i < edits_1.length; _i++) {
                var _a = edits_1[_i], fileName = _a.fileName, textChanges = _a.textChanges;
                var newContent = newFileContents[fileName];
                if (newContent === undefined) {
                    this.raiseError("".concat(description, " - There was an edit in ").concat(fileName, " but new content was not specified."));
                }
                var fileContent = this.tryGetFileContent(fileName);
                if (fileContent !== undefined) {
                    var actualNewContent = ts.textChanges.applyChanges(fileContent, textChanges);
                    assert.equal(actualNewContent, newContent, "new content for ".concat(fileName));
                }
                else {
                    // Creates a new file.
                    assert(textChanges.length === 1);
                    var change = ts.first(textChanges);
                    assert.deepEqual(change.span, ts.createTextSpan(0, 0));
                    assert.equal(change.newText, newContent, "".concat(description, " - Content for ").concat(fileName));
                }
            }
            var _loop_14 = function (fileName) {
                if (!edits.some(function (e) { return e.fileName === fileName; })) {
                    ts.Debug.fail("".concat(description, " - Asserted new contents of ").concat(fileName, " but there were no edits"));
                }
            };
            for (var fileName in newFileContents) {
                _loop_14(fileName);
            }
        };
        TestState.prototype.verifyFileAfterApplyingRefactorAtMarker = function (markerName, expectedContent, refactorNameToApply, actionName, formattingOptions) {
            formattingOptions = formattingOptions || this.formatCodeSettings;
            var marker = this.getMarkerByName(markerName);
            var applicableRefactors = this.languageService.getApplicableRefactors(this.activeFile.fileName, marker.position, ts.emptyOptions);
            var applicableRefactorToApply = ts.find(applicableRefactors, function (refactor) { return refactor.name === refactorNameToApply; });
            if (!applicableRefactorToApply) {
                this.raiseError("The expected refactor: ".concat(refactorNameToApply, " is not available at the marker location."));
            }
            var editInfo = this.languageService.getEditsForRefactor(marker.fileName, formattingOptions, marker.position, refactorNameToApply, actionName, ts.emptyOptions);
            for (var _i = 0, _a = editInfo.edits; _i < _a.length; _i++) {
                var edit = _a[_i];
                this.applyEdits(edit.fileName, edit.textChanges);
            }
            var actualContent = this.getFileContent(marker.fileName);
            if (actualContent !== expectedContent) {
                this.raiseError("verifyFileAfterApplyingRefactors failed:\n".concat(showTextDiff(expectedContent, actualContent)));
            }
        };
        TestState.prototype.printAvailableCodeFixes = function () {
            var codeFixes = this.getCodeFixes(this.activeFile.fileName);
            Harness.IO.log(stringify(codeFixes));
        };
        TestState.prototype.formatCallHierarchyItemSpan = function (file, span, prefix, trailingPrefix) {
            if (trailingPrefix === void 0) { trailingPrefix = prefix; }
            var startLc = this.languageServiceAdapterHost.positionToLineAndCharacter(file.fileName, span.start);
            var endLc = this.languageServiceAdapterHost.positionToLineAndCharacter(file.fileName, ts.textSpanEnd(span));
            var lines = this.spanLines(file, span, { fullLines: true, lineNumbers: true, selection: true });
            var text = "";
            text += "".concat(prefix, "\u256D ").concat(file.fileName, ":").concat(startLc.line + 1, ":").concat(startLc.character + 1, "-").concat(endLc.line + 1, ":").concat(endLc.character + 1, "\n");
            for (var _i = 0, lines_4 = lines; _i < lines_4.length; _i++) {
                var line = lines_4[_i];
                text += "".concat(prefix, "\u2502 ").concat(line.trimRight(), "\n");
            }
            text += "".concat(trailingPrefix, "\u2570\n");
            return text;
        };
        TestState.prototype.formatCallHierarchyItemSpans = function (file, spans, prefix, trailingPrefix) {
            if (trailingPrefix === void 0) { trailingPrefix = prefix; }
            var text = "";
            for (var i = 0; i < spans.length; i++) {
                text += this.formatCallHierarchyItemSpan(file, spans[i], prefix, i < spans.length - 1 ? prefix : trailingPrefix);
            }
            return text;
        };
        TestState.prototype.formatCallHierarchyItem = function (file, callHierarchyItem, direction, seen, prefix, trailingPrefix) {
            if (trailingPrefix === void 0) { trailingPrefix = prefix; }
            var key = "".concat(callHierarchyItem.file, "|").concat(JSON.stringify(callHierarchyItem.span), "|").concat(direction);
            var alreadySeen = seen.has(key);
            seen.set(key, true);
            var incomingCalls = direction === 2 /* CallHierarchyItemDirection.Outgoing */ ? { result: "skip" } :
                alreadySeen ? { result: "seen" } :
                    { result: "show", values: this.languageService.provideCallHierarchyIncomingCalls(callHierarchyItem.file, callHierarchyItem.selectionSpan.start) };
            var outgoingCalls = direction === 1 /* CallHierarchyItemDirection.Incoming */ ? { result: "skip" } :
                alreadySeen ? { result: "seen" } :
                    { result: "show", values: this.languageService.provideCallHierarchyOutgoingCalls(callHierarchyItem.file, callHierarchyItem.selectionSpan.start) };
            var text = "";
            text += "".concat(prefix, "\u256D name: ").concat(callHierarchyItem.name, "\n");
            text += "".concat(prefix, "\u251C kind: ").concat(callHierarchyItem.kind, "\n");
            if (callHierarchyItem.containerName) {
                text += "".concat(prefix, "\u251C containerName: ").concat(callHierarchyItem.containerName, "\n");
            }
            text += "".concat(prefix, "\u251C file: ").concat(callHierarchyItem.file, "\n");
            text += "".concat(prefix, "\u251C span:\n");
            text += this.formatCallHierarchyItemSpan(file, callHierarchyItem.span, "".concat(prefix, "\u2502 "));
            text += "".concat(prefix, "\u251C selectionSpan:\n");
            text += this.formatCallHierarchyItemSpan(file, callHierarchyItem.selectionSpan, "".concat(prefix, "\u2502 "), incomingCalls.result !== "skip" || outgoingCalls.result !== "skip" ? "".concat(prefix, "\u2502 ") :
                "".concat(trailingPrefix, "\u2570 "));
            if (incomingCalls.result === "seen") {
                if (outgoingCalls.result === "skip") {
                    text += "".concat(trailingPrefix, "\u2570 incoming: ...\n");
                }
                else {
                    text += "".concat(prefix, "\u251C incoming: ...\n");
                }
            }
            else if (incomingCalls.result === "show") {
                if (!ts.some(incomingCalls.values)) {
                    if (outgoingCalls.result === "skip") {
                        text += "".concat(trailingPrefix, "\u2570 incoming: none\n");
                    }
                    else {
                        text += "".concat(prefix, "\u251C incoming: none\n");
                    }
                }
                else {
                    text += "".concat(prefix, "\u251C incoming:\n");
                    for (var i = 0; i < incomingCalls.values.length; i++) {
                        var incomingCall = incomingCalls.values[i];
                        var file_1 = this.findFile(incomingCall.from.file);
                        text += "".concat(prefix, "\u2502 \u256D from:\n");
                        text += this.formatCallHierarchyItem(file_1, incomingCall.from, 1 /* CallHierarchyItemDirection.Incoming */, seen, "".concat(prefix, "\u2502 \u2502 "));
                        text += "".concat(prefix, "\u2502 \u251C fromSpans:\n");
                        text += this.formatCallHierarchyItemSpans(file_1, incomingCall.fromSpans, "".concat(prefix, "\u2502 \u2502 "), i < incomingCalls.values.length - 1 ? "".concat(prefix, "\u2502 \u2570 ") :
                            outgoingCalls.result !== "skip" ? "".concat(prefix, "\u2502 \u2570 ") :
                                "".concat(trailingPrefix, "\u2570 \u2570 "));
                    }
                }
            }
            if (outgoingCalls.result === "seen") {
                text += "".concat(trailingPrefix, "\u2570 outgoing: ...\n");
            }
            else if (outgoingCalls.result === "show") {
                if (!ts.some(outgoingCalls.values)) {
                    text += "".concat(trailingPrefix, "\u2570 outgoing: none\n");
                }
                else {
                    text += "".concat(prefix, "\u251C outgoing:\n");
                    for (var i = 0; i < outgoingCalls.values.length; i++) {
                        var outgoingCall = outgoingCalls.values[i];
                        text += "".concat(prefix, "\u2502 \u256D to:\n");
                        text += this.formatCallHierarchyItem(this.findFile(outgoingCall.to.file), outgoingCall.to, 2 /* CallHierarchyItemDirection.Outgoing */, seen, "".concat(prefix, "\u2502 \u2502 "));
                        text += "".concat(prefix, "\u2502 \u251C fromSpans:\n");
                        text += this.formatCallHierarchyItemSpans(file, outgoingCall.fromSpans, "".concat(prefix, "\u2502 \u2502 "), i < outgoingCalls.values.length - 1 ? "".concat(prefix, "\u2502 \u2570 ") :
                            "".concat(trailingPrefix, "\u2570 \u2570 "));
                    }
                }
            }
            return text;
        };
        TestState.prototype.formatCallHierarchy = function (callHierarchyItem) {
            var text = "";
            if (callHierarchyItem) {
                var file = this.findFile(callHierarchyItem.file);
                text += this.formatCallHierarchyItem(file, callHierarchyItem, 0 /* CallHierarchyItemDirection.Root */, new ts.Map(), "");
            }
            return text;
        };
        TestState.prototype.baselineCallHierarchy = function () {
            var _this = this;
            var baselineFile = this.getBaselineFileNameForContainingTestFile(".callHierarchy.txt");
            var callHierarchyItem = this.languageService.prepareCallHierarchy(this.activeFile.fileName, this.currentCaretPosition);
            var text = callHierarchyItem ? ts.mapOneOrMany(callHierarchyItem, function (item) { return _this.formatCallHierarchy(item); }, function (result) { return result.join(""); }) : "none";
            Harness.Baseline.runBaseline(baselineFile, text);
        };
        TestState.prototype.assertTextSpanEqualsRange = function (span, range, message) {
            if (!textSpanEqualsRange(span, range)) {
                this.raiseError("".concat(prefixMessage(message), "Expected to find TextSpan ").concat(JSON.stringify({ start: range.pos, length: range.end - range.pos }), " but got ").concat(JSON.stringify(span), " instead."));
            }
        };
        TestState.prototype.getLineContent = function (index) {
            var text = this.getFileContent(this.activeFile.fileName);
            var pos = this.languageServiceAdapterHost.lineAndCharacterToPosition(this.activeFile.fileName, { line: index, character: 0 });
            var startPos = pos, endPos = pos;
            while (startPos > 0) {
                var ch = text.charCodeAt(startPos - 1);
                if (ch === 13 /* ts.CharacterCodes.carriageReturn */ || ch === 10 /* ts.CharacterCodes.lineFeed */) {
                    break;
                }
                startPos--;
            }
            while (endPos < text.length) {
                var ch = text.charCodeAt(endPos);
                if (ch === 13 /* ts.CharacterCodes.carriageReturn */ || ch === 10 /* ts.CharacterCodes.lineFeed */) {
                    break;
                }
                endPos++;
            }
            return text.substring(startPos, endPos);
        };
        // Get the text of the entire line the caret is currently at
        TestState.prototype.getCurrentLineContent = function () {
            return this.getLineContent(this.languageServiceAdapterHost.positionToLineAndCharacter(this.activeFile.fileName, this.currentCaretPosition).line);
        };
        TestState.prototype.findFile = function (indexOrName) {
            if (typeof indexOrName === "number") {
                var index = indexOrName;
                if (index >= this.testData.files.length) {
                    throw new Error("File index (".concat(index, ") in openFile was out of range. There are only ").concat(this.testData.files.length, " files in this test."));
                }
                else {
                    return this.testData.files[index];
                }
            }
            else if (ts.isString(indexOrName)) {
                var _a = this.tryFindFileWorker(indexOrName), file = _a.file, availableNames = _a.availableNames;
                if (!file) {
                    throw new Error("No test file named \"".concat(indexOrName, "\" exists. Available file names are: ").concat(availableNames.join(", ")));
                }
                return file;
            }
            else {
                return ts.Debug.assertNever(indexOrName);
            }
        };
        TestState.prototype.tryFindFileWorker = function (name) {
            name = ts.normalizePath(name);
            // names are stored in the compiler with this relative path, this allows people to use goTo.file on just the fileName
            name = name.indexOf("/") === -1 ? (this.basePath + "/" + name) : name;
            var availableNames = [];
            var file = ts.forEach(this.testData.files, function (file) {
                var fn = ts.normalizePath(file.fileName);
                if (fn) {
                    if (fn === name) {
                        return file;
                    }
                    availableNames.push(fn);
                }
            });
            return { file: file, availableNames: availableNames };
        };
        TestState.prototype.hasFile = function (name) {
            return this.tryFindFileWorker(name).file !== undefined;
        };
        TestState.prototype.getLineColStringAtPosition = function (position, file) {
            if (file === void 0) { file = this.activeFile; }
            var pos = this.languageServiceAdapterHost.positionToLineAndCharacter(file.fileName, position);
            return "line ".concat((pos.line + 1), ", col ").concat(pos.character);
        };
        TestState.prototype.getMarkerByName = function (markerName) {
            var markerPos = this.testData.markerPositions.get(markerName);
            if (markerPos === undefined) {
                throw new Error("Unknown marker \"".concat(markerName, "\" Available markers: ").concat(this.getMarkerNames().map(function (m) { return "\"" + m + "\""; }).join(", ")));
            }
            else {
                return markerPos;
            }
        };
        TestState.prototype.setCancelled = function (numberOfCalls) {
            this.cancellationToken.setCancelled(numberOfCalls);
        };
        TestState.prototype.resetCancelled = function () {
            this.cancellationToken.resetCancelled();
        };
        TestState.prototype.getEditsForFileRename = function (_a) {
            var _this = this;
            var oldPath = _a.oldPath, newPath = _a.newPath, newFileContents = _a.newFileContents, preferences = _a.preferences;
            var test = function (fileContents, description) {
                var changes = _this.languageService.getEditsForFileRename(oldPath, newPath, _this.formatCodeSettings, preferences);
                _this.testNewFileContents(changes, fileContents, description);
            };
            ts.Debug.assert(!this.hasFile(newPath), "initially, newPath should not exist");
            test(newFileContents, "with file not yet moved");
            this.languageServiceAdapterHost.renameFileOrDirectory(oldPath, newPath);
            this.languageService.cleanupSemanticCache();
            var pathUpdater = ts.getPathUpdater(oldPath, newPath, ts.createGetCanonicalFileName(/*useCaseSensitiveFileNames*/ false), /*sourceMapper*/ undefined);
            test(renameKeys(newFileContents, function (key) { return pathUpdater(key) || key; }), "with file moved");
        };
        TestState.prototype.getApplicableRefactorsAtSelection = function (triggerReason, kind, preferences) {
            if (triggerReason === void 0) { triggerReason = "implicit"; }
            if (preferences === void 0) { preferences = ts.emptyOptions; }
            return this.getApplicableRefactorsWorker(this.getSelection(), this.activeFile.fileName, preferences, triggerReason, kind);
        };
        TestState.prototype.getApplicableRefactors = function (rangeOrMarker, preferences, triggerReason, kind) {
            if (preferences === void 0) { preferences = ts.emptyOptions; }
            if (triggerReason === void 0) { triggerReason = "implicit"; }
            return this.getApplicableRefactorsWorker("position" in rangeOrMarker ? rangeOrMarker.position : rangeOrMarker, rangeOrMarker.fileName, preferences, triggerReason, kind); // eslint-disable-line local/no-in-operator
        };
        TestState.prototype.getApplicableRefactorsWorker = function (positionOrRange, fileName, preferences, triggerReason, kind) {
            if (preferences === void 0) { preferences = ts.emptyOptions; }
            return this.languageService.getApplicableRefactors(fileName, positionOrRange, preferences, triggerReason, kind) || ts.emptyArray;
        };
        TestState.prototype.configurePlugin = function (pluginName, configuration) {
            this.languageService.configurePlugin(pluginName, configuration);
        };
        TestState.prototype.setCompilerOptionsForInferredProjects = function (options) {
            ts.Debug.assert(this.testType === 3 /* FourSlashTestType.Server */);
            this.languageService.setCompilerOptionsForInferredProjects(options);
        };
        TestState.prototype.toggleLineComment = function (newFileContent) {
            var changes = [];
            for (var _i = 0, _a = this.getRanges(); _i < _a.length; _i++) {
                var range = _a[_i];
                changes.push.apply(changes, this.languageService.toggleLineComment(this.activeFile.fileName, range));
            }
            this.applyEdits(this.activeFile.fileName, changes);
            this.verifyCurrentFileContent(newFileContent);
        };
        TestState.prototype.toggleMultilineComment = function (newFileContent) {
            var changes = [];
            for (var _i = 0, _a = this.getRanges(); _i < _a.length; _i++) {
                var range = _a[_i];
                changes.push.apply(changes, this.languageService.toggleMultilineComment(this.activeFile.fileName, range));
            }
            this.applyEdits(this.activeFile.fileName, changes);
            this.verifyCurrentFileContent(newFileContent);
        };
        TestState.prototype.commentSelection = function (newFileContent) {
            var changes = [];
            for (var _i = 0, _a = this.getRanges(); _i < _a.length; _i++) {
                var range = _a[_i];
                changes.push.apply(changes, this.languageService.commentSelection(this.activeFile.fileName, range));
            }
            this.applyEdits(this.activeFile.fileName, changes);
            this.verifyCurrentFileContent(newFileContent);
        };
        TestState.prototype.uncommentSelection = function (newFileContent) {
            var changes = [];
            for (var _i = 0, _a = this.getRanges(); _i < _a.length; _i++) {
                var range = _a[_i];
                changes.push.apply(changes, this.languageService.uncommentSelection(this.activeFile.fileName, range));
            }
            this.applyEdits(this.activeFile.fileName, changes);
            this.verifyCurrentFileContent(newFileContent);
        };
        return TestState;
    }());
    FourSlash.TestState = TestState;
    function prefixMessage(message) {
        return message ? "".concat(message, " - ") : "";
    }
    function textSpanEqualsRange(span, range) {
        return span.start === range.pos && span.length === range.end - range.pos;
    }
    function updateTextRangeForTextChanges(_a, textChanges) {
        var pos = _a.pos, end = _a.end;
        forEachTextChange(textChanges, function (change) {
            var update = function (p) { return updatePosition(p, change.span.start, ts.textSpanEnd(change.span), change.newText); };
            pos = update(pos);
            end = update(end);
        });
        return { pos: pos, end: end };
    }
    /** Apply each textChange in order, updating future changes to account for the text offset of previous changes. */
    function forEachTextChange(changes, cb) {
        // Copy this so we don't ruin someone else's copy
        changes = JSON.parse(JSON.stringify(changes));
        for (var i = 0; i < changes.length; i++) {
            var change = changes[i];
            cb(change);
            var changeDelta = change.newText.length - change.span.length;
            for (var j = i + 1; j < changes.length; j++) {
                if (changes[j].span.start >= change.span.start) {
                    changes[j].span.start += changeDelta;
                }
            }
        }
    }
    function updatePosition(position, editStart, editEnd, _a) {
        var length = _a.length;
        // If inside the edit, return -1 to mark as invalid
        return position <= editStart ? position : position < editEnd ? -1 : position + length - +(editEnd - editStart);
    }
    function renameKeys(obj, renameKey) {
        var res = {};
        for (var key in obj) {
            res[renameKey(key)] = obj[key];
        }
        return res;
    }
    function runFourSlashTest(basePath, testType, fileName) {
        var content = Harness.IO.readFile(fileName);
        runFourSlashTestContent(basePath, testType, content, fileName);
    }
    FourSlash.runFourSlashTest = runFourSlashTest;
    function runFourSlashTestContent(basePath, testType, content, fileName) {
        // Give file paths an absolute path for the virtual file system
        var absoluteBasePath = ts.combinePaths(Harness.virtualFileSystemRoot, basePath);
        var absoluteFileName = ts.combinePaths(Harness.virtualFileSystemRoot, fileName);
        // Parse out the files and their metadata
        var testData = parseTestData(absoluteBasePath, content, absoluteFileName);
        var state = new TestState(absoluteFileName, absoluteBasePath, testType, testData);
        var actualFileName = Harness.IO.resolvePath(fileName) || absoluteFileName;
        var output = ts.transpileModule(content, { reportDiagnostics: true, fileName: actualFileName, compilerOptions: { target: 2 /* ts.ScriptTarget.ES2015 */, inlineSourceMap: true, inlineSources: true } });
        if (output.diagnostics.length > 0) {
            throw new Error("Syntax error in ".concat(absoluteBasePath, ": ").concat(output.diagnostics[0].messageText));
        }
        runCode(output.outputText, state, actualFileName);
    }
    FourSlash.runFourSlashTestContent = runFourSlashTestContent;
    function runCode(code, state, fileName) {
        var _a;
        // Compile and execute the test
        var generatedFile = ts.changeExtension(fileName, ".js");
        var wrappedCode = "(function(test, goTo, plugins, verify, edit, debug, format, cancellation, classification, completion, verifyOperationIsCancelled) {".concat(code, "\n//# sourceURL=").concat(ts.getBaseFileName(generatedFile), "\n})");
        // Provide the content of the current test to 'source-map-support' so that it can give us the correct source positions
        // for test failures.
        var sourceMapSupportModule;
        try {
            sourceMapSupportModule = require("source-map-support");
        }
        catch (_b) {
            // do nothing
        }
        sourceMapSupportModule === null || sourceMapSupportModule === void 0 ? void 0 : sourceMapSupportModule.install({
            retrieveFile: function (path) {
                return path === generatedFile ? wrappedCode :
                    undefined;
            }
        });
        try {
            var test_1 = new FourSlashInterface.Test(state);
            var goTo = new FourSlashInterface.GoTo(state);
            var config = new FourSlashInterface.Config(state);
            var verify = new FourSlashInterface.Verify(state);
            var edit = new FourSlashInterface.Edit(state);
            var debug = new FourSlashInterface.Debug(state);
            var format = new FourSlashInterface.Format(state);
            var cancellation = new FourSlashInterface.Cancellation(state);
            // eslint-disable-next-line no-eval
            var f = eval(wrappedCode);
            f(test_1, goTo, config, verify, edit, debug, format, cancellation, FourSlashInterface.classification, FourSlashInterface.Completion, verifyOperationIsCancelled);
        }
        catch (err) {
            // ensure 'source-map-support' is triggered while we still have the handler attached by accessing `error.stack`.
            (_a = err.stack) === null || _a === void 0 ? void 0 : _a.toString();
            throw err;
        }
        finally {
            sourceMapSupportModule === null || sourceMapSupportModule === void 0 ? void 0 : sourceMapSupportModule.resetRetrieveHandlers();
        }
    }
    function chompLeadingSpace(content) {
        var lines = content.split("\n");
        for (var _i = 0, lines_5 = lines; _i < lines_5.length; _i++) {
            var line = lines_5[_i];
            if ((line.length !== 0) && (line.charAt(0) !== " ")) {
                return content;
            }
        }
        return lines.map(function (s) { return s.substr(1); }).join("\n");
    }
    function parseTestData(basePath, contents, fileName) {
        // Regex for parsing options in the format "@Alpha: Value of any sort"
        var optionRegex = /^\s*@(\w+):\s*(.*)\s*/;
        // List of all the subfiles we've parsed out
        var files = [];
        // Global options
        var globalOptions = {};
        var symlinks;
        // Marker positions
        // Split up the input file by line
        // Note: IE JS engine incorrectly handles consecutive delimiters here when using RegExp split, so
        // we have to string-based splitting instead and try to figure out the delimiting chars
        var lines = contents.split("\n");
        var i = 0;
        var markerPositions = new ts.Map();
        var markers = [];
        var ranges = [];
        // Stuff related to the subfile we're parsing
        var currentFileContent;
        var currentFileName = fileName;
        var currentFileSymlinks;
        var currentFileOptions = {};
        function nextFile() {
            if (currentFileContent === undefined)
                return;
            var file = parseFileContent(currentFileContent, currentFileName, markerPositions, markers, ranges);
            file.fileOptions = currentFileOptions;
            file.symlinks = currentFileSymlinks;
            // Store result file
            files.push(file);
            currentFileContent = undefined;
            currentFileOptions = {};
            currentFileName = fileName;
            currentFileSymlinks = undefined;
        }
        for (var _i = 0, lines_6 = lines; _i < lines_6.length; _i++) {
            var line = lines_6[_i];
            i++;
            if (line.length > 0 && line.charAt(line.length - 1) === "\r") {
                line = line.substr(0, line.length - 1);
            }
            if (line.substr(0, 4) === "////") {
                var text = line.substr(4);
                currentFileContent = currentFileContent === undefined ? text : currentFileContent + "\n" + text;
            }
            else if (line.substr(0, 3) === "///" && currentFileContent !== undefined) {
                throw new Error("Three-slash line in the middle of four-slash region at line " + i);
            }
            else if (line.substr(0, 2) === "//") {
                var possiblySymlinks = Harness.TestCaseParser.parseSymlinkFromTest(line, symlinks);
                if (possiblySymlinks) {
                    symlinks = possiblySymlinks;
                }
                else {
                    // Comment line, check for global/file @options and record them
                    var match = optionRegex.exec(line.substr(2));
                    if (match) {
                        var key = match[1].toLowerCase();
                        var value = match[2];
                        if (!ts.contains(fileMetadataNames, key)) {
                            // Check if the match is already existed in the global options
                            if (globalOptions[key] !== undefined) {
                                throw new Error("Global option '".concat(key, "' already exists"));
                            }
                            globalOptions[key] = value;
                        }
                        else {
                            switch (key) {
                                case "filename" /* MetadataOptionNames.fileName */:
                                    // Found an @FileName directive, if this is not the first then create a new subfile
                                    nextFile();
                                    currentFileName = ts.isRootedDiskPath(value) ? value : basePath + "/" + value;
                                    currentFileOptions[key] = value;
                                    break;
                                case "symlink" /* MetadataOptionNames.symlink */:
                                    currentFileSymlinks = ts.append(currentFileSymlinks, value);
                                    break;
                                default:
                                    // Add other fileMetadata flag
                                    currentFileOptions[key] = value;
                            }
                        }
                    }
                }
            }
            // Previously blank lines between fourslash content caused it to be considered as 2 files,
            // Remove this behavior since it just causes errors now
            else if (line !== "") {
                // Code line, terminate current subfile if there is one
                nextFile();
            }
        }
        // @Filename is the only directive that can be used in a test that contains tsconfig.json file.
        var config = ts.find(files, isConfig);
        if (config) {
            var directive = getNonFileNameOptionInFileList(files);
            if (!directive) {
                directive = getNonFileNameOptionInObject(globalOptions);
            }
            if (directive) {
                throw Error("It is not allowed to use ".concat(config.fileName, " along with directive '").concat(directive, "'"));
            }
        }
        return {
            markerPositions: markerPositions,
            markers: markers,
            globalOptions: globalOptions,
            files: files,
            symlinks: symlinks,
            ranges: ranges
        };
    }
    function isConfig(file) {
        return Harness.getConfigNameFromFileName(file.fileName) !== undefined;
    }
    function getNonFileNameOptionInFileList(files) {
        return ts.forEach(files, function (f) { return getNonFileNameOptionInObject(f.fileOptions); });
    }
    function getNonFileNameOptionInObject(optionObject) {
        for (var option in optionObject) {
            switch (option) {
                case "filename" /* MetadataOptionNames.fileName */:
                case "baselinefile" /* MetadataOptionNames.baselineFile */:
                case "emitthisfile" /* MetadataOptionNames.emitThisFile */:
                    break;
                default:
                    return option;
            }
        }
        return undefined;
    }
    var State;
    (function (State) {
        State[State["none"] = 0] = "none";
        State[State["inSlashStarMarker"] = 1] = "inSlashStarMarker";
        State[State["inObjectMarker"] = 2] = "inObjectMarker";
    })(State || (State = {}));
    function reportError(fileName, line, col, message) {
        var errorMessage = fileName + "(" + line + "," + col + "): " + message;
        throw new Error(errorMessage);
    }
    function recordObjectMarker(fileName, location, text, markerMap, markers) {
        var markerValue;
        try {
            // Attempt to parse the marker value as JSON
            markerValue = JSON.parse("{ " + text + " }");
        }
        catch (e) {
            reportError(fileName, location.sourceLine, location.sourceColumn, "Unable to parse marker text " + e.message);
        }
        if (markerValue === undefined) {
            reportError(fileName, location.sourceLine, location.sourceColumn, "Object markers can not be empty");
            return undefined;
        }
        var marker = {
            fileName: fileName,
            position: location.position,
            data: markerValue
        };
        // Object markers can be anonymous
        if (markerValue.name) {
            markerMap.set(markerValue.name, marker);
        }
        markers.push(marker);
        return marker;
    }
    function recordMarker(fileName, location, name, markerMap, markers) {
        var marker = {
            fileName: fileName,
            position: location.position
        };
        // Verify markers for uniqueness
        if (markerMap.has(name)) {
            var message = "Marker '" + name + "' is duplicated in the source file contents.";
            reportError(marker.fileName, location.sourceLine, location.sourceColumn, message);
            return undefined;
        }
        else {
            markerMap.set(name, marker);
            markers.push(marker);
            return marker;
        }
    }
    function parseFileContent(content, fileName, markerMap, markers, ranges) {
        content = chompLeadingSpace(content);
        // Any slash-star comment with a character not in this string is not a marker.
        var validMarkerChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz$1234567890_";
        /// The file content (minus metacharacters) so far
        var output = "";
        /// The current marker (or maybe multi-line comment?) we're parsing, possibly
        var openMarker;
        /// A stack of the open range markers that are still unclosed
        var openRanges = [];
        /// A list of ranges we've collected so far */
        var localRanges = [];
        /// The latest position of the start of an unflushed plain text area
        var lastNormalCharPosition = 0;
        /// The total number of metacharacters removed from the file (so far)
        var difference = 0;
        /// The fourslash file state object we are generating
        var state = 0 /* State.none */;
        /// Current position data
        var line = 1;
        var column = 1;
        var flush = function (lastSafeCharIndex) {
            output = output + content.substr(lastNormalCharPosition, lastSafeCharIndex === undefined ? undefined : lastSafeCharIndex - lastNormalCharPosition);
        };
        if (content.length > 0) {
            var previousChar = content.charAt(0);
            for (var i = 1; i < content.length; i++) {
                var currentChar = content.charAt(i);
                switch (state) {
                    case 0 /* State.none */:
                        if (previousChar === "[" && currentChar === "|") {
                            // found a range start
                            openRanges.push({
                                position: (i - 1) - difference,
                                sourcePosition: i - 1,
                                sourceLine: line,
                                sourceColumn: column,
                            });
                            // copy all text up to marker position
                            flush(i - 1);
                            lastNormalCharPosition = i + 1;
                            difference += 2;
                        }
                        else if (previousChar === "|" && currentChar === "]") {
                            // found a range end
                            var rangeStart = openRanges.pop();
                            if (!rangeStart) {
                                throw reportError(fileName, line, column, "Found range end with no matching start.");
                            }
                            var range = {
                                fileName: fileName,
                                pos: rangeStart.position,
                                end: (i - 1) - difference,
                                marker: rangeStart.marker
                            };
                            localRanges.push(range);
                            // copy all text up to range marker position
                            flush(i - 1);
                            lastNormalCharPosition = i + 1;
                            difference += 2;
                        }
                        else if (previousChar === "/" && currentChar === "*") {
                            // found a possible marker start
                            state = 1 /* State.inSlashStarMarker */;
                            openMarker = {
                                position: (i - 1) - difference,
                                sourcePosition: i - 1,
                                sourceLine: line,
                                sourceColumn: column,
                            };
                        }
                        else if (previousChar === "{" && currentChar === "|") {
                            // found an object marker start
                            state = 2 /* State.inObjectMarker */;
                            openMarker = {
                                position: (i - 1) - difference,
                                sourcePosition: i - 1,
                                sourceLine: line,
                                sourceColumn: column,
                            };
                            flush(i - 1);
                        }
                        break;
                    case 2 /* State.inObjectMarker */:
                        // Object markers are only ever terminated by |} and have no content restrictions
                        if (previousChar === "|" && currentChar === "}") {
                            // Record the marker
                            var objectMarkerNameText = content.substring(openMarker.sourcePosition + 2, i - 1).trim();
                            var marker = recordObjectMarker(fileName, openMarker, objectMarkerNameText, markerMap, markers);
                            if (openRanges.length > 0) {
                                openRanges[openRanges.length - 1].marker = marker;
                            }
                            // Set the current start to point to the end of the current marker to ignore its text
                            lastNormalCharPosition = i + 1;
                            difference += i + 1 - openMarker.sourcePosition;
                            // Reset the state
                            openMarker = undefined;
                            state = 0 /* State.none */;
                        }
                        break;
                    case 1 /* State.inSlashStarMarker */:
                        if (previousChar === "*" && currentChar === "/") {
                            // Record the marker
                            // start + 2 to ignore the */, -1 on the end to ignore the * (/ is next)
                            var markerNameText = content.substring(openMarker.sourcePosition + 2, i - 1).trim();
                            var marker = recordMarker(fileName, openMarker, markerNameText, markerMap, markers);
                            if (openRanges.length > 0) {
                                openRanges[openRanges.length - 1].marker = marker;
                            }
                            // Set the current start to point to the end of the current marker to ignore its text
                            flush(openMarker.sourcePosition);
                            lastNormalCharPosition = i + 1;
                            difference += i + 1 - openMarker.sourcePosition;
                            // Reset the state
                            openMarker = undefined;
                            state = 0 /* State.none */;
                        }
                        else if (validMarkerChars.indexOf(currentChar) < 0) {
                            if (currentChar === "*" && i < content.length - 1 && content.charAt(i + 1) === "/") {
                                // The marker is about to be closed, ignore the 'invalid' char
                            }
                            else {
                                // We've hit a non-valid marker character, so we were actually in a block comment
                                // Bail out the text we've gathered so far back into the output
                                flush(i);
                                lastNormalCharPosition = i;
                                openMarker = undefined;
                                state = 0 /* State.none */;
                            }
                        }
                        break;
                }
                if (currentChar === "\n" && previousChar === "\r") {
                    // Ignore trailing \n after a \r
                    continue;
                }
                else if (currentChar === "\n" || currentChar === "\r") {
                    line++;
                    column = 1;
                    continue;
                }
                column++;
                previousChar = currentChar;
            }
        }
        // Add the remaining text
        flush(/*lastSafeCharIndex*/ undefined);
        if (openRanges.length > 0) {
            var openRange = openRanges[0];
            reportError(fileName, openRange.sourceLine, openRange.sourceColumn, "Unterminated range.");
        }
        if (openMarker) {
            reportError(fileName, openMarker.sourceLine, openMarker.sourceColumn, "Unterminated marker.");
        }
        // put ranges in the correct order
        localRanges = localRanges.sort(function (a, b) { return a.pos < b.pos ? -1 : a.pos === b.pos && a.end > b.end ? -1 : 1; });
        localRanges.forEach(function (r) { return ranges.push(r); });
        return {
            content: output,
            fileOptions: {},
            version: 0,
            fileName: fileName,
        };
    }
    function stringify(data, replacer) {
        return JSON.stringify(data, replacer, 2);
    }
    /** Collects an array of unique outputs. */
    function unique(inputs, getOutput) {
        var set = new ts.Map();
        for (var _i = 0, inputs_2 = inputs; _i < inputs_2.length; _i++) {
            var input = inputs_2[_i];
            var out = getOutput(input);
            set.set(out, true);
        }
        return ts.arrayFrom(set.keys());
    }
    function toArray(x) {
        return ts.isArray(x) ? x : [x];
    }
    function makeWhitespaceVisible(text) {
        return text.replace(/ /g, "\u00B7").replace(/\r/g, "\u00B6").replace(/\n/g, "\u2193\n").replace(/\t/g, "\u2192\   ");
    }
    function showTextDiff(expected, actual) {
        // Only show whitespace if the difference is whitespace-only.
        if (differOnlyByWhitespace(expected, actual)) {
            expected = makeWhitespaceVisible(expected);
            actual = makeWhitespaceVisible(actual);
        }
        return displayExpectedAndActualString(expected, actual);
    }
    function differOnlyByWhitespace(a, b) {
        return stripWhitespace(a) === stripWhitespace(b);
    }
    function stripWhitespace(s) {
        return s.replace(/\s/g, "");
    }
    function findDuplicatedElement(a, equal) {
        for (var i = 0; i < a.length; i++) {
            for (var j = i + 1; j < a.length; j++) {
                if (equal(a[i], a[j])) {
                    return a[i];
                }
            }
        }
    }
    function displayExpectedAndActualString(expected, actual, quoted) {
        if (quoted === void 0) { quoted = false; }
        var expectMsg = "\x1b[1mExpected\x1b[0m\x1b[31m";
        var actualMsg = "\x1b[1mActual\x1b[0m\x1b[31m";
        var expectedString = quoted ? "\"" + expected + "\"" : expected;
        var actualString = quoted ? "\"" + actual + "\"" : actual;
        return "\n".concat(expectMsg, ":\n").concat(expectedString, "\n\n").concat(actualMsg, ":\n").concat(highlightDifferenceBetweenStrings(expected, actualString));
    }
    function templateToRegExp(template) {
        return new RegExp("^".concat(ts.regExpEscape(template).replace(/\\\{\d+\\\}/g, ".*?"), "$"));
    }
    function rangesOfDiffBetweenTwoStrings(source, target) {
        var ranges = [];
        var addToIndex = function (index) {
            var closestIndex = ranges[ranges.length - 1];
            if (closestIndex) {
                var doesAddToIndex = closestIndex.start + closestIndex.length === index - 1;
                if (doesAddToIndex) {
                    closestIndex.length = closestIndex.length + 1;
                }
                else {
                    ranges.push({ start: index - 1, length: 1 });
                }
            }
            else {
                ranges.push({ start: index - 1, length: 1 });
            }
        };
        for (var index = 0; index < Math.max(source.length, target.length); index++) {
            var srcChar = source[index];
            var targetChar = target[index];
            if (srcChar !== targetChar)
                addToIndex(index);
        }
        return ranges;
    }
    // Adds an _ when the source string and the target string have a whitespace difference
    function highlightDifferenceBetweenStrings(source, target) {
        var ranges = rangesOfDiffBetweenTwoStrings(source, target);
        var emTarget = target;
        ranges.forEach(function (range, index) {
            var lhs = "\u001B[4m";
            var rhs = "\u001B[0m\u001B[31m";
            var additionalOffset = index * lhs.length + index * rhs.length;
            var before = emTarget.slice(0, range.start + 1 + additionalOffset);
            var between = emTarget.slice(range.start + 1 + additionalOffset, range.start + range.length + 1 + additionalOffset);
            var after = emTarget.slice(range.start + range.length + 1 + additionalOffset, emTarget.length);
            emTarget = before + lhs + between + rhs + after;
        });
        return emTarget;
    }
})(FourSlash || (FourSlash = {}));
var FourSlashInterface;
(function (FourSlashInterface) {
    var Test = /** @class */ (function () {
        function Test(state) {
            this.state = state;
        }
        Test.prototype.markers = function () {
            return this.state.getMarkers();
        };
        Test.prototype.markerNames = function () {
            return this.state.getMarkerNames();
        };
        Test.prototype.marker = function (name) {
            return this.state.getMarkerByName(name);
        };
        Test.prototype.markerName = function (m) {
            return this.state.markerName(m);
        };
        Test.prototype.ranges = function () {
            return this.state.getRanges();
        };
        Test.prototype.rangesInFile = function (fileName) {
            return this.state.getRangesInFile(fileName);
        };
        Test.prototype.spans = function () {
            return this.ranges().map(function (r) { return ts.createTextSpan(r.pos, r.end - r.pos); });
        };
        Test.prototype.rangesByText = function () {
            return this.state.rangesByText();
        };
        Test.prototype.markerByName = function (s) {
            return this.state.getMarkerByName(s);
        };
        Test.prototype.symbolsInScope = function (range) {
            return this.state.symbolsInScope(range);
        };
        Test.prototype.setTypesRegistry = function (map) {
            this.state.setTypesRegistry(map);
        };
        return Test;
    }());
    FourSlashInterface.Test = Test;
    var Config = /** @class */ (function () {
        function Config(state) {
            this.state = state;
        }
        Config.prototype.configurePlugin = function (pluginName, configuration) {
            this.state.configurePlugin(pluginName, configuration);
        };
        Config.prototype.setCompilerOptionsForInferredProjects = function (options) {
            this.state.setCompilerOptionsForInferredProjects(options);
        };
        return Config;
    }());
    FourSlashInterface.Config = Config;
    var GoTo = /** @class */ (function () {
        function GoTo(state) {
            this.state = state;
        }
        // Moves the caret to the specified marker,
        // or the anonymous marker ('/**/') if no name
        // is given
        GoTo.prototype.marker = function (name) {
            this.state.goToMarker(name);
        };
        GoTo.prototype.eachMarker = function (a, b) {
            var _this = this;
            var markers = typeof a === "function" ? this.state.getMarkers() : a.map(function (m) { return _this.state.getMarkerByName(m); });
            this.state.goToEachMarker(markers, typeof a === "function" ? a : b);
        };
        GoTo.prototype.rangeStart = function (range) {
            this.state.goToRangeStart(range);
        };
        GoTo.prototype.eachRange = function (action) {
            this.state.goToEachRange(action);
        };
        GoTo.prototype.bof = function () {
            this.state.goToBOF();
        };
        GoTo.prototype.eof = function () {
            this.state.goToEOF();
        };
        GoTo.prototype.implementation = function () {
            this.state.goToImplementation();
        };
        GoTo.prototype.position = function (positionOrLineAndCharacter, fileNameOrIndex) {
            if (fileNameOrIndex !== undefined) {
                this.file(fileNameOrIndex);
            }
            this.state.goToPosition(positionOrLineAndCharacter);
        };
        // Opens a file, given either its index as it
        // appears in the test source, or its filename
        // as specified in the test metadata
        GoTo.prototype.file = function (indexOrName, content, scriptKindName) {
            this.state.openFile(indexOrName, content, scriptKindName);
        };
        GoTo.prototype.select = function (startMarker, endMarker) {
            this.state.select(startMarker, endMarker);
        };
        GoTo.prototype.selectAllInFile = function (fileName) {
            this.state.selectAllInFile(fileName);
        };
        GoTo.prototype.selectRange = function (range) {
            this.state.selectRange(range);
        };
        return GoTo;
    }());
    FourSlashInterface.GoTo = GoTo;
    var VerifyNegatable = /** @class */ (function () {
        function VerifyNegatable(state, negative) {
            if (negative === void 0) { negative = false; }
            this.state = state;
            this.negative = negative;
            if (!negative) {
                this.not = new VerifyNegatable(state, true);
            }
        }
        VerifyNegatable.prototype.assertHasRanges = function (ranges) {
            assert(ranges.length !== 0, "Array of ranges is expected to be non-empty");
        };
        VerifyNegatable.prototype.noSignatureHelp = function () {
            var markers = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                markers[_i] = arguments[_i];
            }
            this.state.verifySignatureHelpPresence(/*expectPresent*/ false, /*triggerReason*/ undefined, markers);
        };
        VerifyNegatable.prototype.noSignatureHelpForTriggerReason = function (reason) {
            var markers = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                markers[_i - 1] = arguments[_i];
            }
            this.state.verifySignatureHelpPresence(/*expectPresent*/ false, reason, markers);
        };
        VerifyNegatable.prototype.signatureHelpPresentForTriggerReason = function (reason) {
            var markers = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                markers[_i - 1] = arguments[_i];
            }
            this.state.verifySignatureHelpPresence(/*expectPresent*/ true, reason, markers);
        };
        VerifyNegatable.prototype.signatureHelp = function () {
            var options = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                options[_i] = arguments[_i];
            }
            this.state.verifySignatureHelp(options);
        };
        VerifyNegatable.prototype.errorExistsBetweenMarkers = function (startMarker, endMarker) {
            this.state.verifyErrorExistsBetweenMarkers(startMarker, endMarker, !this.negative);
        };
        VerifyNegatable.prototype.errorExistsAfterMarker = function (markerName) {
            if (markerName === void 0) { markerName = ""; }
            this.state.verifyErrorExistsAfterMarker(markerName, !this.negative, /*after*/ true);
        };
        VerifyNegatable.prototype.errorExistsBeforeMarker = function (markerName) {
            if (markerName === void 0) { markerName = ""; }
            this.state.verifyErrorExistsAfterMarker(markerName, !this.negative, /*after*/ false);
        };
        VerifyNegatable.prototype.quickInfoExists = function () {
            this.state.verifyQuickInfoExists(this.negative);
        };
        VerifyNegatable.prototype.typeDefinitionCountIs = function (expectedCount) {
            this.state.verifyTypeDefinitionsCount(this.negative, expectedCount);
        };
        VerifyNegatable.prototype.implementationListIsEmpty = function () {
            this.state.verifyImplementationListIsEmpty(this.negative);
        };
        VerifyNegatable.prototype.isValidBraceCompletionAtPosition = function (openingBrace) {
            this.state.verifyBraceCompletionAtPosition(this.negative, openingBrace);
        };
        VerifyNegatable.prototype.jsxClosingTag = function (map) {
            this.state.verifyJsxClosingTag(map);
        };
        VerifyNegatable.prototype.isInCommentAtPosition = function (onlyMultiLineDiverges) {
            this.state.verifySpanOfEnclosingComment(this.negative, onlyMultiLineDiverges);
        };
        VerifyNegatable.prototype.codeFix = function (options) {
            this.state.verifyCodeFix(options);
        };
        VerifyNegatable.prototype.codeFixAvailable = function (options) {
            this.state.verifyCodeFixAvailable(this.negative, options);
        };
        VerifyNegatable.prototype.codeFixAllAvailable = function (fixName) {
            this.state.verifyCodeFixAllAvailable(this.negative, fixName);
        };
        VerifyNegatable.prototype.applicableRefactorAvailableAtMarker = function (markerName) {
            this.state.verifyApplicableRefactorAvailableAtMarker(this.negative, markerName);
        };
        VerifyNegatable.prototype.applicableRefactorAvailableForRange = function () {
            this.state.verifyApplicableRefactorAvailableForRange(this.negative);
        };
        VerifyNegatable.prototype.refactorsAvailable = function (names) {
            this.state.verifyRefactorsAvailable(names);
        };
        VerifyNegatable.prototype.refactorAvailable = function (name, actionName, actionDescription) {
            this.state.verifyRefactorAvailable(this.negative, "implicit", name, actionName, actionDescription);
        };
        VerifyNegatable.prototype.refactorAvailableForTriggerReason = function (triggerReason, name, actionName) {
            this.state.verifyRefactorAvailable(this.negative, triggerReason, name, actionName);
        };
        VerifyNegatable.prototype.refactorKindAvailable = function (kind, expected, preferences) {
            if (preferences === void 0) { preferences = ts.emptyOptions; }
            this.state.verifyRefactorKindsAvailable(kind, expected, preferences);
        };
        VerifyNegatable.prototype.toggleLineComment = function (newFileContent) {
            this.state.toggleLineComment(newFileContent);
        };
        VerifyNegatable.prototype.toggleMultilineComment = function (newFileContent) {
            this.state.toggleMultilineComment(newFileContent);
        };
        VerifyNegatable.prototype.commentSelection = function (newFileContent) {
            this.state.commentSelection(newFileContent);
        };
        VerifyNegatable.prototype.uncommentSelection = function (newFileContent) {
            this.state.uncommentSelection(newFileContent);
        };
        return VerifyNegatable;
    }());
    FourSlashInterface.VerifyNegatable = VerifyNegatable;
    var Verify = /** @class */ (function (_super) {
        __extends(Verify, _super);
        function Verify(state) {
            return _super.call(this, state) || this;
        }
        Verify.prototype.completions = function () {
            var optionsArray = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                optionsArray[_i] = arguments[_i];
            }
            for (var _a = 0, optionsArray_1 = optionsArray; _a < optionsArray_1.length; _a++) {
                var options = optionsArray_1[_a];
                this.state.verifyCompletions(options);
            }
        };
        Verify.prototype.getInlayHints = function (expected, span, preference) {
            this.state.verifyInlayHints(expected, span, preference);
        };
        Verify.prototype.quickInfoIs = function (expectedText, expectedDocumentation, expectedTags) {
            this.state.verifyQuickInfoString(expectedText, expectedDocumentation, expectedTags);
        };
        Verify.prototype.quickInfoAt = function (markerName, expectedText, expectedDocumentation, expectedTags) {
            this.state.verifyQuickInfoAt(markerName, expectedText, expectedDocumentation, expectedTags);
        };
        Verify.prototype.quickInfos = function (namesAndTexts) {
            this.state.verifyQuickInfos(namesAndTexts);
        };
        Verify.prototype.caretAtMarker = function (markerName) {
            this.state.verifyCaretAtMarker(markerName);
        };
        Verify.prototype.indentationIs = function (numberOfSpaces) {
            this.state.verifyIndentationAtCurrentPosition(numberOfSpaces);
        };
        Verify.prototype.indentationAtPositionIs = function (fileName, position, numberOfSpaces, indentStyle, baseIndentSize) {
            if (indentStyle === void 0) { indentStyle = ts.IndentStyle.Smart; }
            if (baseIndentSize === void 0) { baseIndentSize = 0; }
            this.state.verifyIndentationAtPosition(fileName, position, numberOfSpaces, indentStyle, baseIndentSize);
        };
        Verify.prototype.textAtCaretIs = function (text) {
            this.state.verifyTextAtCaretIs(text);
        };
        /**
         * Compiles the current file and evaluates 'expr' in a context containing
         * the emitted output, then compares (using ===) the result of that expression
         * to 'value'. Do not use this function with external modules as it is not supported.
         */
        Verify.prototype.eval = function (expr, value) {
            this.state.verifyEval(expr, value);
        };
        Verify.prototype.currentLineContentIs = function (text) {
            this.state.verifyCurrentLineContent(text);
        };
        Verify.prototype.currentFileContentIs = function (text) {
            this.state.verifyCurrentFileContent(text);
        };
        Verify.prototype.formatDocumentChangesNothing = function () {
            this.state.verifyFormatDocumentChangesNothing();
        };
        Verify.prototype.goToDefinitionIs = function (endMarkers) {
            this.state.verifyGoToDefinitionIs(endMarkers);
        };
        Verify.prototype.goToDefinition = function (arg0, endMarkerName) {
            this.state.verifyGoToDefinition(arg0, endMarkerName);
        };
        Verify.prototype.goToType = function (arg0, endMarkerName) {
            this.state.verifyGoToType(arg0, endMarkerName);
        };
        Verify.prototype.goToSourceDefinition = function (startMarkerNames, end) {
            this.state.verifyGoToSourceDefinition(startMarkerNames, end);
        };
        Verify.prototype.goToDefinitionForMarkers = function () {
            var markerNames = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                markerNames[_i] = arguments[_i];
            }
            this.state.verifyGoToDefinitionForMarkers(markerNames);
        };
        Verify.prototype.goToDefinitionName = function (name, containerName) {
            this.state.verifyGoToDefinitionName(name, containerName);
        };
        Verify.prototype.verifyGetEmitOutputForCurrentFile = function (expected) {
            this.state.verifyGetEmitOutputForCurrentFile(expected);
        };
        Verify.prototype.verifyGetEmitOutputContentsForCurrentFile = function (expected) {
            this.state.verifyGetEmitOutputContentsForCurrentFile(expected);
        };
        Verify.prototype.symbolAtLocation = function (startRange) {
            var declarationRanges = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                declarationRanges[_i - 1] = arguments[_i];
            }
            this.state.verifySymbolAtLocation(startRange, declarationRanges);
        };
        Verify.prototype.typeOfSymbolAtLocation = function (range, symbol, expected) {
            this.state.verifyTypeOfSymbolAtLocation(range, symbol, expected);
        };
        Verify.prototype.baselineFindAllReferences = function () {
            var _a;
            var markerNames = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                markerNames[_i] = arguments[_i];
            }
            (_a = this.state).verifyBaselineFindAllReferences.apply(_a, markerNames);
        };
        Verify.prototype.baselineFindAllReferencesMulti = function (seq) {
            var _a;
            var markerNames = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                markerNames[_i - 1] = arguments[_i];
            }
            (_a = this.state).verifyBaselineFindAllReferencesMulti.apply(_a, __spreadArray([seq], markerNames, false));
        };
        Verify.prototype.baselineGetFileReferences = function (fileName) {
            this.state.verifyBaselineGetFileReferences(fileName);
        };
        Verify.prototype.findReferencesDefinitionDisplayPartsAtCaretAre = function (expected) {
            this.state.verifyDisplayPartsOfReferencedSymbol(expected);
        };
        Verify.prototype.noErrors = function () {
            this.state.verifyNoErrors();
        };
        Verify.prototype.errorExistsAtRange = function (range, code, message) {
            this.state.verifyErrorExistsAtRange(range, code, message);
        };
        Verify.prototype.numberOfErrorsInCurrentFile = function (expected) {
            this.state.verifyNumberOfErrorsInCurrentFile(expected);
        };
        Verify.prototype.baselineCurrentFileBreakpointLocations = function () {
            this.state.baselineCurrentFileBreakpointLocations();
        };
        Verify.prototype.baselineCurrentFileNameOrDottedNameSpans = function () {
            this.state.baselineCurrentFileNameOrDottedNameSpans();
        };
        Verify.prototype.getEmitOutput = function (expectedOutputFiles) {
            this.state.verifyGetEmitOutput(expectedOutputFiles);
        };
        Verify.prototype.baselineGetEmitOutput = function () {
            this.state.baselineGetEmitOutput();
        };
        Verify.prototype.baselineQuickInfo = function () {
            this.state.baselineQuickInfo();
        };
        Verify.prototype.baselineSignatureHelp = function () {
            this.state.baselineSignatureHelp();
        };
        Verify.prototype.baselineCompletions = function (preferences) {
            this.state.baselineCompletions(preferences);
        };
        Verify.prototype.baselineSmartSelection = function () {
            this.state.baselineSmartSelection();
        };
        Verify.prototype.baselineSyntacticDiagnostics = function () {
            this.state.baselineSyntacticDiagnostics();
        };
        Verify.prototype.baselineSyntacticAndSemanticDiagnostics = function () {
            this.state.baselineSyntacticAndSemanticDiagnostics();
        };
        Verify.prototype.nameOrDottedNameSpanTextIs = function (text) {
            this.state.verifyCurrentNameOrDottedNameSpanText(text);
        };
        Verify.prototype.outliningSpansInCurrentFile = function (spans, kind) {
            this.state.verifyOutliningSpans(spans, kind);
        };
        Verify.prototype.outliningHintSpansInCurrentFile = function (spans) {
            this.state.verifyOutliningHintSpans(spans);
        };
        Verify.prototype.todoCommentsInCurrentFile = function (descriptors) {
            this.state.verifyTodoComments(descriptors, this.state.getRanges());
        };
        Verify.prototype.matchingBracePositionInCurrentFile = function (bracePosition, expectedMatchPosition) {
            this.state.verifyMatchingBracePosition(bracePosition, expectedMatchPosition);
        };
        Verify.prototype.noMatchingBracePositionInCurrentFile = function (bracePosition) {
            this.state.verifyNoMatchingBracePosition(bracePosition);
        };
        Verify.prototype.docCommentTemplateAt = function (marker, expectedOffset, expectedText, options) {
            this.state.goToMarker(marker);
            this.state.verifyDocCommentTemplate({ newText: expectedText.replace(/\r?\n/g, "\r\n"), caretOffset: expectedOffset }, options);
        };
        Verify.prototype.noDocCommentTemplateAt = function (marker) {
            this.state.goToMarker(marker);
            this.state.verifyDocCommentTemplate(/*expected*/ undefined);
        };
        Verify.prototype.rangeAfterCodeFix = function (expectedText, includeWhiteSpace, errorCode, index) {
            this.state.verifyRangeAfterCodeFix(expectedText, includeWhiteSpace, errorCode, index);
        };
        Verify.prototype.codeFixAll = function (options) {
            this.state.verifyCodeFixAll(options);
        };
        Verify.prototype.fileAfterApplyingRefactorAtMarker = function (markerName, expectedContent, refactorNameToApply, actionName, formattingOptions) {
            this.state.verifyFileAfterApplyingRefactorAtMarker(markerName, expectedContent, refactorNameToApply, actionName, formattingOptions);
        };
        Verify.prototype.rangeIs = function (expectedText, includeWhiteSpace) {
            this.state.verifyRangeIs(expectedText, includeWhiteSpace);
        };
        Verify.prototype.getAndApplyCodeFix = function (errorCode, index) {
            this.state.getAndApplyCodeActions(errorCode, index);
        };
        Verify.prototype.applyCodeActionFromCompletion = function (markerName, options) {
            this.state.applyCodeActionFromCompletion(markerName, options);
        };
        Verify.prototype.importFixAtPosition = function (expectedTextArray, errorCode, preferences) {
            this.state.verifyImportFixAtPosition(expectedTextArray, errorCode, preferences);
        };
        Verify.prototype.importFixModuleSpecifiers = function (marker, moduleSpecifiers, preferences) {
            this.state.verifyImportFixModuleSpecifiers(marker, moduleSpecifiers, preferences);
        };
        Verify.prototype.navigationBar = function (json, options) {
            this.state.verifyNavigationBar(json, options);
        };
        Verify.prototype.navigationTree = function (json, options) {
            this.state.verifyNavigationTree(json, options);
        };
        Verify.prototype.navigateTo = function () {
            var options = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                options[_i] = arguments[_i];
            }
            this.state.verifyNavigateTo(options);
        };
        Verify.prototype.occurrencesAtPositionContains = function (range, isWriteAccess) {
            this.state.verifyOccurrencesAtPositionListContains(range.fileName, range.pos, range.end, isWriteAccess);
        };
        Verify.prototype.occurrencesAtPositionCount = function (expectedCount) {
            this.state.verifyOccurrencesAtPositionListCount(expectedCount);
        };
        Verify.prototype.rangesAreOccurrences = function (isWriteAccess, ranges) {
            this.state.verifyRangesAreOccurrences(isWriteAccess, ranges);
        };
        Verify.prototype.rangesWithSameTextAreRenameLocations = function () {
            var _a;
            var texts = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                texts[_i] = arguments[_i];
            }
            (_a = this.state).verifyRangesWithSameTextAreRenameLocations.apply(_a, texts);
        };
        Verify.prototype.rangesAreRenameLocations = function (options) {
            this.state.verifyRangesAreRenameLocations(options);
        };
        Verify.prototype.rangesAreDocumentHighlights = function (ranges, options) {
            this.state.verifyRangesAreDocumentHighlights(ranges, options);
        };
        Verify.prototype.rangesWithSameTextAreDocumentHighlights = function () {
            this.state.verifyRangesWithSameTextAreDocumentHighlights();
        };
        Verify.prototype.documentHighlightsOf = function (startRange, ranges, options) {
            this.state.verifyDocumentHighlightsOf(startRange, ranges, options);
        };
        Verify.prototype.noDocumentHighlights = function (startRange) {
            this.state.verifyNoDocumentHighlights(startRange);
        };
        /**
         * This method *requires* a contiguous, complete, and ordered stream of classifications for a file.
         */
        Verify.prototype.syntacticClassificationsAre = function () {
            var classifications = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                classifications[_i] = arguments[_i];
            }
            this.state.verifySyntacticClassifications(classifications);
        };
        Verify.prototype.encodedSyntacticClassificationsLength = function (length) {
            this.state.verifyEncodedSyntacticClassificationsLength(length);
        };
        Verify.prototype.encodedSemanticClassificationsLength = function (format, length) {
            this.state.verifyEncodedSemanticClassificationsLength(format, length);
        };
        /**
         * This method *requires* an ordered stream of classifications for a file, and spans are highly recommended.
         */
        Verify.prototype.semanticClassificationsAre = function (format) {
            var classifications = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                classifications[_i - 1] = arguments[_i];
            }
            this.state.verifySemanticClassifications(format, classifications);
        };
        Verify.prototype.replaceWithSemanticClassifications = function (format) {
            this.state.replaceWithSemanticClassifications(format);
        };
        Verify.prototype.renameInfoSucceeded = function (displayName, fullDisplayName, kind, kindModifiers, fileToRename, expectedRange, preferences) {
            this.state.verifyRenameInfoSucceeded(displayName, fullDisplayName, kind, kindModifiers, fileToRename, expectedRange, preferences);
        };
        Verify.prototype.renameInfoFailed = function (message, preferences) {
            this.state.verifyRenameInfoFailed(message, preferences);
        };
        Verify.prototype.renameLocations = function (startRanges, options) {
            this.state.verifyRenameLocations(startRanges, options);
        };
        Verify.prototype.baselineRename = function (marker, options) {
            this.state.baselineRename(marker, options);
        };
        Verify.prototype.verifyQuickInfoDisplayParts = function (kind, kindModifiers, textSpan, displayParts, documentation, tags) {
            this.state.verifyQuickInfoDisplayParts(kind, kindModifiers, textSpan, displayParts, documentation, tags);
        };
        Verify.prototype.getSyntacticDiagnostics = function (expected) {
            this.state.getSyntacticDiagnostics(expected);
        };
        Verify.prototype.getSemanticDiagnostics = function (expected) {
            this.state.getSemanticDiagnostics(expected);
        };
        Verify.prototype.getSuggestionDiagnostics = function (expected) {
            this.state.getSuggestionDiagnostics(expected);
        };
        Verify.prototype.ProjectInfo = function (expected) {
            this.state.verifyProjectInfo(expected);
        };
        Verify.prototype.allRangesAppearInImplementationList = function (markerName) {
            this.state.verifyRangesInImplementationList(markerName);
        };
        Verify.prototype.getEditsForFileRename = function (options) {
            this.state.getEditsForFileRename(options);
        };
        Verify.prototype.baselineCallHierarchy = function () {
            this.state.baselineCallHierarchy();
        };
        Verify.prototype.moveToNewFile = function (options) {
            this.state.moveToNewFile(options);
        };
        Verify.prototype.noMoveToNewFile = function () {
            this.state.noMoveToNewFile();
        };
        Verify.prototype.organizeImports = function (newContent, mode) {
            this.state.verifyOrganizeImports(newContent, mode);
        };
        return Verify;
    }(VerifyNegatable));
    FourSlashInterface.Verify = Verify;
    var Edit = /** @class */ (function () {
        function Edit(state) {
            this.state = state;
        }
        Edit.prototype.backspace = function (count) {
            this.state.deleteCharBehindMarker(count);
        };
        Edit.prototype.deleteAtCaret = function (times) {
            this.state.deleteChar(times);
        };
        Edit.prototype.replace = function (start, length, text) {
            this.state.replace(start, length, text);
        };
        Edit.prototype.paste = function (text) {
            this.state.paste(text);
        };
        Edit.prototype.insert = function (text) {
            this.insertLines(text);
        };
        Edit.prototype.insertLine = function (text) {
            this.insertLines(text + "\n");
        };
        Edit.prototype.insertLines = function () {
            var lines = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                lines[_i] = arguments[_i];
            }
            this.state.type(lines.join("\n"));
        };
        Edit.prototype.deleteLine = function (index) {
            this.deleteLineRange(index, index);
        };
        Edit.prototype.deleteLineRange = function (startIndex, endIndexInclusive) {
            this.state.deleteLineRange(startIndex, endIndexInclusive);
        };
        Edit.prototype.replaceLine = function (index, text) {
            this.state.selectLine(index);
            this.state.type(text);
        };
        Edit.prototype.moveRight = function (count) {
            this.state.moveCaretRight(count);
        };
        Edit.prototype.moveLeft = function (count) {
            if (typeof count === "undefined") {
                count = 1;
            }
            this.state.moveCaretRight(count * -1);
        };
        Edit.prototype.enableFormatting = function () {
            this.state.enableFormatting = true;
        };
        Edit.prototype.disableFormatting = function () {
            this.state.enableFormatting = false;
        };
        Edit.prototype.applyRefactor = function (options) {
            this.state.applyRefactor(options);
        };
        return Edit;
    }());
    FourSlashInterface.Edit = Edit;
    var Debug = /** @class */ (function () {
        function Debug(state) {
            this.state = state;
        }
        Debug.prototype.printCurrentParameterHelp = function () {
            this.state.printCurrentParameterHelp();
        };
        Debug.prototype.printCurrentFileState = function () {
            this.state.printCurrentFileState(/*showWhitespace*/ false, /*makeCaretVisible*/ true);
        };
        Debug.prototype.printCurrentFileStateWithWhitespace = function () {
            this.state.printCurrentFileState(/*showWhitespace*/ true, /*makeCaretVisible*/ true);
        };
        Debug.prototype.printCurrentFileStateWithoutCaret = function () {
            this.state.printCurrentFileState(/*showWhitespace*/ false, /*makeCaretVisible*/ false);
        };
        Debug.prototype.printCurrentQuickInfo = function () {
            this.state.printCurrentQuickInfo();
        };
        Debug.prototype.printCurrentSignatureHelp = function () {
            this.state.printCurrentSignatureHelp();
        };
        Debug.prototype.printCompletionListMembers = function (options) {
            this.state.printCompletionListMembers(options);
        };
        Debug.prototype.printAvailableCodeFixes = function () {
            this.state.printAvailableCodeFixes();
        };
        Debug.prototype.printBreakpointLocation = function (pos) {
            this.state.printBreakpointLocation(pos);
        };
        Debug.prototype.printBreakpointAtCurrentLocation = function () {
            this.state.printBreakpointAtCurrentLocation();
        };
        Debug.prototype.printNameOrDottedNameSpans = function (pos) {
            this.state.printNameOrDottedNameSpans(pos);
        };
        Debug.prototype.printErrorList = function () {
            this.state.printErrorList();
        };
        Debug.prototype.printNavigationItems = function (searchValue) {
            if (searchValue === void 0) { searchValue = ".*"; }
            this.state.printNavigationItems(searchValue);
        };
        Debug.prototype.printNavigationBar = function () {
            this.state.printNavigationBar();
        };
        Debug.prototype.printContext = function () {
            this.state.printContext();
        };
        Debug.prototype.printOutliningSpans = function () {
            this.state.printOutliningSpans();
        };
        return Debug;
    }());
    FourSlashInterface.Debug = Debug;
    var Format = /** @class */ (function () {
        function Format(state) {
            this.state = state;
        }
        Format.prototype.document = function () {
            this.state.formatDocument();
        };
        Format.prototype.copyFormatOptions = function () {
            return this.state.copyFormatOptions();
        };
        Format.prototype.setFormatOptions = function (options) {
            return this.state.setFormatOptions(options);
        };
        Format.prototype.selection = function (startMarker, endMarker) {
            this.state.formatSelection(this.state.getMarkerByName(startMarker).position, this.state.getMarkerByName(endMarker).position);
        };
        Format.prototype.onType = function (posMarker, key) {
            this.state.formatOnType(this.state.getMarkerByName(posMarker).position, key);
        };
        Format.prototype.setOption = function (name, value) {
            var _a;
            this.state.setFormatOptions(__assign(__assign({}, this.state.formatCodeSettings), (_a = {}, _a[name] = value, _a)));
        };
        return Format;
    }());
    FourSlashInterface.Format = Format;
    var Cancellation = /** @class */ (function () {
        function Cancellation(state) {
            this.state = state;
        }
        Cancellation.prototype.resetCancelled = function () {
            this.state.resetCancelled();
        };
        Cancellation.prototype.setCancelled = function (numberOfCalls) {
            if (numberOfCalls === void 0) { numberOfCalls = 0; }
            this.state.setCancelled(numberOfCalls);
        };
        return Cancellation;
    }());
    FourSlashInterface.Cancellation = Cancellation;
    function classification(format) {
        function semanticToken(identifier, text, _position) {
            return {
                classificationType: identifier,
                text: text
            };
        }
        if (format === "2020" /* ts.SemanticClassificationFormat.TwentyTwenty */) {
            return {
                semanticToken: semanticToken
            };
        }
        // Defaults to the previous semantic classifier factory functions
        function comment(text, position) {
            return getClassification("comment" /* ts.ClassificationTypeNames.comment */, text, position);
        }
        function identifier(text, position) {
            return getClassification("identifier" /* ts.ClassificationTypeNames.identifier */, text, position);
        }
        function keyword(text, position) {
            return getClassification("keyword" /* ts.ClassificationTypeNames.keyword */, text, position);
        }
        function numericLiteral(text, position) {
            return getClassification("number" /* ts.ClassificationTypeNames.numericLiteral */, text, position);
        }
        function operator(text, position) {
            return getClassification("operator" /* ts.ClassificationTypeNames.operator */, text, position);
        }
        function stringLiteral(text, position) {
            return getClassification("string" /* ts.ClassificationTypeNames.stringLiteral */, text, position);
        }
        function whiteSpace(text, position) {
            return getClassification("whitespace" /* ts.ClassificationTypeNames.whiteSpace */, text, position);
        }
        function text(text, position) {
            return getClassification("text" /* ts.ClassificationTypeNames.text */, text, position);
        }
        function punctuation(text, position) {
            return getClassification("punctuation" /* ts.ClassificationTypeNames.punctuation */, text, position);
        }
        function docCommentTagName(text, position) {
            return getClassification("doc comment tag name" /* ts.ClassificationTypeNames.docCommentTagName */, text, position);
        }
        function className(text, position) {
            return getClassification("class name" /* ts.ClassificationTypeNames.className */, text, position);
        }
        function enumName(text, position) {
            return getClassification("enum name" /* ts.ClassificationTypeNames.enumName */, text, position);
        }
        function interfaceName(text, position) {
            return getClassification("interface name" /* ts.ClassificationTypeNames.interfaceName */, text, position);
        }
        function moduleName(text, position) {
            return getClassification("module name" /* ts.ClassificationTypeNames.moduleName */, text, position);
        }
        function typeParameterName(text, position) {
            return getClassification("type parameter name" /* ts.ClassificationTypeNames.typeParameterName */, text, position);
        }
        function parameterName(text, position) {
            return getClassification("parameter name" /* ts.ClassificationTypeNames.parameterName */, text, position);
        }
        function typeAliasName(text, position) {
            return getClassification("type alias name" /* ts.ClassificationTypeNames.typeAliasName */, text, position);
        }
        function jsxOpenTagName(text, position) {
            return getClassification("jsx open tag name" /* ts.ClassificationTypeNames.jsxOpenTagName */, text, position);
        }
        function jsxCloseTagName(text, position) {
            return getClassification("jsx close tag name" /* ts.ClassificationTypeNames.jsxCloseTagName */, text, position);
        }
        function jsxSelfClosingTagName(text, position) {
            return getClassification("jsx self closing tag name" /* ts.ClassificationTypeNames.jsxSelfClosingTagName */, text, position);
        }
        function jsxAttribute(text, position) {
            return getClassification("jsx attribute" /* ts.ClassificationTypeNames.jsxAttribute */, text, position);
        }
        function jsxText(text, position) {
            return getClassification("jsx text" /* ts.ClassificationTypeNames.jsxText */, text, position);
        }
        function jsxAttributeStringLiteralValue(text, position) {
            return getClassification("jsx attribute string literal value" /* ts.ClassificationTypeNames.jsxAttributeStringLiteralValue */, text, position);
        }
        function getClassification(classificationType, text, position) {
            var textSpan = position === undefined ? undefined : { start: position, end: position + text.length };
            return { classificationType: classificationType, text: text, textSpan: textSpan };
        }
        return {
            comment: comment,
            identifier: identifier,
            keyword: keyword,
            numericLiteral: numericLiteral,
            operator: operator,
            stringLiteral: stringLiteral,
            whiteSpace: whiteSpace,
            text: text,
            punctuation: punctuation,
            docCommentTagName: docCommentTagName,
            className: className,
            enumName: enumName,
            interfaceName: interfaceName,
            moduleName: moduleName,
            typeParameterName: typeParameterName,
            parameterName: parameterName,
            typeAliasName: typeAliasName,
            jsxOpenTagName: jsxOpenTagName,
            jsxCloseTagName: jsxCloseTagName,
            jsxSelfClosingTagName: jsxSelfClosingTagName,
            jsxAttribute: jsxAttribute,
            jsxText: jsxText,
            jsxAttributeStringLiteralValue: jsxAttributeStringLiteralValue,
            getClassification: getClassification
        };
    }
    FourSlashInterface.classification = classification;
    var Completion;
    (function (Completion) {
        Completion.CompletionSource = ts.Completions.CompletionSource;
        Completion.SortText = {
            // Presets
            LocalDeclarationPriority: "10",
            LocationPriority: "11",
            OptionalMember: "12",
            MemberDeclaredBySpreadAssignment: "13",
            SuggestedClassMembers: "14",
            GlobalsOrKeywords: "15",
            AutoImportSuggestions: "16",
            ClassMemberSnippets: "17",
            JavascriptIdentifiers: "18",
            // Transformations
            Deprecated: function (sortText) {
                return "z" + sortText;
            },
            ObjectLiteralProperty: function (presetSortText, symbolDisplayName) {
                return "".concat(presetSortText, "\0").concat(symbolDisplayName, "\0");
            },
            SortBelow: function (sortText) {
                return sortText + "1";
            },
        };
        var functionEntry = function (name) { return ({
            name: name,
            kind: "function",
            kindModifiers: "declare",
            sortText: Completion.SortText.GlobalsOrKeywords
        }); };
        var deprecatedFunctionEntry = function (name) { return ({
            name: name,
            kind: "function",
            kindModifiers: "deprecated,declare",
            sortText: "z15",
        }); };
        var varEntry = function (name) { return ({
            name: name,
            kind: "var",
            kindModifiers: "declare",
            sortText: Completion.SortText.GlobalsOrKeywords
        }); };
        var moduleEntry = function (name) { return ({
            name: name,
            kind: "module",
            kindModifiers: "declare",
            sortText: Completion.SortText.GlobalsOrKeywords
        }); };
        var keywordEntry = function (name) { return ({
            name: name,
            kind: "keyword",
            sortText: Completion.SortText.GlobalsOrKeywords
        }); };
        var methodEntry = function (name) { return ({
            name: name,
            kind: "method",
            kindModifiers: "declare",
            sortText: Completion.SortText.LocationPriority
        }); };
        var deprecatedMethodEntry = function (name) { return ({
            name: name,
            kind: "method",
            kindModifiers: "deprecated,declare",
            sortText: "z11",
        }); };
        var propertyEntry = function (name) { return ({
            name: name,
            kind: "property",
            kindModifiers: "declare",
            sortText: Completion.SortText.LocationPriority
        }); };
        var interfaceEntry = function (name) { return ({
            name: name,
            kind: "interface",
            kindModifiers: "declare",
            sortText: Completion.SortText.GlobalsOrKeywords
        }); };
        var typeEntry = function (name) { return ({
            name: name,
            kind: "type",
            kindModifiers: "declare",
            sortText: Completion.SortText.GlobalsOrKeywords
        }); };
        var res = [];
        for (var i = 81 /* ts.SyntaxKind.FirstKeyword */; i <= 162 /* ts.SyntaxKind.LastKeyword */; i++) {
            res.push({
                name: ts.Debug.checkDefined(ts.tokenToString(i)),
                kind: "keyword",
                sortText: Completion.SortText.GlobalsOrKeywords
            });
        }
        Completion.keywordsWithUndefined = res;
        Completion.keywords = Completion.keywordsWithUndefined.filter(function (k) { return k.name !== "undefined"; });
        Completion.typeKeywords = [
            "any",
            "asserts",
            "bigint",
            "boolean",
            "false",
            "infer",
            "keyof",
            "never",
            "null",
            "number",
            "object",
            "readonly",
            "string",
            "symbol",
            "true",
            "undefined",
            "unique",
            "unknown",
            "void",
        ].map(keywordEntry);
        function sorted(entries) {
            return ts.stableSort(entries, compareExpectedCompletionEntries);
        }
        Completion.sorted = sorted;
        // If you want to use a function like `globalsPlus`, that function needs to sort
        // the concatted array since the entries provided as "plus" could be interleaved
        // among the "globals." However, we still want to assert that the "plus" array
        // was internally sorted correctly, so we tack it onto the sorted concatted array
        // so `verify.completions` can assert that it represents the same order as the response.
        function combineExpectedCompletionEntries(functionName, providedByHarness, providedByTest) {
            return Object.assign(sorted(__spreadArray(__spreadArray([], providedByHarness, true), providedByTest, true)), { plusFunctionName: functionName, plusArgument: providedByTest });
        }
        function typeKeywordsPlus(plus) {
            return combineExpectedCompletionEntries("typeKeywordsPlus", Completion.typeKeywords, plus);
        }
        Completion.typeKeywordsPlus = typeKeywordsPlus;
        var globalTypeDecls = [
            interfaceEntry("Symbol"),
            typeEntry("PropertyKey"),
            interfaceEntry("PropertyDescriptor"),
            interfaceEntry("PropertyDescriptorMap"),
            varEntry("Object"),
            interfaceEntry("ObjectConstructor"),
            varEntry("Function"),
            interfaceEntry("FunctionConstructor"),
            typeEntry("ThisParameterType"),
            typeEntry("OmitThisParameter"),
            interfaceEntry("CallableFunction"),
            interfaceEntry("NewableFunction"),
            interfaceEntry("IArguments"),
            varEntry("String"),
            interfaceEntry("StringConstructor"),
            varEntry("Boolean"),
            interfaceEntry("BooleanConstructor"),
            varEntry("Number"),
            interfaceEntry("NumberConstructor"),
            interfaceEntry("TemplateStringsArray"),
            interfaceEntry("ImportMeta"),
            interfaceEntry("ImportCallOptions"),
            interfaceEntry("ImportAssertions"),
            varEntry("Math"),
            varEntry("Date"),
            interfaceEntry("DateConstructor"),
            interfaceEntry("RegExpMatchArray"),
            interfaceEntry("RegExpExecArray"),
            varEntry("RegExp"),
            interfaceEntry("RegExpConstructor"),
            varEntry("Error"),
            interfaceEntry("ErrorConstructor"),
            varEntry("EvalError"),
            interfaceEntry("EvalErrorConstructor"),
            varEntry("RangeError"),
            interfaceEntry("RangeErrorConstructor"),
            varEntry("ReferenceError"),
            interfaceEntry("ReferenceErrorConstructor"),
            varEntry("SyntaxError"),
            interfaceEntry("SyntaxErrorConstructor"),
            varEntry("TypeError"),
            interfaceEntry("TypeErrorConstructor"),
            varEntry("URIError"),
            interfaceEntry("URIErrorConstructor"),
            varEntry("JSON"),
            interfaceEntry("ReadonlyArray"),
            interfaceEntry("ConcatArray"),
            varEntry("Array"),
            interfaceEntry("ArrayConstructor"),
            interfaceEntry("TypedPropertyDescriptor"),
            typeEntry("ClassDecorator"),
            typeEntry("PropertyDecorator"),
            typeEntry("MethodDecorator"),
            typeEntry("ParameterDecorator"),
            typeEntry("PromiseConstructorLike"),
            interfaceEntry("PromiseLike"),
            interfaceEntry("Promise"),
            typeEntry("Awaited"),
            interfaceEntry("ArrayLike"),
            typeEntry("Partial"),
            typeEntry("Required"),
            typeEntry("Readonly"),
            typeEntry("Pick"),
            typeEntry("Record"),
            typeEntry("Exclude"),
            typeEntry("Extract"),
            typeEntry("Omit"),
            typeEntry("NonNullable"),
            typeEntry("Parameters"),
            typeEntry("ConstructorParameters"),
            typeEntry("ReturnType"),
            typeEntry("InstanceType"),
            typeEntry("Uppercase"),
            typeEntry("Lowercase"),
            typeEntry("Capitalize"),
            typeEntry("Uncapitalize"),
            interfaceEntry("ThisType"),
            varEntry("ArrayBuffer"),
            interfaceEntry("ArrayBufferTypes"),
            typeEntry("ArrayBufferLike"),
            interfaceEntry("ArrayBufferConstructor"),
            interfaceEntry("ArrayBufferView"),
            varEntry("DataView"),
            interfaceEntry("DataViewConstructor"),
            varEntry("Int8Array"),
            interfaceEntry("Int8ArrayConstructor"),
            varEntry("Uint8Array"),
            interfaceEntry("Uint8ArrayConstructor"),
            varEntry("Uint8ClampedArray"),
            interfaceEntry("Uint8ClampedArrayConstructor"),
            varEntry("Int16Array"),
            interfaceEntry("Int16ArrayConstructor"),
            varEntry("Uint16Array"),
            interfaceEntry("Uint16ArrayConstructor"),
            varEntry("Int32Array"),
            interfaceEntry("Int32ArrayConstructor"),
            varEntry("Uint32Array"),
            interfaceEntry("Uint32ArrayConstructor"),
            varEntry("Float32Array"),
            interfaceEntry("Float32ArrayConstructor"),
            varEntry("Float64Array"),
            interfaceEntry("Float64ArrayConstructor"),
            moduleEntry("Intl"),
        ];
        Completion.globalThisEntry = {
            name: "globalThis",
            kind: "module",
            sortText: Completion.SortText.GlobalsOrKeywords
        };
        Completion.globalTypes = globalTypesPlus([]);
        function globalTypesPlus(plus) {
            return combineExpectedCompletionEntries("globalTypesPlus", __spreadArray(__spreadArray([Completion.globalThisEntry], globalTypeDecls, true), Completion.typeKeywords, true), plus);
        }
        Completion.globalTypesPlus = globalTypesPlus;
        Completion.typeAssertionKeywords = globalTypesPlus([keywordEntry("const")]);
        function getInJsKeywords(keywords) {
            return keywords.filter(function (keyword) {
                switch (keyword.name) {
                    case "enum":
                    case "interface":
                    case "implements":
                    case "private":
                    case "protected":
                    case "public":
                    case "abstract":
                    case "any":
                    case "boolean":
                    case "declare":
                    case "infer":
                    case "is":
                    case "keyof":
                    case "module":
                    case "namespace":
                    case "never":
                    case "readonly":
                    case "number":
                    case "object":
                    case "string":
                    case "symbol":
                    case "type":
                    case "unique":
                    case "override":
                    case "unknown":
                    case "global":
                    case "bigint":
                        return false;
                    default:
                        return true;
                }
            });
        }
        Completion.classElementKeywords = [
            "abstract",
            "accessor",
            "async",
            "constructor",
            "declare",
            "get",
            "override",
            "private",
            "protected",
            "public",
            "readonly",
            "set",
            "static",
        ].map(keywordEntry);
        Completion.classElementInJsKeywords = getInJsKeywords(Completion.classElementKeywords);
        Completion.constructorParameterKeywords = ["override", "private", "protected", "public", "readonly"].map(function (name) { return ({
            name: name,
            kind: "keyword",
            sortText: Completion.SortText.GlobalsOrKeywords
        }); });
        Completion.functionMembers = [
            methodEntry("apply"),
            methodEntry("call"),
            methodEntry("bind"),
            methodEntry("toString"),
            propertyEntry("length"),
            { name: "arguments", kind: "property", kindModifiers: "declare", text: "(property) Function.arguments: any" },
            propertyEntry("caller"),
        ].sort(compareExpectedCompletionEntries);
        function functionMembersPlus(plus) {
            return combineExpectedCompletionEntries("functionMembersPlus", Completion.functionMembers, plus);
        }
        Completion.functionMembersPlus = functionMembersPlus;
        Completion.stringMembers = [
            methodEntry("toString"),
            methodEntry("charAt"),
            methodEntry("charCodeAt"),
            methodEntry("concat"),
            methodEntry("indexOf"),
            methodEntry("lastIndexOf"),
            methodEntry("localeCompare"),
            methodEntry("match"),
            methodEntry("replace"),
            methodEntry("search"),
            methodEntry("slice"),
            methodEntry("split"),
            methodEntry("substring"),
            methodEntry("toLowerCase"),
            methodEntry("toLocaleLowerCase"),
            methodEntry("toUpperCase"),
            methodEntry("toLocaleUpperCase"),
            methodEntry("trim"),
            propertyEntry("length"),
            deprecatedMethodEntry("substr"),
            methodEntry("valueOf"),
        ].sort(compareExpectedCompletionEntries);
        Completion.functionMembersWithPrototype = __spreadArray(__spreadArray([], Completion.functionMembers, true), [
            propertyEntry("prototype"),
        ], false).sort(compareExpectedCompletionEntries);
        function functionMembersWithPrototypePlus(plus) {
            return __spreadArray(__spreadArray([], Completion.functionMembersWithPrototype, true), plus, true).sort(compareExpectedCompletionEntries);
        }
        Completion.functionMembersWithPrototypePlus = functionMembersWithPrototypePlus;
        // TODO: Shouldn't propose type keywords in statement position
        Completion.statementKeywordsWithTypes = [
            "abstract",
            "any",
            "as",
            "asserts",
            "async",
            "await",
            "bigint",
            "boolean",
            "break",
            "case",
            "catch",
            "class",
            "const",
            "continue",
            "debugger",
            "declare",
            "default",
            "delete",
            "do",
            "else",
            "enum",
            "export",
            "extends",
            "false",
            "finally",
            "for",
            "function",
            "if",
            "implements",
            "import",
            "in",
            "infer",
            "instanceof",
            "interface",
            "keyof",
            "let",
            "module",
            "namespace",
            "never",
            "new",
            "null",
            "number",
            "object",
            "package",
            "readonly",
            "return",
            "satisfies",
            "string",
            "super",
            "switch",
            "symbol",
            "this",
            "throw",
            "true",
            "try",
            "type",
            "typeof",
            "unique",
            "unknown",
            "var",
            "void",
            "while",
            "with",
            "yield",
        ].map(keywordEntry);
        Completion.statementKeywords = Completion.statementKeywordsWithTypes.filter(function (k) {
            var name = k.name;
            switch (name) {
                case "false":
                case "true":
                case "null":
                case "void":
                    return true;
                case "declare":
                case "module":
                    return false;
                default:
                    return !ts.contains(Completion.typeKeywords, k);
            }
        });
        Completion.statementInJsKeywords = getInJsKeywords(Completion.statementKeywords);
        Completion.globalsVars = [
            varEntry("Array"),
            varEntry("ArrayBuffer"),
            varEntry("Boolean"),
            varEntry("DataView"),
            varEntry("Date"),
            functionEntry("decodeURI"),
            functionEntry("decodeURIComponent"),
            functionEntry("encodeURI"),
            functionEntry("encodeURIComponent"),
            varEntry("Error"),
            deprecatedFunctionEntry("escape"),
            functionEntry("eval"),
            varEntry("EvalError"),
            varEntry("Float32Array"),
            varEntry("Float64Array"),
            varEntry("Function"),
            varEntry("Infinity"),
            moduleEntry("Intl"),
            varEntry("Int16Array"),
            varEntry("Int32Array"),
            varEntry("Int8Array"),
            functionEntry("isFinite"),
            functionEntry("isNaN"),
            varEntry("JSON"),
            varEntry("Math"),
            varEntry("NaN"),
            varEntry("Number"),
            varEntry("Object"),
            functionEntry("parseFloat"),
            functionEntry("parseInt"),
            varEntry("RangeError"),
            varEntry("ReferenceError"),
            varEntry("RegExp"),
            varEntry("String"),
            varEntry("SyntaxError"),
            varEntry("TypeError"),
            varEntry("Uint16Array"),
            varEntry("Uint32Array"),
            varEntry("Uint8Array"),
            varEntry("Uint8ClampedArray"),
            deprecatedFunctionEntry("unescape"),
            varEntry("URIError"),
        ];
        var globalKeywordsInsideFunction = [
            "as",
            "async",
            "await",
            "break",
            "case",
            "catch",
            "class",
            "const",
            "continue",
            "debugger",
            "default",
            "delete",
            "do",
            "else",
            "enum",
            "export",
            "extends",
            "false",
            "finally",
            "for",
            "function",
            "if",
            "implements",
            "import",
            "in",
            "instanceof",
            "interface",
            "let",
            "new",
            "null",
            "package",
            "return",
            "satisfies",
            "super",
            "switch",
            "this",
            "throw",
            "true",
            "try",
            "type",
            "typeof",
            "var",
            "void",
            "while",
            "with",
            "yield",
        ].map(keywordEntry);
        function compareExpectedCompletionEntries(a, b) {
            var aSortText = typeof a !== "string" && a.sortText || ts.Completions.SortText.LocationPriority;
            var bSortText = typeof b !== "string" && b.sortText || ts.Completions.SortText.LocationPriority;
            var bySortText = ts.compareStringsCaseSensitiveUI(aSortText, bSortText);
            if (bySortText !== 0 /* ts.Comparison.EqualTo */)
                return bySortText;
            return ts.compareStringsCaseSensitiveUI(typeof a === "string" ? a : a.name, typeof b === "string" ? b : b.name);
        }
        Completion.undefinedVarEntry = {
            name: "undefined",
            kind: "var",
            sortText: Completion.SortText.GlobalsOrKeywords
        };
        // TODO: many of these are inappropriate to always provide
        Completion.globalsInsideFunction = function (plus, options) { return __spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray([
            { name: "arguments", kind: "local var" }
        ], plus, true), [
            Completion.globalThisEntry
        ], false), (options === null || options === void 0 ? void 0 : options.noLib) ? [] : Completion.globalsVars, true), [
            Completion.undefinedVarEntry
        ], false), globalKeywordsInsideFunction, true).sort(compareExpectedCompletionEntries); };
        var globalInJsKeywordsInsideFunction = getInJsKeywords(globalKeywordsInsideFunction);
        // TODO: many of these are inappropriate to always provide
        Completion.globalsInJsInsideFunction = function (plus, options) { return __spreadArray(__spreadArray(__spreadArray(__spreadArray([
            { name: "arguments", kind: "local var" },
            Completion.globalThisEntry
        ], (options === null || options === void 0 ? void 0 : options.noLib) ? [] : Completion.globalsVars, true), plus, true), [
            Completion.undefinedVarEntry
        ], false), globalInJsKeywordsInsideFunction, true).sort(compareExpectedCompletionEntries); };
        // TODO: many of these are inappropriate to always provide
        Completion.globalKeywords = [
            "abstract",
            "any",
            "as",
            "asserts",
            "async",
            "await",
            "bigint",
            "boolean",
            "break",
            "case",
            "catch",
            "class",
            "const",
            "continue",
            "debugger",
            "declare",
            "default",
            "delete",
            "do",
            "else",
            "enum",
            "export",
            "extends",
            "false",
            "finally",
            "for",
            "function",
            "if",
            "implements",
            "import",
            "in",
            "infer",
            "instanceof",
            "interface",
            "keyof",
            "let",
            "module",
            "namespace",
            "never",
            "new",
            "null",
            "number",
            "object",
            "package",
            "readonly",
            "return",
            "satisfies",
            "string",
            "super",
            "switch",
            "symbol",
            "this",
            "throw",
            "true",
            "try",
            "type",
            "typeof",
            "unique",
            "unknown",
            "var",
            "void",
            "while",
            "with",
            "yield",
        ].map(keywordEntry);
        Completion.globalInJsKeywords = getInJsKeywords(Completion.globalKeywords);
        Completion.insideMethodKeywords = [
            "as",
            "async",
            "await",
            "break",
            "case",
            "catch",
            "class",
            "const",
            "continue",
            "debugger",
            "default",
            "delete",
            "do",
            "else",
            "enum",
            "export",
            "extends",
            "false",
            "finally",
            "for",
            "function",
            "if",
            "implements",
            "import",
            "in",
            "instanceof",
            "interface",
            "let",
            "new",
            "null",
            "package",
            "return",
            "satisfies",
            "super",
            "switch",
            "this",
            "throw",
            "true",
            "try",
            "type",
            "typeof",
            "var",
            "void",
            "while",
            "with",
            "yield",
        ].map(keywordEntry);
        Completion.insideMethodInJsKeywords = getInJsKeywords(Completion.insideMethodKeywords);
        Completion.globals = __spreadArray(__spreadArray(__spreadArray([
            Completion.globalThisEntry
        ], Completion.globalsVars, true), [
            Completion.undefinedVarEntry
        ], false), Completion.globalKeywords, true).sort(compareExpectedCompletionEntries);
        Completion.globalsInJs = __spreadArray(__spreadArray(__spreadArray([
            Completion.globalThisEntry
        ], Completion.globalsVars, true), [
            Completion.undefinedVarEntry
        ], false), Completion.globalInJsKeywords, true).sort(compareExpectedCompletionEntries);
        function globalsPlus(plus, options) {
            return combineExpectedCompletionEntries("globalsPlus", __spreadArray(__spreadArray(__spreadArray([
                Completion.globalThisEntry
            ], (options === null || options === void 0 ? void 0 : options.noLib) ? [] : Completion.globalsVars, true), [
                Completion.undefinedVarEntry
            ], false), Completion.globalKeywords, true), plus);
        }
        Completion.globalsPlus = globalsPlus;
        function globalsInJsPlus(plus, options) {
            return combineExpectedCompletionEntries("globalsInJsPlus", __spreadArray(__spreadArray(__spreadArray([
                Completion.globalThisEntry
            ], (options === null || options === void 0 ? void 0 : options.noLib) ? [] : Completion.globalsVars, true), [
                Completion.undefinedVarEntry
            ], false), Completion.globalInJsKeywords, true), plus);
        }
        Completion.globalsInJsPlus = globalsInJsPlus;
    })(Completion = FourSlashInterface.Completion || (FourSlashInterface.Completion = {}));
})(FourSlashInterface || (FourSlashInterface = {}));
var Harness;
(function (Harness) {
    function forEachASTNode(node) {
        var work, _loop_15;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    work = [node];
                    _loop_15 = function () {
                        var elem, resChildren;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    elem = work.pop();
                                    return [4 /*yield*/, elem];
                                case 1:
                                    _b.sent();
                                    resChildren = [];
                                    // push onto work queue in reverse order to maintain preorder traversal
                                    ts.forEachChild(elem, function (c) {
                                        resChildren.unshift(c);
                                    });
                                    work.push.apply(work, resChildren);
                                    return [2 /*return*/];
                            }
                        });
                    };
                    _a.label = 1;
                case 1:
                    if (!work.length) return [3 /*break*/, 3];
                    return [5 /*yield**/, _loop_15()];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 1];
                case 3: return [2 /*return*/];
            }
        });
    }
    var TypeWriterWalker = /** @class */ (function () {
        function TypeWriterWalker(program, hadErrorBaseline) {
            this.program = program;
            this.hadErrorBaseline = hadErrorBaseline;
            // Consider getting both the diagnostics checker and the non-diagnostics checker to verify
            // they are consistent.
            this.checker = program.getTypeChecker();
        }
        TypeWriterWalker.prototype.getSymbols = function (fileName) {
            var sourceFile, gen, _a, done, value;
            var _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        sourceFile = this.program.getSourceFile(fileName);
                        this.currentSourceFile = sourceFile;
                        gen = this.visitNode(sourceFile, /*isSymbolWalk*/ true);
                        _a = gen.next(), done = _a.done, value = _a.value;
                        _c.label = 1;
                    case 1:
                        if (!!done) return [3 /*break*/, 4];
                        return [4 /*yield*/, value];
                    case 2:
                        _c.sent();
                        _c.label = 3;
                    case 3:
                        _b = gen.next(), done = _b.done, value = _b.value;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/];
                }
            });
        };
        TypeWriterWalker.prototype.getTypes = function (fileName) {
            var sourceFile, gen, _a, done, value;
            var _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        sourceFile = this.program.getSourceFile(fileName);
                        this.currentSourceFile = sourceFile;
                        gen = this.visitNode(sourceFile, /*isSymbolWalk*/ false);
                        _a = gen.next(), done = _a.done, value = _a.value;
                        _c.label = 1;
                    case 1:
                        if (!!done) return [3 /*break*/, 4];
                        return [4 /*yield*/, value];
                    case 2:
                        _c.sent();
                        _c.label = 3;
                    case 3:
                        _b = gen.next(), done = _b.done, value = _b.value;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/];
                }
            });
        };
        TypeWriterWalker.prototype.visitNode = function (node, isSymbolWalk) {
            var gen, res, node_2, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        gen = forEachASTNode(node);
                        res = gen.next();
                        _a.label = 1;
                    case 1:
                        if (!!res.done) return [3 /*break*/, 4];
                        node_2 = res.value;
                        if (!(ts.isExpressionNode(node_2) || node_2.kind === 79 /* ts.SyntaxKind.Identifier */ || ts.isDeclarationName(node_2))) return [3 /*break*/, 3];
                        result = this.writeTypeOrSymbol(node_2, isSymbolWalk);
                        if (!result) return [3 /*break*/, 3];
                        return [4 /*yield*/, result];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        res = gen.next();
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/];
                }
            });
        };
        TypeWriterWalker.prototype.isImportStatementName = function (node) {
            if (ts.isImportSpecifier(node.parent) && (node.parent.name === node || node.parent.propertyName === node))
                return true;
            if (ts.isImportClause(node.parent) && node.parent.name === node)
                return true;
            if (ts.isImportEqualsDeclaration(node.parent) && node.parent.name === node)
                return true;
            return false;
        };
        TypeWriterWalker.prototype.isExportStatementName = function (node) {
            if (ts.isExportAssignment(node.parent) && node.parent.expression === node)
                return true;
            if (ts.isExportSpecifier(node.parent) && (node.parent.name === node || node.parent.propertyName === node))
                return true;
            return false;
        };
        TypeWriterWalker.prototype.isIntrinsicJsxTag = function (node) {
            var p = node.parent;
            if (!(ts.isJsxOpeningElement(p) || ts.isJsxClosingElement(p) || ts.isJsxSelfClosingElement(p)))
                return false;
            if (p.tagName !== node)
                return false;
            return ts.isIntrinsicJsxName(node.getText());
        };
        TypeWriterWalker.prototype.writeTypeOrSymbol = function (node, isSymbolWalk) {
            var actualPos = ts.skipTrivia(this.currentSourceFile.text, node.pos);
            var lineAndCharacter = this.currentSourceFile.getLineAndCharacterOfPosition(actualPos);
            var sourceText = ts.getSourceTextOfNodeFromSourceFile(this.currentSourceFile, node);
            if (!isSymbolWalk) {
                // Don't try to get the type of something that's already a type.
                // Exception for `T` in `type T = something` because that may evaluate to some interesting type.
                if (ts.isPartOfTypeNode(node) || ts.isIdentifier(node) && !(ts.getMeaningFromDeclaration(node.parent) & 1 /* ts.SemanticMeaning.Value */) && !(ts.isTypeAliasDeclaration(node.parent) && node.parent.name === node)) {
                    return undefined;
                }
                // Workaround to ensure we output 'C' instead of 'typeof C' for base class expressions
                // let type = this.checker.getTypeAtLocation(node);
                var type = ts.isExpressionWithTypeArgumentsInClassExtendsClause(node.parent) ? this.checker.getTypeAtLocation(node.parent) : undefined;
                if (!type || type.flags & 1 /* ts.TypeFlags.Any */)
                    type = this.checker.getTypeAtLocation(node);
                // Distinguish `errorType`s from `any`s; but only if the file has no errors.
                // Additionally,
                // * the LHS of a qualified name
                // * a binding pattern name
                // * labels
                // * the "global" in "declare global"
                // * the "target" in "new.target"
                // * names in import statements
                // * type-only names in export statements
                // * and intrinsic jsx tag names
                // return `error`s via `getTypeAtLocation`
                // But this is generally expected, so we don't call those out, either
                var typeString = void 0;
                if (!this.hadErrorBaseline &&
                    type.flags & 1 /* ts.TypeFlags.Any */ &&
                    !ts.isBindingElement(node.parent) &&
                    !ts.isPropertyAccessOrQualifiedName(node.parent) &&
                    !ts.isLabelName(node) &&
                    !(ts.isModuleDeclaration(node.parent) && ts.isGlobalScopeAugmentation(node.parent)) &&
                    !ts.isMetaProperty(node.parent) &&
                    !this.isImportStatementName(node) &&
                    !this.isExportStatementName(node) &&
                    !this.isIntrinsicJsxTag(node)) {
                    typeString = type.intrinsicName;
                }
                else {
                    typeString = this.checker.typeToString(type, node.parent, 1 /* ts.TypeFormatFlags.NoTruncation */ | 1048576 /* ts.TypeFormatFlags.AllowUniqueESSymbolType */);
                    if (ts.isIdentifier(node) && ts.isTypeAliasDeclaration(node.parent) && node.parent.name === node && typeString === ts.idText(node)) {
                        // for a complex type alias `type T = ...`, showing "T : T" isn't very helpful for type tests. When the type produced is the same as
                        // the name of the type alias, recreate the type string without reusing the alias name
                        typeString = this.checker.typeToString(type, node.parent, 1 /* ts.TypeFormatFlags.NoTruncation */ | 1048576 /* ts.TypeFormatFlags.AllowUniqueESSymbolType */ | 8388608 /* ts.TypeFormatFlags.InTypeAlias */);
                    }
                }
                return {
                    line: lineAndCharacter.line,
                    syntaxKind: node.kind,
                    sourceText: sourceText,
                    type: typeString
                };
            }
            var symbol = this.checker.getSymbolAtLocation(node);
            if (!symbol) {
                return;
            }
            var symbolString = "Symbol(" + this.checker.symbolToString(symbol, node.parent);
            if (symbol.declarations) {
                var count = 0;
                for (var _i = 0, _a = symbol.declarations; _i < _a.length; _i++) {
                    var declaration = _a[_i];
                    if (count >= 5) {
                        symbolString += " ... and ".concat(symbol.declarations.length - count, " more");
                        break;
                    }
                    count++;
                    symbolString += ", ";
                    if (declaration.__symbolTestOutputCache) {
                        symbolString += declaration.__symbolTestOutputCache;
                        continue;
                    }
                    var declSourceFile = declaration.getSourceFile();
                    var declLineAndCharacter = declSourceFile.getLineAndCharacterOfPosition(declaration.pos);
                    var fileName = ts.getBaseFileName(declSourceFile.fileName);
                    var isLibFile = /lib(.*)\.d\.ts/i.test(fileName);
                    var declText = "Decl(".concat(fileName, ", ").concat(isLibFile ? "--" : declLineAndCharacter.line, ", ").concat(isLibFile ? "--" : declLineAndCharacter.character, ")");
                    symbolString += declText;
                    declaration.__symbolTestOutputCache = declText;
                }
            }
            symbolString += ")";
            return {
                line: lineAndCharacter.line,
                syntaxKind: node.kind,
                sourceText: sourceText,
                symbol: symbolString
            };
        };
        return TypeWriterWalker;
    }());
    Harness.TypeWriterWalker = TypeWriterWalker;
})(Harness || (Harness = {}));
//# sourceMappingURL=harness.js.map