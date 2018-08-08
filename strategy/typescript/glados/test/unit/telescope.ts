context("telescope", function ()
	test("equals_eps", function ()
		local EPS = 1E-12

		assert_equal_eps(0, 0, EPS)
		assert_not_equal_eps(0, 1, EPS)
		assert_equal_eps(1, 1, EPS)
		assert_not_equal_eps(1, 0, EPS)
		assert_equal_eps(0, 1E-12, EPS)
		assert_not_equal_eps(0, 1.1E-12, EPS)
	end)

	test("deep_equal", function ()
		local tablea = {}
		local tableb = {}

		assert_deep_equal(tablea, tableb)
		tablea[1] = 2
		assert_not_deep_equal(tablea, tableb)
		tableb[1] = 2
		assert_deep_equal(tablea, tableb)

		tablea["abc"] = false
		assert_not_deep_equal(tablea, tableb)
		tableb["abc"] = true
		assert_not_deep_equal(tablea, tableb)
		tableb["abc"] = false
		assert_deep_equal(tablea, tableb)

		tablea["def"] = {}
		assert_not_deep_equal(tablea, tableb)
		tablea["def"][2] = 1
		assert_not_deep_equal(tablea, tableb)
		tableb["def"] = {}
		assert_not_deep_equal(tablea, tableb)
		tableb["def"][2] = 1
		assert_deep_equal(tablea, tableb)

		tableb["def"][3] = 1
		assert_not_deep_equal(tablea, tableb)
		tablea["def"][3] = 1
		assert_deep_equal(tablea, tableb)
	end)
end)
