local Entrypoints = require "../base/entrypoints"
local tests = require "test/unit/tests"
local telescope = require "test/telescope/telescope"

local testContexts = {}
local initialized = false


telescope.make_assertion("equal_eps", "'%s' to be equal to '%s' with epsilon '%s'",
		function(a, b, c) return math.abs(b-a) <= c end)
telescope.make_assertion("not_equal_eps", "'%s' not to be equal to '%s' with epsilon '%s'",
		function(a, b, c) return math.abs(b-a) > c end)

local function deep_equal(tablea, tableb)
	if type(tablea) == "table" and type(tableb) == "table" then
		for k, va in pairs(tablea) do
			local vb = tableb[k]
			if not deep_equal(va, vb) then
				return false
			end
		end
		for k, vb in pairs(tableb) do
			local va = tablea[k]
			if not deep_equal(va, vb) then
				return false
			end
		end
		return true
	elseif tablea == tableb then
		return true
	else
		return false
	end
end

telescope.make_assertion("deep_equal", "'%s' to be deep equal to '%s'",
		function(a, b) return deep_equal(a, b) end)
telescope.make_assertion("not_deep_equal", "'%s' to be not deep equal to '%s'",
		function(a, b) return not deep_equal(a, b) end)


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

local testStartTime = nil

local function testHookBefore(result)
	result.timing = amun.getCurrentTime()
	if testStartTime == nil then
		testStartTime = amun.getCurrentTime()
	end
end

local function testHookAfter(result)
	result.timing = amun.getCurrentTime() - result.timing
	if amun.getCurrentTime() - testStartTime > 0.2 then
		coroutine.yield()
		testStartTime = amun.getCurrentTime()
	end
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
	os.exit(failing)
end

local function backtraceWrapper(func)
	return function()
		local result, message = xpcall(func, debug.traceback)
		if result then
			return message
		else
			error(message)
		end
	end
end

local co = coroutine.create(backtraceWrapper(testrunner))

local function runTests()
	if coroutine.status(co) == "dead" then
		return
	end
	local success, msg = coroutine.resume(co)
	if not success then
		log(msg)
		error("Error during unit test setup / run")
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
