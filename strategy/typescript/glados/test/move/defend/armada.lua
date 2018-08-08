local Armada = Class("Test.Move.Defend.Armada", require "group/move/armada")

local G = (require "../base/world").Geometry

Armada.TEST_BALL_START_RECTS = {
		{Vector(G.FieldWidthHalf / 2,4*G.FieldHeightHalf / 5), Vector(G.FieldWidthHalf, G.FieldHeightHalf)},
		{Vector(-G.FieldWidthHalf/2, 4*G.FieldHeightHalf / 5), Vector(-G.FieldWidthHalf, G.FieldHeightHalf)},
--		{Vector(), Vector()}
}

return Armada
