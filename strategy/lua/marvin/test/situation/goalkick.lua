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

-- taken from the game against Robodragons at Robocup 2013, we were the yellow team
local situation = {
	refereeState = "DirectYellow",
	gameStage = "NORMAL_FIRST_HALF",
	ball = { pos = Vector(1.90294,-2.55562), speed = Vector(-0.00070032,0.000634986) },
	blueGoalie = 10,
	blueRobots = {
		[1] = {
			pos = Vector(-0.88634,0.140404),
			dir = Vector.fromAngle(-1.85832),
			speed = Vector(0.331314,-0.122663),
			angularSpeed = Vector.fromAngle(0.0646932)
		},
		[2] = {
			pos = Vector(-0.391654,0.576961),
			dir = Vector.fromAngle(-1.76391),
			speed = Vector(0.236766,-0.0830987),
			angularSpeed = Vector.fromAngle(0.416014)
		},
		[3] = {
			pos = Vector(1.76722,-1.96718),
			dir = Vector.fromAngle(-1.38677),
			speed = Vector(-0.237062,-0.061856),
			angularSpeed = Vector.fromAngle(-0.0430019)
		},
		[4] = {
			pos = Vector(-0.761898,2.24565),
			dir = Vector.fromAngle(-2.09577),
			speed = Vector(-0.861553,0.406132),
			angularSpeed = Vector.fromAngle(-1.10344)
		},
		[5] = {
			pos = Vector(0.19553,2.08599),
			dir = Vector.fromAngle(-1.21616),
			speed = Vector(-0.00349166,0.00263252),
			angularSpeed = Vector.fromAngle(-0.00526154)
		},
		[10] = {
			pos = Vector(0.374264,2.3324),
			dir = Vector.fromAngle(-1.26692),
			speed = Vector(0.00491276,-0.0051928),
			angularSpeed = Vector.fromAngle(1.90645e-05)
		},
	},
	yellowGoalie = 7,
	yellowRobots = {
		[0] = {
			pos = Vector(-1.53908,-1.34895),
			dir = Vector.fromAngle(-0.643515),
			speed = Vector(0.384134,1.69793),
			angularSpeed = Vector.fromAngle(-0.529191)
		},
		[2] = {
			pos = Vector(1.68409,-2.55011),
			dir = Vector.fromAngle(1.77044),
			speed = Vector(0.407719,0.427127),
			angularSpeed = Vector.fromAngle(0.466998)
		},
		[3] = {
			pos = Vector(-1.06612,1.72835),
			dir = Vector.fromAngle(-0.683572),
			speed = Vector(0.19653,-0.383806),
			angularSpeed = Vector.fromAngle(-0.909653)
		},
		[4] = {
			pos = Vector(0.698769,-2.22351),
			dir = Vector.fromAngle(0.816358),
			speed = Vector(-0.00308184,0.0125537),
			angularSpeed = Vector.fromAngle(0.120367)
		},
		[5] = {
			pos = Vector(-0.193653,0.471421),
			dir = Vector.fromAngle(-1.52714),
			speed = Vector(0.653194,1.50165),
			angularSpeed = Vector.fromAngle(0.390014)
		},
		[7] = {
			pos = Vector(0.328748,-2.92295),
			dir = Vector.fromAngle(0.205976),
			speed = Vector(0.00100773,-0.00342283),
			angularSpeed = Vector.fromAngle(0.066189)
		},
	},
}

return situation
