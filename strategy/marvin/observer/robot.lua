local Robot = {}

function Robot.estimatePos(robot, time)
	-- body
end

function Robot.minTimeToBall(robot, ball)
	local posDiff = robot.pos - ball.pos
	 -- only add ball speed if it moves towards us
	local ballSpeedToRobot = math.max(0, ball.speed:dot(posDiff) / posDiff:length())
	return math.max(0, posDiff:length() - robot.radius - ball.radius) / (robot.maxSpeed + ballSpeedToRobot)
end

return Robot
