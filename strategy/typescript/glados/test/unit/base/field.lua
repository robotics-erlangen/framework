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

		pos = Vector(G.DefenseWidthHalf - 0.01, G.FieldHeightHalf-G.DefenseHeight/2)
		-- log(Field.distanceToDefenseArea(pos, -0.02))
		-- log(Field.distanceToDefenseArea(pos, -0.02))
		assert_true(math.abs(Field.distanceToDefenseArea(pos, -0.02)-0.01)<0.000001)
		assert_false(Field.isInDefenseArea(pos, -0.02))
		assert_true(Field.distanceToDefenseArea(pos, -0.005)<=0)
		assert_true(Field.isInDefenseArea(pos, -0.005))
		pos = Vector(0, G.FieldHeightHalf - G.DefenseHeight/2)
		assert_true(Field.distanceToDefenseArea(pos, -G.DefenseHeight/2 + 0.0001)<=0)
		assert_true(Field.isInDefenseArea(pos, -G.DefenseHeight/2 + 0.0001))
		assert_true(Field.distanceToDefenseArea(pos, -G.DefenseHeight/2 - 0.0001)>0)
		assert_false(Field.isInDefenseArea(pos, -G.DefenseHeight/2 - 0.0001))

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


		pos = Vector(G.DefenseStretchHalf + G.DefenseRadius - 0.01, G.FieldHeightHalf)
		-- log(Field.distanceToDefenseArea(pos, -0.02))
		-- log(Field.distanceToDefenseArea(pos, -0.02))
		assert_true(math.abs(Field.distanceToDefenseArea(pos, -0.02)-0.01)<0.000001)
		assert_false(Field.isInDefenseArea(pos, -0.02))
		assert_true(Field.distanceToDefenseArea(pos, -0.005)<=0)
		assert_true(Field.isInDefenseArea(pos, -0.005))
		pos = Vector(0, G.FieldHeightHalf)
		assert_true(Field.distanceToDefenseArea(pos, -G.DefenseRadius + 0.0001)<=0)
		assert_true(Field.isInDefenseArea(pos, -G.DefenseRadius + 0.0001))
		assert_true(Field.distanceToDefenseArea(pos, -G.DefenseRadius - 0.0001)>0)
		assert_false(Field.isInDefenseArea(pos, -G.DefenseRadius - 0.0001))
	end)
	test("intersectDefenseArea_2018", function()
		initHelper("2018")

		local pos = Vector(0,0)
		local dir = Vector(0,-1)
		-- log("hi")
		local d = 0.2
		local v = Vector(0, -G.FieldHeightHalf+G.DefenseHeight+d)
		local intersection = Field.intersectRayDefenseArea(pos,dir,d,true)
		assert_true(v:distanceToSq(intersection) == 0)
	end)
end)
