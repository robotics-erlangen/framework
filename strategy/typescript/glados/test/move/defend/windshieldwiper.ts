local WindshieldWiper = Class("Test.Move.Defend.WindshieldWiper", require "group/move/windshieldwiper")

local G = (require "../base/world").Geometry

WindshieldWiper.TEST_BALL_START_RECTS = {
		{Vector(G.FieldWidthHalf / 2,3*G.FieldHeightHalf / 5), Vector(G.FieldWidthHalf, G.FieldHeightHalf)},
		{Vector(-G.FieldWidthHalf/2, 3*G.FieldHeightHalf / 5), Vector(-G.FieldWidthHalf, G.FieldHeightHalf)},
--		{Vector(), Vector()}
}

return WindshieldWiper
