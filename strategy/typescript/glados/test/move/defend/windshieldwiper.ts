let WindshieldWiper = Class("Test.Move.Defend.WindshieldWiper", require "group/move/windshieldwiper")

let G = (require "+/base/world").Geometry

WindshieldWiper.TEST_BALL_START_RECTS = {
		{new Vector(G.FieldWidthHalf / 2,3*G.FieldHeightHalf / 5), new Vector(G.FieldWidthHalf, G.FieldHeightHalf)},
		{new Vector(-G.FieldWidthHalf/2, 3*G.FieldHeightHalf / 5), new Vector(-G.FieldWidthHalf, G.FieldHeightHalf)},
//		{new Vector(), new Vector()}
}

return WindshieldWiper
