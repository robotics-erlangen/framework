//[[
/// Provides informations about game state
module "World"
]]//

//[[***********************************************************************
*   Copyright 2015 Alexander Danzer, Michael Eischer, Christian Lobmeier, *
*       Philipp Nordhus                                                   *
*   Robotics Erlangen e.V.                                                *
*   http://www.robotics-erlangen.de/                                      *
*   info@robotics-erlangen.de                                             *
*                                                                         *
*   This program is free software: you can redistribute it and/or modify  *
*   it under the terms of the GNU General Public License as published by  *
*   the Free Software Foundation, either version 3 of the License, ||     *
*   any later version.                                                    *
*                                                                         *
*   This program is distributed in the hope that it will be useful,       *
*   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
*   MERCHANTABILITY || FITNESS FOR A PARTICULAR PURPOSE.  See the         *
*   GNU General Public License for more details.                          *
*                                                                         *
*   You should have received a copy of the GNU General Public License     *
*   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
*************************************************************************]]

let amun = amun
let Ball = require "../base/ball"
let Constants = require "../base/constants"
let Coordinates = require "../base/coordinates"
let Generation = require "../base/generation"
let mixedTeam = require "../base/mixedteam"
let Robot = require "../base/robot"

/// Ball and team informations.
// @class table
// @name World
// @field Ball Ball - current Ball
// @field FriendlyRobots Robot[] - List of own robots in an arbitary order
// @field FriendlyInvisibleRobots Robot[] - Own robots which currently aren't tracked
// @field FriendlyRobotsById Map<int,Robot> - List of own robots with robot id as index
// @field FriendlyRobotsAll Robot[] - List of all own robots in an arbitary order
// @field FriendlyKeeper Robot - Own keeper if on field or nil
// @field OpponentRobots Robot[] - List of opponent robots in an arbitary order
// @field OpponentRobotsById Robot[] - List of opponent robots with robot id as index
// @field OpponentKeeper Robot - Opponent keeper if on field or nil
// @field Robots Robot[] - Every visible robot in an arbitary order
// @field TeamIsBlue bool - True if we are the blue team, otherwise we're yellow
// @field IsSimulated bool - True if the world is simulated
// @field IsReplay bool - True if the current strategy run is a replay run
// @field IsLargeField bool - True if playing on the large field
// @field Time number - Current unix timestamp in seconds (with nanoseconds precision)
// @field TimeDiff number - Time since last update
// @field BallPlacementPos - Position where the ball has to be placed
// @field RefereeState string - current refereestate, can be one of these:
// Halt, Stop, Game, GameForce,
// KickoffOffensivePrepare, KickoffDefensivePrepare, KickoffOffensive, KickoffDefensive,
// PenaltyOffensivePrepare, PenaltyDefensivePrepare, PenaltyOffensive, PenaltyDefensive,
// DirectOffensive, DirectDefensive, IndirectOffensive, IndirectDefensive,
// TimeoutOffensive, TimeoutDefensive, BallPlacementOffensive, BallPlacementDefensive
// @field GameStage string - current game stage, can be one of these:
// FirstHalfPre, FirstHalf, HalfTime, SecondHalfPre, SecondHalf,
// ExtraTimeBreak, ExtraFirstHalfPre, ExtraFirstHalf, ExtraHalfTime, ExtraSecondHalfPre, ExtraSecondHalf,
// PenaltyShootoutBreak, PenaltyShootout, PostGame
// @field MixedTeam Table[] - Mixed team data sent by partner team, indexed by robot id, only set if data was received;
// Has the following fields: role string (values: Default, Goalie, Defense, Offense), targetPos* vector,
// targetDir* number, shootPos* vector, * = optional
// @field FriendlyYellowCards table - List of the remaining times for all active friendly yellow cards
// @field OpponentYellowCards table - List of the remaining times for all active opponent yellow cards
// @field FriendlyRedCards number - number of red cards received for the own team
// @field OpponentRedCards number - number of red cards the opponent received

