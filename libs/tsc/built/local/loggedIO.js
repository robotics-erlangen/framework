"use strict";
var Playback;
(function (Playback) {
    var recordLog;
    var replayLog;
    var replayFilesRead;
    var recordLogFileNameBase = "";
    function memoize(func) {
        var lookup = {};
        var run = (function (s) {
            if (ts.hasProperty(lookup, s))
                return lookup[s];
            return lookup[s] = func(s);
        });
        run.reset = function () {
            lookup = undefined; // TODO: GH#18217
        };
        return run;
    }
    function createEmptyLog() {
        return {
            timestamp: (new Date()).toString(),
            arguments: [],
            currentDirectory: "",
            filesRead: [],
            directoriesRead: [],
            filesWritten: [],
            filesDeleted: [],
            filesAppended: [],
            fileExists: [],
            filesFound: [],
            dirs: [],
            dirExists: [],
            dirsCreated: [],
            pathsResolved: [],
            executingPath: ""
        };
    }
    function newStyleLogIntoOldStyleLog(log, host, baseName) {
        for (var _i = 0, _a = log.filesAppended; _i < _a.length; _i++) {
            var file = _a[_i];
            if (file.contentsPath) {
                file.contents = host.readFile(ts.combinePaths(baseName, file.contentsPath));
                delete file.contentsPath;
            }
        }
        for (var _b = 0, _c = log.filesWritten; _b < _c.length; _b++) {
            var file = _c[_b];
            if (file.contentsPath) {
                file.contents = host.readFile(ts.combinePaths(baseName, file.contentsPath));
                delete file.contentsPath;
            }
        }
        for (var _d = 0, _e = log.filesRead; _d < _e.length; _d++) {
            var file = _e[_d];
            var result = file.result; // TODO: GH#18217
            if (result.contentsPath) {
                // `readFile` strips away a BOM (and actually reinerprets the file contents according to the correct encoding)
                // - but this has the unfortunate sideeffect of removing the BOM from any outputs based on the file, so we readd it here.
                result.contents = (result.bom || "") + host.readFile(ts.combinePaths(baseName, result.contentsPath));
                delete result.contentsPath;
            }
        }
        return log;
    }
    Playback.newStyleLogIntoOldStyleLog = newStyleLogIntoOldStyleLog;
    var canonicalizeForHarness = ts.createGetCanonicalFileName(/*caseSensitive*/ false); // This is done so tests work on windows _and_ linux
    function sanitizeTestFilePath(name) {
        var path = ts.toPath(ts.normalizeSlashes(name.replace(/[\^<>:"|?*%]/g, "_")).replace(/\.\.\//g, "__dotdot/"), "", canonicalizeForHarness);
        if (ts.startsWith(path, "/")) {
            return path.substring(1);
        }
        return path;
    }
    function oldStyleLogIntoNewStyleLog(log, writeFile, baseTestName) {
        if (log.filesAppended) {
            for (var _i = 0, _a = log.filesAppended; _i < _a.length; _i++) {
                var file = _a[_i];
                if (file.contents !== undefined) {
                    file.contentsPath = ts.combinePaths("appended", sanitizeTestFilePath(file.path));
                    writeFile(ts.combinePaths(baseTestName, file.contentsPath), file.contents);
                    delete file.contents;
                }
            }
        }
        if (log.filesWritten) {
            for (var _b = 0, _c = log.filesWritten; _b < _c.length; _b++) {
                var file = _c[_b];
                if (file.contents !== undefined) {
                    file.contentsPath = ts.combinePaths("written", sanitizeTestFilePath(file.path));
                    writeFile(ts.combinePaths(baseTestName, file.contentsPath), file.contents);
                    delete file.contents;
                }
            }
        }
        if (log.filesRead) {
            for (var _d = 0, _e = log.filesRead; _d < _e.length; _d++) {
                var file = _e[_d];
                var result = file.result; // TODO: GH#18217
                var contents = result.contents;
                if (contents !== undefined) {
                    result.contentsPath = ts.combinePaths("read", sanitizeTestFilePath(file.path));
                    writeFile(ts.combinePaths(baseTestName, result.contentsPath), contents);
                    var len = contents.length;
                    if (len >= 2 && contents.charCodeAt(0) === 0xfeff) {
                        result.bom = "\ufeff";
                    }
                    if (len >= 2 && contents.charCodeAt(0) === 0xfffe) {
                        result.bom = "\ufffe";
                    }
                    if (len >= 3 && contents.charCodeAt(0) === 0xefbb && contents.charCodeAt(1) === 0xbf) {
                        result.bom = "\uefbb\xbf";
                    }
                    delete result.contents;
                }
            }
        }
        return log;
    }
    Playback.oldStyleLogIntoNewStyleLog = oldStyleLogIntoNewStyleLog;
    function initWrapper() {
        var _a = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            _a[_i] = arguments[_i];
        }
        var wrapper = _a[0], underlying = _a[1];
        ts.forEach(Object.keys(underlying), function (prop) {
            wrapper[prop] = underlying[prop];
        });
        wrapper.startReplayFromString = function (logString) {
            wrapper.startReplayFromData(JSON.parse(logString));
        };
        wrapper.startReplayFromData = function (log) {
            replayLog = log;
            // Remove non-found files from the log (shouldn't really need them, but we still record them for diagnostic purposes)
            replayLog.filesRead = replayLog.filesRead.filter(function (f) { return f.result.contents !== undefined; });
            replayFilesRead = new ts.Map();
            for (var _i = 0, _a = replayLog.filesRead; _i < _a.length; _i++) {
                var file = _a[_i];
                replayFilesRead.set(ts.normalizeSlashes(file.path).toLowerCase(), file);
            }
        };
        wrapper.endReplay = function () {
            replayLog = undefined;
            replayFilesRead = undefined;
        };
        wrapper.startRecord = function (fileNameBase) {
            recordLogFileNameBase = fileNameBase;
            recordLog = createEmptyLog();
            recordLog.useCaseSensitiveFileNames = typeof underlying.useCaseSensitiveFileNames === "function" ? underlying.useCaseSensitiveFileNames() : underlying.useCaseSensitiveFileNames;
            if (typeof underlying.args !== "function") {
                recordLog.arguments = underlying.args;
            }
        };
        wrapper.startReplayFromFile = function (logFn) {
            wrapper.startReplayFromString(underlying.readFile(logFn));
        };
        wrapper.endRecord = function () {
            if (recordLog !== undefined) {
                var i_1 = 0;
                var getBase = function () { return recordLogFileNameBase + i_1; };
                while (underlying.fileExists(ts.combinePaths(getBase(), "test.json")))
                    i_1++;
                var newLog = oldStyleLogIntoNewStyleLog(recordLog, function (path, str) { return underlying.writeFile(path, str); }, getBase());
                underlying.writeFile(ts.combinePaths(getBase(), "test.json"), JSON.stringify(newLog, null, 4)); // eslint-disable-line no-null/no-null
                var syntheticTsconfig = generateTsconfig(newLog);
                if (syntheticTsconfig) {
                    underlying.writeFile(ts.combinePaths(getBase(), "tsconfig.json"), JSON.stringify(syntheticTsconfig, null, 4)); // eslint-disable-line no-null/no-null
                }
                recordLog = undefined;
            }
        };
        function generateTsconfig(newLog) {
            if (newLog.filesRead.some(function (file) { return /tsconfig.+json$/.test(file.path); })) {
                return;
            }
            var files = [];
            for (var _i = 0, _a = newLog.filesRead; _i < _a.length; _i++) {
                var file = _a[_i];
                var result = file.result;
                if (result.contentsPath &&
                    Harness.isDefaultLibraryFile(result.contentsPath) &&
                    /\.[tj]s$/.test(result.contentsPath)) {
                    files.push(result.contentsPath);
                }
            }
            return { compilerOptions: ts.parseCommandLine(newLog.arguments).options, files: files };
        }
        wrapper.fileExists = recordReplay(wrapper.fileExists, underlying)(function (path) { return callAndRecord(underlying.fileExists(path), recordLog.fileExists, { path: path }); }, memoize(function (path) {
            // If we read from the file, it must exist
            if (findFileByPath(path, /*throwFileNotFoundError*/ false)) {
                return true;
            }
            else {
                return findResultByFields(replayLog.fileExists, { path: path }, /*defaultValue*/ false);
            }
        }));
        wrapper.getExecutingFilePath = function () {
            if (replayLog !== undefined) {
                return replayLog.executingPath;
            }
            else if (recordLog !== undefined) {
                return recordLog.executingPath = underlying.getExecutingFilePath();
            }
            else {
                return underlying.getExecutingFilePath();
            }
        };
        wrapper.getCurrentDirectory = function () {
            if (replayLog !== undefined) {
                return replayLog.currentDirectory || "";
            }
            else if (recordLog !== undefined) {
                return recordLog.currentDirectory = underlying.getCurrentDirectory();
            }
            else {
                return underlying.getCurrentDirectory();
            }
        };
        wrapper.resolvePath = recordReplay(wrapper.resolvePath, underlying)(function (path) { return callAndRecord(underlying.resolvePath(path), recordLog.pathsResolved, { path: path }); }, memoize(function (path) { return findResultByFields(replayLog.pathsResolved, { path: path }, !ts.isRootedDiskPath(ts.normalizeSlashes(path)) && replayLog.currentDirectory ? replayLog.currentDirectory + "/" + path : ts.normalizeSlashes(path)); }));
        wrapper.readFile = recordReplay(wrapper.readFile, underlying)(function (path) {
            var result = underlying.readFile(path);
            var logEntry = { path: path, codepage: 0, result: { contents: result, codepage: 0 } };
            recordLog.filesRead.push(logEntry);
            return result;
        }, memoize(function (path) { return findFileByPath(path, /*throwFileNotFoundError*/ true).contents; }));
        wrapper.readDirectory = recordReplay(wrapper.readDirectory, underlying)(function (path, extensions, exclude, include, depth) {
            var result = underlying.readDirectory(path, extensions, exclude, include, depth);
            recordLog.directoriesRead.push({ path: path, extensions: extensions, exclude: exclude, include: include, depth: depth, result: result });
            return result;
        }, function (path) {
            // Because extensions is an array of all allowed extension, we will want to merge each of the replayLog.directoriesRead into one
            // if each of the directoriesRead has matched path with the given path (directory with same path but different extension will considered
            // different entry).
            // TODO (yuisu): We can certainly remove these once we recapture the RWC using new API
            var normalizedPath = ts.normalizePath(path).toLowerCase();
            return ts.flatMap(replayLog.directoriesRead, function (directory) {
                if (ts.normalizeSlashes(directory.path).toLowerCase() === normalizedPath) {
                    return directory.result;
                }
            });
        });
        wrapper.writeFile = recordReplay(wrapper.writeFile, underlying)(function (path, contents) { return callAndRecord(underlying.writeFile(path, contents), recordLog.filesWritten, { path: path, contents: contents, bom: false }); }, function () { return noOpReplay("writeFile"); });
        wrapper.exit = function (exitCode) {
            if (recordLog !== undefined) {
                wrapper.endRecord();
            }
            underlying.exit(exitCode);
        };
        wrapper.useCaseSensitiveFileNames = function () {
            if (replayLog !== undefined) {
                return !!replayLog.useCaseSensitiveFileNames;
            }
            return typeof underlying.useCaseSensitiveFileNames === "function" ? underlying.useCaseSensitiveFileNames() : underlying.useCaseSensitiveFileNames;
        };
    }
    Playback.initWrapper = initWrapper;
    function recordReplay(original, underlying) {
        function createWrapper(record, replay) {
            // eslint-disable-next-line local/only-arrow-functions
            return function () {
                if (replayLog !== undefined) {
                    return replay.apply(undefined, arguments);
                }
                else if (recordLog !== undefined) {
                    return record.apply(undefined, arguments);
                }
                else {
                    return original.apply(underlying, arguments);
                }
            };
        }
        return createWrapper;
    }
    function callAndRecord(underlyingResult, logArray, logEntry) {
        if (underlyingResult !== undefined) {
            logEntry.result = underlyingResult;
        }
        logArray.push(logEntry);
        return underlyingResult;
    }
    function findResultByFields(logArray, expectedFields, defaultValue) {
        var predicate = function (entry) {
            return Object.getOwnPropertyNames(expectedFields).every(function (name) { return entry[name] === expectedFields[name]; });
        };
        var results = logArray.filter(function (entry) { return predicate(entry); });
        if (results.length === 0) {
            if (defaultValue !== undefined) {
                return defaultValue;
            }
            else {
                throw new Error("No matching result in log array for: " + JSON.stringify(expectedFields));
            }
        }
        return results[0].result;
    }
    function findFileByPath(expectedPath, throwFileNotFoundError) {
        var normalizedName = ts.normalizePath(expectedPath).toLowerCase();
        // Try to find the result through normal fileName
        var result = replayFilesRead.get(normalizedName);
        if (result) {
            return result.result;
        }
        // If we got here, we didn't find a match
        if (throwFileNotFoundError) {
            throw new Error("No matching result in log array for path: " + expectedPath);
        }
        else {
            return undefined;
        }
    }
    function noOpReplay(_name) {
        // console.log("Swallowed write operation during replay: " + name);
    }
    function wrapIO(underlying) {
        var wrapper = {};
        initWrapper(wrapper, underlying);
        wrapper.directoryName = notSupported;
        wrapper.createDirectory = notSupported;
        wrapper.directoryExists = notSupported;
        wrapper.deleteFile = notSupported;
        wrapper.listFiles = notSupported;
        return wrapper;
        function notSupported() {
            throw new Error("NotSupported");
        }
    }
    Playback.wrapIO = wrapIO;
    function wrapSystem(underlying) {
        var wrapper = {};
        initWrapper(wrapper, underlying);
        return wrapper;
    }
    Playback.wrapSystem = wrapSystem;
})(Playback || (Playback = {}));
//# sourceMappingURL=loggedIO.js.map