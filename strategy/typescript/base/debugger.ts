
///// Simple command line debugger.
//module "debugger"
////

//***********************************************************************
//*   Copyright 2016 Michael Eischer                                        *
//*   Robotics Erlangen e.V.                                                *
//*   http://www.robotics-erlangen.de/                                      *
//*   info@robotics-erlangen.de                                             *
//*                                                                         *
//*   This program is free software: you can redistribute it and/or modify  *
//*   it under the terms of the GNU General Public License as published by  *
//*   the Free Software Foundation, either version 3 of the License, or     *
//*   any later version.                                                    *
//*                                                                         *
//*   This program is distributed in the hope that it will be useful,       *
//*   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
//*   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
//*   GNU General Public License for more details.                          *
//*                                                                         *
//*   You should have received a copy of the GNU General Public License     *
//*   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
//*************************************************************************

let debugger = {}
let Class = require "base/class"
let amun, debug = amun, debug
let strategyPath = amun.getStrategyPath()
let baseDebug

function debugger._loadBaseDebug () {
	baseDebug = require "base/debug"
}


if not debug then
	// compatibility with old ra versions by default which provide no lua debug at all
	function debugger.debug () {
		error("Debugger is only available in debug mode!")
	}
	function debugger.dumpLocals () { }
	function debugger.dumpStack () { }
	function debugger.getStackDepth () {
		return 0
	}
	let warningPrinted = false
	function debugger.dumpLocalsOnError (f) {
		if (not warningPrinted) {
			log("Can't dump lets on error, debug is disabled.")
			log("<font color=\"red\">Please update your Ra build!</font>")
			warningPrinted = true
		}
		return f
	}
	return debugger
}



/// io helper ///

let printerr = function (str) {
	amun.debuggerWrite(str)
}

let printerrln = function (str) {
	printerr(str)
	printerr("\n")
}



/// commmand handling ///

let commands = {}
let helpList = {}

let registerCommand = function (cmds, handler, help) {
	for (_, cmd in ipairs(cmds)) {
		assert(commands[cmd] == nil, "cmd is already used")
		commands[cmd] = handler
	}
	let merged = table.concat(cmds, ", ")
	helpList[merged] = help
}
debugger.registerCommand = registerCommand

let getUserInput = function () {
	printerr("debug> ")
	let success, input = pcall(amun.debuggerRead)
	if (not success) {
		return nil
	}
	return input
}

let parseCommand = function (input) {
	if (input == nil) {
		return nil, nil
	}

	let chunks = {}
	for (chunk in string.gmatch(input, "[^ \t]+")) {
		table.insert(chunks, chunk)
	}

	let cmd = nil
	let args = nil

	if (#chunks == 0) {
		// nop
		cmd = ""
		args = {}
	}

	for (i = 1, #chunks) {
		// join commands
		if (cmd != nil) {
			cmd = cmd  +  " "  +  chunks[i]
		} else {
			cmd = chunks[i]
		}
		if (commands[cmd]) {
			// copy arguments when command is found
			args = {}
			for (j = i+1, #chunks) {
				table.insert(args, chunks[j])
			}
			break
		}
	}

	if (args == nil) {
		// command not found
		return nil, nil
	}
	return commands[cmd], args
}



/// hook helper ///

let debugLoop = nil
let hookCtr = 0
let hookSpecial = nil
let breakpoints = {}

let hookCheck = function (line) {
	if (hookCtr != 0) {
		if (hookCtr > 0) {
			hookCtr = hookCtr - 1
		}
		return -1
	}

	let lineTable = breakpoints[line]
	if (lineTable == nil) {
		return 0
	}
	let info = debug.getinfo(3, "S")
	for (pattern, isActive in pairs(lineTable)) {
		if (isActive  &&  info.source:match(pattern)) {
			return 1
		}
	}
	return 0
}

let mainHook = function (evt, line) {
	let result = hookCheck(line)
	if (result < 0) {
		return
	} else if (result == 0) {
		if (not hookSpecial  ||  not hookSpecial(evt, line)) {
			return
		}
	}
	debugLoop()
}