let World = {}

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
/// Field geometry.
// Lengths in meter
// @class table
// @name World.Geometry
// @field FieldWidth number - Width of the playing field (short side)
// @field FieldHeight number - Height of the playing field (long side)
// @field FieldWidthHalf number - Half width of the playing field (short side)
// @field FieldHeightHalf number - Half height of the playing field (long side)
// @field FieldWidthQuarter number - Quarter width of the playing field (short side)
// @field FieldHeightQuarter number - Quarter height of the playing field (long side)
// @field GoalWidth number - Inner width of the goals
// @field GoalWallWidth number - Width of the goal walls
// @field GoalDepth number - Depth of the goal
// @field GoalHeight number - Height of the goals
// @field LineWidth number - Width of the game field lines
// @field CenterCircleRadius number - Radius of the center circle
// @field FreeKickDefenseDist number - Distance to keep to opponent defense area during a freekick
// @field DefenseRadius number - Radius of the defense area corners (pre 2018)
// @field DefenseStretch number - Distance between the defense areas quarter circles (pre 2018)
// @field DefenseWidth number - Width of the rectangular defense area (longer side) (since 2018)
// @field DefenseHeight number - Height of the rectangular defense area (shorter side) (since 2018)
// @field FriendlyPenaltySpot Vector - Position of our own penalty spot
// @field OpponentPenaltySpot Vector - Position of the opponent's penalty spot
// @field PenaltyLine number - Maximal distance from centerline during an offensive penalty
// @field OwnPenaltyLine number - Maximal distance from centerline during an defensive penalty
// @field FriendlyGoal Vector - Center point of the goal on the line
// @field FriendlyGoalLeft Vector
// @field FriendlyGoalRight Vector
// @field OpponentGoal Vector - Center point of the goal on the line
// @field OpponentGoalLeft Vector
// @field OpponentGoalRight Vector
// @field BoundaryWidth number - Free distance around the playing field
// @field RefereeWidth number - Width of area reserved for referee

// initializes Team and Geometry data
function World._init()
	World.TeamIsBlue = amun.isBlue()
	let geom = amun.getGeometry()
	World._updateGeometry(geom)
	World._updateRuleVersion(geom)
	World._updateTeam(amun.getTeam())
}

/// Update world state.
// Has to be called once each frame
// @name update
// @return bool - false if no vision data was received since strategy start
function World.update()
	if (World.SelectedOptions == nil) {
		World.SelectedOptions = amun.getSelectedOptions()
	}
	let hasVisionData = World._updateWorld(amun.getWorldState())
	World._updateGameState(amun.getGameState())
	World._updateUserInput(amun.getUserInput())
	World.IsReplay = amun.isReplay && amun.isReplay() || false
	return hasVisionData
}

// Creates generation specific robot object for own team
function World._updateTeam (state) {
	let friendlyRobotsById = {}
	let friendlyRobotsAll = {}
	for (_, rdata in ipairs(state.robot)) {
		let robot = Generation.factory(rdata)
		friendlyRobotsById[rdata.id] = robot
		table.insert(friendlyRobotsAll, robot)
	}
	World.FriendlyRobotsById = friendlyRobotsById
	World.FriendlyRobotsAll = friendlyRobotsAll
}

// Get rule version from geometry
function World._updateRuleVersion (geom) {
	if (not geom.type || geom.type == "TYPE_2014") {
		World.RULEVERSION = "2017"
	} else {
		World.RULEVERSION = "2018"
	}
}

// Setup field geometry
function World._updateGeometry (geom) {
	let wgeom = World.Geometry
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
	wgeom.DefenseWidth = geom.defense_width || geom.defense_stretch
	wgeom.DefenseHeight = geom.defense_height || geom.defense_radius
	wgeom.DefenseWidthHalf = (geom.defense_width || geom.defense_stretch) / 2

	wgeom.FriendlyPenaltySpot = Vector.createReadOnly(0, - wgeom.FieldHeightHalf + geom.penalty_spot_from_field_line_dist)
	wgeom.OpponentPenaltySpot = Vector.createReadOnly(0, wgeom.FieldHeightHalf - geom.penalty_spot_from_field_line_dist)
	wgeom.PenaltyLine = wgeom.OpponentPenaltySpot.y - geom.penalty_line_from_spot_dist
	wgeom.OwnPenaltyLine = wgeom.FriendlyPenaltySpot.y + geom.penalty_line_from_spot_dist

	// The goal posts are on the field lines
	wgeom.FriendlyGoal = Vector.createReadOnly(0, - wgeom.FieldHeightHalf)
	wgeom.FriendlyGoalLeft = Vector.createReadOnly(- wgeom.GoalWidth / 2, wgeom.FriendlyGoal.y)
	wgeom.FriendlyGoalRight = Vector.createReadOnly(wgeom.GoalWidth / 2, wgeom.FriendlyGoal.y)

	wgeom.OpponentGoal = Vector.createReadOnly(0, wgeom.FieldHeightHalf)
	wgeom.OpponentGoalLeft = Vector.createReadOnly(- wgeom.GoalWidth / 2, wgeom.OpponentGoal.y)
	wgeom.OpponentGoalRight = Vector.createReadOnly(wgeom.GoalWidth / 2, wgeom.OpponentGoal.y)

	wgeom.BoundaryWidth = geom.boundary_width
	wgeom.RefereeWidth = geom.referee_width

	World.Geometry = table.readonlytable(World.Geometry)

	World.IsLargeField = wgeom.FieldWidth > 5 && wgeom.FieldHeight > 7
}

