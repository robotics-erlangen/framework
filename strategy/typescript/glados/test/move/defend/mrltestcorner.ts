let MrlTestCorner = Class("Test.Move.Defend.MrlTestCorner", require "group/move/mrltestcorner")

let G = (require "+/base/world").Geometry
MrlTestCorner.TEST_BALL_START_RECTS = {
		{new Vector(G.FieldWidthHalf / 2, 4 * G.FieldHeightHalf / 5), new Vector(G.FieldWidthHalf, G.FieldHeightHalf)},
		{new Vector(-G.FieldWidthHalf / 2, 4 * G.FieldHeightHalf / 5), new Vector(-G.FieldWidthHalf, G.FieldHeightHalf)},
//		{new Vector(), new Vector()}
}

return MrlTestCorner
