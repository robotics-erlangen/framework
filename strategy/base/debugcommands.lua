--[[
--- Some functions to modify the world during debug.
module "debugcommands"
]]--
local DebugCommands = {}
local World = require "../base/world"
local sendRefereeCommand = amun.sendRefereeCommand

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

--- Set referee command.
-- refereeCommand is similar to World.RefereeState. But Game does not exist and KickOff, Penalty are only
-- reachable via their prepare state followed by "Start"
-- @param [refereeCommand string - similar to World.RefereeState]
-- @param [gameStage string - same as in World.GameStage]
function DebugCommands.sendRefereeCommand(refereeCommand, gameStage)
	assert(amun.isDebug, "only works in debug mode")
	local origState = World._getFullRefereeState()
	
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
	end

	-- unmap referee command from own team
	local command = refereeCommand or World.RefereeCommand
	if World.TeamIsBlue then
		command = refereeCommand:gsub("Offensive", "Blue"):gsub("Defensive", "Yellow")
	else
		command = refereeCommand:gsub("Offensive", "Yellow"):gsub("Defensive", "Blue")
	end
	-- map "refereeState" to command or default to "Start"
	state.command = commandUnmapping[command] or "Start"
	
	sendRefereeCommand(state)
end

return DebugCommands
