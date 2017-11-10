--[[
--- Simple command line debugger.
module "debugger"
]]--

--[[***********************************************************************
*   Copyright 2016 Michael Eischer                                        *
*   Robotics Erlangen e.V.                                                *
*   http://www.robotics-erlangen.de/                                      *
*   info@robotics-erlangen.de                                             *
*                                                                         *
*   This program is free software: you can redistribute it and/or modify  *
*   it under the terms of the GNU General Public License as published by  *
*   the Free Software Foundation, either version 3 of the License, or     *
*   any later version.                                                    *
*                                                                         *
*   This program is distributed in the hope that it will be useful,       *
*   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
*   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
*   GNU General Public License for more details.                          *
*                                                                         *
*   You should have received a copy of the GNU General Public License     *
*   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
*************************************************************************]]

local debugger = {}
local Class = require "../base/class"

if not debug then
	debugger.debug = function ()
		error("Debugger is only available in debug mode!")
	end
	debugger.dumpLocals = function()
	end
	debugger.dumpStack = function()
	end
	debugger.getStackDepth = function()
		return 0
	end
	return debugger
end



--- io helper ---

local function printerr(str)
	io.stderr:write(str)
end

local function printerrln(str)
	printerr(str)
	printerr("\n")
end



--- commmand handling ---

local commands = {}
local helpList = {}

local function registerCommand(cmds, handler, help)
	for _, cmd in ipairs(cmds) do
		assert(commands[cmd] == nil, "cmd is already used")
		commands[cmd] = handler
	end
	local merged = table.concat(cmds, ", ")
	helpList[merged] = help
end
debugger.registerCommand = registerCommand

local function getUserInput()
	printerr("debug> ")
	local input = io.stdin:read("*l")
	return input
end

local function parseCommand(input)
	local chunks = {}
	for chunk in string.gmatch(input, "[^ \t]+") do
		table.insert(chunks, chunk)
	end

	local cmd = nil
	local args = nil

	if #chunks == 0 then
		-- nop
		cmd = ""
		args = {}
	end

	for i = 1, #chunks do
		-- join commands
		if cmd ~= nil then
			cmd = cmd .. " " .. chunks[i]
		else
			cmd = chunks[i]
		end
		if commands[cmd] then
			-- copy arguments when command is found
			args = {}
			for j = i+1, #chunks do
				table.insert(args, chunks[j])
			end
			break
		end
	end

	if args == nil then
		-- command not found
		return nil, nil
	end
	return commands[cmd], args
end



--- hook helper ---

local debugLoop = nil
local hookCtr = 0
local hookSpecial = nil
local breakpoints = {}

local function hookCheck(line)
	if hookCtr ~= 0 then
		if hookCtr > 0 then
			hookCtr = hookCtr - 1
		end
		return -1
	end

	local lineTable = breakpoints[line]
	if lineTable == nil then
		return 0
	end
	local info = debug.getinfo(3, "S")
	for pattern, isActive in pairs(lineTable) do
		if isActive and info.source:match(pattern) then
			return 1
		end
	end
	return 0
end

local function mainHook(evt, line)
	local result = hookCheck(line)
	if result < 0 then
		return
	elseif result == 0 then
		if not hookSpecial or not hookSpecial(evt, line) then
			return
		end
	end
	debugLoop()
end

local function setupHook()
	debug.sethook(mainHook, "l")
	-- disable jit as the hook is not called from jit compiled code
	jit.off()
	jit.flush()
end

local function addBreakpoint(file, line)
	local lineTable = breakpoints[line]
	if not lineTable then
		breakpoints[line] = {}
		lineTable = breakpoints[line]
	end
	lineTable[file] = true
end

local function removeBreakpoint(file, line)
	local lineTable = breakpoints[line]
	if not lineTable or not lineTable[file] then
		return false
	end
	lineTable[file] = nil
	-- remove lineTable if it is empty
	local isEmpty = (next(lineTable) == nil)
	if isEmpty then
		breakpoints[line] = nil
	end
	return true
end

local function clearBreakpoints()
	breakpoints = {}
end

