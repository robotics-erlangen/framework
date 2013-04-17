--[[
--- Provides informations about game state
module "World"
]]--
local Ball = require "../base/ball"
local Robot = require "../base/robot"
local Generation = require "../base/generation"
local amun = amun

--- Ball and team informations.
-- @class table
-- @name World
-- @field Ball Ball - current Ball
-- @field FriendlyRobots Robot[] - List of own robots in an arbitary order
-- @field FriendlyInvisibleRobots Robot[] - Own robots which currently aren't tracked
-- @field FriendlyRobotsById Robot[] - List of own robots with robot id as index
-- @field FriendlyKeeper Robot - Own keeper if on field or nil
-- @field OpponentRobots Robot[] - List of opponent robots in an arbitary order
-- @field OpponentRobotsById Robot[] - List of opponent robots with robot id as index
-- @field OpponentKeeper Robot - Opponent keeper if on field or nil
-- @field Robots Robot[] - Every visible robot in an arbitary order
-- @field TeamIsBlue bool - True if we are the blue team, otherwise we're yellow
-- @field Time number - Current unix timestamp in seconds (with nanoseconds precision)
-- @field TimeDiff number - Time since last update
-- @field RefereeState string - current refereestate, can be one of these:
-- Halt, Stop, Game, GameForce,
-- KickoffOffensivePrepare, KickoffDefensivePrepare, KickoffOffensive, KickoffDefensive,
-- PenaltyOffensivePrepare, PenaltyDefensivePrepare, PenaltyOffensive, PenaltyDefensive,
-- DirectOffensive, DirectDefensive, IndirectOffensive, IndirectDefensive
-- @field GameStage string - current game stage, can be one of these:
-- FirstHalfPre, FirstHalf, HalfTime, SecondHalfPre, SecondHalf
-- ExtraTimeBreak, ExtraFirstHalfPre, ExtraFirstHalf, ExtraHalfTime, ExtraSecondHalfPre, ExtraSecondHalf,
-- PenaltyShootoutBreak, PenaltyShootout, PostGame

local World = {}

World.Ball = Ball.create()
World.FriendlyRobots = {}
World.FriendlyInvisibleRobots = {}
World.FriendlyRobotsById = {}
World.FriendlyKeeper = nil
World.OpponentRobots = {}
World.OpponentRobotsById = {}
World.OpponentKeeper = nil
World.Robots = {}
World.TeamIsBlue = false

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
-- @field DefenseRadius number - Radius of the defense area corners
-- @field DefenseStretch number - Distance between the defense areas quarter circles
-- @field FriendlyPenaltySpot Vector - Position of our own penalty spot
-- @field OpponentPenaltySpot Vector - Position of the opponent's penalty spot
-- @field PenaltyLine number - Maximal distance from centerline during a penalty
-- @field FriendlyGoal Vector - Center point of the goal on the line
-- @field FriendlyGoalLeft Vector
-- @field FriendlyGoalRight Vector
-- @field OpponentGoal Vector - Center point of the goal on the line
-- @field OpponentGoalLeft Vector
-- @field OpponentGoalRight Vector
-- @field BoundaryWidth number - Free distance around the playing field
-- @field RefereeWidth number - Width of area reserved for referee

-- initializes Team and Geometry data
function World._init()
	World.TeamIsBlue = amun.isBlue()
	World._updateGeometry(amun.getGeometry())
	World._updateTeam(amun.getTeam())
end

--- Update world state.
-- Has to be called once each frame
-- @name update
function World.update()
	World._updateWorld(amun.getWorldState())
	World._updateGameState(amun.getGameState())
end

-- Creates generation specific robot object for own team
function World._updateTeam(state)
	local friendlyRobotsById = {}
	for _, rdata in pairs(state.robot) do
		friendlyRobotsById[rdata.id] = Generation.create(rdata, World.Geometry)
	end
	World.FriendlyRobotsById = friendlyRobotsById
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

	wgeom.FriendlyPenaltySpot = Vector.create(0, - wgeom.FieldHeightHalf + geom.penalty_spot_from_field_line_dist)
	wgeom.OpponentPenaltySpot = Vector.create(0, wgeom.FieldHeightHalf - geom.penalty_spot_from_field_line_dist)
	wgeom.PenaltyLine = wgeom.OpponentPenaltySpot.y - geom.penalty_line_from_spot_dist

	-- The goal posts are on the field lines
	wgeom.FriendlyGoal = Vector.create(0, - wgeom.FieldHeightHalf + wgeom.LineWidth)
	wgeom.FriendlyGoalLeft = Vector.create(- wgeom.GoalWidth / 2, wgeom.FriendlyGoal.y)
	wgeom.FriendlyGoalRight = Vector.create(wgeom.GoalWidth / 2, wgeom.FriendlyGoal.y)

	wgeom.OpponentGoal = Vector.create(0, wgeom.FieldHeightHalf - wgeom.LineWidth)
	wgeom.OpponentGoalLeft = Vector.create(- wgeom.GoalWidth / 2, wgeom.OpponentGoal.y)
	wgeom.OpponentGoalRight = Vector.create(wgeom.GoalWidth / 2, wgeom.OpponentGoal.y)

	wgeom.BoundaryWidth = geom.boundary_width
	wgeom.RefereeWidth = geom.referee_width
end

function World._updateWorld(state)
	-- Get time
	if World.Time then
		World.TimeDiff = state.time * 1E-9 - World.Time
	else
		World.TimeDiff = 0
	end
	World.Time = state.time * 1E-9

	-- update ball if available
	if state.ball then
		World.Ball:_update(state.ball, World.Time)
	end
	
	local dataFriendly = World.TeamIsBlue and state.blue or state.yellow
	if dataFriendly then
		-- sort data by robot id
		local dataById = {}
		for _,rdata in pairs(dataFriendly) do
			dataById[rdata.id] = rdata
		end

		-- Update data of every own robot
		World.FriendlyRobots = {}
		World.FriendlyInvisibleRobots = {}
		for id, robot in pairs(World.FriendlyRobotsById) do
			robot:_update(dataById[id], World.Time)
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
		for _,rdata in pairs(dataOpponent) do
			local robot = opponentRobotsById[rdata.id]
			if not robot then
				robot = Robot.create(rdata.id, false)
			end
			robot:_update(rdata, World.Time)
			table.insert(World.OpponentRobots, robot)
			World.OpponentRobotsById[rdata.id] = robot
		end
	end
	
	World.Robots = table.copy(World.FriendlyRobots)
	table.append(World.Robots, World.OpponentRobots)
end

local stageMapping = {
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
	
-- updates referee command and keeper information
function World._updateGameState(state)
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
	
	World.GameStage = stageMapping[state.stage]

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
end

--- Stops own robots and enables standby
-- @name haltOwnRobots
function World.haltOwnRobots()
	for _, robot in pairs(World.FriendlyRobotsById) do
		robot:setStandby(true)
		robot:halt()
	end
end

--- Set generated commands for our robots.
-- Robots without a command stop by default
-- @name setRobotCommands
function World.setRobotCommands()
	for _, robot in pairs(World.FriendlyRobotsById) do
		robot:_setCommand()
	end
end

World._init()

return World
