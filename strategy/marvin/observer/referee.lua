local Referee = {}

local BaseRef = require "../base/referee"
local Field = require "../base/field"
local World = require "../base/world"

local G = World.Geometry

-- Returns true if the ball's next line cut would result in an icing
-- @param ball - A ball like structure
-- @param friendly bool - Perform the check for our own team if true
-- @return bool - Wether icing is predicted
function Referee.icingPredicted(ball, friendly)
	local ballOutPos = Field.nextLineCut(ball.pos, ball.speed)
	local _, lastTouchPos = BaseRef.robotAndPosOfLastBallTouch()
	if not lastTouchPos or not ballOutPos then
		return false
	end
	local lastTouchedCorrect = friendly == BaseRef.friendlyTouchedLast()
	local shotFromCorrect = friendly and lastTouchPos.y < 0 or lastTouchPos.y > 0
	local outAtGoalline = (friendly and math.abs(ballOutPos.y + G.FieldHeightHalf) or math.abs(ballOutPos.y - G.FieldHeightHalf)) < 0.001
	return lastTouchedCorrect and shotFromCorrect and outAtGoalline
end

-- Returns true if the ball's next line cut would result in an opponent icing
-- @param ball - a ball like structure
-- @return bool - Wether icing is predicted
function Referee.opponentIcingPredicted(ball)
	return Referee.icingPredicted(ball, false)
end

-- Returns true if the ball's next line cut would result in a friendly icing
-- @param ball - A ball like structure
-- @return bool - Wether icing is predicted
function Referee.friendlyIcingPredicted(ball)
	return Referee.icingPredicted(ball, true)
end

return Referee
