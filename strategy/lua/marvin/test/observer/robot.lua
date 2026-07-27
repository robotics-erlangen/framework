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

local RobotTest = {}

local World = require "../base/world"
local robot = require "observer/robot"

local ctr = 0

local function printDynamics(dyn)
	log("self.maxSpeed = " .. tostring(dyn.maxSpeed))
	log("self.maxAngularSpeed = " .. tostring(dyn.maxAngularSpeed))
	log("self.acceleration.aSpeedupFMax = " .. tostring(dyn.acceleration.aSpeedupFMax))
	log("self.acceleration.aSpeedupSMax = " .. tostring(dyn.acceleration.aSpeedupSMax))
	log("self.acceleration.aSpeedupPhiMax = " .. tostring(dyn.acceleration.aSpeedupPhiMax))
	log("self.acceleration.aBrakeFMax = " .. tostring(dyn.acceleration.aBrakeFMax))
	log("self.acceleration.aBrakeSMax = " .. tostring(dyn.acceleration.aBrakeSMax))
	log("self.acceleration.aBrakePhiMax = " .. tostring(dyn.acceleration.aBrakePhiMax))
	log("")
end

function RobotTest.testRobotDynamics()
	robot.estimateRobotDynamics()

	ctr = ctr + 1
	if ctr % 1000 == 0 then
		log(World.TeamIsBlue and "Blue Team:" or "Yellow Team:")
		printDynamics(robot.getFriendlyDynamics())
		log(World.TeamIsBlue and "Yellow Team:" or "Blue Team:")
		printDynamics(robot.getOpponentDynamics())
	end
end

return RobotTest