function debugLoop()
	local autoCommands = { "__init__" }
	while true do
		local input
		if #autoCommands == 0 then
			input = getUserInput()
		else
			input = autoCommands[1]
			table.remove(autoCommands, 1)
		end
		local handler, args = parseCommand(input)
		if handler == nil then
			printerrln("Unknown command. Run \"help\" for help")
		else
			local success, continueExecution = pcall(handler, args)
			if not success then
				printerrln("Internal debugger error")
				printerrln(continueExecution)
			elseif continueExecution then
				autoCommands = { "__exit__" }
			end
		end
		-- exit after calling __exit__ handler
		if input == "__exit__" then
			break
		end
	end
end



--- helper functions ---

-- used to stop the simulator while execution is suspended
local function setScaling(scaling)
	amun.sendCommand({
		speed = scaling
	})
end

local function getBaseStackLevel()
	local this = debug.getinfo(1, "S").source
	local i = 2
	local speculative = 0
	while true do
		local info = debug.getinfo(i, "Sn")
		-- try to skip pcall
		if info and info.source == "=[C]" and info.name == "pcall" and info.namewhat == "global" then
			speculative = 1
		elseif info == nil or info.source ~= this then
			-- subtract this function
			return i - 1 - speculative
		else
			speculative = 0
		end
		i = i + 1
	end
end

local function getStackDepth()
	local i = 1
	while debug.getinfo(i, "") ~= nil do
		i = i + 1
	end
	return i - 1 - getBaseStackLevel()
end

local function getLocals(offset)
	local baseFrame = getBaseStackLevel() + offset

	local locals = {}
	if debug.getinfo(baseFrame, "") == nil then
		return locals
	end
	local i = 1
	while true do
		local varname, value = debug.getlocal(baseFrame, i)
		if varname == nil then
			break
		end
		i = i + 1
		-- ignore variables like "(*temporary)" and "(for index)"
		if varname:sub(1, 1) ~= "(" then
			-- wrap value to allow storing nil
			locals[varname] = {value}
		end
	end
	-- TODO: varargs, using negative indices
	return locals
end

local function getClosureParameters(offset)
	local baseFrame = getBaseStackLevel() + offset

	local parameters = {}
	local info = debug.getinfo(baseFrame, "uf")
	if info == nil then
		return parameters
	end
	for i = 1, info.nups do
		local varname, value = debug.getupvalue(info.func, i)
		-- wrap value to allow storing nil
		parameters[varname] = {value}
	end
	return parameters
end

