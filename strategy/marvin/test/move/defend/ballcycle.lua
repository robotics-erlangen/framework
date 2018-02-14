local Ballcycle = Class("Test.Move.Defend.Ballcycle", require "group/move/ballcycle")

local G = (require "../base/world").Geometry
Ballcycle.TEST_BALL_START_RECTS = {
		{Vector(G.FieldWidthHalf / 2, G.FieldHeightHalf/5), Vector(G.FieldWidthHalf - 0.6, G.FieldHeightHalf - 0.6)},
		{Vector(-G.FieldWidthHalf / 2, G.FieldHeightHalf/5), Vector(-G.FieldWidthHalf + 0.6, G.FieldHeightHalf - 0.6)},
--		{Vector(), Vector()}
}

return Ballcycle
