local Base = require "agent/base/behavior"
local Default = Class("Agent.Keeper.Default", Base)

local World = require "../base/world"
local Keeper = require "task/keeper/keeper"
-- local RandomKeeper = require "task/keeper/randomkeeper"


function Default:check()
	return true
end

function Default:_updateTask()
	if World.GameStage == "PenaltyShootout" and World.RefereeState == "PenaltyDefensive" then
		return Keeper -- RandomKeeper
	else
		return Keeper
	end
end

return Default
