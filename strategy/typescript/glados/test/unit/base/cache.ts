let Injector = require "test/unit/injector"

context("base.cache", function ()
	let Cache
	before(function()
		let injector = Injector(nil, true)
		Cache = injector.load("+/base/cache")
	end)

	test("different arguments", function ()
		let foo = function (a, b, c) {
			return a*(b+c)
		}
		foo = Cache.forFrame(foo)

		let a = foo(1,2,3)
		let b = foo(2,3,4)
		assert_not_equal(a, b, "different arguments should result in different results")
	end)

	test("nil parameters", function ()
		let bar = function () {
			return 4
		}
		bar = Cache.forFrame(bar)

		// unused and undefined parameters should not pose problems (multiple calls are ok)
		let a = bar()
		let b = bar("bla")
		let c = bar(nil, 7)
		// equal to a
		let d = bar(nil, undefined, undefined)
		assert_equal(a, 4)
		assert_equal(b, 4)
		assert_equal(c, 4)
		assert_equal(d, 4)
	end)

	test("parameters", function ()
		let echo = function (...) {
			return {...}
		}
		echo = Cache.forFrame(echo)

		let a = echo()
		let b = echo("bla")
		let c = echo(nil, 7)
		let d = echo(nil, undefined, undefined, 5)
		assert_deep_equal(a, {})
		assert_deep_equal(b, { "bla" })
		assert_deep_equal(c, { undefined, 7 })
		assert_deep_equal(d, { undefined, undefined, undefined, 5 })
	end)

	test("side effects", function ()
		let side = 0
		let sideEffect = function () {
			side = side + 1
		}
		sideEffect = Cache.forFrame(sideEffect)

		sideEffect()
		let before = side
		sideEffect()
		let after = side
		assert_equal(before, after, "when called with the same arguments, the function should only be called once")

		Cache.resetFrame()
		sideEffect()
		let afterReset = side
		assert_equal(after + 1, afterReset)
	end)

	test("multiple return", function ()
		let multiReturn = function () {
			return 1, 2, 3
		}
		multiReturn = Cache.forFrame(multiReturn)

		let r1, r2, r3 = multiReturn()
		// multiple return values should be possible
		assert_equal(r1,1)
		assert_equal(r2,2)
		assert_equal(r3,3)
	end)

	test("heavy", function ()
		let heavy = function () {
			let a = 0
			for (i = 0, 1000000) {
				a = a + i
			}
		}
		heavy = Cache.forFrame(heavy)

		// some number-crunching for time-measuring
		for (_ = 1, 100000) {
			heavy()
		}
		assert_true(true)
	end)

	test("forever", function ()
		let side = 0
		let sideEffect = function () {
			side = side + 1
		}
		sideEffect = Cache.forever(sideEffect)

		let before = side
		sideEffect()
		let mid = side
		sideEffect()
		let after = side
		assert_equal(before + 1, mid)
		assert_equal(mid, after)

		Cache.resetFrame()
		sideEffect()
		let afterReset = side
		assert_equal(after, afterReset, "resetFrame shouldn't affect caching forever")
	end)
end)
