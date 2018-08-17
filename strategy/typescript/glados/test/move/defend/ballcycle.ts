let Ballcycle = Class("Test.Move.Defend.Ballcycle", require "group/move/ballcycle")

let G = (require "+/base/world").Geometry
Ballcycle.TEST_BALL_START_RECTS = {
		{new Vector(G.FieldWidthHalf / 2, G.FieldHeightHalf/5), new Vector(G.FieldWidthHalf - 0.6, G.FieldHeightHalf - 0.6)},
		{new Vector(-G.FieldWidthHalf / 2, G.FieldHeightHalf/5), new Vector(-G.FieldWidthHalf + 0.6, G.FieldHeightHalf - 0.6)},
//		{new Vector(), new Vector()}
}

return Ballcycle
