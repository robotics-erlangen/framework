local ClearBall = require "task/ability/clearball"
local Duel = (require "../base/class").newTask("Task.Duel", require "task/base", ClearBall)

local World = require "../base/world"
local geom = require "../base/geom"
local debug = require "../base/debug"
local Direct = require "trajectory/direct"
local Shoot = require "observer/shoot"
local Ball = require "observer/ball"

function Duel:_init()
	self._opposer = nil
end

function Duel:run()
	self._opposer = assert(Ball.opponentBallOwner(),
		"Duel task shall only be active when an opponent has the ball")
	self._send.defendedOpponent("all", self._opposer)
	if self._robot:hasBall(World.Ball) then
		self:_contest()
		debug.set("duel-state", "contest")
	else
		self:_clearBall()
		debug.set("duel-state", "clear ball")
	end
end

function Duel:_contest()
	--decide if we should rotate cw or ccw
	local toOpponentDir = (self._opposer and self._opposer.pos or World.Ball.pos) - self._robot.pos
	local intersection = geom.intersectLineLine(
			self._robot.pos, toOpponentDir, World.Geometry.OpponentGoal, Vector.create(1, 0))
	local ccw = intersection and math.sign(intersection.x) or 1 --positive = ccw, negative = cw
	local toBall = (World.Ball.pos - self._robot.pos):setLength(0.2)
	self._robot.trajectory:update(Direct, toBall, nil, ccw * 2 * 2*math.pi) -- 2 turns per second

	-- send the position of the ball
	self._send.attackPosition("all", World.Ball.pos)
end

return Duel