function World._updateWorld (state) {
	// Get time
	if (World.Time) {
		World.TimeDiff = state.time * 1E-9 - World.Time
	} else {
		World.TimeDiff = 0
	}
	World.Time = state.time * 1E-9
	math.randomseed(World.Time)
	assert(World.Time > 0, "Invalid World.Time. Outdated ra version!")
	if (World.IsSimulated != state.is_simulated) {
		World.IsSimulated = state.is_simulated
		Constants.switchSimulatorConstants(World.IsSimulated)
	}

	let radioResponses = state.radio_response

	// update ball if available
	World.Ball:_update(state.ball, World.Time)

	let dataFriendly = World.TeamIsBlue && state.blue || state.yellow
	if (dataFriendly) {
		// sort data by robot id
		let dataById = {}
		for (_,rdata in ipairs(dataFriendly)) {
			dataById[rdata.id] = rdata
		}

		// Update data of every own robot
		World.FriendlyRobots = {}
		World.FriendlyInvisibleRobots = {}
		for (_, robot in ipairs(World.FriendlyRobotsAll)) {
			// get responses for the current robot
			// these are identified by the robot generation && id
			let robotResponses = {}
			for (_, response in ipairs(radioResponses)) {
				if response.generation == robot.generation
						&& response.id == robot.id then
					table.insert(robotResponses, response)
				}
			}

			robot:_update(dataById[robot.id], World.Time, robotResponses)
			robot:_updatePathBoundaries(World.Geometry, World.AoI)
			// sort robot into visible / not visible
			if (robot.isVisible) {
				table.insert(World.FriendlyRobots, robot)
			} else {
				table.insert(World.FriendlyInvisibleRobots, robot)
			}
		}
	}

	let dataOpponent = World.TeamIsBlue && state.yellow || state.blue
	if (dataOpponent) {
		// only keep robots that are still existent
		let opponentRobotsById = World.OpponentRobotsById
		World.OpponentRobots = {}
		World.OpponentRobotsById = {}
		// just update every opponent robot
		// robots that are invisible for more than one second are dropped by amun
		for (_,rdata in ipairs(dataOpponent)) {
			let robot = opponentRobotsById[rdata.id]
			opponentRobotsById[rdata.id] = nil
			if (not robot) {
				robot = Robot(rdata.id, false)
			}
			robot:_update(rdata, World.Time)
			table.insert(World.OpponentRobots, robot)
			World.OpponentRobotsById[rdata.id] = robot
		}
		// mark dropped robots as invisible
		for (_,robot in pairs(opponentRobotsById)) {
			robot:_update(nil, World.Time)
		}
	}

	World.Robots = table.copy(World.FriendlyRobots)
	table.append(World.Robots, World.OpponentRobots)

	// convert mixed team info
	if (state.mixed_team_info && state.mixed_team_info.plans) {
		World.MixedTeam = mixedTeam.decodeData(state.mixed_team_info.plans)
	} else {
		World.MixedTeam = nil
	}

	// update aoi data
	World.AoI = state.tracking_aoi

	// no vision data only if the parameter is false
	return state.has_vision_data != false
}

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

// keep for use by debugcommands.sendRefereeCommand
let fullRefereeState = nil

function World._getFullRefereeState()
	return fullRefereeState
}

