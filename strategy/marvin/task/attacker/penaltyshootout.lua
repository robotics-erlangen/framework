local Shoot = require "task/ability/shoot"
local PathHelper = require "trajectory/pathhelper"
local PenaltyShootout = Class("Task.PenaltyShootout", require "task/base", Shoot)

function PenaltyShootout:_init(ball)
	self._ball = ball
end

function PenaltyShootout:run()
	local obstacleTable = {
        inbox = self._inbox
    }
    PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)
	local shootlength = (0.2 + self._robot.speed:length())
	local shootpos = Vector(0, shootlength/3 + 0.2) * 0.6 + self._ball.speed/3 * 0.4
	shootpos.x = -shootpos.x
	shootpos = shootpos + self._ball.pos
	self:_shoot(shootpos, shootlength)
end

return PenaltyShootout