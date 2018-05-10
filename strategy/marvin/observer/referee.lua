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
	-- Touched by correct team?
	if friendly ~= BaseRef.friendlyTouchedLast() then
		return false
	end
	-- On the correct side?
	if friendly and lastTouchPos.y > 0 or lastTouchPos.y < 0 then
		return false
	end
	-- Does the ball cross the middle line?
	if lastTouchPos.y * ballOutPos.y > 0 then
		return false
	end
	-- Will it go out at the goal line?
	if (friendly and math.abs(ballOutPos.y + G.FieldHeightHalf) or math.abs(ballOutPos.y - G.FieldHeightHalf)) > 0.001 then
		return false
	end
	-- Will it cross the line at the goal?
	if math.abs(ballOutPos.x) < G.GoalWidth / 2 then
		return false
	end

	return true
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
