--[[
--- Provides informations about game state
module "World"
]]--
local Ball = require "../base/ball"
local Robot = require "../base/robot"
local Generation = require "../base/generation"

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
-- DirectOffensive, DirectDefensive, IndirectOffensive, IndirectDefensive,
-- TimeoutOffensive, TimeoutDefensive

local World = {}

World.Ball = Ball.create()
World.FriendlyRobots = {}
World.FriendlyInvisibleRobots = {}
World.FriendlyRobotsById = {}
World.OpponentRobots = {}
World.OpponentRobotsById = {}
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

function World._init()
	World.TeamIsBlue = amun.isBlue()
	World._updateGeometry(amun.getGeometry())
	World._updateTeam(amun.getTeam())
end

function World._update()
	World._updateWorld(amun.getWorldState())
	World._updateGameState(amun.getGameState())
	World._haltHiddenRobots()
end

function World._updateTeam(state)
	local friendlyRobotsById = {}
	for _, rdata in pairs(state.robot) do
		friendlyRobotsById[rdata.id] = Generation.create(rdata, World.Geometry)
	end
	World.FriendlyRobotsById = friendlyRobotsById
end

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
	if World.Time then
		World.TimeDiff = state.time * 1E-9 - World.Time
	else
		World.TimeDiff = 0
	end
	World.Time = state.time * 1E-9

	if state.ball then
		World.Ball:_update(state.ball, World.Time)
	end
	
	local dataFriendly = World.TeamIsBlue and state.blue or state.yellow
	if dataFriendly then
		local dataById = {}
		for _,rdata in pairs(dataFriendly) do
			dataById[rdata.id] = rdata
		end

		World.FriendlyRobots = {}
		World.FriendlyInvisibleRobots = {}
		for id, robot in pairs(World.FriendlyRobotsById) do
			robot:_update(dataById[id], World.Time)
			if robot.isVisible then
				table.insert(World.FriendlyRobots, robot)
			else
				table.insert(World.FriendlyInvisibleRobots, robot)
			end
		end
	end

	local dataOpponent = World.TeamIsBlue and state.yellow or state.blue
	if dataOpponent then
		local opponentRobotsById = World.OpponentRobotsById
		World.OpponentRobots = {}
		World.OpponentRobotsById = {}
		for _,rdata in pairs(dataOpponent) do
			local robot = opponentRobotsById[rdata.id]
			if not robot then
				robot = Robot.create(rdata.id, false)
			end
			robot:_update(rdata, World.Time)
			--TODO keep opponents if invisible for up to 1? second?
			table.insert(World.OpponentRobots, robot)
			World.OpponentRobotsById[rdata.id] = robot
		end
	end
	
	World.Robots = table.copy(World.FriendlyRobots)
	table.append(World.Robots, World.OpponentRobots)
end

function World._updateGameState(state)
	local refState = state.state
	if World.TeamIsBlue then
		World.RefereeState = refState:gsub("Blue", "Offensive"):gsub("Yellow", "Defensive")
	else
		World.RefereeState = refState:gsub("Yellow", "Offensive"):gsub("Blue", "Defensive")
	end
	
	if World.RefereeState == "TimeoutOffensive" or World.RefereeState == "TimeoutDefensive" then
		World.RefereeState = "Halt"
	end

	local friendlyKeeperId = 1
	local opponentKeeperId = 1

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
	-- required Phase phase = 1;
	-- required int32 goals_blue = 3;
	-- required int32 goals_yellow = 4;
	-- required int32 time_remaining = 5;
end

function World.haltOwnRobots()
	for _, robot in pairs(World.FriendlyRobotsById) do
		robot:setStandby(true)
		robot:setControllerInput({})
	end
end

function World._haltHiddenRobots()
	for _, robot in pairs(World.FriendlyInvisibleRobots) do
		robot:setControllerInput({})
	end
end

function World._setRobotCommands()
	for _, robot in pairs(World.FriendlyRobotsById) do
		robot:_setCommand()
	end
end

return World
