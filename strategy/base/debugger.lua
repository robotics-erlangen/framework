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

if not debug then
	return nil
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
	io.stderr:write("debug> ")
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
	local info = debug.getinfo(3)
	for pattern, isActive in pairs(lineTable) do
		if info.source:match(pattern) then
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
	-- clear hook
	debug.sethook()
	debugLoop(true)
end

local function getStackDepth(inDebugCallback)
	local i = 1
	while debug.getinfo(i) ~= nil do
		i = i + 1
	end
	return i - (inDebugCallback and 1 or 0)
end

local function addBreakpoint(file, line)
	local lineTable = breakpoints[line]
	if not lineTable then
		breakpoints[line] = {}
		lineTable = breakpoints[line]
	end
	lineTable[file] = true
end

local function clearBreakpoints()
	breakpoints = {}
end


--- handler functions ---
-- a handler function must return true to continue to programm's execution

local function nopHandler(outfile, args, inDebugCallback)
end

local function helpHandler(outfile, args, inDebugCallback)
	outfile:write("Command list\n")
	local commands = {}
	for k,v in pairs(helpList) do
		if v ~= nil then
			table.insert(commands, k)
		end
	end
	table.sort(commands)
	for _, cmd in ipairs(commands) do
		local desc = helpList[cmd]
		outfile:write(string.format("    %-20s - %s\n", cmd, desc))
	end
	outfile:write("\n")
end

local function backtraceHandler(outfile, args, inDebugCallback)
	local str = debug.traceback()
	str = string.gsub(str, "&nbsp;", " ")
	str = string.gsub(str, "&gt;", ">")
	str = string.gsub(str, "<br>", "\n")
	str = string.gsub(str, "</font>", "")
	str = string.gsub(str, "<font[^>]+>", "")

	local skipFrames = 2 + (inDebugCallback and 1 or 0)
	for line in string.gmatch(str, "[^\n]+") do
		-- skip backtrace frames belonging to the debugger
		local isFrame = string.sub(line, 1, 4) == "   >"

		if isFrame and skipFrames > 0 then
			skipFrames = skipFrames - 1
		else
			outfile:write(line.."\n")
		end
	end
end

local function getLocals(inDebugCallback)
	-- should only be called from handler
	local baseFrame = 4 + (inDebugCallback and 1 or 0)

	local locals = {}
	local i = 1
	while true do
		local varname, value = debug.getlocal(baseFrame, i)
		if varname == nil then
			break
		end
		i = i + 1
		if varname ~= "(*temporary)" then
			locals[varname] = value
		end
	end
	return locals
end

local function getClosureParameters(inDebugCallback)
	-- should only be called from handler
	local baseFrame = 4 + (inDebugCallback and 1 or 0)

	local parameters = {}
	local info = debug.getinfo(baseFrame)
	for i = 1, info.nups do
		local varname, value = debug.getupvalue(info.func, i)
		parameters[varname] = value
	end
	return parameters
end

local function printVar(outfile, name, data)
	outfile:write(string.format("    %-20s = (%s)\"%s\"\n", name, type(data), tostring(data)))
end

local function localInfoHandler(outfile, args, inDebugCallback)
	outfile:write("Locals\n")
	for varname, value in pairs(getLocals(inDebugCallback)) do
		printVar(outfile, varname, value)
	end

	local closureParameters = getClosureParameters(inDebugCallback)
	local isFirstClosureParameter = true
	for varname, value in pairs(closureParameters) do
		if isFirstClosureParameter then
			outfile:write("Closure parameters\n")
			isFirstClosureParameter = false
		end
		printVar(outfile, varname, value)
	end
end

local function ppHelper(outfile, name, valueType, value, indent)
	local indent = ("    "):rep(indent or 0)
	outfile:write(string.format("%s%-20s = (%s)\"%s\"\n", indent, name, valueType, tostring(value)))
end

local function prettyPrint(outfile, name, value, visited, indent)
	visited = visited or {}
	indent = indent or 0
	local origType = type(value)
	if type(value) == "table" then
		if visited[value] then
			prettyPrint(outfile, name, tostring(value), visited, indent)
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
			local hasValues = false
			for k, v in pairs(value) do
				hasValues = true
				break
			end
			if not hasValues then
				tableValue = "empty table"
			end
		end
		ppHelper(outfile, name, origType, tableValue, indent)

		for k, v in pairs(value) do
			prettyPrint(outfile, k, v, visited, indent + 1)
		end
		return
	elseif type(value) == "userdata" or type(value) == "cdata" then
		value = tostring(value)
	end
	ppHelper(outfile, name, origType, value, indent)
end


