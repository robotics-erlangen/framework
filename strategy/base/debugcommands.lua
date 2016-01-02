--[[
--- Some functions to modify the world during debug.
module "debugcommands"
]]--

--[[***********************************************************************
*   Copyright 2015 Alexander Danzer, Michael Eischer                      *
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

local DebugCommands = {}

local sendRefereeCommand = amun.sendRefereeCommand
local sendCommand = amun.sendCommand
local Coordinates = require "../base/coordinates"
local World = require "../base/world"


-- See stageMapping in World
local stageUnmapping = {
	FirstHalfPre = "NORMAL_FIRST_HALF_PRE",
	FirstHalf = "NORMAL_FIRST_HALF",
	HalfTime = "NORMAL_HALF_TIME",
	SecondHalfPre = "NORMAL_SECOND_HALF_PRE",
	SecondHalf = "NORMAL_SECOND_HALF",

	ExtraTimeBreak = "EXTRA_TIME_BREAK",
	ExtraFirstHalfPre = "EXTRA_FIRST_HALF_PRE",
	ExtraFirstHalf = "EXTRA_FIRST_HALF",
	ExtraHalfTime = "EXTRA_HALF_TIME",
	ExtraSecondHalfPre = "EXTRA_SECOND_HALF_PRE",
	ExtraSecondHalf = "EXTRA_SECOND_HALF",

	PenaltyShootoutBreak = "PENALTY_SHOOTOUT_BREAK",
	PenaltyShootout = "PENALTY_SHOOTOUT",
	PostGame = "POST_GAME"
}

local commandUnmapping = {
	Start = "NORMAL_START", -- special value to start kickoff and penalty
	Halt = "HALT",
	Stop = "STOP",
	GameForce = "FORCE_START",
	KickoffYellowPrepare = "PREPARE_KICKOFF_YELLOW",
	KickoffBluePrepare = "PREPARE_KICKOFF_BLUE",
	PenaltyYellowPrepare = "PREPARE_PENALTY_YELLOW",
	PenaltyBluePrepare = "PREPARE_PENALTY_BLUE",
	DirectYellow = "DIRECT_FREE_YELLOW",
	DirectBlue = "DIRECT_FREE_BLUE",
	IndirectYellow = "INDIRECT_FREE_YELLOW",
	IndirectBlue = "INDIRECT_FREE_BLUE",
	TimeoutYellow = "TIMEOUT_YELLOW",
	TimeoutBlue = "TIMEOUT_BLUE"
}


--- Set referee command. The new values are not visible before the next frame!
-- refereeCommand uses most values of World.RefereeState. However "Game" does not exist
-- and "Kickoff...", "Penalty..." are only reachable via their "...Prepare" state followed by sending "Start"
-- @usage DebugCommands.sendRefereeCommand("GameForce", "SecondHalf")
-- @usage DebugCommands.sendRefereeCommand("DirectOffensive")
-- @param [refereeCommand string - similar to values of World.RefereeState]
-- @param [gameStage string - use value of World.GameStage]
-- @param [blueKeeperID int - yellow keeper id]
-- @param [yellowKeeperID int - blue keeper id]
function DebugCommands.sendRefereeCommand(refereeCommand, gameStage, blueKeeperID, yellowKeeperID)
	assert(amun.isDebug, "only works in debug mode")
	local origState = World._getFullRefereeState()
	-- require origState to be populated, is guaranteed once World.update() was called
	assert(origState, "Musn't be called before World.update(), that is outside of Entrypoints")

	-- fill message with default values
	local state = { state = origState.state, stage = origState.stage, -- default values
		packet_timestamp = 0, command_timestamp = 0,
		stage_time_left = origState.stage_time_left,
		-- internal referee uses the command counter as delta
		-- 0 = don't change command, 1 = update command
		command_counter = 0,
		blue = origState.blue, yellow = origState.yellow
	}

	-- update gamestage
	if gameStage then
		state.stage = stageUnmapping[gameStage]
		if not state.stage then
			error("Invalid game stage name: " .. gameStage)
		end
	end

	if refereeCommand then
		-- map referee command from team local to global naming
		-- that is revert *Offensive/Defensive to *Blue/Yellow
		local command
		if World.TeamIsBlue then
			command = refereeCommand:gsub("Offensive", "Blue"):gsub("Defensive", "Yellow")
		else
			command = refereeCommand:gsub("Offensive", "Yellow"):gsub("Defensive", "Blue")
		end
		-- map "refereeState" to command
		state.command = commandUnmapping[command]
		if not state.command then
			error("Invalid referee command name: " .. refereeCommand)
		end
		state.command_counter = 1 -- trigger command update
	end

	if blueKeeperID then
		state.blue.goalie = blueKeeperID
	end

	if yellowKeeperID then
		state.yellow.goalie = yellowKeeperID
	end

	sendRefereeCommand(state)
end

--- Move ball and robots to a given position.
-- Every parameter in these data structures is required!
-- ball: { pos = Vector, speed = Vector } <br/>
-- robot: { pos = Vector, dir = number, speed = Vector, angularSpeed = number }
-- @param [ball ball - ball target]
-- @param [friendlyRobots robot[] - friendly robots by id]
-- @param [opponentRobots robot[] - opponent robots by id]
function DebugCommands.moveObjects(ball, friendlyRobots, opponentRobots)
	assert(amun.isDebug, "only works in debug mode")
	assert(World.IsSimulated, "This can only be used in the simulator!")
	local simCommand = { move_blue = {}, move_yellow = {} }
	if ball then
		assert(ball.pos and ball.speed, "ball parameter missing")
		-- convert to global coordinate system
		local pos = Coordinates.toGlobal(ball.pos)
		local speed = Coordinates.toGlobal(ball.speed)
		simCommand.move_ball = {
			position = true, -- just position
			p_x = pos.x, p_y = pos.y,
			v_x = speed.x, v_y = speed.y
		}
	end

	local friendly, opponent -- handle blue / yellow team selection
	if World.TeamIsBlue then
		friendly = simCommand.move_blue
		opponent = simCommand.move_yellow
	else
		friendly = simCommand.move_yellow
		opponent = simCommand.move_blue
	end

	for id, robot in pairs(friendlyRobots or {}) do
		assert(robot.pos and robot.speed and robot.dir and robot.angularSpeed, "robot parameter missing")
		local pos = Coordinates.toGlobal(robot.pos)
		local speed = Coordinates.toGlobal(robot.speed)
		table.insert(friendly, {
			position = true, id = id, -- just position
			p_x = pos.x, p_y = pos.y, phi = Coordinates.toGlobal(robot.dir),
			v_x = speed.x, v_y = speed.y, omega = robot.angularSpeed
		})
	end
	for id, robot in pairs(opponentRobots or {}) do
		assert(robot.pos and robot.speed and robot.dir and robot.angularSpeed, "robot parameter missing")
		local pos = Coordinates.toGlobal(robot.pos)
		local speed = Coordinates.toGlobal(robot.speed)
		table.insert(opponent, {
			position = true, id = id, -- just position
			p_x = pos.x, p_y = pos.y, phi = Coordinates.toGlobal(robot.dir),
			v_x = speed.x, v_y = speed.y, omega = robot.angularSpeed
		})
	end

	sendCommand({ simulator = simCommand, tracking = { reset = true } })
end

return DebugCommands
