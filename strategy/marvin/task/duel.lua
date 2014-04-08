local Duel = (require "../base/class").new("Task.Duel", require "task/directpass")

local World = require "../base/world"
local geom = require "../base/geom"
local Direct = require "trajectory/direct"
local DirectPass = require "task/directpass"
local Shoot = require "observer/shoot"
local ClearBall = require "task/clearball"
local Ball = require "observer/ball"

Duel.priority = 4



function Duel:_init()
end

function Duel:_canShoot()
	return true
end

function Duel:run()
	self.opposer = Ball.opponentBallOwner()
	if self.opposer then
		if self._robot:hasBall(World.Ball) then
			self:_contest()
		else
			local cb = ClearBall.create(self._agent)
			ClearBall._clearBall(cb)
		end
	else
		self:_passAway()
	end
end

function Duel:_contest()
	--decide if we should rotate cw or ccw
	local toOpponentDir = (self.opposer and self.opposer.pos or World.Ball.pos) - self._robot.pos
	local intersection = geom.intersectLineLine(
			self._robot.pos, toOpponentDir, World.Geometry.OpponentGoal, Vector.create(1, 0))
	local ccw = intersection and math.sign(intersection.x) or 1 --positive = ccw, negative = cw
	local toBall = (World.Ball.pos - self._robot.pos):setLength(0.2)
	self._robot.trajectory:update(Direct, toBall, nil, ccw * 2 * 2*math.pi) -- 2 turns per second
end

function Duel:_passAway()
	local bestAssistant = Shoot.bestFreeAssistant(self._robot, self._inbox.attackerFlag("ignorePriority"))
	
	local rating = bestAssistant and Shoot.rateAssistant(bestAssistant) or 0
	local oldRating = self._bestAssistant and Shoot.rateAssistant(self._bestAssistant) or -1 
	local hyst = World.Geometry.FieldHeightQuarter / 2

	if self._bestAssistant ~= bestAssistant and rating > oldRating+hyst then
		self._bestAssistant = bestAssistant
	end
		
	if self._bestAssistant then
		DirectPass._init(self, self._bestAssistant, true)
		DirectPass.run(self)
	else
		self:_shoot(World.Geometry.OpponentGoal, math.huge, false) 
	end
end

return Duel