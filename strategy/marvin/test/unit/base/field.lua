local Injector = require "test/unit/injector"


context("base.field", function()
	local Referee, Field, World, math, geom
	local injector = Injector(nil)

	before(function()
		
		math = injector:load("../base/math")
		geom = injector:load("../base/geom")


		World = {
			Geometry = {
				FieldHeightHalf = 4.5,
				FieldWidthHalf = 3,
				FreeKickDefenseDist = 0.2,
				DefenseStretch = 0.5,
				-- DefenseStretchHalf = DefenseStretch / 2,
				DefenseRadius = 1,
				GoalWidth = 1,
				GoalDepth = 0.18,
				-- DefenseHeight = DefenseRadius,
				-- DefenseWidth = DefenseHeight * 2,
				-- DefenseWidthHalf = DefenseWidth / 2,

			},
			RULEVERSION = "2018"
		}
		local G = World.Geometry
		G.DefenseStretchHalf = G.DefenseStretch / 2
		G.DefenseHeight = G.DefenseRadius
		G.DefenseWidth = G.DefenseHeight * 2
		G.DefenseWidthHalf = G.DefenseWidth / 2

		Referee = {
			isStopState = function()
				return false
			end,
			isFriendlyFreeKickState = function()
				return false
			end
		}

		injector:addModuleOverlay("../base/world", World)
		injector:addModuleOverlay("../base/referee", Referee)
	end)

	test("distanceToDefenseArea_2018", function()
		local G = World.Geometry
		World.RULEVERSION = "2018"
		Field = injector:load("../base/field")

		local pos = Vector(0,0)
		assert_equal(Field.distanceToDefenseArea(pos, 3,false), 0.5)
		assert_equal(Field.distanceToDefenseArea(pos, 3,true), 0.5)
		assert_false(Field.isInDefenseArea(pos,0.18,false))
		assert_false(Field.isInDefenseArea(pos,0.18,true))
		pos = Vector(0.1, G.FieldHeightHalf)
		assert_true(Field.isInDefenseArea(pos,0.18,false))
		assert_false(Field.isInDefenseArea(pos,0.18,true))
		pos = Vector(G.DefenseWidthHalf + 0.2,-G.FieldHeightHalf+0.4)
		assert_true(Field.isInDefenseArea(pos, 0.3, true))
		assert_false(Field.isInDefenseArea(pos, 0.3, false))
		pos = Vector(G.DefenseWidthHalf + 0.1, G.FieldHeightHalf-G.DefenseHeight-0.1)
		assert_true(Field.isInDefenseArea(pos, 0.2,false))
	end)
	test("distanceToDefenseArea_2017", function()
		local G = World.Geometry
		World.RULEVERSION = "2017"
		Field = injector:load("../base/field")

		local pos = Vector(0,0)
		assert_equal(Field.distanceToDefenseArea(pos, 3,false), 0.5)
		assert_equal(Field.distanceToDefenseArea(pos, 3,true), 0.5)
		assert_false(Field.isInDefenseArea(pos,0.18,false))
		assert_false(Field.isInDefenseArea(pos,0.18,true))
		pos = Vector(0.1, G.FieldHeightHalf)
		assert_true(Field.isInDefenseArea(pos,0.18,false))
		assert_false(Field.isInDefenseArea(pos,0.18,true))
	end)
end)
