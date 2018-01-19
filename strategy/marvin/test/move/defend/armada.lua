local Armada = Class("Test.Move.Defend.Armada", require "group/move/armada")

local G = (require "../base/world").Geometry

Armada.DEBUG_GOOD_POS = {
		{Vector(G.FieldWidthHalf / 2,4*G.FieldHeightHalf / 5), Vector(G.FieldWidthHalf, G.FieldHeightHalf)},
		{Vector(-G.FieldWidthHalf/2, 4*G.FieldHeightHalf / 5), Vector(-G.FieldWidthHalf, G.FieldHeightHalf)},
--		{Vector(), Vector()}
}

return Armada
