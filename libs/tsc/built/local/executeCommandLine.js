"use strict";
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
    var StatisticType;
    (function (StatisticType) {
        StatisticType[StatisticType["time"] = 0] = "time";
        StatisticType[StatisticType["count"] = 1] = "count";
        StatisticType[StatisticType["memory"] = 2] = "memory";
    })(StatisticType = ts.StatisticType || (ts.StatisticType = {}));
    function countLines(program) {
        var counts = getCountsMap();
        ts.forEach(program.getSourceFiles(), function (file) {
            var key = getCountKey(program, file);
            var lineCount = ts.getLineStarts(file).length;
            counts.set(key, counts.get(key) + lineCount);
        });
        return counts;
    }
    function getCountsMap() {
        var counts = new ts.Map();
        counts.set("Library", 0);
        counts.set("Definitions", 0);
        counts.set("TypeScript", 0);
        counts.set("JavaScript", 0);
        counts.set("JSON", 0);
        counts.set("Other", 0);
        return counts;
    }
    function getCountKey(program, file) {
        if (program.isSourceFileDefaultLibrary(file)) {
            return "Library";
        }
        else if (file.isDeclarationFile) {
            return "Definitions";
        }
        var path = file.path;
        if (ts.fileExtensionIsOneOf(path, ts.supportedTSExtensionsFlat)) {
            return "TypeScript";
        }
        else if (ts.fileExtensionIsOneOf(path, ts.supportedJSExtensionsFlat)) {
            return "JavaScript";
        }
        else if (ts.fileExtensionIs(path, ".json" /* Extension.Json */)) {
            return "JSON";
        }
        else {
            return "Other";
        }
    }
    function updateReportDiagnostic(sys, existing, options) {
        return shouldBePretty(sys, options) ?
            ts.createDiagnosticReporter(sys, /*pretty*/ true) :
            existing;
    }
    function defaultIsPretty(sys) {
        return !!sys.writeOutputIsTTY && sys.writeOutputIsTTY() && !sys.getEnvironmentVariable("NO_COLOR");
    }
    function shouldBePretty(sys, options) {
        if (!options || typeof options.pretty === "undefined") {
            return defaultIsPretty(sys);
        }
        return options.pretty;
    }
    function getOptionsForHelp(commandLine) {
        // Sort our options by their names, (e.g. "--noImplicitAny" comes before "--watch")
        return !!commandLine.options.all ?
            ts.sort(ts.optionDeclarations, function (a, b) { return ts.compareStringsCaseInsensitive(a.name, b.name); }) :
            ts.filter(ts.optionDeclarations.slice(), function (v) { return !!v.showInSimplifiedHelpView; });
    }
    function printVersion(sys) {
        sys.write(ts.getDiagnosticText(ts.Diagnostics.Version_0, ts.version) + sys.newLine);
    }
    function createColors(sys) {
        var showColors = defaultIsPretty(sys);
        if (!showColors) {
            return {
                bold: function (str) { return str; },
                blue: function (str) { return str; },
                blueBackground: function (str) { return str; },
                brightWhite: function (str) { return str; }
            };
        }
        function bold(str) {
            return "\u001B[1m".concat(str, "\u001B[22m");
        }
        var isWindows = sys.getEnvironmentVariable("OS") && ts.stringContains(sys.getEnvironmentVariable("OS").toLowerCase(), "windows");
        var isWindowsTerminal = sys.getEnvironmentVariable("WT_SESSION");
        var isVSCode = sys.getEnvironmentVariable("TERM_PROGRAM") && sys.getEnvironmentVariable("TERM_PROGRAM") === "vscode";
        function blue(str) {
            // Effectively Powershell and Command prompt users use cyan instead
            // of blue because the default theme doesn't show blue with enough contrast.
            if (isWindows && !isWindowsTerminal && !isVSCode) {
                return brightWhite(str);
            }
            return "\u001B[94m".concat(str, "\u001B[39m");
        }
        // There are ~3 types of terminal color support: 16 colors, 256 and 16m colors
        // If there is richer color support, e.g. 256+ we can use extended ANSI codes which are not just generic 'blue'
        // but a 'lighter blue' which is closer to the blue in the TS logo.
        var supportsRicherColors = sys.getEnvironmentVariable("COLORTERM") === "truecolor" || sys.getEnvironmentVariable("TERM") === "xterm-256color";
        function blueBackground(str) {
            if (supportsRicherColors) {
                return "\u001B[48;5;68m".concat(str, "\u001B[39;49m");
            }
            else {
                return "\u001B[44m".concat(str, "\u001B[39;49m");
            }
        }
        function brightWhite(str) {
            return "\u001B[97m".concat(str, "\u001B[39m");
        }
        return {
            bold: bold,
            blue: blue,
            brightWhite: brightWhite,
            blueBackground: blueBackground
        };
    }
    function getDisplayNameTextOfOption(option) {
        return "--".concat(option.name).concat(option.shortName ? ", -".concat(option.shortName) : "");
    }
    function generateOptionOutput(sys, option, rightAlignOfLeft, leftAlignOfRight) {
        var _a, _b;
        var text = [];
        var colors = createColors(sys);
        // name and description
        var name = getDisplayNameTextOfOption(option);
        // value type and possible value
        var valueCandidates = getValueCandidate(option);
        var defaultValueDescription = typeof option.defaultValueDescription === "object"
            ? ts.getDiagnosticText(option.defaultValueDescription)
            : formatDefaultValue(option.defaultValueDescription, option.type === "list" ? option.element.type : option.type);
        var terminalWidth = (_b = (_a = sys.getWidthOfTerminal) === null || _a === void 0 ? void 0 : _a.call(sys)) !== null && _b !== void 0 ? _b : 0;
        // Note: child_process might return `terminalWidth` as undefined.
        if (terminalWidth >= 80) {
            var description = "";
            if (option.description) {
                description = ts.getDiagnosticText(option.description);
            }
            text.push.apply(text, __spreadArray(__spreadArray([], getPrettyOutput(name, description, rightAlignOfLeft, leftAlignOfRight, terminalWidth, /*colorLeft*/ true), false), [sys.newLine], false));
            if (showAdditionalInfoOutput(valueCandidates, option)) {
                if (valueCandidates) {
                    text.push.apply(text, __spreadArray(__spreadArray([], getPrettyOutput(valueCandidates.valueType, valueCandidates.possibleValues, rightAlignOfLeft, leftAlignOfRight, terminalWidth, /*colorLeft*/ false), false), [sys.newLine], false));
                }
                if (defaultValueDescription) {
                    text.push.apply(text, __spreadArray(__spreadArray([], getPrettyOutput(ts.getDiagnosticText(ts.Diagnostics.default_Colon), defaultValueDescription, rightAlignOfLeft, leftAlignOfRight, terminalWidth, /*colorLeft*/ false), false), [sys.newLine], false));
                }
            }
            text.push(sys.newLine);
        }
        else {
            text.push(colors.blue(name), sys.newLine);
            if (option.description) {
                var description = ts.getDiagnosticText(option.description);
                text.push(description);
            }
            text.push(sys.newLine);
            if (showAdditionalInfoOutput(valueCandidates, option)) {
                if (valueCandidates) {
                    text.push("".concat(valueCandidates.valueType, " ").concat(valueCandidates.possibleValues));
                }
                if (defaultValueDescription) {
                    if (valueCandidates)
                        text.push(sys.newLine);
                    var diagType = ts.getDiagnosticText(ts.Diagnostics.default_Colon);
                    text.push("".concat(diagType, " ").concat(defaultValueDescription));
                }
                text.push(sys.newLine);
            }
            text.push(sys.newLine);
        }
        return text;
        function formatDefaultValue(defaultValue, type) {
            return defaultValue !== undefined && typeof type === "object"
                // e.g. ScriptTarget.ES2015 -> "es6/es2015"
                ? ts.arrayFrom(type.entries())
                    .filter(function (_a) {
                    var value = _a[1];
                    return value === defaultValue;
                })
                    .map(function (_a) {
                    var name = _a[0];
                    return name;
                })
                    .join("/")
                : String(defaultValue);
        }
        function showAdditionalInfoOutput(valueCandidates, option) {
            var ignoreValues = ["string"];
            var ignoredDescriptions = [undefined, "false", "n/a"];
            var defaultValueDescription = option.defaultValueDescription;
            if (option.category === ts.Diagnostics.Command_line_Options)
                return false;
            if (ts.contains(ignoreValues, valueCandidates === null || valueCandidates === void 0 ? void 0 : valueCandidates.possibleValues) && ts.contains(ignoredDescriptions, defaultValueDescription)) {
                return false;
            }
            return true;
        }
        function getPrettyOutput(left, right, rightAlignOfLeft, leftAlignOfRight, terminalWidth, colorLeft) {
            var res = [];
            var isFirstLine = true;
            var remainRight = right;
            var rightCharacterNumber = terminalWidth - leftAlignOfRight;
            while (remainRight.length > 0) {
                var curLeft = "";
                if (isFirstLine) {
                    curLeft = ts.padLeft(left, rightAlignOfLeft);
                    curLeft = ts.padRight(curLeft, leftAlignOfRight);
                    curLeft = colorLeft ? colors.blue(curLeft) : curLeft;
                }
                else {
                    curLeft = ts.padLeft("", leftAlignOfRight);
                }
                var curRight = remainRight.substr(0, rightCharacterNumber);
                remainRight = remainRight.slice(rightCharacterNumber);
                res.push("".concat(curLeft).concat(curRight));
                isFirstLine = false;
            }
            return res;
        }
        function getValueCandidate(option) {
            // option.type might be "string" | "number" | "boolean" | "object" | "list" | ESMap<string, number | string>
            // string -- any of: string
            // number -- any of: number
            // boolean -- any of: boolean
            // object -- null
            // list -- one or more: , content depends on `option.element.type`, the same as others
            // ESMap<string, number | string> -- any of: key1, key2, ....
            if (option.type === "object") {
                return undefined;
            }
            return {
                valueType: getValueType(option),
                possibleValues: getPossibleValues(option)
            };
            function getValueType(option) {
                switch (option.type) {
                    case "string":
                    case "number":
                    case "boolean":
                        return ts.getDiagnosticText(ts.Diagnostics.type_Colon);
                    case "list":
                        return ts.getDiagnosticText(ts.Diagnostics.one_or_more_Colon);
                    default:
                        return ts.getDiagnosticText(ts.Diagnostics.one_of_Colon);
                }
            }
            function getPossibleValues(option) {
                var possibleValues;
                switch (option.type) {
                    case "string":
                    case "number":
                    case "boolean":
                        possibleValues = option.type;
                        break;
                    case "list":
                        // TODO: check infinite loop
                        possibleValues = getPossibleValues(option.element);
                        break;
                    case "object":
                        possibleValues = "";
                        break;
                    default:
                        // ESMap<string, number | string>
                        // Group synonyms: es6/es2015
                        var inverted_1 = {};
                        option.type.forEach(function (value, name) {
                            (inverted_1[value] || (inverted_1[value] = [])).push(name);
                        });
                        return ts.getEntries(inverted_1)
                            .map(function (_a) {
                            var synonyms = _a[1];
                            return synonyms.join("/");
                        })
                            .join(", ");
                }
                return possibleValues;
            }
        }
    }
    function generateGroupOptionOutput(sys, optionsList) {
        var maxLength = 0;
        for (var _i = 0, optionsList_1 = optionsList; _i < optionsList_1.length; _i++) {
            var option = optionsList_1[_i];
            var curLength = getDisplayNameTextOfOption(option).length;
            maxLength = maxLength > curLength ? maxLength : curLength;
        }
        // left part should be right align, right part should be left align
        // assume 2 space between left margin and left part.
        var rightAlignOfLeftPart = maxLength + 2;
        // assume 2 space between left and right part
        var leftAlignOfRightPart = rightAlignOfLeftPart + 2;
        var lines = [];
        for (var _a = 0, optionsList_2 = optionsList; _a < optionsList_2.length; _a++) {
            var option = optionsList_2[_a];
            var tmp = generateOptionOutput(sys, option, rightAlignOfLeftPart, leftAlignOfRightPart);
            lines = __spreadArray(__spreadArray([], lines, true), tmp, true);
        }
        // make sure always a blank line in the end.
        if (lines[lines.length - 2] !== sys.newLine) {
            lines.push(sys.newLine);
        }
        return lines;
    }
    function generateSectionOptionsOutput(sys, sectionName, options, subCategory, beforeOptionsDescription, afterOptionsDescription) {
        var _a;
        var res = [];
        res.push(createColors(sys).bold(sectionName) + sys.newLine + sys.newLine);
        if (beforeOptionsDescription) {
            res.push(beforeOptionsDescription + sys.newLine + sys.newLine);
        }
        if (!subCategory) {
            res = __spreadArray(__spreadArray([], res, true), generateGroupOptionOutput(sys, options), true);
            if (afterOptionsDescription) {
                res.push(afterOptionsDescription + sys.newLine + sys.newLine);
            }
            return res;
        }
        var categoryMap = new ts.Map();
        for (var _i = 0, options_1 = options; _i < options_1.length; _i++) {
            var option = options_1[_i];
            if (!option.category) {
                continue;
            }
            var curCategory = ts.getDiagnosticText(option.category);
            var optionsOfCurCategory = (_a = categoryMap.get(curCategory)) !== null && _a !== void 0 ? _a : [];
            optionsOfCurCategory.push(option);
            categoryMap.set(curCategory, optionsOfCurCategory);
        }
        categoryMap.forEach(function (value, key) {
            res.push("### ".concat(key).concat(sys.newLine).concat(sys.newLine));
            res = __spreadArray(__spreadArray([], res, true), generateGroupOptionOutput(sys, value), true);
        });
        if (afterOptionsDescription) {
            res.push(afterOptionsDescription + sys.newLine + sys.newLine);
        }
        return res;
    }
    function printEasyHelp(sys, simpleOptions) {
        var colors = createColors(sys);
        var output = __spreadArray([], getHeader(sys, "".concat(ts.getDiagnosticText(ts.Diagnostics.tsc_Colon_The_TypeScript_Compiler), " - ").concat(ts.getDiagnosticText(ts.Diagnostics.Version_0, ts.version))), true);
        output.push(colors.bold(ts.getDiagnosticText(ts.Diagnostics.COMMON_COMMANDS)) + sys.newLine + sys.newLine);
        example("tsc", ts.Diagnostics.Compiles_the_current_project_tsconfig_json_in_the_working_directory);
        example("tsc app.ts util.ts", ts.Diagnostics.Ignoring_tsconfig_json_compiles_the_specified_files_with_default_compiler_options);
        example("tsc -b", ts.Diagnostics.Build_a_composite_project_in_the_working_directory);
        example("tsc --init", ts.Diagnostics.Creates_a_tsconfig_json_with_the_recommended_settings_in_the_working_directory);
        example("tsc -p ./path/to/tsconfig.json", ts.Diagnostics.Compiles_the_TypeScript_project_located_at_the_specified_path);
        example("tsc --help --all", ts.Diagnostics.An_expanded_version_of_this_information_showing_all_possible_compiler_options);
        example(["tsc --noEmit", "tsc --target esnext"], ts.Diagnostics.Compiles_the_current_project_with_additional_settings);
        var cliCommands = simpleOptions.filter(function (opt) { return opt.isCommandLineOnly || opt.category === ts.Diagnostics.Command_line_Options; });
        var configOpts = simpleOptions.filter(function (opt) { return !ts.contains(cliCommands, opt); });
        output = __spreadArray(__spreadArray(__spreadArray([], output, true), generateSectionOptionsOutput(sys, ts.getDiagnosticText(ts.Diagnostics.COMMAND_LINE_FLAGS), cliCommands, /*subCategory*/ false, /* beforeOptionsDescription */ undefined, /* afterOptionsDescription*/ undefined), true), generateSectionOptionsOutput(sys, ts.getDiagnosticText(ts.Diagnostics.COMMON_COMPILER_OPTIONS), configOpts, /*subCategory*/ false, /* beforeOptionsDescription */ undefined, ts.formatMessage(/*_dummy*/ undefined, ts.Diagnostics.You_can_learn_about_all_of_the_compiler_options_at_0, "https://aka.ms/tsc")), true);
        for (var _i = 0, output_1 = output; _i < output_1.length; _i++) {
            var line = output_1[_i];
            sys.write(line);
        }
        function example(ex, desc) {
            var examples = typeof ex === "string" ? [ex] : ex;
            for (var _i = 0, examples_1 = examples; _i < examples_1.length; _i++) {
                var example_1 = examples_1[_i];
                output.push("  " + colors.blue(example_1) + sys.newLine);
            }
            output.push("  " + ts.getDiagnosticText(desc) + sys.newLine + sys.newLine);
        }
    }
    function printAllHelp(sys, compilerOptions, buildOptions, watchOptions) {
        var output = __spreadArray([], getHeader(sys, "".concat(ts.getDiagnosticText(ts.Diagnostics.tsc_Colon_The_TypeScript_Compiler), " - ").concat(ts.getDiagnosticText(ts.Diagnostics.Version_0, ts.version))), true);
        output = __spreadArray(__spreadArray([], output, true), generateSectionOptionsOutput(sys, ts.getDiagnosticText(ts.Diagnostics.ALL_COMPILER_OPTIONS), compilerOptions, /*subCategory*/ true, /* beforeOptionsDescription */ undefined, ts.formatMessage(/*_dummy*/ undefined, ts.Diagnostics.You_can_learn_about_all_of_the_compiler_options_at_0, "https://aka.ms/tsc")), true);
        output = __spreadArray(__spreadArray([], output, true), generateSectionOptionsOutput(sys, ts.getDiagnosticText(ts.Diagnostics.WATCH_OPTIONS), watchOptions, /*subCategory*/ false, ts.getDiagnosticText(ts.Diagnostics.Including_watch_w_will_start_watching_the_current_project_for_the_file_changes_Once_set_you_can_config_watch_mode_with_Colon)), true);
        output = __spreadArray(__spreadArray([], output, true), generateSectionOptionsOutput(sys, ts.getDiagnosticText(ts.Diagnostics.BUILD_OPTIONS), buildOptions, /*subCategory*/ false, ts.formatMessage(/*_dummy*/ undefined, ts.Diagnostics.Using_build_b_will_make_tsc_behave_more_like_a_build_orchestrator_than_a_compiler_This_is_used_to_trigger_building_composite_projects_which_you_can_learn_more_about_at_0, "https://aka.ms/tsc-composite-builds")), true);
        for (var _i = 0, output_2 = output; _i < output_2.length; _i++) {
            var line = output_2[_i];
            sys.write(line);
        }
    }
    function printBuildHelp(sys, buildOptions) {
        var output = __spreadArray([], getHeader(sys, "".concat(ts.getDiagnosticText(ts.Diagnostics.tsc_Colon_The_TypeScript_Compiler), " - ").concat(ts.getDiagnosticText(ts.Diagnostics.Version_0, ts.version))), true);
        output = __spreadArray(__spreadArray([], output, true), generateSectionOptionsOutput(sys, ts.getDiagnosticText(ts.Diagnostics.BUILD_OPTIONS), buildOptions, /*subCategory*/ false, ts.formatMessage(/*_dummy*/ undefined, ts.Diagnostics.Using_build_b_will_make_tsc_behave_more_like_a_build_orchestrator_than_a_compiler_This_is_used_to_trigger_building_composite_projects_which_you_can_learn_more_about_at_0, "https://aka.ms/tsc-composite-builds")), true);
        for (var _i = 0, output_3 = output; _i < output_3.length; _i++) {
            var line = output_3[_i];
            sys.write(line);
        }
    }
    function getHeader(sys, message) {
        var _a, _b;
        var colors = createColors(sys);
        var header = [];
        var terminalWidth = (_b = (_a = sys.getWidthOfTerminal) === null || _a === void 0 ? void 0 : _a.call(sys)) !== null && _b !== void 0 ? _b : 0;
        var tsIconLength = 5;
        var tsIconFirstLine = colors.blueBackground(ts.padLeft("", tsIconLength));
        var tsIconSecondLine = colors.blueBackground(colors.brightWhite(ts.padLeft("TS ", tsIconLength)));
        // If we have enough space, print TS icon.
        if (terminalWidth >= message.length + tsIconLength) {
            // right align of the icon is 120 at most.
            var rightAlign = terminalWidth > 120 ? 120 : terminalWidth;
            var leftAlign = rightAlign - tsIconLength;
            header.push(ts.padRight(message, leftAlign) + tsIconFirstLine + sys.newLine);
            header.push(ts.padLeft("", leftAlign) + tsIconSecondLine + sys.newLine);
        }
        else {
            header.push(message + sys.newLine);
            header.push(sys.newLine);
        }
        return header;
    }
    function printHelp(sys, commandLine) {
        if (!commandLine.options.all) {
            printEasyHelp(sys, getOptionsForHelp(commandLine));
        }
        else {
            printAllHelp(sys, getOptionsForHelp(commandLine), ts.optionsForBuild, ts.optionsForWatch);
        }
    }
    function executeCommandLineWorker(sys, cb, commandLine) {
        var reportDiagnostic = ts.createDiagnosticReporter(sys);
        if (commandLine.options.build) {
            reportDiagnostic(ts.createCompilerDiagnostic(ts.Diagnostics.Option_build_must_be_the_first_command_line_argument));
            return sys.exit(ts.ExitStatus.DiagnosticsPresent_OutputsSkipped);
        }
        // Configuration file name (if any)
        var configFileName;
        if (commandLine.options.locale) {
            ts.validateLocaleAndSetLanguage(commandLine.options.locale, sys, commandLine.errors);
        }
        // If there are any errors due to command line parsing and/or
        // setting up localization, report them and quit.
        if (commandLine.errors.length > 0) {
            commandLine.errors.forEach(reportDiagnostic);
            return sys.exit(ts.ExitStatus.DiagnosticsPresent_OutputsSkipped);
        }
        if (commandLine.options.init) {
            writeConfigFile(sys, reportDiagnostic, commandLine.options, commandLine.fileNames);
            return sys.exit(ts.ExitStatus.Success);
        }
        if (commandLine.options.version) {
            printVersion(sys);
            return sys.exit(ts.ExitStatus.Success);
        }
        if (commandLine.options.help || commandLine.options.all) {
            printHelp(sys, commandLine);
            return sys.exit(ts.ExitStatus.Success);
        }
        if (commandLine.options.watch && commandLine.options.listFilesOnly) {
            reportDiagnostic(ts.createCompilerDiagnostic(ts.Diagnostics.Options_0_and_1_cannot_be_combined, "watch", "listFilesOnly"));
            return sys.exit(ts.ExitStatus.DiagnosticsPresent_OutputsSkipped);
        }
        if (commandLine.options.project) {
            if (commandLine.fileNames.length !== 0) {
                reportDiagnostic(ts.createCompilerDiagnostic(ts.Diagnostics.Option_project_cannot_be_mixed_with_source_files_on_a_command_line));
                return sys.exit(ts.ExitStatus.DiagnosticsPresent_OutputsSkipped);
            }
            var fileOrDirectory = ts.normalizePath(commandLine.options.project);
            if (!fileOrDirectory /* current directory "." */ || sys.directoryExists(fileOrDirectory)) {
                configFileName = ts.combinePaths(fileOrDirectory, "tsconfig.json");
                if (!sys.fileExists(configFileName)) {
                    reportDiagnostic(ts.createCompilerDiagnostic(ts.Diagnostics.Cannot_find_a_tsconfig_json_file_at_the_specified_directory_Colon_0, commandLine.options.project));
                    return sys.exit(ts.ExitStatus.DiagnosticsPresent_OutputsSkipped);
                }
            }
            else {
                configFileName = fileOrDirectory;
                if (!sys.fileExists(configFileName)) {
                    reportDiagnostic(ts.createCompilerDiagnostic(ts.Diagnostics.The_specified_path_does_not_exist_Colon_0, commandLine.options.project));
                    return sys.exit(ts.ExitStatus.DiagnosticsPresent_OutputsSkipped);
                }
            }
        }
        else if (commandLine.fileNames.length === 0) {
            var searchPath = ts.normalizePath(sys.getCurrentDirectory());
            configFileName = ts.findConfigFile(searchPath, function (fileName) { return sys.fileExists(fileName); });
        }
        if (commandLine.fileNames.length === 0 && !configFileName) {
            if (commandLine.options.showConfig) {
                reportDiagnostic(ts.createCompilerDiagnostic(ts.Diagnostics.Cannot_find_a_tsconfig_json_file_at_the_current_directory_Colon_0, ts.normalizePath(sys.getCurrentDirectory())));
            }
            else {
                printVersion(sys);
                printHelp(sys, commandLine);
            }
            return sys.exit(ts.ExitStatus.DiagnosticsPresent_OutputsSkipped);
        }
        var currentDirectory = sys.getCurrentDirectory();
        var commandLineOptions = ts.convertToOptionsWithAbsolutePaths(commandLine.options, function (fileName) { return ts.getNormalizedAbsolutePath(fileName, currentDirectory); });
        if (configFileName) {
            var extendedConfigCache = new ts.Map();
            var configParseResult = ts.parseConfigFileWithSystem(configFileName, commandLineOptions, extendedConfigCache, commandLine.watchOptions, sys, reportDiagnostic); // TODO: GH#18217
            if (commandLineOptions.showConfig) {
                if (configParseResult.errors.length !== 0) {
                    reportDiagnostic = updateReportDiagnostic(sys, reportDiagnostic, configParseResult.options);
                    configParseResult.errors.forEach(reportDiagnostic);
                    return sys.exit(ts.ExitStatus.DiagnosticsPresent_OutputsSkipped);
                }
                // eslint-disable-next-line no-null/no-null
                sys.write(JSON.stringify(ts.convertToTSConfig(configParseResult, configFileName, sys), null, 4) + sys.newLine);
                return sys.exit(ts.ExitStatus.Success);
            }
            reportDiagnostic = updateReportDiagnostic(sys, reportDiagnostic, configParseResult.options);
            if (ts.isWatchSet(configParseResult.options)) {
                if (reportWatchModeWithoutSysSupport(sys, reportDiagnostic))
                    return;
                return createWatchOfConfigFile(sys, cb, reportDiagnostic, configParseResult, commandLineOptions, commandLine.watchOptions, extendedConfigCache);
            }
            else if (ts.isIncrementalCompilation(configParseResult.options)) {
                performIncrementalCompilation(sys, cb, reportDiagnostic, configParseResult);
            }
            else {
                performCompilation(sys, cb, reportDiagnostic, configParseResult);
            }
        }
        else {
            if (commandLineOptions.showConfig) {
                // eslint-disable-next-line no-null/no-null
                sys.write(JSON.stringify(ts.convertToTSConfig(commandLine, ts.combinePaths(currentDirectory, "tsconfig.json"), sys), null, 4) + sys.newLine);
                return sys.exit(ts.ExitStatus.Success);
            }
            reportDiagnostic = updateReportDiagnostic(sys, reportDiagnostic, commandLineOptions);
            if (ts.isWatchSet(commandLineOptions)) {
                if (reportWatchModeWithoutSysSupport(sys, reportDiagnostic))
                    return;
                return createWatchOfFilesAndCompilerOptions(sys, cb, reportDiagnostic, commandLine.fileNames, commandLineOptions, commandLine.watchOptions);
            }
            else if (ts.isIncrementalCompilation(commandLineOptions)) {
                performIncrementalCompilation(sys, cb, reportDiagnostic, __assign(__assign({}, commandLine), { options: commandLineOptions }));
            }
            else {
                performCompilation(sys, cb, reportDiagnostic, __assign(__assign({}, commandLine), { options: commandLineOptions }));
            }
        }
    }
    function isBuild(commandLineArgs) {
        if (commandLineArgs.length > 0 && commandLineArgs[0].charCodeAt(0) === 45 /* CharacterCodes.minus */) {
            var firstOption = commandLineArgs[0].slice(commandLineArgs[0].charCodeAt(1) === 45 /* CharacterCodes.minus */ ? 2 : 1).toLowerCase();
            return firstOption === "build" || firstOption === "b";
        }
        return false;
    }
    ts.isBuild = isBuild;
    function executeCommandLine(system, cb, commandLineArgs) {
        if (isBuild(commandLineArgs)) {
            var _a = ts.parseBuildCommand(commandLineArgs.slice(1)), buildOptions_1 = _a.buildOptions, watchOptions_1 = _a.watchOptions, projects_1 = _a.projects, errors_1 = _a.errors;
            if (buildOptions_1.generateCpuProfile && system.enableCPUProfiler) {
                system.enableCPUProfiler(buildOptions_1.generateCpuProfile, function () { return performBuild(system, cb, buildOptions_1, watchOptions_1, projects_1, errors_1); });
            }
            else {
                return performBuild(system, cb, buildOptions_1, watchOptions_1, projects_1, errors_1);
            }
        }
        var commandLine = ts.parseCommandLine(commandLineArgs, function (path) { return system.readFile(path); });
        if (commandLine.options.generateCpuProfile && system.enableCPUProfiler) {
            system.enableCPUProfiler(commandLine.options.generateCpuProfile, function () { return executeCommandLineWorker(system, cb, commandLine); });
        }
        else {
            return executeCommandLineWorker(system, cb, commandLine);
        }
    }
    ts.executeCommandLine = executeCommandLine;
    function reportWatchModeWithoutSysSupport(sys, reportDiagnostic) {
        if (!sys.watchFile || !sys.watchDirectory) {
            reportDiagnostic(ts.createCompilerDiagnostic(ts.Diagnostics.The_current_host_does_not_support_the_0_option, "--watch"));
            sys.exit(ts.ExitStatus.DiagnosticsPresent_OutputsSkipped);
            return true;
        }
        return false;
    }
    function performBuild(sys, cb, buildOptions, watchOptions, projects, errors) {
        // Update to pretty if host supports it
        var reportDiagnostic = updateReportDiagnostic(sys, ts.createDiagnosticReporter(sys), buildOptions);
        if (buildOptions.locale) {
            ts.validateLocaleAndSetLanguage(buildOptions.locale, sys, errors);
        }
        if (errors.length > 0) {
            errors.forEach(reportDiagnostic);
            return sys.exit(ts.ExitStatus.DiagnosticsPresent_OutputsSkipped);
        }
        if (buildOptions.help) {
            printVersion(sys);
            printBuildHelp(sys, ts.buildOpts);
            return sys.exit(ts.ExitStatus.Success);
        }
        if (projects.length === 0) {
            printVersion(sys);
            printBuildHelp(sys, ts.buildOpts);
            return sys.exit(ts.ExitStatus.Success);
        }
        if (!sys.getModifiedTime || !sys.setModifiedTime || (buildOptions.clean && !sys.deleteFile)) {
            reportDiagnostic(ts.createCompilerDiagnostic(ts.Diagnostics.The_current_host_does_not_support_the_0_option, "--build"));
            return sys.exit(ts.ExitStatus.DiagnosticsPresent_OutputsSkipped);
        }
        if (buildOptions.watch) {
            if (reportWatchModeWithoutSysSupport(sys, reportDiagnostic))
                return;
            var buildHost_1 = ts.createSolutionBuilderWithWatchHost(sys, 
            /*createProgram*/ undefined, reportDiagnostic, ts.createBuilderStatusReporter(sys, shouldBePretty(sys, buildOptions)), createWatchStatusReporter(sys, buildOptions));
            var solutionPerformance_1 = enableSolutionPerformance(sys, buildOptions);
            updateSolutionBuilderHost(sys, cb, buildHost_1, solutionPerformance_1);
            var onWatchStatusChange_1 = buildHost_1.onWatchStatusChange;
            buildHost_1.onWatchStatusChange = function (d, newLine, options, errorCount) {
                onWatchStatusChange_1 === null || onWatchStatusChange_1 === void 0 ? void 0 : onWatchStatusChange_1(d, newLine, options, errorCount);
                if (d.code === ts.Diagnostics.Found_0_errors_Watching_for_file_changes.code ||
                    d.code === ts.Diagnostics.Found_1_error_Watching_for_file_changes.code) {
                    reportSolutionBuilderTimes(builder_1, solutionPerformance_1);
                }
            };
            var builder_1 = ts.createSolutionBuilderWithWatch(buildHost_1, projects, buildOptions, watchOptions);
            builder_1.build();
            return builder_1;
        }
        var buildHost = ts.createSolutionBuilderHost(sys, 
        /*createProgram*/ undefined, reportDiagnostic, ts.createBuilderStatusReporter(sys, shouldBePretty(sys, buildOptions)), createReportErrorSummary(sys, buildOptions));
        var solutionPerformance = enableSolutionPerformance(sys, buildOptions);
        updateSolutionBuilderHost(sys, cb, buildHost, solutionPerformance);
        var builder = ts.createSolutionBuilder(buildHost, projects, buildOptions);
        var exitStatus = buildOptions.clean ? builder.clean() : builder.build();
        reportSolutionBuilderTimes(builder, solutionPerformance);
        ts.dumpTracingLegend(); // Will no-op if there hasn't been any tracing
        return sys.exit(exitStatus);
    }
    function createReportErrorSummary(sys, options) {
        return shouldBePretty(sys, options) ?
            function (errorCount, filesInError) { return sys.write(ts.getErrorSummaryText(errorCount, filesInError, sys.newLine, sys)); } :
            undefined;
    }
    function performCompilation(sys, cb, reportDiagnostic, config) {
        var fileNames = config.fileNames, options = config.options, projectReferences = config.projectReferences;
        var host = ts.createCompilerHostWorker(options, /*setParentPos*/ undefined, sys);
        var currentDirectory = host.getCurrentDirectory();
        var getCanonicalFileName = ts.createGetCanonicalFileName(host.useCaseSensitiveFileNames());
        ts.changeCompilerHostLikeToUseCache(host, function (fileName) { return ts.toPath(fileName, currentDirectory, getCanonicalFileName); });
        enableStatisticsAndTracing(sys, options, /*isBuildMode*/ false);
        var programOptions = {
            rootNames: fileNames,
            options: options,
            projectReferences: projectReferences,
            host: host,
            configFileParsingDiagnostics: ts.getConfigFileParsingDiagnostics(config)
        };
        var program = ts.createProgram(programOptions);
        var exitStatus = ts.emitFilesAndReportErrorsAndGetExitStatus(program, reportDiagnostic, function (s) { return sys.write(s + sys.newLine); }, createReportErrorSummary(sys, options));
        reportStatistics(sys, program, /*builder*/ undefined);
        cb(program);
        return sys.exit(exitStatus);
    }
    function performIncrementalCompilation(sys, cb, reportDiagnostic, config) {
        var options = config.options, fileNames = config.fileNames, projectReferences = config.projectReferences;
        enableStatisticsAndTracing(sys, options, /*isBuildMode*/ false);
        var host = ts.createIncrementalCompilerHost(options, sys);
        var exitStatus = ts.performIncrementalCompilation({
            host: host,
            system: sys,
            rootNames: fileNames,
            options: options,
            configFileParsingDiagnostics: ts.getConfigFileParsingDiagnostics(config),
            projectReferences: projectReferences,
            reportDiagnostic: reportDiagnostic,
            reportErrorSummary: createReportErrorSummary(sys, options),
            afterProgramEmitAndDiagnostics: function (builderProgram) {
                reportStatistics(sys, builderProgram.getProgram(), /*builder*/ undefined);
                cb(builderProgram);
            }
        });
        return sys.exit(exitStatus);
    }
    function updateSolutionBuilderHost(sys, cb, buildHost, solutionPerformance) {
        updateCreateProgram(sys, buildHost, /*isBuildMode*/ true);
        buildHost.afterProgramEmitAndDiagnostics = function (program) {
            reportStatistics(sys, program.getProgram(), solutionPerformance);
            cb(program);
        };
        buildHost.afterEmitBundle = cb;
    }
    function updateCreateProgram(sys, host, isBuildMode) {
        var compileUsingBuilder = host.createProgram;
        host.createProgram = function (rootNames, options, host, oldProgram, configFileParsingDiagnostics, projectReferences) {
            ts.Debug.assert(rootNames !== undefined || (options === undefined && !!oldProgram));
            if (options !== undefined) {
                enableStatisticsAndTracing(sys, options, isBuildMode);
            }
            return compileUsingBuilder(rootNames, options, host, oldProgram, configFileParsingDiagnostics, projectReferences);
        };
    }
    function updateWatchCompilationHost(sys, cb, watchCompilerHost) {
        updateCreateProgram(sys, watchCompilerHost, /*isBuildMode*/ false);
        var emitFilesUsingBuilder = watchCompilerHost.afterProgramCreate; // TODO: GH#18217
        watchCompilerHost.afterProgramCreate = function (builderProgram) {
            emitFilesUsingBuilder(builderProgram);
            reportStatistics(sys, builderProgram.getProgram(), /*builder*/ undefined);
            cb(builderProgram);
        };
    }
    function createWatchStatusReporter(sys, options) {
        return ts.createWatchStatusReporter(sys, shouldBePretty(sys, options));
    }
    function createWatchOfConfigFile(system, cb, reportDiagnostic, configParseResult, optionsToExtend, watchOptionsToExtend, extendedConfigCache) {
        var watchCompilerHost = ts.createWatchCompilerHostOfConfigFile({
            configFileName: configParseResult.options.configFilePath,
            optionsToExtend: optionsToExtend,
            watchOptionsToExtend: watchOptionsToExtend,
            system: system,
            reportDiagnostic: reportDiagnostic,
            reportWatchStatus: createWatchStatusReporter(system, configParseResult.options)
        });
        updateWatchCompilationHost(system, cb, watchCompilerHost);
        watchCompilerHost.configFileParsingResult = configParseResult;
        watchCompilerHost.extendedConfigCache = extendedConfigCache;
        return ts.createWatchProgram(watchCompilerHost);
    }
    function createWatchOfFilesAndCompilerOptions(system, cb, reportDiagnostic, rootFiles, options, watchOptions) {
        var watchCompilerHost = ts.createWatchCompilerHostOfFilesAndCompilerOptions({
            rootFiles: rootFiles,
            options: options,
            watchOptions: watchOptions,
            system: system,
            reportDiagnostic: reportDiagnostic,
            reportWatchStatus: createWatchStatusReporter(system, options)
        });
        updateWatchCompilationHost(system, cb, watchCompilerHost);
        return ts.createWatchProgram(watchCompilerHost);
    }
    function enableSolutionPerformance(system, options) {
        if (system === ts.sys && options.extendedDiagnostics) {
            ts.performance.enable();
            return createSolutionPerfomrance();
        }
    }
    function createSolutionPerfomrance() {
        var statistics;
        return {
            addAggregateStatistic: addAggregateStatistic,
            forEachAggregateStatistics: forEachAggreateStatistics,
            clear: clear,
        };
        function addAggregateStatistic(s) {
            var existing = statistics === null || statistics === void 0 ? void 0 : statistics.get(s.name);
            if (existing) {
                if (existing.type === StatisticType.memory)
                    existing.value = Math.max(existing.value, s.value);
                else
                    existing.value += s.value;
            }
            else {
                (statistics !== null && statistics !== void 0 ? statistics : (statistics = new ts.Map())).set(s.name, s);
            }
        }
        function forEachAggreateStatistics(cb) {
            statistics === null || statistics === void 0 ? void 0 : statistics.forEach(cb);
        }
        function clear() {
            statistics = undefined;
        }
    }
    function reportSolutionBuilderTimes(builder, solutionPerformance) {
        if (!solutionPerformance)
            return;
        if (!ts.performance.isEnabled()) {
            ts.sys.write(ts.Diagnostics.Performance_timings_for_diagnostics_or_extendedDiagnostics_are_not_available_in_this_session_A_native_implementation_of_the_Web_Performance_API_could_not_be_found.message + "\n");
            return;
        }
        var statistics = [];
        statistics.push({ name: "Projects in scope", value: ts.getBuildOrderFromAnyBuildOrder(builder.getBuildOrder()).length, type: StatisticType.count });
        reportSolutionBuilderCountStatistic("SolutionBuilder::Projects built");
        reportSolutionBuilderCountStatistic("SolutionBuilder::Timestamps only updates");
        reportSolutionBuilderCountStatistic("SolutionBuilder::Bundles updated");
        solutionPerformance.forEachAggregateStatistics(function (s) {
            s.name = "Aggregate ".concat(s.name);
            statistics.push(s);
        });
        ts.performance.forEachMeasure(function (name, duration) {
            if (isSolutionMarkOrMeasure(name))
                statistics.push({ name: "".concat(getNameFromSolutionBuilderMarkOrMeasure(name), " time"), value: duration, type: StatisticType.time });
        });
        ts.performance.disable();
        ts.performance.enable();
        reportAllStatistics(ts.sys, statistics);
        function reportSolutionBuilderCountStatistic(name) {
            var value = ts.performance.getCount(name);
            if (value) {
                statistics.push({ name: getNameFromSolutionBuilderMarkOrMeasure(name), value: value, type: StatisticType.count });
            }
        }
        function getNameFromSolutionBuilderMarkOrMeasure(name) {
            return name.replace("SolutionBuilder::", "");
        }
    }
    function canReportDiagnostics(system, compilerOptions) {
        return system === ts.sys && (compilerOptions.diagnostics || compilerOptions.extendedDiagnostics);
    }
    function canTrace(system, compilerOptions) {
        return system === ts.sys && compilerOptions.generateTrace;
    }
    function enableStatisticsAndTracing(system, compilerOptions, isBuildMode) {
        if (canReportDiagnostics(system, compilerOptions)) {
            ts.performance.enable(system);
        }
        if (canTrace(system, compilerOptions)) {
            ts.startTracing(isBuildMode ? "build" : "project", compilerOptions.generateTrace, compilerOptions.configFilePath);
        }
    }
    function isSolutionMarkOrMeasure(name) {
        return ts.startsWith(name, "SolutionBuilder::");
    }
    function reportStatistics(sys, program, solutionPerformance) {
        var compilerOptions = program.getCompilerOptions();
        if (canTrace(sys, compilerOptions)) {
            ts.tracing === null || ts.tracing === void 0 ? void 0 : ts.tracing.stopTracing();
        }
        var statistics;
        if (canReportDiagnostics(sys, compilerOptions)) {
            statistics = [];
            var memoryUsed = sys.getMemoryUsage ? sys.getMemoryUsage() : -1;
            reportCountStatistic("Files", program.getSourceFiles().length);
            var lineCounts = countLines(program);
            if (compilerOptions.extendedDiagnostics) {
                for (var _i = 0, _a = ts.arrayFrom(lineCounts.keys()); _i < _a.length; _i++) {
                    var key = _a[_i];
                    reportCountStatistic("Lines of " + key, lineCounts.get(key));
                }
            }
            else {
                reportCountStatistic("Lines", ts.reduceLeftIterator(lineCounts.values(), function (sum, count) { return sum + count; }, 0));
            }
            reportCountStatistic("Identifiers", program.getIdentifierCount());
            reportCountStatistic("Symbols", program.getSymbolCount());
            reportCountStatistic("Types", program.getTypeCount());
            reportCountStatistic("Instantiations", program.getInstantiationCount());
            if (memoryUsed >= 0) {
                reportStatisticalValue({ name: "Memory used", value: memoryUsed, type: StatisticType.memory }, /*aggregate*/ true);
            }
            var isPerformanceEnabled = ts.performance.isEnabled();
            var programTime = isPerformanceEnabled ? ts.performance.getDuration("Program") : 0;
            var bindTime = isPerformanceEnabled ? ts.performance.getDuration("Bind") : 0;
            var checkTime = isPerformanceEnabled ? ts.performance.getDuration("Check") : 0;
            var emitTime = isPerformanceEnabled ? ts.performance.getDuration("Emit") : 0;
            if (compilerOptions.extendedDiagnostics) {
                var caches = program.getRelationCacheSizes();
                reportCountStatistic("Assignability cache size", caches.assignable);
                reportCountStatistic("Identity cache size", caches.identity);
                reportCountStatistic("Subtype cache size", caches.subtype);
                reportCountStatistic("Strict subtype cache size", caches.strictSubtype);
                if (isPerformanceEnabled) {
                    ts.performance.forEachMeasure(function (name, duration) {
                        if (!isSolutionMarkOrMeasure(name))
                            reportTimeStatistic("".concat(name, " time"), duration, /*aggregate*/ true);
                    });
                }
            }
            else if (isPerformanceEnabled) {
                // Individual component times.
                // Note: To match the behavior of previous versions of the compiler, the reported parse time includes
                // I/O read time and processing time for triple-slash references and module imports, and the reported
                // emit time includes I/O write time. We preserve this behavior so we can accurately compare times.
                reportTimeStatistic("I/O read", ts.performance.getDuration("I/O Read"), /*aggregate*/ true);
                reportTimeStatistic("I/O write", ts.performance.getDuration("I/O Write"), /*aggregate*/ true);
                reportTimeStatistic("Parse time", programTime, /*aggregate*/ true);
                reportTimeStatistic("Bind time", bindTime, /*aggregate*/ true);
                reportTimeStatistic("Check time", checkTime, /*aggregate*/ true);
                reportTimeStatistic("Emit time", emitTime, /*aggregate*/ true);
            }
            if (isPerformanceEnabled) {
                reportTimeStatistic("Total time", programTime + bindTime + checkTime + emitTime, /*aggregate*/ false);
            }
            reportAllStatistics(sys, statistics);
            if (!isPerformanceEnabled) {
                sys.write(ts.Diagnostics.Performance_timings_for_diagnostics_or_extendedDiagnostics_are_not_available_in_this_session_A_native_implementation_of_the_Web_Performance_API_could_not_be_found.message + "\n");
            }
            else {
                if (solutionPerformance) {
                    // Clear selected marks and measures
                    ts.performance.forEachMeasure(function (name) {
                        if (!isSolutionMarkOrMeasure(name))
                            ts.performance.clearMeasures(name);
                    });
                    ts.performance.forEachMark(function (name) {
                        if (!isSolutionMarkOrMeasure(name))
                            ts.performance.clearMarks(name);
                    });
                }
                else {
                    ts.performance.disable();
                }
            }
        }
        function reportStatisticalValue(s, aggregate) {
            statistics.push(s);
            if (aggregate)
                solutionPerformance === null || solutionPerformance === void 0 ? void 0 : solutionPerformance.addAggregateStatistic(s);
        }
        function reportCountStatistic(name, count) {
            reportStatisticalValue({ name: name, value: count, type: StatisticType.count }, /*aggregate*/ true);
        }
        function reportTimeStatistic(name, time, aggregate) {
            reportStatisticalValue({ name: name, value: time, type: StatisticType.time }, aggregate);
        }
    }
    function reportAllStatistics(sys, statistics) {
        var nameSize = 0;
        var valueSize = 0;
        for (var _i = 0, statistics_1 = statistics; _i < statistics_1.length; _i++) {
            var s = statistics_1[_i];
            if (s.name.length > nameSize) {
                nameSize = s.name.length;
            }
            var value = statisticValue(s);
            if (value.length > valueSize) {
                valueSize = value.length;
            }
        }
        for (var _a = 0, statistics_2 = statistics; _a < statistics_2.length; _a++) {
            var s = statistics_2[_a];
            sys.write(ts.padRight(s.name + ":", nameSize + 2) + ts.padLeft(statisticValue(s).toString(), valueSize) + sys.newLine);
        }
    }
    function statisticValue(s) {
        switch (s.type) {
            case StatisticType.count:
                return "" + s.value;
            case StatisticType.time:
                return (s.value / 1000).toFixed(2) + "s";
            case StatisticType.memory:
                return Math.round(s.value / 1000) + "K";
            default:
                ts.Debug.assertNever(s.type);
        }
    }
    function writeConfigFile(sys, reportDiagnostic, options, fileNames) {
        var currentDirectory = sys.getCurrentDirectory();
        var file = ts.normalizePath(ts.combinePaths(currentDirectory, "tsconfig.json"));
        if (sys.fileExists(file)) {
            reportDiagnostic(ts.createCompilerDiagnostic(ts.Diagnostics.A_tsconfig_json_file_is_already_defined_at_Colon_0, file));
        }
        else {
            sys.writeFile(file, ts.generateTSConfig(options, fileNames, sys.newLine));
            var output = __spreadArray([sys.newLine], getHeader(sys, "Created a new tsconfig.json with:"), true);
            output.push(ts.getCompilerOptionsDiffValue(options, sys.newLine) + sys.newLine + sys.newLine);
            output.push("You can learn more at https://aka.ms/tsconfig" + sys.newLine);
            for (var _i = 0, output_4 = output; _i < output_4.length; _i++) {
                var line = output_4[_i];
                sys.write(line);
            }
        }
        return;
    }
})(ts || (ts = {}));
//# sourceMappingURL=executeCommandLine.js.map