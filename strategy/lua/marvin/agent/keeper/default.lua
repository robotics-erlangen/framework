--[[***********************************************************************
*   Copyright 2026 Robotics Erlangen e.V.                                 *
*   http://www.robotics-erlangen.de/                                      *
*   info@robotics-erlangen.de                                             *
*                                                                         *
*   This program is free software: you can redistribute it and/or modify  *
*   it under the terms of the GNU General Public License as published by  *
*   the Free Software Foundation, either version 3 of the License, or     *
*   any later version.                                                    *
*                                                                         *
*   This program is distributed in the hope that it will be useful,       *
*   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
*   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
*   GNU General Public License for more details.                          *
*                                                                         *
*   You should have received a copy of the GNU General Public License     *
*   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
*************************************************************************]]

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
