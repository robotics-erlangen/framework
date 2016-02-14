local Cache = require "../base/cache"


local function foo(a, b, c)
    return a*(b+c)
end
foo = Cache.forFrame(foo)

local function bar()
    return 4
end
bar = Cache.forFrame(bar)

local function multiReturn()
    return 1, 2, 3
end
multiReturn = Cache.forFrame(multiReturn)

local function heavy()
        local a = 0
        for i = 0, 1000000 do
            a = a + i
        end
        log("running")
end
heavy = Cache.forFrame(heavy)

local side = 0
local function sideEffect()
    side = side + 1
end
sideEffect = Cache.forFrame(sideEffect)

context("base.cache", function ()
    test("different arguments", function ()
        local a = foo(1,2,3)
        local b = foo(2,3,4)
        assert_not_equal(a, b, "different arguments should result in different results")
    end)

    test("nil parameters", function ()
        -- unused and nil parameters should not pose problems (multiple calls are ok)
        local a = bar()
        local b = bar("bla")
        local c = bar(nil, 7)
        assert_equal(a, 4)
        assert_equal(b, 4)
        assert_equal(c, 4)
    end)

    test("side effects", function ()
        sideEffect()
        local before = side
        sideEffect()
        local after = side
        assert_equal(before, after, "when called with the same arguments, the function should only be called once")
    end)

    test("reset frame cache", function ()
        sideEffect()
        local before = side
        Cache.resetFrame()
        sideEffect()
        local after = side
        assert_equal(before + 1, after)
    end)

    test("multiple return", function ()
        local r1, r2, r3 = multiReturn()
        -- multiple return values should be possible
        assert_not_nil(r1)
        assert_not_nil(r2)
        assert_not_nil(r3)
    end)

    test("heavy", function ()
        -- some number-crunching for time-measuring
        for i = 1, 100000 do
            heavy()
        end
        assert_true(true)
    end)
end)