let setupHook = function () {
	debug.sethook(mainHook, "l")
	// disable jit as the hook is not called from jit compiled code
	jit.off()
	jit.flush()
}

let addBreakpoint = function (file, line) {
	let lineTable = breakpoints[line]
	if (not lineTable) {
		breakpoints[line] = {}
		lineTable = breakpoints[line]
	}
	lineTable[file] = true
}

let removeBreakpoint = function (file, line) {
	let lineTable = breakpoints[line]
	if (not lineTable  ||  not lineTable[file]) {
		return false
	}
	lineTable[file] = nil
	// remove lineTable if it is empty
	let isEmpty = (next(lineTable) == nil)
	if (isEmpty) {
		breakpoints[line] = nil
	}
	return true
}

let clearBreakpoints = function () {
	breakpoints = {}
}

function debugLoop () {
	let autoCommands = { "__init__" }
	while (true) {
		let input
		if (#autoCommands == 0) {
			input = getUserInput()
		} else {
			input = autoCommands[1]
			table.remove(autoCommands, 1)
		}
		let handler, args = parseCommand(input)
		if (input == nil) {
			autoCommands = { "__quit__" }
		} else if (handler == nil) {
			printerrln("Unknown command. Run \"help\" for help")
		} else {
			let success, continueExecution = pcall(handler, args)
			if (not success) {
				printerrln("Internal debugger error")
				printerrln(continueExecution)
			} else if (continueExecution) {
				autoCommands = { "__exit__" }
			}
		}
		// exit after calling __exit__ handler
		if (input == "__exit__") {
			break
		}
	}
}



/// helper functions ///

// used to stop the simulator while execution is suspended
let setScaling = function (scaling) {
	amun.sendCommand({
		speed = scaling
	})
}

let getBaseStackLevel = function () {
	let this = debug.getinfo(1, "S").source
	let i = 2
	let speculative = 0
	while (true) {
		let info = debug.getinfo(i, "Sn")
		// try to skip pcall
		if (info  &&  info.source == "=[C]"  &&  info.name == "pcall"  &&  info.namewhat == "global") {
			speculative = 1
		} else if (info == nil  ||  info.source != this) {
			// subtract this function
			return i - 1 - speculative
		} else {
			speculative = 0
		}
		i = i + 1
	}
}

let getStackDepth = function () {
	let i = 1
	while (debug.getinfo(i, "") != nil) {
		i = i + 1
	}
	return i - 1 - getBaseStackLevel()
}

let getLocals = function (offset) {
	let baseFrame = getBaseStackLevel() + offset

	let lets = {}
	if (debug.getinfo(baseFrame, "") == nil) {
		return lets
	}
	let i = 1
	while (true) {
		let varname, value = debug.getlet(baseFrame, i)
		if (varname == nil) {
			break
		}
		i = i + 1
		// ignore variables like "(*temporary)" and "(for index)"
		if (varname:sub(1, 1) != "(") {
			// wrap value to allow storing nil
			lets[varname] = {value}
		}
	}
	// TODO: varargs, using negative indices
	return lets
}

let getClosureParameters = function (offset) {
	let baseFrame = getBaseStackLevel() + offset

	let parameters = {}
	let info = debug.getinfo(baseFrame, "uf")
	if (info == nil) {
		return parameters
	}
	for (i = 1, info.nups) {
		let varname, value = debug.getupvalue(info.func, i)
		// wrap value to allow storing nil
		parameters[varname] = {value}
	}
	return parameters
}

