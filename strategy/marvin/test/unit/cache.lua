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

return function()
    local a = foo(1,2,3)
    local b = foo(2,3,4)
    assert(a ~= b, "different arguments should result in different results")

    a = bar()
    b = bar("bla")
    local c = bar(nil, 7)
    assert(a==4 and b==4 and c==4,
        "unused and nil parameters should not pose problems (multiple calls are ok)")

    sideEffect()
    local before = side
    sideEffect()
    local after = side
    assert(before == after, "when called with the same arguments, the function should only be called once")

    before = side
    Cache.resetFrame()
    sideEffect()
    after = side
    log(before)
    assert(before ~= after, "frame cache is resettable")

    local r1, r2, r3 = multiReturn()
    assert(r1 and r2 and r3, "multiple return values should be possible")

    -- some number-crunching for time-measuring
    for i = 1, 100000 do
        heavy()
    end
end
