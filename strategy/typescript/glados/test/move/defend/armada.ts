let Armada = Class("Test.Move.Defend.Armada", require "group/move/armada")

let G = (require "+/base/world").Geometry

Armada.TEST_BALL_START_RECTS = {
		{new Vector(G.FieldWidthHalf / 2,4*G.FieldHeightHalf / 5), new Vector(G.FieldWidthHalf, G.FieldHeightHalf)},
		{new Vector(-G.FieldWidthHalf/2, 4*G.FieldHeightHalf / 5), new Vector(-G.FieldWidthHalf, G.FieldHeightHalf)},
//		{new Vector(), new Vector()}
}

return Armada
