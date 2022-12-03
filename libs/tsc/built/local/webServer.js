"use strict";
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
/*@internal*/
/// <reference lib="dom" />
/// <reference lib="webworker.importscripts" />
var ts;
(function (ts) {
    var server;
    (function (server) {
        var BaseLogger = /** @class */ (function () {
            function BaseLogger(level) {
                this.level = level;
                this.seq = 0;
                this.inGroup = false;
                this.firstInGroup = true;
            }
            BaseLogger.padStringRight = function (str, padding) {
                return (str + padding).slice(0, padding.length);
            };
            BaseLogger.prototype.close = function () {
            };
            BaseLogger.prototype.getLogFileName = function () {
                return undefined;
            };
            BaseLogger.prototype.perftrc = function (s) {
                this.msg(s, server.Msg.Perf);
            };
            BaseLogger.prototype.info = function (s) {
                this.msg(s, server.Msg.Info);
            };
            BaseLogger.prototype.err = function (s) {
                this.msg(s, server.Msg.Err);
            };
            BaseLogger.prototype.startGroup = function () {
                this.inGroup = true;
                this.firstInGroup = true;
            };
            BaseLogger.prototype.endGroup = function () {
                this.inGroup = false;
            };
            BaseLogger.prototype.loggingEnabled = function () {
                return true;
            };
            BaseLogger.prototype.hasLevel = function (level) {
                return this.loggingEnabled() && this.level >= level;
            };
            BaseLogger.prototype.msg = function (s, type) {
                if (type === void 0) { type = server.Msg.Err; }
                switch (type) {
                    case server.Msg.Info:
                        ts.perfLogger.logInfoEvent(s);
                        break;
                    case server.Msg.Perf:
                        ts.perfLogger.logPerfEvent(s);
                        break;
                    default: // Msg.Err
                        ts.perfLogger.logErrEvent(s);
                        break;
                }
                if (!this.canWrite())
                    return;
                s = "[".concat(server.nowString(), "] ").concat(s, "\n");
                if (!this.inGroup || this.firstInGroup) {
                    var prefix = BaseLogger.padStringRight(type + " " + this.seq.toString(), "          ");
                    s = prefix + s;
                }
                this.write(s, type);
                if (!this.inGroup) {
                    this.seq++;
                }
            };
            BaseLogger.prototype.canWrite = function () {
                return true;
            };
            BaseLogger.prototype.write = function (_s, _type) {
            };
            return BaseLogger;
        }());
        server.BaseLogger = BaseLogger;
        var MainProcessLogger = /** @class */ (function (_super) {
            __extends(MainProcessLogger, _super);
            function MainProcessLogger(level, host) {
                var _this = _super.call(this, level) || this;
                _this.host = host;
                return _this;
            }
            MainProcessLogger.prototype.write = function (body, type) {
                var level;
                switch (type) {
                    case server.Msg.Info:
                        level = "info";
                        break;
                    case server.Msg.Perf:
                        level = "perf";
                        break;
                    case server.Msg.Err:
                        level = "error";
                        break;
                    default:
                        ts.Debug.assertNever(type);
                }
                this.host.writeMessage({
                    type: "log",
                    level: level,
                    body: body,
                });
            };
            return MainProcessLogger;
        }(BaseLogger));
        server.MainProcessLogger = MainProcessLogger;
        // Attempt to load `dynamicImport`
        if (typeof importScripts === "function") {
            try {
                // NOTE: importScripts is synchronous
                importScripts("dynamicImportCompat.js");
            }
            catch (_a) {
                // ignored
            }
        }
        function createWebSystem(host, args, getExecutingFilePath) {
            var _this = this;
            var returnEmptyString = function () { return ""; };
            var getExecutingDirectoryPath = ts.memoize(function () { return ts.memoize(function () { return ts.ensureTrailingDirectorySeparator(ts.getDirectoryPath(getExecutingFilePath())); }); });
            // Later we could map ^memfs:/ to do something special if we want to enable more functionality like module resolution or something like that
            var getWebPath = function (path) { return ts.startsWith(path, ts.directorySeparator) ? path.replace(ts.directorySeparator, getExecutingDirectoryPath()) : undefined; };
            var dynamicImport = function (id) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    // Use syntactic dynamic import first, if available
                    if (server.dynamicImport) {
                        return [2 /*return*/, server.dynamicImport(id)];
                    }
                    throw new Error("Dynamic import not implemented");
                });
            }); };
            return {
                args: args,
                newLine: "\r\n",
                useCaseSensitiveFileNames: false,
                readFile: function (path) {
                    var webPath = getWebPath(path);
                    return webPath && host.readFile(webPath);
                },
                write: host.writeMessage.bind(host),
                watchFile: ts.returnNoopFileWatcher,
                watchDirectory: ts.returnNoopFileWatcher,
                getExecutingFilePath: function () { return ts.directorySeparator; },
                getCurrentDirectory: returnEmptyString,
                /* eslint-disable no-restricted-globals */
                setTimeout: function (cb, ms) {
                    var args = [];
                    for (var _i = 2; _i < arguments.length; _i++) {
                        args[_i - 2] = arguments[_i];
                    }
                    return setTimeout.apply(void 0, __spreadArray([cb, ms], args, false));
                },
                clearTimeout: function (handle) { return clearTimeout(handle); },
                setImmediate: function (x) { return setTimeout(x, 0); },
                clearImmediate: function (handle) { return clearTimeout(handle); },
                /* eslint-enable no-restricted-globals */
                importPlugin: function (initialDir, moduleName) { return __awaiter(_this, void 0, void 0, function () {
                    var packageRoot, packageJson, packageJsonResponse, e_1, browser, scriptPath, module_1, e_2;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                packageRoot = ts.combinePaths(initialDir, moduleName);
                                _a.label = 1;
                            case 1:
                                _a.trys.push([1, 4, , 5]);
                                return [4 /*yield*/, fetch(ts.combinePaths(packageRoot, "package.json"))];
                            case 2:
                                packageJsonResponse = _a.sent();
                                return [4 /*yield*/, packageJsonResponse.json()];
                            case 3:
                                packageJson = _a.sent();
                                return [3 /*break*/, 5];
                            case 4:
                                e_1 = _a.sent();
                                return [2 /*return*/, { module: undefined, error: new Error("Could not load plugin. Could not load 'package.json'.") }];
                            case 5:
                                browser = packageJson.browser;
                                if (!browser) {
                                    return [2 /*return*/, { module: undefined, error: new Error("Could not load plugin. No 'browser' field found in package.json.") }];
                                }
                                scriptPath = ts.combinePaths(packageRoot, browser);
                                _a.label = 6;
                            case 6:
                                _a.trys.push([6, 8, , 9]);
                                return [4 /*yield*/, dynamicImport(scriptPath)];
                            case 7:
                                module_1 = (_a.sent()).default;
                                return [2 /*return*/, { module: module_1, error: undefined }];
                            case 8:
                                e_2 = _a.sent();
                                return [2 /*return*/, { module: undefined, error: e_2 }];
                            case 9: return [2 /*return*/];
                        }
                    });
                }); },
                exit: ts.notImplemented,
                // Debugging related
                getEnvironmentVariable: returnEmptyString,
                // tryEnableSourceMapsForHost?(): void;
                // debugMode?: boolean;
                // For semantic server mode
                fileExists: function (path) {
                    var webPath = getWebPath(path);
                    return !!webPath && host.fileExists(webPath);
                },
                directoryExists: ts.returnFalse,
                readDirectory: ts.notImplemented,
                getDirectories: function () { return []; },
                createDirectory: ts.notImplemented,
                writeFile: ts.notImplemented,
                resolvePath: ts.identity, // Plugins
                // realpath? // Module resolution, symlinks
                // getModifiedTime // File watching
                // createSHA256Hash // telemetry of the project
                // Logging related
                // /*@internal*/ bufferFrom?(input: string, encoding?: string): Buffer;
                // gc?(): void;
                // getMemoryUsage?(): number;
            };
        }
        server.createWebSystem = createWebSystem;
        var WorkerSession = /** @class */ (function (_super) {
            __extends(WorkerSession, _super);
            function WorkerSession(host, webHost, options, logger, cancellationToken, hrtime) {
                var _this = _super.call(this, __assign(__assign({ host: host, cancellationToken: cancellationToken }, options), { typingsInstaller: server.nullTypingsInstaller, byteLength: ts.notImplemented, // Formats the message text in send of Session which is overriden in this class so not needed
                    hrtime: hrtime, logger: logger, canUseEvents: true })) || this;
                _this.webHost = webHost;
                return _this;
            }
            WorkerSession.prototype.send = function (msg) {
                if (msg.type === "event" && !this.canUseEvents) {
                    if (this.logger.hasLevel(server.LogLevel.verbose)) {
                        this.logger.info("Session does not support events: ignored event: ".concat(JSON.stringify(msg)));
                    }
                    return;
                }
                if (this.logger.hasLevel(server.LogLevel.verbose)) {
                    this.logger.info("".concat(msg.type, ":").concat(server.indent(JSON.stringify(msg))));
                }
                this.webHost.writeMessage(msg);
            };
            WorkerSession.prototype.parseMessage = function (message) {
                return message;
            };
            WorkerSession.prototype.toStringMessage = function (message) {
                return JSON.stringify(message, undefined, 2);
            };
            return WorkerSession;
        }(server.Session));
        server.WorkerSession = WorkerSession;
    })(server = ts.server || (ts.server = {}));
})(ts || (ts = {}));
//# sourceMappingURL=webServer.js.map