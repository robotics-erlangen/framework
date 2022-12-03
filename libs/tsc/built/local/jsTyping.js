"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var ts;
(function (ts) {
    var server;
    (function (server) {
        /* @internal */
        server.ActionSet = "action::set";
        /* @internal */
        server.ActionInvalidate = "action::invalidate";
        /* @internal */
        server.ActionPackageInstalled = "action::packageInstalled";
        /* @internal */
        server.EventTypesRegistry = "event::typesRegistry";
        /* @internal */
        server.EventBeginInstallTypes = "event::beginInstallTypes";
        /* @internal */
        server.EventEndInstallTypes = "event::endInstallTypes";
        /* @internal */
        server.EventInitializationFailed = "event::initializationFailed";
        /* @internal */
        var Arguments;
        (function (Arguments) {
            Arguments.GlobalCacheLocation = "--globalTypingsCacheLocation";
            Arguments.LogFile = "--logFile";
            Arguments.EnableTelemetry = "--enableTelemetry";
            Arguments.TypingSafeListLocation = "--typingSafeListLocation";
            Arguments.TypesMapLocation = "--typesMapLocation";
            /**
             * This argument specifies the location of the NPM executable.
             * typingsInstaller will run the command with `${npmLocation} install ...`.
             */
            Arguments.NpmLocation = "--npmLocation";
            /**
             * Flag indicating that the typings installer should try to validate the default npm location.
             * If the default npm is not found when this flag is enabled, fallback to `npm install`
             */
            Arguments.ValidateDefaultNpmLocation = "--validateDefaultNpmLocation";
        })(Arguments = server.Arguments || (server.Arguments = {}));
        /* @internal */
        function hasArgument(argumentName) {
            return ts.sys.args.indexOf(argumentName) >= 0;
        }
        server.hasArgument = hasArgument;
        /* @internal */
        function findArgument(argumentName) {
            var index = ts.sys.args.indexOf(argumentName);
            return index >= 0 && index < ts.sys.args.length - 1
                ? ts.sys.args[index + 1]
                : undefined;
        }
        server.findArgument = findArgument;
        /* @internal */
        function nowString() {
            // E.g. "12:34:56.789"
            var d = new Date();
            return "".concat(ts.padLeft(d.getHours().toString(), 2, "0"), ":").concat(ts.padLeft(d.getMinutes().toString(), 2, "0"), ":").concat(ts.padLeft(d.getSeconds().toString(), 2, "0"), ".").concat(ts.padLeft(d.getMilliseconds().toString(), 3, "0"));
        }
        server.nowString = nowString;
    })(server = ts.server || (ts.server = {}));
})(ts || (ts = {}));
/* @internal */
var ts;
(function (ts) {
    var JsTyping;
    (function (JsTyping) {
        function isTypingUpToDate(cachedTyping, availableTypingVersions) {
            var availableVersion = new ts.Version(ts.getProperty(availableTypingVersions, "ts".concat(ts.versionMajorMinor)) || ts.getProperty(availableTypingVersions, "latest"));
            return availableVersion.compareTo(cachedTyping.version) <= 0;
        }
        JsTyping.isTypingUpToDate = isTypingUpToDate;
        var unprefixedNodeCoreModuleList = [
            "assert",
            "assert/strict",
            "async_hooks",
            "buffer",
            "child_process",
            "cluster",
            "console",
            "constants",
            "crypto",
            "dgram",
            "diagnostics_channel",
            "dns",
            "dns/promises",
            "domain",
            "events",
            "fs",
            "fs/promises",
            "http",
            "https",
            "http2",
            "inspector",
            "module",
            "net",
            "os",
            "path",
            "perf_hooks",
            "process",
            "punycode",
            "querystring",
            "readline",
            "repl",
            "stream",
            "stream/promises",
            "string_decoder",
            "timers",
            "timers/promises",
            "tls",
            "trace_events",
            "tty",
            "url",
            "util",
            "util/types",
            "v8",
            "vm",
            "wasi",
            "worker_threads",
            "zlib"
        ];
        JsTyping.prefixedNodeCoreModuleList = unprefixedNodeCoreModuleList.map(function (name) { return "node:".concat(name); });
        JsTyping.nodeCoreModuleList = __spreadArray(__spreadArray([], unprefixedNodeCoreModuleList, true), JsTyping.prefixedNodeCoreModuleList, true);
        JsTyping.nodeCoreModules = new ts.Set(JsTyping.nodeCoreModuleList);
        function nonRelativeModuleNameForTypingCache(moduleName) {
            return JsTyping.nodeCoreModules.has(moduleName) ? "node" : moduleName;
        }
        JsTyping.nonRelativeModuleNameForTypingCache = nonRelativeModuleNameForTypingCache;
        function loadSafeList(host, safeListPath) {
            var result = ts.readConfigFile(safeListPath, function (path) { return host.readFile(path); });
            return new ts.Map(ts.getEntries(result.config));
        }
        JsTyping.loadSafeList = loadSafeList;
        function loadTypesMap(host, typesMapPath) {
            var result = ts.readConfigFile(typesMapPath, function (path) { return host.readFile(path); });
            if (result.config) {
                return new ts.Map(ts.getEntries(result.config.simpleMap));
            }
            return undefined;
        }
        JsTyping.loadTypesMap = loadTypesMap;
        /**
         * @param host is the object providing I/O related operations.
         * @param fileNames are the file names that belong to the same project
         * @param projectRootPath is the path to the project root directory
         * @param safeListPath is the path used to retrieve the safe list
         * @param packageNameToTypingLocation is the map of package names to their cached typing locations and installed versions
         * @param typeAcquisition is used to customize the typing acquisition process
         * @param compilerOptions are used as a source for typing inference
         */
        function discoverTypings(host, log, fileNames, projectRootPath, safeList, packageNameToTypingLocation, typeAcquisition, unresolvedImports, typesRegistry, compilerOptions) {
            if (!typeAcquisition || !typeAcquisition.enable) {
                return { cachedTypingPaths: [], newTypingNames: [], filesToWatch: [] };
            }
            // A typing name to typing file path mapping
            var inferredTypings = new ts.Map();
            // Only infer typings for .js and .jsx files
            fileNames = ts.mapDefined(fileNames, function (fileName) {
                var path = ts.normalizePath(fileName);
                if (ts.hasJSFileExtension(path)) {
                    return path;
                }
            });
            var filesToWatch = [];
            if (typeAcquisition.include)
                addInferredTypings(typeAcquisition.include, "Explicitly included types");
            var exclude = typeAcquisition.exclude || [];
            // Directories to search for package.json, bower.json and other typing information
            if (!compilerOptions.types) {
                var possibleSearchDirs = new ts.Set(fileNames.map(ts.getDirectoryPath));
                possibleSearchDirs.add(projectRootPath);
                possibleSearchDirs.forEach(function (searchDir) {
                    getTypingNames(searchDir, "bower.json", "bower_components", filesToWatch);
                    getTypingNames(searchDir, "package.json", "node_modules", filesToWatch);
                });
            }
            if (!typeAcquisition.disableFilenameBasedTypeAcquisition) {
                getTypingNamesFromSourceFileNames(fileNames);
            }
            // add typings for unresolved imports
            if (unresolvedImports) {
                var module_1 = ts.deduplicate(unresolvedImports.map(nonRelativeModuleNameForTypingCache), ts.equateStringsCaseSensitive, ts.compareStringsCaseSensitive);
                addInferredTypings(module_1, "Inferred typings from unresolved imports");
            }
            // Add the cached typing locations for inferred typings that are already installed
            packageNameToTypingLocation.forEach(function (typing, name) {
                var registryEntry = typesRegistry.get(name);
                if (inferredTypings.has(name) && inferredTypings.get(name) === undefined && registryEntry !== undefined && isTypingUpToDate(typing, registryEntry)) {
                    inferredTypings.set(name, typing.typingLocation);
                }
            });
            // Remove typings that the user has added to the exclude list
            for (var _i = 0, exclude_1 = exclude; _i < exclude_1.length; _i++) {
                var excludeTypingName = exclude_1[_i];
                var didDelete = inferredTypings.delete(excludeTypingName);
                if (didDelete && log)
                    log("Typing for ".concat(excludeTypingName, " is in exclude list, will be ignored."));
            }
            var newTypingNames = [];
            var cachedTypingPaths = [];
            inferredTypings.forEach(function (inferred, typing) {
                if (inferred !== undefined) {
                    cachedTypingPaths.push(inferred);
                }
                else {
                    newTypingNames.push(typing);
                }
            });
            var result = { cachedTypingPaths: cachedTypingPaths, newTypingNames: newTypingNames, filesToWatch: filesToWatch };
            if (log)
                log("Result: ".concat(JSON.stringify(result)));
            return result;
            function addInferredTyping(typingName) {
                if (!inferredTypings.has(typingName)) {
                    inferredTypings.set(typingName, undefined); // TODO: GH#18217
                }
            }
            function addInferredTypings(typingNames, message) {
                if (log)
                    log("".concat(message, ": ").concat(JSON.stringify(typingNames)));
                ts.forEach(typingNames, addInferredTyping);
            }
            /**
             * Adds inferred typings from manifest/module pairs (think package.json + node_modules)
             *
             * @param projectRootPath is the path to the directory where to look for package.json, bower.json and other typing information
             * @param manifestName is the name of the manifest (package.json or bower.json)
             * @param modulesDirName is the directory name for modules (node_modules or bower_components). Should be lowercase!
             * @param filesToWatch are the files to watch for changes. We will push things into this array.
             */
            function getTypingNames(projectRootPath, manifestName, modulesDirName, filesToWatch) {
                // First, we check the manifests themselves. They're not
                // _required_, but they allow us to do some filtering when dealing
                // with big flat dep directories.
                var manifestPath = ts.combinePaths(projectRootPath, manifestName);
                var manifest;
                var manifestTypingNames;
                if (host.fileExists(manifestPath)) {
                    filesToWatch.push(manifestPath);
                    manifest = ts.readConfigFile(manifestPath, function (path) { return host.readFile(path); }).config;
                    manifestTypingNames = ts.flatMap([manifest.dependencies, manifest.devDependencies, manifest.optionalDependencies, manifest.peerDependencies], ts.getOwnKeys);
                    addInferredTypings(manifestTypingNames, "Typing names in '".concat(manifestPath, "' dependencies"));
                }
                // Now we scan the directories for typing information in
                // already-installed dependencies (if present). Note that this
                // step happens regardless of whether a manifest was present,
                // which is certainly a valid configuration, if an unusual one.
                var packagesFolderPath = ts.combinePaths(projectRootPath, modulesDirName);
                filesToWatch.push(packagesFolderPath);
                if (!host.directoryExists(packagesFolderPath)) {
                    return;
                }
                // There's two cases we have to take into account here:
                // 1. If manifest is undefined, then we're not using a manifest.
                //    That means that we should scan _all_ dependencies at the top
                //    level of the modulesDir.
                // 2. If manifest is defined, then we can do some special
                //    filtering to reduce the amount of scanning we need to do.
                //
                // Previous versions of this algorithm checked for a `_requiredBy`
                // field in the package.json, but that field is only present in
                // `npm@>=3 <7`.
                // Package names that do **not** provide their own typings, so
                // we'll look them up.
                var packageNames = [];
                var dependencyManifestNames = manifestTypingNames
                    // This is #1 described above.
                    ? manifestTypingNames.map(function (typingName) { return ts.combinePaths(packagesFolderPath, typingName, manifestName); })
                    // And #2. Depth = 3 because scoped packages look like `node_modules/@foo/bar/package.json`
                    : host.readDirectory(packagesFolderPath, [".json" /* Extension.Json */], /*excludes*/ undefined, /*includes*/ undefined, /*depth*/ 3)
                        .filter(function (manifestPath) {
                        if (ts.getBaseFileName(manifestPath) !== manifestName) {
                            return false;
                        }
                        // It's ok to treat
                        // `node_modules/@foo/bar/package.json` as a manifest,
                        // but not `node_modules/jquery/nested/package.json`.
                        // We only assume depth 3 is ok for formally scoped
                        // packages. So that needs this dance here.
                        var pathComponents = ts.getPathComponents(ts.normalizePath(manifestPath));
                        var isScoped = pathComponents[pathComponents.length - 3][0] === "@";
                        return isScoped && pathComponents[pathComponents.length - 4].toLowerCase() === modulesDirName || // `node_modules/@foo/bar`
                            !isScoped && pathComponents[pathComponents.length - 3].toLowerCase() === modulesDirName; // `node_modules/foo`
                    });
                if (log)
                    log("Searching for typing names in ".concat(packagesFolderPath, "; all files: ").concat(JSON.stringify(dependencyManifestNames)));
                // Once we have the names of things to look up, we iterate over
                // and either collect their included typings, or add them to the
                // list of typings we need to look up separately.
                for (var _i = 0, dependencyManifestNames_1 = dependencyManifestNames; _i < dependencyManifestNames_1.length; _i++) {
                    var manifestPath_1 = dependencyManifestNames_1[_i];
                    var normalizedFileName = ts.normalizePath(manifestPath_1);
                    var result_1 = ts.readConfigFile(normalizedFileName, function (path) { return host.readFile(path); });
                    var manifest_1 = result_1.config;
                    // If the package has its own d.ts typings, those will take precedence. Otherwise the package name will be used
                    // to download d.ts files from DefinitelyTyped
                    if (!manifest_1.name) {
                        continue;
                    }
                    var ownTypes = manifest_1.types || manifest_1.typings;
                    if (ownTypes) {
                        var absolutePath = ts.getNormalizedAbsolutePath(ownTypes, ts.getDirectoryPath(normalizedFileName));
                        if (host.fileExists(absolutePath)) {
                            if (log)
                                log("    Package '".concat(manifest_1.name, "' provides its own types."));
                            inferredTypings.set(manifest_1.name, absolutePath);
                        }
                        else {
                            if (log)
                                log("    Package '".concat(manifest_1.name, "' provides its own types but they are missing."));
                        }
                    }
                    else {
                        packageNames.push(manifest_1.name);
                    }
                }
                addInferredTypings(packageNames, "    Found package names");
            }
            /**
             * Infer typing names from given file names. For example, the file name "jquery-min.2.3.4.js"
             * should be inferred to the 'jquery' typing name; and "angular-route.1.2.3.js" should be inferred
             * to the 'angular-route' typing name.
             * @param fileNames are the names for source files in the project
             */
            function getTypingNamesFromSourceFileNames(fileNames) {
                var fromFileNames = ts.mapDefined(fileNames, function (j) {
                    if (!ts.hasJSFileExtension(j))
                        return undefined;
                    var inferredTypingName = ts.removeFileExtension(ts.getBaseFileName(j.toLowerCase()));
                    var cleanedTypingName = ts.removeMinAndVersionNumbers(inferredTypingName);
                    return safeList.get(cleanedTypingName);
                });
                if (fromFileNames.length) {
                    addInferredTypings(fromFileNames, "Inferred typings from file names");
                }
                var hasJsxFile = ts.some(fileNames, function (f) { return ts.fileExtensionIs(f, ".jsx" /* Extension.Jsx */); });
                if (hasJsxFile) {
                    if (log)
                        log("Inferred 'react' typings due to presence of '.jsx' extension");
                    addInferredTyping("react");
                }
            }
        }
        JsTyping.discoverTypings = discoverTypings;
        var NameValidationResult;
        (function (NameValidationResult) {
            NameValidationResult[NameValidationResult["Ok"] = 0] = "Ok";
            NameValidationResult[NameValidationResult["EmptyName"] = 1] = "EmptyName";
            NameValidationResult[NameValidationResult["NameTooLong"] = 2] = "NameTooLong";
            NameValidationResult[NameValidationResult["NameStartsWithDot"] = 3] = "NameStartsWithDot";
            NameValidationResult[NameValidationResult["NameStartsWithUnderscore"] = 4] = "NameStartsWithUnderscore";
            NameValidationResult[NameValidationResult["NameContainsNonURISafeCharacters"] = 5] = "NameContainsNonURISafeCharacters";
        })(NameValidationResult = JsTyping.NameValidationResult || (JsTyping.NameValidationResult = {}));
        var maxPackageNameLength = 214;
        /**
         * Validates package name using rules defined at https://docs.npmjs.com/files/package.json
         */
        function validatePackageName(packageName) {
            return validatePackageNameWorker(packageName, /*supportScopedPackage*/ true);
        }
        JsTyping.validatePackageName = validatePackageName;
        function validatePackageNameWorker(packageName, supportScopedPackage) {
            if (!packageName) {
                return 1 /* NameValidationResult.EmptyName */;
            }
            if (packageName.length > maxPackageNameLength) {
                return 2 /* NameValidationResult.NameTooLong */;
            }
            if (packageName.charCodeAt(0) === 46 /* CharacterCodes.dot */) {
                return 3 /* NameValidationResult.NameStartsWithDot */;
            }
            if (packageName.charCodeAt(0) === 95 /* CharacterCodes._ */) {
                return 4 /* NameValidationResult.NameStartsWithUnderscore */;
            }
            // check if name is scope package like: starts with @ and has one '/' in the middle
            // scoped packages are not currently supported
            if (supportScopedPackage) {
                var matches = /^@([^/]+)\/([^/]+)$/.exec(packageName);
                if (matches) {
                    var scopeResult = validatePackageNameWorker(matches[1], /*supportScopedPackage*/ false);
                    if (scopeResult !== 0 /* NameValidationResult.Ok */) {
                        return { name: matches[1], isScopeName: true, result: scopeResult };
                    }
                    var packageResult = validatePackageNameWorker(matches[2], /*supportScopedPackage*/ false);
                    if (packageResult !== 0 /* NameValidationResult.Ok */) {
                        return { name: matches[2], isScopeName: false, result: packageResult };
                    }
                    return 0 /* NameValidationResult.Ok */;
                }
            }
            if (encodeURIComponent(packageName) !== packageName) {
                return 5 /* NameValidationResult.NameContainsNonURISafeCharacters */;
            }
            return 0 /* NameValidationResult.Ok */;
        }
        function renderPackageNameValidationFailure(result, typing) {
            return typeof result === "object" ?
                renderPackageNameValidationFailureWorker(typing, result.result, result.name, result.isScopeName) :
                renderPackageNameValidationFailureWorker(typing, result, typing, /*isScopeName*/ false);
        }
        JsTyping.renderPackageNameValidationFailure = renderPackageNameValidationFailure;
        function renderPackageNameValidationFailureWorker(typing, result, name, isScopeName) {
            var kind = isScopeName ? "Scope" : "Package";
            switch (result) {
                case 1 /* NameValidationResult.EmptyName */:
                    return "'".concat(typing, "':: ").concat(kind, " name '").concat(name, "' cannot be empty");
                case 2 /* NameValidationResult.NameTooLong */:
                    return "'".concat(typing, "':: ").concat(kind, " name '").concat(name, "' should be less than ").concat(maxPackageNameLength, " characters");
                case 3 /* NameValidationResult.NameStartsWithDot */:
                    return "'".concat(typing, "':: ").concat(kind, " name '").concat(name, "' cannot start with '.'");
                case 4 /* NameValidationResult.NameStartsWithUnderscore */:
                    return "'".concat(typing, "':: ").concat(kind, " name '").concat(name, "' cannot start with '_'");
                case 5 /* NameValidationResult.NameContainsNonURISafeCharacters */:
                    return "'".concat(typing, "':: ").concat(kind, " name '").concat(name, "' contains non URI safe characters");
                case 0 /* NameValidationResult.Ok */:
                    return ts.Debug.fail(); // Shouldn't have called this.
                default:
                    throw ts.Debug.assertNever(result);
            }
        }
    })(JsTyping = ts.JsTyping || (ts.JsTyping = {}));
})(ts || (ts = {}));
//# sourceMappingURL=jsTyping.js.map