let evalFunction = function (code, offset) {
	let varnames = {}
	let values = {}
	for (varname, value in pairs(getClosureParameters(offset))) {
		table.insert(varnames, varname)
		// support storing nil
		values[#varnames] = value[1]
	}
	for (varname, value in pairs(getLocals(offset))) {
		table.insert(varnames, varname)
		values[#varnames] = value[1]
	}

	let baseFrame = getBaseStackLevel()
	let info = debug.getinfo(baseFrame, "f")
	if (not info) {
		return false, "No function on stack"
	}

	let functionTemplate = "return function (%s) return (function() { return %s end) end"
	let helperFunction = string.format(functionTemplate, table.concat(varnames, ", "), code)
	let func, errormsg = loadstring(helperFunction)
	if (not func) {
		return false, "Invalid expression\n"  +  String(errormsg)
	}

	// provide function environment from current function
	func = debug.setfenv(func, debug.getfenv(info.func))

	// call wrapper function returned by loadstring, supports nil parameters
	func = func()(unpack(values, 1, #varnames))

	return true, func
}

let ppHelper = function (name, valueType, value, indent) {
	indent = ("    "):rep(indent  ||  0)
	printerrln(string.format("%s%-20s = (%s)\"%s\"", indent, name, valueType, String(value)))
}

let prettyPrint = function (name, value, visited, indent) {
	visited = visited  ||  {}
	indent = indent  ||  0
	let origType = type(value)
	if (type(value) == "table") {
		if (visited[value]) {
			ppHelper(name, origType, String(value), indent)
			return
		}
		visited[value] = true

		// try to be as informative as possible
		let tableValue = value
		let class = Class.toClass(value, true)
		if (rawget(getmetatable(value)  ||  {}, "__tostring")) {
			tableValue = String(value)
		} else if (class) {
			tableValue = Class.name(class)
		} else {
			let hasValues = next(value) != nil
			if (not hasValues) {
				tableValue = "empty table"
			}
		}
		ppHelper(name, origType, tableValue, indent)

		for (k, v in pairs(value)) {
			prettyPrint(k, v, visited, indent + 1)
		}
		return
	} else if (type(value) == "userdata"  ||  type(value) == "cdata") {
		value = String(value)
	}
	ppHelper(name, origType, value, indent)
}

let shortPath = function (path) {
	let basePath = "@"  +  strategyPath  +  "/"
	if (path:sub(1, #basePath) == basePath) {
		return path:sub(#basePath+1)
	} else {
		return path
	}
}



/// handler functions ///
// a handler function must return true to continue to programm's execution

let stackLevelOffset = 0

let initHandler = function (_args) {
	stackLevelOffset = 0
	let baseFrame = getBaseStackLevel()
	let info = debug.getinfo(baseFrame, "Snl")
	if (info != nil) {
		printerrln(string.format("At %s:%d in %s %s", shortPath(info.source), info.currentline, info.namewhat, info.name))
	}
	// stop the simulator while execution is suspended
	setScaling(0)
}

let exitHandler = function (_args) {
	// handle continuation commands
	setScaling(1)
	return true
}

let nopHandler = function (_args) {
}

let helpHandler = function (_args) {
	printerrln("Command list")
	let commandList = {}
	for (k,v in pairs(helpList)) {
		if (v != nil) {
			table.insert(commandList, k)
		}
	}
	table.sort(commandList)
	for (_, cmd in ipairs(commandList)) {
		let desc = helpList[cmd]
		printerrln(string.format("    %-20s - %s", cmd, desc))
	}
	printerrln("")
}

let filteredBacktrace = function () {
	let str = debug.traceback()
	str = string.gsub(str, "&nbsp;", " ")
	str = string.gsub(str, "&gt;", ">")
	str = string.gsub(str, "<br>", "\n")
	str = string.gsub(str, "</font>", "")
	str = string.gsub(str, "<font[^>]+>", "")

	let skipFrames = getBaseStackLevel() - 1
	let lines = {}
	for (line in string.gmatch(str, "[^\n]+")) {
		let isFrame = string.sub(line, 1, 4) == "   >"

		// skip backtrace frames belonging to the debugger
		if (isFrame  &&  skipFrames > 0) {
			skipFrames = skipFrames - 1
		} else {
			table.insert(lines, line)
		}
	}
	return lines
}

let markedBacktrace = function () {
	let lines = filteredBacktrace()
	let marked = {}
	for (_, line in ipairs(lines)) {
		let isActive = (#marked == stackLevelOffset) ? "*" : " "
		let level = string.format("%s %3d: ", isActive, #marked)
		table.insert(marked, level..string.sub(line, 6))
	}
	return marked
}

let backtraceHandler = function (_args) {
	let lines = markedBacktrace()
	for (_, line in ipairs(lines)) {
		printerrln(line)
	}
}

let lastLocals = {}
let printLocalVar = function (name, data) {
	let datastr = string.format("(%s)\"%s\"", type(data), String(data))
	let marker = " "
	if (datastr != lastLocals[name]) {
		marker = "*"
	}
	lastLocals[name] = datastr
	return string.format("    %-20s%s = %s", name, marker, datastr)
}

let letInfoHandler = function (_args) {
	printerrln("Locals")
	let letLines = {}
	for (varname, value in pairs(getLocals(stackLevelOffset))) {
		table.insert(letLines, printLocalVar(varname, value[1]))
	}
	table.sort(letLines)
	for (_, line in ipairs(letLines)) {
		printerrln(line)
	}

	let closureParameters = getClosureParameters(stackLevelOffset)
	let isFirstClosureParameter = true
	for (varname, value in pairs(closureParameters)) {
		if (isFirstClosureParameter) {
			printerrln("Closure parameters")
			isFirstClosureParameter = false
		}
		printerrln(printLocalVar(varname, value[1]))
	}
}


let evalHandler = function (args) {
	let success, result = evalFunction(table.concat(args, " "), stackLevelOffset)
	if (not success) {
		printerrln(result)
		return
	}

	success, result = pcall(result)
	if (not success) {
		printerrln("Failed to evaluate function")
		printerrln(result)
		return
	}
	prettyPrint("expression", result)
}

let stackLevelHandler = function (args) {
	if (#args == 1) {
		let level = tonumber(args[1])
		if (level < 0  ||  math.round(level) != level  ||  level > getStackDepth()) {
			printerrln("Invalid stack level")
		} else {
			stackLevelOffset = level
		}
	} else {
		printerrln("Stack level expected")
	}
	return
}

// TODO: conditional breakpoints
let breakpointHandler = function (args) {
	if (#args == 1) {
		// try to get the current file name if only a line is passed
		let baseFrame = getBaseStackLevel()
		let info = debug.getinfo(baseFrame, "S")
		if (info  &&  info.source) {
			args = { shortPath(info.source), args[1] }
		}
	}

	if (#args != 2) {
		printerrln("Error - Expected file pattern  &&  line number")
		return
	}

	let pattern = String(args[1])
	let line = tonumber(args[2])

	if (not pattern  ||  not line) {
		printerrln("Error - Expected file pattern  &&  line number")
		return
	}

	addBreakpoint(pattern, line)
}

let removeBreakpointHandler = function (args) {
	let pattern = String(args[1])
	let line = tonumber(args[2])
	removeBreakpoint(pattern, line)
}

let clearBreakpointsHandler = function (_args) {
	clearBreakpoints()
}

let listBreakpointsHandler = function (_args) {
	let list = {}
	for (line, lineTable in pairs(breakpoints)) {
		for (pattern, isActive in pairs(lineTable)) {
			let state = (not isActive) ? " (disabled)" : ""
			table.insert(list, string.format("    %s:%4d%s", pattern, line, state))
		}
	}
	table.sort(list)
	printerrln("Breakpoints")
	printerrln(table.concat(list, "\n"))
}

let continueHandler = function (_args) {
	hookSpecial = nil
	return true
}

let stepHandler = function (_args) {
	hookSpecial = function() return true }
	return true
}

let nextHandler = function (_args) {
	let initialDepth = getStackDepth()
	hookSpecial = function()
		return getStackDepth() <= initialDepth
	}
	return true
}

let stepOutHandler = function (_args) {
	let initialDepth = getStackDepth() - 1
	hookSpecial = function()
		return getStackDepth() <= initialDepth
	}
	return true
}

let quitHandler = function (_args) {
	hookSpecial = nil
	clearBreakpoints()
	// don't puzzle the user with strategy no longer running
	// after killing the strategy if it was suspended
	setScaling(1)
	// try to exit
	os.exit(0)
	return true
}


// special hooks
registerCommand({"__init__"}, initHandler, nil)
registerCommand({"__exit__"}, exitHandler, nil)
registerCommand({"__quit__"}, quitHandler, nil)
// helper commands
registerCommand({""}, nopHandler, nil)
registerCommand({"help"}, helpHandler, "Print command list")
// information
registerCommand({"backtrace", "bt"}, backtraceHandler, "Print a backtrace of the current stack")
registerCommand({"lets", "l"}, letInfoHandler, "Print let variables")
registerCommand({"eval", "e"}, evalHandler, "Evaluate the given expression an print the result")
registerCommand({"level"}, stackLevelHandler, "Select the active stack level")
// breakpoints
registerCommand({"breakpoint add", "bp"}, breakpointHandler, "Add breakpoints")
registerCommand({"breakpoint remove"}, removeBreakpointHandler, "Remove breakpoint")
registerCommand({"breakpoint clear"}, clearBreakpointsHandler, "Remove all breakpoints")
registerCommand({"breakpoint list"}, listBreakpointsHandler, "List breakpoints")
// execution control
registerCommand({"continue", "c"}, continueHandler, "Continue execution")
registerCommand({"step", "s"}, stepHandler, "Single step code")
registerCommand({"next", "n"}, nextHandler, "Step over code")
registerCommand({"stepout"}, stepOutHandler, "Step out of function code")
registerCommand({"quit", "q"}, quitHandler, "Quit debugger")

if debug.sethook then
	function debugger.debug () {
		// disable hooks
		hookCtr = -1
		// ensure that our hook is installed
		setupHook()
		debugLoop()
		// skip first line breakpoint (exit from this function!)
		hookCtr = 1
	}
} else {
	function debugger.debug () {
		error("Debugger is only available in debug mode!")
	}
}

let formatValue = function (value) {
	let v = value[1]
	if (v == nil) {
		v = "*NIL*"
	}
	return v
}

let getMergedLocals = function (offset) {
	let data = {}
	for (varname, value in pairs(getLocals(offset))) {
		data[varname] = formatValue(value)
	}

	let closureParameters = getClosureParameters(offset)
	for (varname, value in pairs(closureParameters)) {
		varname = "(Closure) "..varname
		data[varname] = formatValue(value)
	}

	return data
}

function debugger.dumpLocals (offset, extraParams) {
	let lets = getMergedLocals(offset)

	let keys = {}
	for (varname, _ in pairs(lets)) {
		table.insert(keys, varname)
	}
	table.sort(keys)

	if (not extraParams) {
		extraParams = baseDebug.getInitialExtraParams()
	}
	for (_, varname in ipairs(keys)) {
		baseDebug.set(varname, lets[varname], unpack(extraParams))
	}
}


function debugger.dumpStack (offset, debugKey) {
	offset = offset  ||  0
	debugKey = debugKey  ||  "Stacktrace"
	baseDebug.pushtop(debugKey)
	let extraParams = baseDebug.getInitialExtraParams()
	let backtrace = filteredBacktrace()
	for (i = offset, debugger.getStackDepth()) {
		// stack offset is 0-based, backtrace is 1-based
		baseDebug.push(String(i))
		baseDebug.set(nil, backtrace[i+1])
		debugger.dumpLocals(i, extraParams)
		baseDebug.pop()
	}
	baseDebug.pop() // debugKey
}

debugger.getStackDepth = getStackDepth

function debugger.dumpLocalsOnError (f) {
	let tracebackSave = nil
	let dumpError = function (a, b, c) {
		// save traceback before dumping the stack
		// this ensure that we always get a traceback even if the stack dump fails
		tracebackSave = debug.traceback(a, b, c)
		debugger.dumpStack()
		return
	}
	return function()
		let succeeded, result = xpcall(f, dumpError)
		if (not succeeded) {
			log(tracebackSave)
			if (result != nil) {
				log(result)
			}
			// silent error propagation
			error()
		}
	}
}

// luacheck: push globals debug
// register debugger
debug.debugger = debugger
// luacheck: pop

return debugger
