local Entrypoints = require "../base/entrypoints"
local tests = require "test/unit/tests"
local telescope = require "test/telescope/telescope"

local testContexts = {}
local initialized = false

local function initializeTest(name)
	if not pcall(require, 'debug') then
		error("Debugging not enabled!")
	end

	-- local timeout = 1000000000 -- number of instructions before hook is called
	-- debug.sethook(function() error("Timeout (adjustable in tests/unit/init.lua)") end, "", timeout)

	-- just load to ensure autoreloading is enabled
	pcall(require, name)
	telescope.load_contexts(name, testContexts)
	initialized = true
end



local function ancestor_count(i, contexts)
	local count = 0
	while i ~= 0 and contexts[i].parent ~= 0 do
		i = contexts[i].parent
		count = count + 1
	end
	return count
end

local function colored_report(contexts, results)
	local buffer               = {}
	local leading_space        = "&nbsp;&nbsp;"

	local function space(level)
		return leading_space:rep(level)
	end

	local function format_status(result)
		local runTime = math.round(result.timing*1000000)/1000
		local formatRunTime = "(" .. tostring(runTime) .. "ms)"
		-- TODO: error messages and tracebacks
		if result.status_code == telescope.status_codes.pass then
			return " <font color=\"darkgreen\">success ".. formatRunTime .."</font>"
		elseif result.status_code == telescope.status_codes.fail then
			return " <font color=\"red\">fail ".. formatRunTime .."</font>"
		elseif result.status_code == telescope.status_codes.unassertive then
			return " <font color=\"orange\">unassertive ".. formatRunTime .."</font>"
		else
			return " [" .. result.status_label .. "]" .. formatRunTime
		end
	end

	local function format_error(result)
		local name = contexts[result.test].name
	    return "&nbsp;&nbsp;&nbsp;&nbsp;" .. result.message[1] .. result.message[2]
	end

	table.insert(buffer, "")

	for i, item in ipairs(contexts) do
		local level = ancestor_count(i, contexts)
		local name = item.name
		if item.context then
			table.insert(buffer, space(level) .. name .. ':')
		elseif results[i] then
			table.insert(buffer, space(level) .. name .. format_status(results[i]))
			if results[i].message then
				table.insert(buffer, format_error(results[i]))
			end
		end
	end
	return table.concat(buffer, "<br>\n")
end


local function testHookBefore(result)
	result.timing = amun.getCurrentTime()
end

local function testHookAfter(result)
	result.timing = amun.getCurrentTime() - result.timing
	coroutine.yield()
end

local function testrunner()
	local results = telescope.run(testContexts, { before = testHookBefore, after = testHookAfter } )
	local report = colored_report(testContexts, results)
	log(report)

	local _, data = telescope.summary_report(testContexts, results)
	local failing = data.tests - data.passed
	if failing == 0 then
		log("<font color=\"darkgreen\"> All testcases successfull :)</font>")
	else
		log("<font color=\"red\">" .. failing .. " failing testcase"
			.. (failing > 1 and "s" or "") ..  "!</font>")
	end
end

local co = coroutine.create(testrunner)

local function runTests()
	if coroutine.status(co) == "dead" then
		return
	end
	local success, msg = coroutine.resume(co)
	if not success then
		error(msg)
	end
end



Entrypoints.add("Unit Tests/ all", function()
	if not initialized then
		for name, test in pairs(tests) do
			initializeTest(test)
		end
	end
	runTests()
end)

for name, test in pairs(tests) do
	Entrypoints.add("Unit Tests/" .. name, function()
		if not initialized then
			initializeTest(test)
		end
		runTests()
	end)
end
