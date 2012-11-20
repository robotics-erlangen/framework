local KickoffOffensive = (require "../base/class").new("Play.KickoffOffensive", require "play/base")

local Settings = require "settings"
local World = require "../base/world"
local RobotMatcher = require "control/robotmatcher"
local G = World.Geometry


KickoffOffensive.weight = 1000 -- TODO
KickoffOffensive.timeout = 20 -- TODO


function KickoffOffensive:_init()
	self._side = math.random(2) == 1 -- true = right, false = left
	log("KickoffOffensive: Formation "..(self._side and "Right" or "Left"))
end

function KickoffOffensive.selectRobots(attackers, defenders)
	local robots = table.append(table.copy(attackers), defenders) -- use attackers AND defenders
	robots, _ = RobotMatcher.match(robots, 4, nil, nil) -- TODO use conditions if needed
	return robots
end

function KickoffOffensive:prepareFormation()
	-- #1 Ballie
	local balliePos = Vector.create(0, -World.Ball.radius - self._robots[1].radius - Settings.positionPadding)
	-- #2 Quarterback
	local quarterbackPos = Vector.create(0, -G.CenterCircleRadius - self._robots[2].radius - Settings.positionPadding)
	-- #3 Outer
	local outerPos = Vector.create((self._side and 1 or -1) * G.FieldWidthHalf * 0.75, -3 * self._robots[3].radius)
	-- #4 Inner
	local innerPos = Vector.create((self._side and 1 or -1) * G.FieldWidthHalf * 0.5, -3 * self._robots[4].radius)
	
	--TODO weitermachen
end