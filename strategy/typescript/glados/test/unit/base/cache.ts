local Injector = require "test/unit/injector"

context("base.cache", function ()
	local Cache
	before(function()
		local injector = Injector(nil, true)
		Cache = injector:load("../base/cache")
	end)

	test("different arguments", function ()
		local function foo(a, b, c)
			return a*(b+c)
		end
		foo = Cache.forFrame(foo)

		local a = foo(1,2,3)
		local b = foo(2,3,4)
		assert_not_equal(a, b, "different arguments should result in different results")
	end)

	test("nil parameters", function ()
		local function bar()
			return 4
		end
		bar = Cache.forFrame(bar)

		// unused and nil parameters should not pose problems (multiple calls are ok)
		local a = bar()
		local b = bar("bla")
		local c = bar(nil, 7)
		// equal to a
		local d = bar(nil, nil, nil)
		assert_equal(a, 4)
		assert_equal(b, 4)
		assert_equal(c, 4)
		assert_equal(d, 4)
	end)

	test("parameters", function ()
		local function echo(...)
			return {...}
		end
		echo = Cache.forFrame(echo)

		local a = echo()
		local b = echo("bla")
		local c = echo(nil, 7)
		local d = echo(nil, nil, nil, 5)
		assert_deep_equal(a, {})
		assert_deep_equal(b, { "bla" })
		assert_deep_equal(c, { nil, 7 })
		assert_deep_equal(d, { nil, nil, nil, 5 })
	end)

	test("side effects", function ()
		local side = 0
		local function sideEffect()
			side = side + 1
		end
		sideEffect = Cache.forFrame(sideEffect)

		sideEffect()
		local before = side
		sideEffect()
		local after = side
		assert_equal(before, after, "when called with the same arguments, the function should only be called once")

		Cache.resetFrame()
		sideEffect()
		local afterReset = side
		assert_equal(after + 1, afterReset)
	end)

	test("multiple return", function ()
		local function multiReturn()
			return 1, 2, 3
		end
		multiReturn = Cache.forFrame(multiReturn)

		local r1, r2, r3 = multiReturn()
		// multiple return values should be possible
		assert_equal(r1,1)
		assert_equal(r2,2)
		assert_equal(r3,3)
	end)

	test("heavy", function ()
		local function heavy()
			local a = 0
			for i = 0, 1000000 do
				a = a + i
			end
		end
		heavy = Cache.forFrame(heavy)

		// some number-crunching for time-measuring
		for _ = 1, 100000 do
			heavy()
		end
		assert_true(true)
	end)

	test("forever", function ()
		local side = 0
		local function sideEffect()
			side = side + 1
		end
		sideEffect = Cache.forever(sideEffect)

		local before = side
		sideEffect()
		local mid = side
		sideEffect()
		local after = side
		assert_equal(before + 1, mid)
		assert_equal(mid, after)

		Cache.resetFrame()
		sideEffect()
		local afterReset = side
		assert_equal(after, afterReset, "resetFrame shouldn't affect caching forever")
	end)
end)
