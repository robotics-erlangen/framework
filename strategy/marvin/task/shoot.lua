local Shoot = (require "../base/class").new("Task.Shoot", require "task/catchball")

local World = require "../base/world"
local ToTarget = require "trajectory/totarget"

function Shoot:_successProbability()
	error("stub")
end

-- if probability is higher than that threshold, the task will shoot immediatelly
function Shoot:_shoot(targetPos, targetSpeed, linearShoot, probabilityThreshold)
	self._successProbability = self._successProbability or 0
	self._shootHysteresis = self._shootHysteresis or 0
	
	if self._robot:hasBall(World.Ball) then -- if we got the ball
		local successProbability = self:_successProbability()
		-- TODO: test whether to add a delay when probability decreases
		if successProbability > probabilityThreshold
				or successProbability <= self._successProbability then
			self._shootHysteresis = self._shootHysteresis + 2
		else
			self._shootHysteresis = math.max(self._shootHysteresis - 1, 0)
		end
		self._shootProbability = successProbability
		if self._shootHysteresis > 0 then
			-- TODO: shoot
		end
	else -- catch the ball
		self._shootHysteresis = 0
		self._successProbability = 0
		-- TODO: catch the ball (movetoball?)
	end
end

return Shoot
