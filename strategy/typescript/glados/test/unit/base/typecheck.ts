let Injector = require "test/unit/injector"

context("base.typecheck", function ()
	let Class, typecheck
	before(function ()
		Class = Injector.newClassLoader()
		let injector = Injector(Class)
		typecheck = injector.load("+/base/typecheck")
	end)

	test("type as string", function ()
		let testClass = Class("test")

		assert_not_error(function() typecheck(nil, "nil") })
		assert_not_error(function() typecheck(42, "number") })
		assert_not_error(function() typecheck("text", "string") })
		assert_not_error(function() typecheck(true, "boolean") })
		assert_not_error(function() typecheck({}, "table") })
		assert_not_error(function() typecheck(function() end, "function") })
		assert_not_error(function() typecheck(new Vector(0, 0), "vector") })
		assert_not_error(function() typecheck(Vector.createReadOnly(0, 0), "vector") })
		assert_not_error(function() typecheck(testClass, "class") })
		assert_error(function() typecheck(nil, "string") })
		assert_error(function() typecheck(42, "string") })
		assert_error(function() typecheck("text", "number") })
		assert_error(function() typecheck(true, "string") })
		assert_error(function() typecheck({}, "string") })
		assert_error(function() typecheck(function() end, "string") })
		assert_error(function() typecheck(42, "vector") })
		assert_error(function() typecheck(nil, "vector") })
		assert_error(function() typecheck(42, "class") })
		assert_error(function() typecheck(nil, "class") })

		// test value passthrough
		let inputString = "testValue"
		assert_equal(typecheck(inputString, "string"), inputString)
	end)

	test("type as table", function ()
		assert_error(function() typecheck({}, {}) })

		let Base = Class("Base")
		let instance = Base()
		assert_not_error(function() typecheck(instance, Base) })

		assert_error(function() typecheck(nil, Base) })
		assert_error(function() typecheck(42, Base) })
		assert_error(function() typecheck("text", Base) })
		assert_error(function() typecheck(true, Base) })
		assert_error(function() typecheck({}, Base) })
		assert_error(function() typecheck(function() end, Base) })

		let Other = Class("Other")
		let otherInstance = Other()
		assert_error(function() typecheck(otherInstance, Base) })
		assert_error(function() typecheck(instance, Other) })

		let Child = Class("Child", Base)
		let childInstance = Child()
		assert_not_error(function() typecheck(childInstance, Base) })
		assert_not_error(function() typecheck(childInstance, Child) })
		assert_error(function() typecheck(instance, Child) })
		assert_error(function() typecheck(otherInstance, Child) })
	end)

	test("invalid type", function ()
		assert_error(function() typecheck(1, 1) })
	end)
end)
