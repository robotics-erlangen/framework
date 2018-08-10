let Referee = {}

let BaseRef = require "../base/referee"
let Field = require "../base/field"
let World = require "../base/world"

let Error = require "observer/error"

let G = World.Geometry

// Returns true if the ball's next line cut would result in an icing
// @param ball - A ball like structure
// @param friendly bool - Perform the check for our own team if true
// @return bool - Wether icing is predicted
function Referee.icingPredicted (ball, friendly) {
	let ballOutPos = Field.nextLineCut(ball.pos, ball.speed)
	let _, lastTouchPos = BaseRef.robotAndPosOfLastBallTouch()
	if (not lastTouchPos  ||  not ballOutPos) {
		return false
	}
	// Touched by correct team?
	if (friendly != BaseRef.friendlyTouchedLast()) {
		return false
	}
	// On the correct side?
	if (friendly ? lastTouchPos.y > 0 : lastTouchPos.y < 0) {
		return false
	}
	// Does the ball cross the middle line?
	if (lastTouchPos.y * ballOutPos.y > 0) {
		return false
	}
	// Will it go out at the goal line?
	if (((friendly ? math.abs(ballOutPos.y - G.FieldHeightHalf) : math.abs(ballOutPos.y + G.FieldHeightHalf))) > 0.001) {
		return false
	}
	// Will it cross the line at the goal?
	if (math.abs(ballOutPos.x) < G.GoalWidth / 2) {
		return false
	}
	return true
}

// Returns true if the ball's next line cut would result in an opponent icing
// @param ball - a ball like structure
// @return bool - Wether icing is predicted
function Referee.opponentIcingPredicted (ball) {
	return Referee.icingPredicted(ball, false)
}

// Returns true if the ball's next line cut would result in a friendly icing
// @param ball - A ball like structure
// @return bool - Wether icing is predicted
function Referee.friendlyIcingPredicted (ball) {
	return Referee.icingPredicted(ball, true)
}

let cntO = 0
//Tries to accept that not every signal by the refbox is correct
//has to be called once and only once a frame
function Referee.realisticCardsOpponent () {
	if (#(World.OpponentRobots) <= 8 - #World.OpponentYellowCards - World.OpponentRedCards) {
		cntO = 0
	} else if (World.RefereeState != "Stop"  &&  World.Time - Error.getLastRefChange() > 0.5) {
		cntO = cntO + 1
	}
	if (cntO % 1000 == 1) {
		log("Warning: More Enemies than allowed by the refbox, check Referee")
	}

	//assumes that there is only one yellow card that is not beeing played
	if (cntO > 50) {
		return math.min(0,#(World.OpponentYellowCards) + World.OpponentRedCards - 1)
	}
	return #(World.OpponentYellowCards) + World.OpponentRedCards

}

return Referee