local function evalFunction(code)
	local varnames = {}
	local values = {}
	for varname, value in pairs(getClosureParameters()) do
		table.insert(varnames, varname)
		-- support storing nil
		values[#varnames] = value[1]
	end
	for varname, value in pairs(getLocals()) do
		table.insert(varnames, varname)
		values[#varnames] = value[1]
	end

	local baseFrame = getBaseStackLevel()
	local info = debug.getinfo(baseFrame, "f")
	if not info then
		return false, "No function on stack"
	end

	local functionTemplate = "return function (%s) return (function() return %s end) end"
	local helperFunction = string.format(functionTemplate, table.concat(varnames, ", "), code)
	local func, errormsg = loadstring(helperFunction)
	if not func then
		return false, "Invalid expression\n" .. tostring(errormsg)
	end

	-- provide function environment from current function
	func = debug.setfenv(func, debug.getfenv(info.func))

	-- call wrapper function returned by loadstring, supports nil parameters
	func = func()(unpack(values, 1, #varnames))

	return true, func
end

local function ppHelper(name, valueType, value, indent)
	indent = ("    "):rep(indent or 0)
	printerrln(string.format("%s%-20s = (%s)\"%s\"", indent, name, valueType, tostring(value)))
end

local function prettyPrint(name, value, visited, indent)
	visited = visited or {}
	indent = indent or 0
	local origType = type(value)
	if type(value) == "table" then
		if visited[value] then
			ppHelper(name, origType, tostring(value), indent)
			return
		end
		visited[value] = true

		-- try to be as informative as possible
		local tableValue = value
		local class = Class.toClass(value, true)
		if rawget(getmetatable(value) or {}, "__tostring") then
			tableValue = tostring(value)
		elseif class then
			tableValue = Class.name(class)
		else
			local hasValues = next(value) ~= nil
			if not hasValues then
				tableValue = "empty table"
			end
		end
		ppHelper(name, origType, tableValue, indent)

		for k, v in pairs(value) do
			prettyPrint(k, v, visited, indent + 1)
		end
		return
	elseif type(value) == "userdata" or type(value) == "cdata" then
		value = tostring(value)
	end
	ppHelper(name, origType, value, indent)
end

local function shortPath(path)
	local basePath = "@" .. amun.strategyPath .. "/"
	if path:sub(1, #basePath) == basePath then
		return path:sub(#basePath+1)
	else
		return path
	end
end



--- handler functions ---
-- a handler function must return true to continue to programm's execution

local function initHandler(_args)
	local baseFrame = getBaseStackLevel()
	local info = debug.getinfo(baseFrame, "Snl")
	if info ~= nil then
		printerrln(string.format("At %s:%d in %s %s", shortPath(info.source), info.currentline, info.namewhat, info.name))
	end
	-- stop the simulator while execution is suspended
	setScaling(0)
end

local function exitHandler(_args)
	-- handle continuation commands
	setScaling(1)
	return true
end

local function nopHandler(_args)
end

local function helpHandler(_args)
	printerrln("Command list")
	local commandList = {}
	for k,v in pairs(helpList) do
		if v ~= nil then
			table.insert(commandList, k)
		end
	end
	table.sort(commandList)
	for _, cmd in ipairs(commandList) do
		local desc = helpList[cmd]
		printerrln(string.format("    %-20s - %s", cmd, desc))
	end
	printerrln("")
end

local function backtraceHandler(_args)
	local str = debug.traceback()
	str = string.gsub(str, "&nbsp;", " ")
	str = string.gsub(str, "&gt;", ">")
	str = string.gsub(str, "<br>", "\n")
	str = string.gsub(str, "</font>", "")
	str = string.gsub(str, "<font[^>]+>", "")

	local skipFrames = getBaseStackLevel() - 1
	for line in string.gmatch(str, "[^\n]+") do
		-- skip backtrace frames belonging to the debugger
		local isFrame = string.sub(line, 1, 4) == "   >"

		if isFrame and skipFrames > 0 then
			skipFrames = skipFrames - 1
		else
			printerrln(line)
		end
	end
end

local lastLocals = {}
local function printLocalVar(name, data)
	local datastr = string.format("(%s)\"%s\"", type(data), tostring(data))
	local marker = " "
	if datastr ~= lastLocals[name] then
		marker = "*"
	end
	lastLocals[name] = datastr
	return string.format("    %-20s%s = %s", name, marker, datastr)
end

local function localInfoHandler(_args)
	printerrln("Locals")
	local localLines = {}
	for varname, value in pairs(getLocals()) do
		table.insert(localLines, printLocalVar(varname, value[1]))
	end
	table.sort(localLines)
	for _, line in ipairs(localLines) do
		printerrln(line)
	end

	local closureParameters = getClosureParameters()
	local isFirstClosureParameter = true
	for varname, value in pairs(closureParameters) do
		if isFirstClosureParameter then
			printerrln("Closure parameters")
			isFirstClosureParameter = false
		end
		printerrln(printLocalVar(varname, value[1]))
	end
end


local function evalHandler(args)
	local success, result = evalFunction(table.concat(args, " "))
	if not success then
		printerrln(result)
		return
	end

	success, result = pcall(result)
	if not success then
		printerrln("Failed to evaluate function")
		printerrln(result)
		return
	end
	prettyPrint("expression", result)
end

-- TODO: conditional breakpoints
local function breakpointHandler(args)
	if #args == 1 then
		-- try to get the current file name if only a line is passed
		local baseFrame = getBaseStackLevel()
		local info = debug.getinfo(baseFrame, "S")
		if info and info.source then
			args = { shortPath(info.source), args[1] }
		end
	end

	if #args ~= 2 then
		printerrln("Error - Expected file pattern and line number")
		return
	end

	local pattern = tostring(args[1])
	local line = tonumber(args[2])

	if not pattern or not line then
		printerrln("Error - Expected file pattern and line number")
		return
	end

	addBreakpoint(pattern, line)
end

local function removeBreakpointHandler(args)
	local pattern = tostring(args[1])
	local line = tonumber(args[2])
	removeBreakpoint(pattern, line)
end

local function clearBreakpointsHandler(_args)
	clearBreakpoints()
end

local function listBreakpointsHandler(_args)
	local list = {}
	for line, lineTable in pairs(breakpoints) do
		for pattern, isActive in pairs(lineTable) do
			local state = (not isActive) and " (disabled)" or ""
			table.insert(list, string.format("    %s:%4d%s", pattern, line, state))
		end
	end
	table.sort(list)
	printerrln("Breakpoints")
	printerrln(table.concat(list, "\n"))
end

local function continueHandler(_args)
	hookSpecial = nil
	return true
end

local function stepHandler(_args)
	hookSpecial = function() return true end
	return true
end

local function nextHandler(_args)
	local initialDepth = getStackDepth()
	hookSpecial = function()
		return getStackDepth() <= initialDepth
	end
	return true
end

local function stepOutHandler(_args)
	local initialDepth = getStackDepth() - 1
	hookSpecial = function()
		return getStackDepth() <= initialDepth
	end
	return true
end

local function quitHandler(_args)
	hookSpecial = nil
	clearBreakpoints()
	-- don't puzzle the user with strategy no longer running
	-- after killing the strategy if it was suspended
	setScaling(1)
	-- try to exit
	os.exit(0)
	return true
end


-- special hooks
registerCommand({"__init__"}, initHandler, nil)
registerCommand({"__exit__"}, exitHandler, nil)
-- helper commands
registerCommand({""}, nopHandler, nil)
registerCommand({"help"}, helpHandler, "Print command list")
-- information
registerCommand({"backtrace", "bt"}, backtraceHandler, "Print a backtrace of the current stack")
registerCommand({"locals", "l"}, localInfoHandler, "Print local variables")
registerCommand({"eval", "e"}, evalHandler, "Evaluate the given expression an print the result")
-- breakpoints
registerCommand({"breakpoint add", "bp"}, breakpointHandler, "Add breakpoints")
registerCommand({"breakpoint remove"}, removeBreakpointHandler, "Remove breakpoint")
registerCommand({"breakpoint clear"}, clearBreakpointsHandler, "Remove all breakpoints")
registerCommand({"breakpoint list"}, listBreakpointsHandler, "List breakpoints")
-- execution control
registerCommand({"continue", "c"}, continueHandler, "Continue execution")
registerCommand({"step", "s"}, stepHandler, "Single step code")
registerCommand({"next", "n"}, nextHandler, "Step over code")
registerCommand({"stepout"}, stepOutHandler, "Step out of function code")
registerCommand({"quit", "q"}, quitHandler, "Quit debugger")


function debugger.debug()
	-- disable hooks
	hookCtr = -1
	-- ensure that our hook is installed
	setupHook()
	debugLoop()
	-- skip first line breakpoint (exit from this function!)
	hookCtr = 1
end

local baseDebug

function debugger._loadBaseDebug()
	baseDebug = require "../base/debug"
end

local function formatValue(value)
	local v = value[1]
	if v == nil then
		v = "*NIL*"
	end
	return v
end

local function getMergedLocals(offset)
	local data = {}
	for varname, value in pairs(getLocals(offset)) do
		data[varname] = formatValue(value)
	end

	local closureParameters = getClosureParameters(offset)
	for varname, value in pairs(closureParameters) do
		varname = "(Closure) "..varname
		data[varname] = formatValue(value)
	end

	return data
end

function debugger.dumpLocals(offset)
	local locals = getMergedLocals(offset)

	local keys = {}
	for varname, _ in pairs(locals) do
		table.insert(keys, varname)
	end
	table.sort(keys)

	baseDebug.set(nil, "")
	for _, varname in ipairs(keys) do
		baseDebug.set(varname, locals[varname])
	end
end


function debugger.dumpStack(debugKey)
	debugKey = debugKey or "Stacktrace"
	baseDebug.pushtop(debugKey)
	for i = 1, debugger.getStackDepth() do
		baseDebug.push(tostring(i))
		debugger.dumpLocals(i)
		baseDebug.pop()
	end
end

debugger.getStackDepth = getStackDepth

-- luacheck: globals debug
-- register debugger
debug.debugger = debugger

return debugger
