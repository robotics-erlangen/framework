--[[
--- Contains system specific constants. That is constants that are due to intrinsic properties of the robots / camera system / game rules.
-- See source for constant and description
module "Constants"
]]--

--[[***********************************************************************
*   Copyright 2015 Alexander Danzer, Michael Eischer, Christian Lobmeier  *
*   Robotics Erlangen e.V.                                                *
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

local Constants = {}

Constants.stopBallDistance = 0.5 -- distance to ball during stop [m]

Constants.systemLatency = 0.04 -- total system latency [s]

Constants.positionError = 0.005 -- possible position error from vision [m]

Constants.maxBallSpeed = 6.3 -- maximum allowed shooting speed [m/s]

Constants.maxDribbleDistance = 1

Constants.maxRobotRadius = 0.09

Constants.maxRobotHeight = 0.15

Constants.floorDamping = 0.55 -- vertical speed damping coeffient for a ball hitting the ground

Constants.stopSpeed = 1.5 -- maximum allowed driving speed during stop states [m/s]

function Constants.switchSimulatorConstants(isSimulated)
	if isSimulated then
		Constants.ballDeceleration = -0.35
		Constants.fastBallDeceleration = -4.5
		Constants.ballSwitchRatio = 0.69
	else
		-- measured by looking at the ball speed graph in the plotter
		Constants.ballDeceleration = -0.3 -- acceleration which brakes the ball [m/s^2]
		Constants.fastBallDeceleration = -2.5 -- accerlation which brakes the ball until it is rolling [m/s^2]
		Constants.ballSwitchRatio = 0.6 -- if ball is slower than switchRatio * shootSpeed then switch from fast to normal ball deceleration
	end
end

Constants.switchSimulatorConstants(false)

return Constants
