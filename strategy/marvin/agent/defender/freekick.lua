local Base = require "agent/base/behaviour"
local Freekick = (require "../base/class").new("Agent.Defender.Freekick", Base)

local World = require "../base/world"
local Class = require "../base/class"
local ManMark = require "task/manmark"
local MoveToPos = require "task/movetopos"

function Freekick:_check()
	if World.RefereeState == "DirectDefensive" or World.RefereeState == "IndirectDefensive" then
		return Base.State.Active
	else
		return Base.State.Inactive
	end
end

function Freekick:_run()
	local absX = World.Geometry.FieldWidthQuarter
	local x = World.Ball.pos.x > 0 and -absX or absX
	local preferredPos = Vector.create(x, World.Ball.pos.y)
	local preferredDir = (World.Ball.pos - preferredPos):angle()
	
	local manmark = false
	for _,r in pairs(World.OpponentRobots) do
		local d = r.pos:distanceTo(preferredPos)
		if d < 0.5 then
			manmark = true
			break
		elseif d < 0.8 then
			manmark = self._manmark
			break
		end
	end
	self._manmark = manmark
	
	if not self._manmarktask or self._manmark ~= self._manmarktask or not self._task then
		if not self._manmark then
			self._task = MoveToPos.create(self._robot, preferredPos, preferredDir)
		else
			self._task = ManMark.create(self._robot)
		end
		self._manmarktask = self._manmark
	end
end

return Freekick
