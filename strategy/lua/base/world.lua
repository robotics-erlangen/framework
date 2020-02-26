--[[
--- Provides informations about game state
module "World"
]]--

--[[***********************************************************************
*   Copyright 2015 Alexander Danzer, Michael Eischer, Christian Lobmeier, *
*       Philipp Nordhus                                                   *
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

local amun = amun
local Ball = require "../base/ball"
local Constants = require "../base/constants"
local Coordinates = require "../base/coordinates"
local Generation = require "../base/generation"
local mixedTeam = require "../base/mixedteam"
local Robot = require "../base/robot"

--- Ball and team informations.
-- @class table
-- @name World
-- @field Ball Ball - current Ball
-- @field FriendlyRobots Robot[] - List of own robots in an arbitary order
-- @field FriendlyInvisibleRobots Robot[] - Own robots which currently aren't tracked
-- @field FriendlyRobotsById Map<int,Robot> - List of own robots with robot id as index
-- @field FriendlyRobotsAll Robot[] - List of all own robots in an arbitary order
-- @field FriendlyKeeper Robot - Own keeper if on field or nil
-- @field OpponentRobots Robot[] - List of opponent robots in an arbitary order
-- @field OpponentRobotsById Robot[] - List of opponent robots with robot id as index
-- @field OpponentKeeper Robot - Opponent keeper if on field or nil
-- @field Robots Robot[] - Every visible robot in an arbitary order
-- @field TeamIsBlue bool - True if we are the blue team, otherwise we're yellow
-- @field IsSimulated bool - True if the world is simulated
-- @field IsReplay bool - True if the current strategy run is a replay run
-- @field IsLargeField bool - True if playing on the large field
-- @field Time number - Current unix timestamp in seconds (with nanoseconds precision)
-- @field TimeDiff number - Time since last update
-- @field BallPlacementPos - Position where the ball has to be placed
-- @field RefereeState string - current refereestate, can be one of these:
-- Halt, Stop, Game, GameForce,
-- KickoffOffensivePrepare, KickoffDefensivePrepare, KickoffOffensive, KickoffDefensive,
-- PenaltyOffensivePrepare, PenaltyDefensivePrepare, PenaltyOffensive, PenaltyDefensive,
-- DirectOffensive, DirectDefensive, IndirectOffensive, IndirectDefensive,
-- TimeoutOffensive, TimeoutDefensive, BallPlacementOffensive, BallPlacementDefensive
-- @field GameStage string - current game stage, can be one of these:
-- FirstHalfPre, FirstHalf, HalfTime, SecondHalfPre, SecondHalf,
-- ExtraTimeBreak, ExtraFirstHalfPre, ExtraFirstHalf, ExtraHalfTime, ExtraSecondHalfPre, ExtraSecondHalf,
-- PenaltyShootoutBreak, PenaltyShootout, PostGame
-- @field MixedTeam Table[] - Mixed team data sent by partner team, indexed by robot id, only set if data was received;
-- Has the following fields: role string (values: Default, Goalie, Defense, Offense), targetPos* vector,
-- targetDir* number, shootPos* vector, * = optional
-- @field FriendlyYellowCards table - List of the remaining times for all active friendly yellow cards
-- @field OpponentYellowCards table - List of the remaining times for all active opponent yellow cards
-- @field FriendlyRedCards number - number of red cards received for the own team
-- @field OpponentRedCards number - number of red cards the opponent received

local World = {}

World.AoI = nil
World.Ball = Ball()
World.FriendlyRobots = {}
World.FriendlyInvisibleRobots = {}
World.FriendlyRobotsById = {}
World.FriendlyRobotsAll = {}
World.FriendlyKeeper = nil
World.OpponentRobots = {}
World.OpponentRobotsById = {}
World.OpponentKeeper = nil
World.Robots = {}
World.TeamIsBlue = false
World.IsSimulated = false
World.IsLargeField = false
World.MixedTeam = nil
World.SelectedOptions = nil

World.RULEVERSION = nil

World.Geometry = {}
--- Field geometry.
-- Lengths in meter
-- @class table
-- @name World.Geometry
-- @field FieldWidth number - Width of the playing field (short side)
-- @field FieldHeight number - Height of the playing field (long side)
-- @field FieldWidthHalf number - Half width of the playing field (short side)
-- @field FieldHeightHalf number - Half height of the playing field (long side)
-- @field FieldWidthQuarter number - Quarter width of the playing field (short side)
-- @field FieldHeightQuarter number - Quarter height of the playing field (long side)
-- @field GoalWidth number - Inner width of the goals
-- @field GoalWallWidth number - Width of the goal walls
-- @field GoalDepth number - Depth of the goal
-- @field GoalHeight number - Height of the goals
-- @field LineWidth number - Width of the game field lines
-- @field CenterCircleRadius number - Radius of the center circle
-- @field FreeKickDefenseDist number - Distance to keep to opponent defense area during a freekick
-- @field DefenseRadius number - Radius of the defense area corners (pre 2018)
-- @field DefenseStretch number - Distance between the defense areas quarter circles (pre 2018)
-- @field DefenseWidth number - Width of the rectangular defense area (longer side) (since 2018)
-- @field DefenseHeight number - Height of the rectangular defense area (shorter side) (since 2018)
-- @field FriendlyPenaltySpot Vector - Position of our own penalty spot
-- @field OpponentPenaltySpot Vector - Position of the opponent's penalty spot
-- @field PenaltyLine number - Maximal distance from centerline during an offensive penalty
-- @field OwnPenaltyLine number - Maximal distance from centerline during an defensive penalty
-- @field FriendlyGoal Vector - Center point of the goal on the line
-- @field FriendlyGoalLeft Vector
-- @field FriendlyGoalRight Vector
-- @field OpponentGoal Vector - Center point of the goal on the line
-- @field OpponentGoalLeft Vector
-- @field OpponentGoalRight Vector
-- @field BoundaryWidth number - Free distance around the playing field

-- initializes Team and Geometry data
function World._init()
	World.TeamIsBlue = amun.isBlue()
	local geom = amun.getGeometry()
	World._updateGeometry(geom)
	World._updateRuleVersion(geom)
	World._updateTeam(amun.getTeam())
end

--- Update world state.
-- Has to be called once each frame
-- @name update
-- @return bool - false if no vision data was received since strategy start
function World.update()
	if World.SelectedOptions == nil then
		World.SelectedOptions = amun.getSelectedOptions()
	end
	local hasVisionData = World._updateWorld(amun.getWorldState())
	World._updateGameState(amun.getGameState())
	World._updateUserInput(amun.getUserInput())
	World.IsReplay = amun.isReplay and amun.isReplay() or false
	return hasVisionData
end

-- Creates generation specific robot object for own team
function World._updateTeam(state)
	local friendlyRobotsById = {}
	local friendlyRobotsAll = {}
	for _, rdata in ipairs(state.robot) do
		local robot = Generation.factory(rdata)
		friendlyRobotsById[rdata.id] = robot
		table.insert(friendlyRobotsAll, robot)
	end
	World.FriendlyRobotsById = friendlyRobotsById
	World.FriendlyRobotsAll = friendlyRobotsAll
end

-- Get rule version from geometry
function World._updateRuleVersion(geom)
	if not geom.type or geom.type == "TYPE_2014" then
		World.RULEVERSION = "2017"
	else
		World.RULEVERSION = "2018"
	end
end

-- Setup field geometry
function World._updateGeometry(geom)
	local wgeom = World.Geometry
	wgeom.FieldWidth = geom.field_width
	wgeom.FieldWidthHalf = geom.field_width / 2
	wgeom.FieldWidthQuarter = geom.field_width / 4
	wgeom.FieldHeight = geom.field_height
	wgeom.FieldHeightHalf = geom.field_height / 2
	wgeom.FieldHeightQuarter = geom.field_height / 4

	wgeom.GoalWidth = geom.goal_width
	wgeom.GoalWallWidth = geom.goal_wall_width
	wgeom.GoalDepth = geom.goal_depth
	wgeom.GoalHeight = geom.goal_height

	wgeom.LineWidth = geom.line_width
	wgeom.CenterCircleRadius = geom.center_circle_radius
	wgeom.FreeKickDefenseDist = geom.free_kick_from_defense_dist

	wgeom.DefenseRadius = geom.defense_radius
	wgeom.DefenseStretch = geom.defense_stretch
	wgeom.DefenseStretchHalf = geom.defense_stretch / 2
	wgeom.DefenseWidth = geom.defense_width or geom.defense_stretch
	wgeom.DefenseHeight = geom.defense_height or geom.defense_radius
	wgeom.DefenseWidthHalf = (geom.defense_width or geom.defense_stretch) / 2

	wgeom.FriendlyPenaltySpot = Vector.createReadOnly(0, - wgeom.FieldHeightHalf + geom.penalty_spot_from_field_line_dist)
	wgeom.OpponentPenaltySpot = Vector.createReadOnly(0, wgeom.FieldHeightHalf - geom.penalty_spot_from_field_line_dist)
	wgeom.PenaltyLine = wgeom.OpponentPenaltySpot.y - geom.penalty_line_from_spot_dist
	wgeom.OwnPenaltyLine = wgeom.FriendlyPenaltySpot.y + geom.penalty_line_from_spot_dist

	-- The goal posts are on the field lines
	wgeom.FriendlyGoal = Vector.createReadOnly(0, - wgeom.FieldHeightHalf)
	wgeom.FriendlyGoalLeft = Vector.createReadOnly(- wgeom.GoalWidth / 2, wgeom.FriendlyGoal.y)
	wgeom.FriendlyGoalRight = Vector.createReadOnly(wgeom.GoalWidth / 2, wgeom.FriendlyGoal.y)

	wgeom.OpponentGoal = Vector.createReadOnly(0, wgeom.FieldHeightHalf)
	wgeom.OpponentGoalLeft = Vector.createReadOnly(- wgeom.GoalWidth / 2, wgeom.OpponentGoal.y)
	wgeom.OpponentGoalRight = Vector.createReadOnly(wgeom.GoalWidth / 2, wgeom.OpponentGoal.y)

	wgeom.BoundaryWidth = geom.boundary_width

	World.Geometry = table.readonlytable(World.Geometry)

	World.IsLargeField = wgeom.FieldWidth > 5 and wgeom.FieldHeight > 7
end

function World._updateWorld(state)
	-- Get time
	if World.Time then
		World.TimeDiff = state.time * 1E-9 - World.Time
	else
		World.TimeDiff = 0
	end
	World.Time = state.time * 1E-9
	math.randomseed(World.Time)
	assert(World.Time > 0, "Invalid World.Time. Outdated ra version!")
	if World.IsSimulated ~= state.is_simulated then
		World.IsSimulated = state.is_simulated
		Constants.switchSimulatorConstants(World.IsSimulated)
	end

	local radioResponses = state.radio_response

	-- update ball if available
	World.Ball:_update(state.ball, World.Time)

	local dataFriendly = World.TeamIsBlue and state.blue or state.yellow
	if dataFriendly then
		-- sort data by robot id
		local dataById = {}
		for _,rdata in ipairs(dataFriendly) do
			dataById[rdata.id] = rdata
		end

		-- Update data of every own robot
		World.FriendlyRobots = {}
		World.FriendlyInvisibleRobots = {}
		for _, robot in ipairs(World.FriendlyRobotsAll) do
			-- get responses for the current robot
			-- these are identified by the robot generation and id
			local robotResponses = {}
			for _, response in ipairs(radioResponses) do
				if response.generation == robot.generation
						and response.id == robot.id then
					table.insert(robotResponses, response)
				end
			end

			robot:_update(dataById[robot.id], World.Time, robotResponses)
			robot:_updatePathBoundaries(World.Geometry, World.AoI)
			-- sort robot into visible / not visible
			if robot.isVisible then
				table.insert(World.FriendlyRobots, robot)
			else
				table.insert(World.FriendlyInvisibleRobots, robot)
			end
		end
	end

	local dataOpponent = World.TeamIsBlue and state.yellow or state.blue
	if dataOpponent then
		-- only keep robots that are still existent
		local opponentRobotsById = World.OpponentRobotsById
		World.OpponentRobots = {}
		World.OpponentRobotsById = {}
		-- just update every opponent robot
		-- robots that are invisible for more than one second are dropped by amun
		for _,rdata in ipairs(dataOpponent) do
			local robot = opponentRobotsById[rdata.id]
			opponentRobotsById[rdata.id] = nil
			if not robot then
				robot = Robot(rdata.id, false)
			end
			robot:_update(rdata, World.Time)
			table.insert(World.OpponentRobots, robot)
			World.OpponentRobotsById[rdata.id] = robot
		end
		-- mark dropped robots as invisible
		for _,robot in pairs(opponentRobotsById) do
			robot:_update(nil, World.Time)
		end
	end

	World.Robots = table.copy(World.FriendlyRobots)
	table.append(World.Robots, World.OpponentRobots)

	-- convert mixed team info
	if state.mixed_team_info and state.mixed_team_info.plans then
		World.MixedTeam = mixedTeam.decodeData(state.mixed_team_info.plans)
	else
		World.MixedTeam = nil
	end

	-- update aoi data
	World.AoI = state.tracking_aoi

	-- no vision data only if the parameter is false
	return state.has_vision_data ~= false
end

World.gameStageMapping = {
	NORMAL_FIRST_HALF_PRE = "FirstHalfPre",
	NORMAL_FIRST_HALF = "FirstHalf",
	NORMAL_HALF_TIME = "HalfTime",
	NORMAL_SECOND_HALF_PRE = "SecondHalfPre",
	NORMAL_SECOND_HALF = "SecondHalf",

	EXTRA_TIME_BREAK = "ExtraTimeBreak",
	EXTRA_FIRST_HALF_PRE = "ExtraFirstHalfPre",
	EXTRA_FIRST_HALF = "ExtraFirstHalf",
	EXTRA_HALF_TIME = "ExtraHalfTime",
	EXTRA_SECOND_HALF_PRE = "ExtraSecondHalfPre",
	EXTRA_SECOND_HALF = "ExtraSecondHalf",

	PENALTY_SHOOTOUT_BREAK = "PenaltyShootoutBreak",
	PENALTY_SHOOTOUT = "PenaltyShootout",
	POST_GAME = "PostGame"
}

-- keep for use by debugcommands.sendRefereeCommand
local fullRefereeState = nil

function World._getFullRefereeState()
	return fullRefereeState
end

-- updates referee command and keeper information
function World._updateGameState(state)
	fullRefereeState = state
	local refState = state.state
	-- map referee command to own team
	if World.TeamIsBlue then
		World.RefereeState = refState:gsub("Blue", "Offensive"):gsub("Yellow", "Defensive")
	else
		World.RefereeState = refState:gsub("Yellow", "Offensive"):gsub("Blue", "Defensive")
	end

	if World.RefereeState == "TimeoutOffensive" or World.RefereeState == "TimeoutDefensive" then
		World.RefereeState = "Halt"
	end

	if state.designated_position and state.designated_position.x then
		World.BallPlacementPos = Coordinates.toLocal(Vector.createReadOnly(
			-- refbox position message uses millimeters
			-- ssl-vision's coordinate system is rotated by 90 degrees
			-state.designated_position.y / 1000,
			state.designated_position.x / 1000))
	end

	World.GameStage = World.gameStageMapping[state.stage]

	local friendlyTeamInfo = World.TeamIsBlue and state.blue or state.yellow
	local opponentTeamInfo = World.TeamIsBlue and state.yellow or state.blue

	local friendlyKeeperId = friendlyTeamInfo.goalie
	local opponentKeeperId = opponentTeamInfo.goalie

	local friendlyKeeper = World.FriendlyRobotsById[friendlyKeeperId]
	if friendlyKeeper and not friendlyKeeper.isVisible then
		friendlyKeeper = nil
	end

	local opponentKeeper = World.OpponentRobotsById[opponentKeeperId]
	if opponentKeeper and not opponentKeeper.isVisible then
		opponentKeeper = nil
	end

	World.FriendlyKeeper = friendlyKeeper
	World.OpponentKeeper = opponentKeeper

	--[[
	optional sint32 stage_time_left = 2;
	message TeamInfo {
		// The team's name (empty string if operator has not typed anything).
		required string name = 1;
		// The number of goals scored by the team during normal play and overtime.
		required uint32 score = 2;
		// The number of red cards issued to the team since the beginning of the game.
		required uint32 red_cards = 3;
		// The amount of time (in microseconds) left on each yellow card issued to the team.
		// If no yellow cards are issued, this array has no elements.
		// Otherwise, times are ordered from smallest to largest.
		repeated uint32 yellow_card_times = 4 [packed=true];
		// The total number of yellow cards ever issued to the team.
		required uint32 yellow_cards = 5;
		// The number of timeouts this team can still call.
		// If in a timeout right now, that timeout is excluded.
		required uint32 timeouts = 6;
		// The number of microseconds of timeout this team can use.
		required uint32 timeout_time = 7;
	}]]

	World.FriendlyYellowCards = {}
	for _, time in ipairs(friendlyTeamInfo.yellow_card_times) do
		table.insert(World.FriendlyYellowCards, time / 1000000)
	end
	World.OpponentYellowCards = {}
	for _, time in ipairs(opponentTeamInfo.yellow_card_times) do
		table.insert(World.OpponentYellowCards, time / 1000000)
	end
	World.FriendlyRedCards = friendlyTeamInfo.red_cards
	World.OpponentRedCards = opponentTeamInfo.red_cards
end

-- update and handle user inputs set for own robots
function World._updateUserInput(input)
	if input.radio_command then
		for _, robot in ipairs(World.FriendlyRobotsAll) do
			robot:_updateUserControl(nil) -- clear
		end
		for _, cmd in ipairs(input.radio_command) do
			local robot = World.FriendlyRobotsById[cmd.id]
			if robot then
				robot:_updateUserControl(cmd.command)
			end
		end
	end
	if input.move_command then
		-- cache the movecommands for 0.3 seconds if it not there every frame
		for _, robot in ipairs(World.FriendlyRobotsAll) do
			-- < 0 for going back in logfiles while replaying
			if robot.moveCommand and (World.Time - robot.moveCommand.time > 0.3 or
				World.Time - robot.moveCommand.time < 0) then
				robot.moveCommand = nil
			end
		end
		for _, cmd in ipairs(input.move_command) do
			if World.FriendlyRobotsById[cmd.id] then
				World.FriendlyRobotsById[cmd.id].moveCommand = {time = World.Time, pos = Coordinates.toGlobal(Vector(cmd.p_x, cmd.p_y))}
			else
				local teamColorString = World.TeamIsBlue and "blue" or "yellow"
				log("<font color=\"red\">WARNING: </font>please select robot "..cmd.id.." for team "..teamColorString..
					" for pulling it!")
			end
		end
	end
end


--- Stops own robots and enables standby
-- @name haltOwnRobots
function World.haltOwnRobots()
	for _, robot in ipairs(World.FriendlyRobotsAll) do
		if not robot.moveCommand then
			robot:setStandby(true)
			robot:halt()
		end
	end
end

--- Set generated commands for our robots.
-- Robots without a command stop by default
-- @name setRobotCommands
function World.setRobotCommands()
	for _, robot in ipairs(World.FriendlyRobotsAll) do
		amun.setCommand(robot.generation, robot.id, robot:_command())
	end
end

World._init()

return World
