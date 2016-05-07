local EPS = 1E-12

context("base.math", function()
    test("bound", function()
        assert_equal(math.bound(1, 2, 3), 2)
        assert_equal(math.bound(1, 4, 3), 3)
        assert_equal(math.bound(1, 0, 3), 1)
        assert_equal(math.bound(1, -math.huge, 3), 1)
        assert_equal(math.bound(1, math.huge, 3), 3)
    end)

    test("roundTowards", function()
        assert_equal(math.roundTowards(2.5, 3, 0), 3)
        assert_equal(math.roundTowards(2.4, 3, 0.2), 3)
        assert_equal(math.roundTowards(2.399, 3, 0.2), 2)
        assert_equal(math.roundTowards(2.399, 3, 0.2), 2)
        assert_equal(math.roundTowards(2.449, 3, 0.1), 2)
        assert_equal(math.roundTowards(2.551, 2, 0.1), 3)
        assert_equal(math.roundTowards(1.49, 3, 0.1), 1)
        assert_equal(math.roundTowards(4.51, 3, 0.1), 5)
    end)

    test("roundUpwards", function()
        assert_equal(math.roundUpwards(2, 0.1), 2)
        assert_equal(math.roundUpwards(1.5, 0), 2)
        assert_equal(math.roundUpwards(1.4, 0.1), 2)
        assert_equal(math.roundUpwards(1.39, 0.1), 1)
        assert_equal(math.roundUpwards(2.39, 0.1), 2)
        assert_equal(math.roundUpwards(-2.55, 0.1), -2)
        assert_equal(math.roundUpwards(-2.45, 0), -2)
        assert_equal(math.roundUpwards(-2.61, 0.1), -3)
    end)

    test("round", function ()
        assert_equal(math.round(2.45), 2)
        assert_equal(math.round(2.45, 0), 2)
        assert_equal(math.round(2.45, 1), 2.5)
        assert_equal(math.round(2.45, 2), 2.45)
        assert_equal(math.round(0.0001), 0)
        assert_equal(math.round(0.0001, 0), 0)
        assert_equal(math.round(0.0001, 1), 0)
        assert_equal(math.round(0.0001, 2), 0)
        assert_equal(math.round(0.0001, 3), 0)
        assert_equal(math.round(123, 0), 123)
        assert_equal(math.round(123, -1), 120)
        assert_equal(math.round(123, -2), 100)
        assert_equal(math.round(2.5, 0), 3)
    end)

    test("solveLin", function ()
        assert_equal(math.solveLin(1, 2), -2)
        assert_equal(math.solveLin(0, 2), nil)
        assert_equal(math.solveLin(2, -1), 0.5)
        assert_equal(math.solveLin(-2, -1), -0.5)
        assert_equal(math.solveLin(4, 2), -0.5)
        assert_equal(math.solveLin(-4, -2), -0.5)
    end)

    test("solveSq", function ()
        local x1, x2 = math.solveSq(1, 0, -1)
        assert_equal(x1, 1)
        assert_equal(x2, -1)

        local x1, x2 = math.solveSq(3, -15, 18)
        assert_equal(x1, 2)
        assert_equal(x2, 3)

        -- verify numeric stability
        -- (x-a)(x-b) = x*x-(a+b)*x+a*b = 0
        local x1, x2 = math.solveSq(1, -1e9-1e-9, 1e9*1e-9)
        assert_equal(x1, 1e-9)
        assert_equal(x2, 1e9)

        local x1, x2 = math.solveSq(1, 0, 0)
        assert_equal(x1, 0)
        assert_equal(x2, nil)
        local x1, x2 = math.solveSq(1, -2, 1)
        assert_equal(x1, 1)
        assert_equal(x2, nil)
        local x1, x2 = math.solveSq(1, -2, 1)
        assert_equal(x1, 1)
        assert_equal(x2, nil)

        local x1, x2 = math.solveSq(1, 0, 1)
        assert_equal(x1, nil)
        assert_equal(x2, nil)

        local x1, x2 = math.solveSq(0, 1, 2)
        assert_equal(x1, -2)
        assert_equal(x2, nil)

        local x1, x2 = math.solveSq(0, 0, 2)
        assert_equal(x1, nil)
        assert_equal(x2, nil)
    end)

    test("sign", function ()
        assert_equal(math.sign(0), 0)
        assert_equal(math.sign(-0), 0)
        assert_equal(math.sign(-0.01), -1)
        assert_equal(math.sign(0.01), 1)
        assert_equal(math.sign(-100), -1)
        assert_equal(math.sign(100), 1)
    end)

    test("average", function ()
        local array = { 1, 2, 3, 4, 0 }
        assert_equal(math.average(array), 2)
        assert_equal(math.average(array, 1, 5), 2)
        assert_equal(math.average(array, 2, 4), 3)
        assert_equal(math.average(array, 4, 4), 4)
    end)

    test("variance", function ()
        local array = { 1, 2, 3, 4, 0 }
        assert_equal(math.variance(array), 2)
        assert_equal(math.variance(array, 2), 2)
        assert_equal(math.variance(array, nil, 1, 5), 2)
        assert_equal(math.variance(array, 2, 1, 5), 2)
        assert_equal(math.variance(array, nil, 2, 4), 2/3)
        assert_equal(math.variance(array, 3, 2, 4), 2/3)
        assert_equal(math.variance(array, nil, 4, 4), 0)
    end)
	
	test("polynomialRoots", function()
		local coefficients = {1, 0, 2, 0, 1}
		--log("x^4 + 2x^2 + 1")
		local roots = math.realRootsOfPolynomial(coefficients)
		assert_equal(#roots, 0)
		--log("-----------------------------")
		
		coefficients = {1, 2, 1}
		--log("x^2 + 2x + 1")
		roots = math.realRootsOfPolynomial(coefficients)
		--log("roots = {"..roots[1]..", "..roots[2].."}")
		assert_equal(roots[1], -1)
		--log("-----------------------------")
		
		coefficients = {1, -6, 11, -6}
		--log("x^3 - 6x^2 + 11x - 6")
		roots = math.realRootsOfPolynomial(coefficients)
		--log("roots = {"..roots[1]..", "..roots[2]..", "..roots[3].."}")
		assert_less_than(math.abs(math.evaluatePolynomial(coefficients, roots[1])), roots[1]*1e-12)
		assert_less_than(math.abs(math.evaluatePolynomial(coefficients, roots[2])), roots[2]*1e-12)
		assert_less_than(math.abs(math.evaluatePolynomial(coefficients, roots[3])), roots[3]*1e-12)
		--log("-----------------------------")
		
		coefficients = {1, 4, 6, 4, 1}
		--log("x^4 + 4x^3 + 6x^2 + 4x + 1")
		roots = math.realRootsOfPolynomial(coefficients)
		--log("roots = {"..roots[1]..", "..roots[2]..", "..roots[3]..", "..roots[4].."}")
		assert_equal(#roots, 4)
		--log("-----------------------------")
		
		coefficients = {1, 2, 3, 4, 5, 6}
		--log("x^5 + 2x^4 + 3x^3 + 4x^2 + 5x + 6")
		roots = math.realRootsOfPolynomial(coefficients)
		--log("roots = {"..roots[1].."}")
		assert_equal(#roots, 1)
		--log("-----------------------------")
		
		coefficients = {1, -1.5, -24, 48.5, 30}
		--log("x^4 - 1.5x^3 - 24x^2 + 48.5x + 30")
		roots = math.realRootsOfPolynomial(coefficients)
		--log("roots = {"..roots[1]..", "..roots[2]..", "..roots[3]..", "..roots[4].."}")
		assert_equal(#roots, 4)
		--log("-----------------------------")
		
		--coefficients = {math.random() - 0.5, (math.random() - 0.5)*2, (math.random() - 0.5)*4, (math.random() - 0.5)*8, (math.random() - 0.5)*16}
		--log(coefficients[1].."x^4 + "..coefficients[2].."x^3 + "..coefficients[3].."x^2 + "..coefficients[4].."x + "..coefficients[5])
		--roots = math.realRootsOfPolynomial(coefficients)
		--log("roots = {"..(roots[1] or "")..(roots[2] and ", "..roots[2] or "")..(roots[3] and ", "..roots[3] or "")..(roots[4] and ", "..roots[4] or "").."}")
		--for _, root in ipairs(roots) do
		--	local f = math.evaluatePolynomial(coefficients, root)
		--	--log("f = "..f)
		--	assert_less_than(math.abs(f), math.abs(root*1e-12))
		--end
	end)
end)
