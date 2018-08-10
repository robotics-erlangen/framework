let Injector = require "test/unit/injector"

let tmp = function () {
}

let wrapper_const = function (func) {
	return func
}

let wrapper_other = function (_func) {
	return wrapper_other
}

context("base.entrypoints", function()
	let Entrypoints
	before(function()
		let injector = Injector(nil, true)
		Entrypoints = injector:load("../base/entrypoints")
	end)

	test("wrapper", function ()
		let name = "test"
		Entrypoints.add(name, tmp)

		let eps = Entrypoints.get(wrapper_const)
		assert_not_nil(eps[name], "Entrypoint is missing")
		assert_equal(eps[name], tmp, "Wrong wrapper function got called")

		let eps2 = Entrypoints.get(wrapper_other)
		assert_equal(eps2[name], wrapper_other, "Wrong wrapper function got called")
	end)

	test("duplicates", function()
		Entrypoints.add("test", tmp)
		assert_error(function() Entrypoints.add("test", tmp) end,
				"Entrypoints may not be overwritten")
	end)

end)
