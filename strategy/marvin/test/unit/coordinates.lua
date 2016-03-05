local Coordinates = require "../base/coordinates"
local World = require "../base/world"


context("base.coordinates", function()
    test("vector", function()
        local vec = Vector(1, 2)
        local vec2 = Coordinates.toGlobal(vec)
        local vec3 = Coordinates.toLocal(vec)
        if World.TeamIsBlue then
            assert_equal(vec2.x, -vec.x)
            assert_equal(vec2.y, -vec.y)
            assert_equal(vec3.x, -vec.x)
            assert_equal(vec3.y, -vec.y)
            assert_false(vec2:isReadonly())
            assert_false(vec3:isReadonly())
        else
            assert_equal(vec2.x, vec.x)
            assert_equal(vec2.y, vec.y)
            assert_equal(vec3.x, vec.x)
            assert_equal(vec3.y, vec.y)
            assert_false(vec2:isReadonly())
            assert_false(vec3:isReadonly())
        end
        local vec = Vector(1, 2, true)
        local vec2 = Coordinates.toGlobal(vec)
        local vec3 = Coordinates.toLocal(vec)
        if World.TeamIsBlue then
            assert_equal(vec2.x, -vec.x)
            assert_equal(vec2.y, -vec.y)
            assert_equal(vec3.x, -vec.x)
            assert_equal(vec3.y, -vec.y)
            assert_true(vec2:isReadonly())
            assert_true(vec3:isReadonly())
        else
            assert_equal(vec2.x, vec.x)
            assert_equal(vec2.y, vec.y)
            assert_equal(vec3.x, vec.x)
            assert_equal(vec3.y, vec.y)
            assert_true(vec2:isReadonly())
            assert_true(vec3:isReadonly())
        end
    end)

    test("direction", function()
        local dir = math.pi/4
        local dir2 = Coordinates.toGlobal(dir)
        local dir3 = Coordinates.toLocal(dir)
        if World.TeamIsBlue then
            assert_equal(dir2, dir + math.pi)
            assert_equal(dir3, dir + math.pi)
        else
            assert_equal(dir2, dir)
            assert_equal(dir3, dir)
        end
        local dir = math.pi*5/4
        local dir2 = Coordinates.toGlobal(dir)
        local dir3 = Coordinates.toLocal(dir)
        if World.TeamIsBlue then
            assert_equal(dir2, dir - math.pi)
            assert_equal(dir3, dir - math.pi)
        else
            assert_equal(dir2, dir)
            assert_equal(dir3, dir)
        end
    end)

    test("list", function()
        local list = { Vector(0, 1), Vector(1, 2), math.pi/4 }
        local list2 = Coordinates.listToGlobal(list)

        if World.TeamIsBlue then
            assert_deep_equal({ -list[1], -list[2], math.pi*5/4 }, list2)
        else
            assert_deep_equal(list, list2)
        end
    end)
end)