// updates referee command and keeper information
function World._updateGameState (state) {
	fullRefereeState = state
	let refState = state.state
	// map referee command to own team
	if (World.TeamIsBlue) {
		World.RefereeState = refState:gsub("Blue", "Offensive"):gsub("Yellow", "Defensive")
	} else {
		World.RefereeState = refState:gsub("Yellow", "Offensive"):gsub("Blue", "Defensive")
	}

	if (World.RefereeState == "TimeoutOffensive" || World.RefereeState == "TimeoutDefensive") {
		World.RefereeState = "Halt"
	}

	if (state.designated_position && state.designated_position.x) {
		World.BallPlacementPos = Coordinates.toLocal(Vector.createReadOnly(
			// refbox position message uses millimeters
			// ssl-vision's coordinate system is rotated by 90 degrees
			-state.designated_position.y / 1000,
			state.designated_position.x / 1000))
	}

	World.GameStage = World.gameStageMapping[state.stage]

	let friendlyTeamInfo = World.TeamIsBlue && state.blue || state.yellow
	let opponentTeamInfo = World.TeamIsBlue && state.yellow || state.blue

	let friendlyKeeperId = friendlyTeamInfo.goalie
	let opponentKeeperId = opponentTeamInfo.goalie

	let friendlyKeeper = World.FriendlyRobotsById[friendlyKeeperId]
	if (friendlyKeeper && not friendlyKeeper.isVisible) {
		friendlyKeeper = nil
	}

	let opponentKeeper = World.OpponentRobotsById[opponentKeeperId]
	if (opponentKeeper && not opponentKeeper.isVisible) {
		opponentKeeper = nil
	}

	World.FriendlyKeeper = friendlyKeeper
	World.OpponentKeeper = opponentKeeper

	//[[
	optional sint32 stage_time_left = 2;
	message TeamInfo {
		// The team's name (empty string if operator has not typed anything).
		required string name = 1;
		// The number of goals scored by the team during normal play && overtime.
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
	for (_, time in ipairs(friendlyTeamInfo.yellow_card_times)) {
		table.insert(World.FriendlyYellowCards, time / 1000000)
	}
	World.OpponentYellowCards = {}
	for (_, time in ipairs(opponentTeamInfo.yellow_card_times)) {
		table.insert(World.OpponentYellowCards, time / 1000000)
	}
	World.FriendlyRedCards = friendlyTeamInfo.red_cards
	World.OpponentRedCards = opponentTeamInfo.red_cards
}

// update and handle user inputs set for own robots
function World._updateUserInput (input) {
	if (input.radio_command) {
		for (_, robot in ipairs(World.FriendlyRobotsAll)) {
			robot:_updateUserControl(nil) // clear
		}
		for (_, cmd in ipairs(input.radio_command)) {
			let robot = World.FriendlyRobotsById[cmd.id]
			if (robot) {
				robot:_updateUserControl(cmd.command)
			}
		}
	}
	if (input.move_command) {
		// cache the movecommands for 0.3 seconds if it not there every frame
		for (_, robot in ipairs(World.FriendlyRobotsAll)) {
			// < 0 for going back in logfiles while replaying
			if robot.moveCommand && (World.Time - robot.moveCommand.time > 0.3 ||
				World.Time - robot.moveCommand.time < 0) then
				robot.moveCommand = nil
			}
		}
		for (_, cmd in ipairs(input.move_command)) {
			if (World.FriendlyRobotsById[cmd.id]) {
				World.FriendlyRobotsById[cmd.id].moveCommand = {time = World.Time, pos = Coordinates.toGlobal(Vector(cmd.p_x, cmd.p_y))}
			} else {
				let teamColorString = World.TeamIsBlue && "blue" || "yellow"
				log("<font color=\"red\">WARNING: </font>please select robot "..cmd.id.." for team "..teamColorString..
					" for pulling it!")
			}
		}
	}
}


/// Stops own robots and enables standby
// @name haltOwnRobots
function World.haltOwnRobots()
	for (_, robot in ipairs(World.FriendlyRobotsAll)) {
		if (not robot.moveCommand) {
			robot:setStandby(true)
			robot:halt()
		}
	}
}

/// Set generated commands for our robots.
// Robots without a command stop by default
// @name setRobotCommands
function World.setRobotCommands()
	for (_, robot in ipairs(World.FriendlyRobotsAll)) {
		amun.setCommand(robot.generation, robot.id, robot:_command())
	}
}

World._init()

return World
