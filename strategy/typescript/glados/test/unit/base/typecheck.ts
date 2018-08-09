local Injector = require "test/unit/injector"

context("base.typecheck", function ()
	local Class, typecheck
	before(function ()
		Class = Injector.newClassLoader()
		local injector = Injector(Class)
		typecheck = injector:load("../base/typecheck")
	end)

	test("type as string", function ()
		local testClass = Class("test")

		assert_not_error(function() typecheck(nil, "nil") end)
		assert_not_error(function() typecheck(42, "number") end)
		assert_not_error(function() typecheck("text", "string") end)
		assert_not_error(function() typecheck(true, "boolean") end)
		assert_not_error(function() typecheck({}, "table") end)
		assert_not_error(function() typecheck(function() end, "function") end)
		assert_not_error(function() typecheck(Vector(0, 0), "vector") end)
		assert_not_error(function() typecheck(Vector.createReadOnly(0, 0), "vector") end)
		assert_not_error(function() typecheck(testClass, "class") end)
		assert_error(function() typecheck(nil, "string") end)
		assert_error(function() typecheck(42, "string") end)
		assert_error(function() typecheck("text", "number") end)
		assert_error(function() typecheck(true, "string") end)
		assert_error(function() typecheck({}, "string") end)
		assert_error(function() typecheck(function() end, "string") end)
		assert_error(function() typecheck(42, "vector") end)
		assert_error(function() typecheck(nil, "vector") end)
		assert_error(function() typecheck(42, "class") end)
		assert_error(function() typecheck(nil, "class") end)

		// test value passthrough
		local inputString = "testValue"
		assert_equal(typecheck(inputString, "string"), inputString)
	end)

	test("type as table", function ()
		assert_error(function() typecheck({}, {}) end)

		local Base = Class("Base")
		local instance = Base()
		assert_not_error(function() typecheck(instance, Base) end)

		assert_error(function() typecheck(nil, Base) end)
		assert_error(function() typecheck(42, Base) end)
		assert_error(function() typecheck("text", Base) end)
		assert_error(function() typecheck(true, Base) end)
		assert_error(function() typecheck({}, Base) end)
		assert_error(function() typecheck(function() end, Base) end)

		local Other = Class("Other")
		local otherInstance = Other()
		assert_error(function() typecheck(otherInstance, Base) end)
		assert_error(function() typecheck(instance, Other) end)

		local Child = Class("Child", Base)
		local childInstance = Child()
		assert_not_error(function() typecheck(childInstance, Base) end)
		assert_not_error(function() typecheck(childInstance, Child) end)
		assert_error(function() typecheck(instance, Child) end)
		assert_error(function() typecheck(otherInstance, Child) end)
	end)

	test("invalid type", function ()
		assert_error(function() typecheck(1, 1) end)
	end)
end)
