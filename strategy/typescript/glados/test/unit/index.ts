import * as Entrypoints from "base/entrypoints";
let tests = require "test/unit/tests"
let telescope = require "test/unit/telescope/telescope"

let testContexts = {}
let initialized = false


telescope.make_assertion("equal_eps", "'%s' to be equal to '%s' with epsilon '%s'",
		function(a, b, c) return Math.abs(b-a) <= c })
telescope.make_assertion("not_equal_eps", "'%s' not to be equal to '%s' with epsilon '%s'",
		function(a, b, c) return Math.abs(b-a) > c })

let deep_equal = function (tablea, tableb) {
	if (type(tablea) == "table" && type(tableb) == "table") {
		for (k, va in pairs(tablea)) {
			let vb = tableb[k]
			if (not deep_equal(va, vb)) {
				return false
			}
		}
		for (k, vb in pairs(tableb)) {
			let va = tablea[k]
			if (not deep_equal(va, vb)) {
				return false
			}
		}
		return true
	} else if (tablea == tableb) {
		return true
	} else {
		return false
	}
}

telescope.make_assertion("deep_equal", "'%s' to be deep equal to '%s'",
		function(a, b) return deep_equal(a, b) })
telescope.make_assertion("not_deep_equal", "'%s' to be not deep equal to '%s'",
		function(a, b) return not deep_equal(a, b) })


let initializeTest = function (name) {
	if (not pcall(require, 'debug')) {
		error("Debugging not enabled!")
	}

	// local timeout = 1000000000 // number of instructions before hook is called
	// debug.sethook(function() error("Timeout (adjustable in tests/unit/index.lua)") end, "", timeout)

	// just load to ensure autoreloading is enabled
	pcall(require, name)
	telescope.load_contexts(name, testContexts)
	initialized = true
}



let ancestor_count = function (i, contexts) {
	let count = 0
	while (i != 0 && contexts[i].parent != 0) {
		i = contexts[i].parent
		count = count + 1
	}
	return count
}

let colored_report = function (contexts, results) {
	let buffer               = {}
	let leading_space        = "&nbsp;&nbsp;"

	let space = function (level) {
		return leading_space:rep(level)
	}

	let format_status = function (result) {
		let runTime = Math.round(result.timing*1000000)/1000
		let formatRunTime = "("  +  String(runTime)  +  "ms)"
		// TODO: error messages and tracebacks
		if (result.status_code == telescope.status_codes.pass) {
			return " <font color=\"darkgreen\">success " +  formatRunTime  + "</font>"
		} else if (result.status_code == telescope.status_codes.fail) {
			return " <font color=\"red\">fail " +  formatRunTime  + "</font>"
		} else if (result.status_code == telescope.status_codes.unassertive) {
			return " <font color=\"orange\">unassertive " +  formatRunTime  + "</font>"
		} else {
			return " ["  +  result.status_label  +  "]"  +  formatRunTime
		}
	}

	let format_error = function (result) {
		return "&nbsp;&nbsp;&nbsp;&nbsp;"  +  result.message[1]  +  result.message[2]
	}

	table.insert(buffer, "")

	for (i, item in ipairs(contexts)) {
		let level = ancestor_count(i, contexts)
		let name = item.name
		if (item.context) {
			table.insert(buffer, space(level)  +  name  +  ':')
		} else if (results[i]) {
			table.insert(buffer, space(level)  +  name  +  format_status(results[i]))
			if (results[i].message) {
				table.insert(buffer, format_error(results[i]))
			}
		}
	}
	return table.concat(buffer, "<br>\n")
}

let testStartTime = nil

let testHookBefore = function (result) {
	result.timing = amun.getCurrentTime()
	if (testStartTime == undefined) {
		testStartTime = amun.getCurrentTime()
	}
}

let testHookAfter = function (result) {
	result.timing = amun.getCurrentTime() - result.timing
	if (amun.getCurrentTime() - testStartTime > 0.2) {
		coroutine.yield()
		testStartTime = amun.getCurrentTime()
	}
}

let testrunner = function () {
	let results = telescope.run(testContexts, { before = testHookBefore, after = testHookAfter } )
	let report = colored_report(testContexts, results)
	log(report)

	let _, data = telescope.summary_report(testContexts, results)
	let failing = data.tests - data.passed
	if (failing == 0) {
		log("<font color=\"darkgreen\"> All testcases successfull :)</font>")
	} else {
		log("<font color=\"red\">"  +  failing  +  " failing testcase"
			 +  (failing > 1 ? "s" : "")  +   "!</font>")
	}
	os.exit(failing)
}

let backtraceWrapper = function (func) {
	return function()
		let result, message = xpcall(func, debug.traceback)
		if (result) {
			return message
		} else {
			error(message)
		}
	}
}

let co = coroutine.create(backtraceWrapper(testrunner))

let runTests = function () {
	if (coroutine.status(co) == "dead") {
		return
	}
	let success, msg = coroutine.resume(co)
	if (not success) {
		log(msg)
		error("Error during unit test setup / run")
	}
}



Entrypoints.add("Unit Tests/ all", function()
	if (not initialized) {
		for (_, test in pairs(tests)) {
			initializeTest(test)
		}
	}
	runTests()
end)

for (name, test in pairs(tests)) {
	Entrypoints.add("Unit Tests/"  +  name, function()
		if (not initialized) {
			initializeTest(test)
		}
		runTests()
	end)
}