local function evalHandler(outfile, args, inDebugCallback)
	local closureParameters = getClosureParameters(inDebugCallback)
	local locals = getLocals(inDebugCallback)

	local varnames = {}
	local values = {}
	for varname, value in pairs(closureParameters) do
		table.insert(varnames, varname)
		table.insert(values, value)
	end
	for varname, value in pairs(locals) do
		table.insert(varnames, varname)
		table.insert(values, value)
	end

	local baseFrame = 3 + (inDebugCallback and 1 or 0)

	local parameters = {}
	local info = debug.getinfo(baseFrame)

	local functionTemplate = "return function (%s) return %s end"
	local helperFunction = string.format(functionTemplate, table.concat(varnames, ", "), table.concat(args, " "))
	local func, errormsg = loadstring(helperFunction)
	if not func then
		outfile:write("Invalid expression\n")
		outfile:write(tostring(errormsg).."\n")
		return
	end

	-- provide function environment from current function
	func = debug.setfenv(func, debug.getfenv(info.func))

	-- call wrapper function returned by loadstring
	local result = func()(unpack(values))
	prettyPrint(outfile, "expression", result)
end

local function breakpointHandler(outfile, args, inDebugCallback)
	if #args ~= 2 then
		outfile:write("Error - Expected file pattern and line number")
		return
	end

	local pattern = tostring(args[1])
	local line = tonumber(args[2])
	addBreakpoint(pattern, line)
end

local function clearBreakpointsHandler(outfile, args, inDebugCallback)
	clearBreakpoints()
end

local function listBreakpointsHandler(outfile, args, inDebugCallback)
	outfile:write("Breakpoints\n")
	for line, lineTable in pairs(breakpoints) do
		for pattern, isActive in pairs(lineTable) do
			outfile:write(string.format("    %s:%d\n", pattern, line))
		end
	end
end

local function continueHandler(outfile, args, inDebugCallback)
	hookSpecial = nil
	return true
end

local function stepHandler(outfile, args, inDebugCallback)
	hookSpecial = function() return true end
	return true
end

local function nextHandler(outfile, args, inDebugCallback)
	local initialDepth = getStackDepth(inDebugCallback)
	hookSpecial = function()
		return getStackDepth() <= initialDepth
	end
	return true
end

local function stepOutHandler(outfile, args, inDebugCallback)
	local initialDepth = getStackDepth(inDebugCallback) - 1
	hookSpecial = function()
		return getStackDepth() <= initialDepth
	end
	return true
end

local function quitHandler(outfile, args, inDebugCallback)
	hookSpecial = nil
	clearBreakpoints()
	-- try to exit
	os.exit(0)
	return true
end


registerCommand({""}, nopHandler, nil)
registerCommand({"help"}, helpHandler, "Print command list")
-- information
registerCommand({"backtrace", "bt"}, backtraceHandler, "Print a backtrace of the current stack")
registerCommand({"locals", "l"}, localInfoHandler, "Print local variables")
registerCommand({"eval"}, evalHandler, "Evaluate the given expression an print the result")
-- breakpoints
registerCommand({"breakpoint add", "bp"}, breakpointHandler, "Add breakpoints")
registerCommand({"breakpoint clear"}, clearBreakpointsHandler, "Remove all breakpoints")
registerCommand({"breakpoint list"}, listBreakpointsHandler, "List breakpoints")
-- execution control
registerCommand({"continue", "c"}, continueHandler, "Continue execution")
registerCommand({"step", "s"}, stepHandler, "Single step code")
registerCommand({"next", "n"}, nextHandler, "Step over code")
registerCommand({"stepout"}, stepOutHandler, "Step out of function code")
registerCommand({"quit", "q"}, quitHandler, "Quit debugger")

debugLoop = function (inDebugCallback)
	-- disable hooks
	hookCtr = -1
	-- ensure that our hook is installed
	debug.sethook(mainHook, "l")

	local outfile = io.stderr
	local baseFrame = 2 + (inDebugCallback and 1 or 0)
	local info = debug.getinfo(baseFrame)
	if info ~= nil then
		outfile:write(string.format("At %s:%d in %s %s\n", info.short_src, info.currentline, info.namewhat, info.name))
	end

	while true do
		local input = getUserInput()
		local handler, args = parseCommand(input)
		if handler == nil then
			local outfile = io.stderr
			outfile:write("Unknown command. Run \"help\" for help\n")
		else
			local continueExecution = handler(outfile, args, inDebugCallback)
			if continueExecution then
				break
			end
		end
	end
	-- skip first line breakpoint (exit from this function!)
	hookCtr = 1
end

debugger.debug = debugLoop
debug.debugger = debugger

return debugger
