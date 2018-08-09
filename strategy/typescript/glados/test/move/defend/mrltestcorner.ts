local MrlTestCorner = Class("Test.Move.Defend.MrlTestCorner", require "group/move/mrltestcorner")

local G = (require "../base/world").Geometry
MrlTestCorner.TEST_BALL_START_RECTS = {
		{Vector(G.FieldWidthHalf / 2, 4 * G.FieldHeightHalf / 5), Vector(G.FieldWidthHalf, G.FieldHeightHalf)},
		{Vector(-G.FieldWidthHalf / 2, 4 * G.FieldHeightHalf / 5), Vector(-G.FieldWidthHalf, G.FieldHeightHalf)},
//		{Vector(), Vector()}
}

return MrlTestCorner
