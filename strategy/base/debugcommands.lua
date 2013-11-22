--[[
--- Some functions to modify the world during debug.
module "debugcommands"
]]--
local DebugCommands = {}
local World = require "../base/world"
local Coordinates = require "../base/coordinates"
local sendRefereeCommand = amun.sendRefereeCommand
local sendCommand = amun.sendCommand

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
	TimeoutBlue = "TIMEOUT_BLUE",

	KickoffYellow = "NORMAL_START", -- these entries are just used for validness checks
	KickoffBlue = "NORMAL_START",
	PenaltyYellow = "NORMAL_START",
	PenaltyBlue = "NORMAL_START"
}


--- Set referee command. The new values are not visible before the next frame!
-- refereeCommand uses most values of World.RefereeState. However "Game" does not exist
-- and "Kickoff...", "Penalty..." are only reachable via their "...Prepare" state followed by sending "Start"
-- @usage DebugCommands.sendRefereeCommand("GameForce", "SecondHalf")
-- @usage DebugCommands.sendRefereeCommand("DirectOffensive")
-- @param [refereeCommand string - similar to values of World.RefereeState]
-- @param [gameStage string - use value of World.GameStage]
function DebugCommands.sendRefereeCommand(refereeCommand, gameStage)
	assert(amun.isDebug, "only works in debug mode")
	local origState = World._getFullRefereeState()
	-- require origState to be populated, is guaranteed once World.update() was called
	assert(origState, "Musn't be called before World.update(), that is outside of Entrypoints")
	
	-- fill message with default values
	local state = { state = origState.state, stage = origState.stage,
		packet_timestamp = 0, command_timestamp = 0,
		stage_time_left = origState.stage_time_left,
		-- random command_counter to prevent interference with internal referee
		command_counter = math.random(1000000),
		blue = origState.blue, yellow = origState.yellow
	}

	-- update gamestage
	if gameStage then
		state.stage = stageUnmapping[gameStage]
		if not state.stage then
			error("Invalid game stage name: " .. gameStage)
		end
	end

	-- unmap referee command from team local to global naming
	-- that is revert Offensive/Defensive to Blue/Yellow
	local origCommand = refereeCommand or World.RefereeState -- keep for error message
	local command
	if World.TeamIsBlue then
		command = origCommand:gsub("Offensive", "Blue"):gsub("Defensive", "Yellow")
	else
		command = origCommand:gsub("Offensive", "Yellow"):gsub("Defensive", "Blue")
	end
	-- map World.RefereeState = "Game" to "Start" command
	if not refereeCommand and command == "Game" then
		command = "Start"
	end
	-- map "refereeState" to command
	state.command = commandUnmapping[command]
	if not state.command then
		error("Invalid referee command name: " .. origCommand)
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
			position = true,
			p_x = pos.x, p_y = pos.y, phi = Coordinates.toGlobal(robot.dir),
			v_x = speed.x, v_y = speed.y, omega = robot.angularSpeed
		})
	end

	sendCommand({ simulator = simCommand, tracking = { reset = true } })
end

return DebugCommands
