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

local AttackRatio = require "trainer/attackratio"
local Defense = require "trainer/defense"
local Trainer = require "trainer/trainer"
local MainTrainer = Class("MainTrainer", Trainer, AttackRatio, Defense)


function MainTrainer:init(mode)
	Trainer.init(self)
	-- the instance function 'attackRatio' overwrites the method
	if mode == "passive" then
		self.attackRatio = function() return 0 end
	elseif mode == "aggressive" then
		self.attackRatio = function() return 8 end
	end
end

function MainTrainer:run()
	Trainer.run(self)
	self:_assignDefenders()
end

return MainTrainer
