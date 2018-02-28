local Injector = require "test/unit/injector"

context("base.field", function()
	local Field, Referee, World, G
	local injector

	local function initHelper(ruleversion)
		World.RULEVERSION = ruleversion
		Field = injector:load("../base/field")
	end

	before(function()
		injector = Injector(nil)
		injector:load("../base/math")
		injector:load("../base/geom")

		World = {
			Geometry = {
				FieldHeightHalf = 4.5,
				FieldWidthHalf = 3,
				FreeKickDefenseDist = 0.2,
				DefenseStretch = 0.5,
				DefenseRadius = 1,
				GoalWidth = 1,
				GoalDepth = 0.18,
			},
			RULEVERSION = nil -- keep unset for now
		}
		G = World.Geometry
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
		initHelper("2018")

		local pos = Vector(0, 0)
		assert_equal(Field.distanceToDefenseArea(pos, 3, false), 0.5)
		assert_equal(Field.distanceToDefenseArea(pos, 3, true), 0.5)
		assert_false(Field.isInDefenseArea(pos, 0.18, false))
		assert_false(Field.isInDefenseArea(pos, 0.18, true))
		pos = Vector(0.1, G.FieldHeightHalf)
		assert_true(Field.isInDefenseArea(pos, 0.18, false))
		assert_false(Field.isInDefenseArea(pos, 0.18, true))
		pos = Vector(G.DefenseWidthHalf + 0.2, -G.FieldHeightHalf + 0.4)
		assert_true(Field.isInDefenseArea(pos, 0.3, true))
		assert_false(Field.isInDefenseArea(pos, 0.3, false))
		pos = Vector(G.DefenseWidthHalf + 0.1, G.FieldHeightHalf - G.DefenseHeight - 0.1)
		assert_true(Field.isInDefenseArea(pos, 0.2, false))
	end)
	test("distanceToDefenseArea_2017", function()
		initHelper("2017")

		local pos = Vector(0, 0)
		assert_equal(Field.distanceToDefenseArea(pos, 3, false), 0.5)
		assert_equal(Field.distanceToDefenseArea(pos, 3, true), 0.5)
		assert_false(Field.isInDefenseArea(pos, 0.18, false))
		assert_false(Field.isInDefenseArea(pos, 0.18, true))
		pos = Vector(0.1, G.FieldHeightHalf)
		assert_true(Field.isInDefenseArea(pos, 0.18, false))
		assert_false(Field.isInDefenseArea(pos, 0.18, true))
	end)
end)
