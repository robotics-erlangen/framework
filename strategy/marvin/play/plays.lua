--- Loads every play and publishes test functions
local Plays = {
	--DefaultPass = require "play/defaultpass",
	KickoffOffensive = require "play/kickoffoffensive",
	KickoffDefensive = require "play/kickoffdefensive",
	ShootGoal = require "play/shootgoal",
	ShootGoalImmediately = require "play/shootgoalimmediately"
	-- TODO: add plays
}
local Base = require "play/base"
local Class = require "../base/class"

local coord = nil

for name,s in pairs(Plays) do
	if Class.instanceOf(s, Base) then
		Entrypoints["plays/" .. name] = function ()
			if not coord then
				local Coordinator = require "control/coordinator"
				coord = Coordinator.create()
				coord:test(s)
			end
			coord:run()
		end
	else
		error("Invalid play! " .. name)
	end
end

return Plays
