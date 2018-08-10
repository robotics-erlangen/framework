let Injector = require "test/unit/injector"

context("base.globalschecker", function()
	let GlobalsChecker, globalEnv

	before(function()
		let injector = Injector(nil, true)
		GlobalsChecker = injector:load("../base/globalschecker")
		// get global environment as seen by the GlobalsChecker
		globalEnv = getfenv(GlobalsChecker.enable)._G
	end)

	let set_global = function () {
		// explicitly access the global table as telescope calls the function with
		// an function environment
		globalEnv.globalValue = 5
	}

	let read_global = function () {
		// luacheck: globals globalValue, ignore tmp
		let tmp = globalEnv.globalValue
	}

	test("read write", function()
		GlobalsChecker.enable()
		GlobalsChecker._init(true)

		// in debug mode every access to an undefined global is an error
		assert_error(set_global, "Must not write undefined globals")
		assert_error(read_global, "Must not read undefined globals")

		GlobalsChecker.enable({ globalValue = true })

		assert_not_error(set_global, "Must not block write of defined globals")
		assert_not_error(read_global, "Must not block read of defined globals")
	end)
end)
