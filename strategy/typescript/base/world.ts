/**
 * @module world
 * Provides informations about game state
 */

/**************************************************************************
*   Copyright 2018 Alexander Danzer, Michael Eischer, Tobias Heineken     *
*                  Christian Lobmeier, Philipp Nordhus, Andreas Wendler   *
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
**************************************************************************/

/* eslint-disable @typescript-eslint/naming-convention */

let amunLocal = amun;
import { Ball as BallClass } from "base/ball";
import { Coordinates } from "base/coordinates";
import * as debug from "base/debug";
import * as MathUtil from "base/mathutil";
// let mixedTeam = require "base/mixedteam"
import * as pb from "base/protobuf";
import { FriendlyRobot, Robot } from "base/robot";
import { AbsTime, RelTime } from "base/timing";
import { Position, Vector } from "base/vector";


/** Current unix timestamp in seconds (with nanoseconds precision) */
export let Time: AbsTime = 0;
/** Time since last update */
export let TimeDiff: RelTime = 0;
export let AoI: pb.world.TrackingAOI | undefined = undefined;
/** current Ball */
export let Ball: BallClass = new BallClass();
/** List of own robots in an arbitary order */
export let FriendlyRobots: FriendlyRobot[] = [];
/** Own robots which currently aren't tracked */
export let FriendlyInvisibleRobots: FriendlyRobot[] = [];
/** List of own robots with robot id as index */
export let FriendlyRobotsById: { [index: number]: FriendlyRobot } = {};
/** List of all own robots in an arbitary order */
export let FriendlyRobotsAll: FriendlyRobot[] = [];
/** Own keeper if on field or nil */
export let FriendlyKeeper: FriendlyRobot | undefined;
/** List of opponent robots in an arbitary order */
export let OpponentRobots: Robot[] = [];
/** List of opponent robots with robot id as index */
export let OpponentRobotsById: { [index: number]: Robot } = {};
/** Opponent keeper if on field or nil */
export let OpponentKeeper: Robot | undefined;
/** Every visible robot in an arbitary order */
export let Robots: Robot[] = [];
/** True if we are the blue team, otherwise we're yellow */
export let TeamIsBlue: boolean = false;
/** True if playing on the large field */
export let IsLargeField: boolean = false;
/** True if the current strategy run is a replay run */
export let IsReplay: boolean = false;
/**
 * Mixed team data sent by partner team, indexed by robot id, only set if data was received;
 * Has the following fields: role string (values: Default, Goalie, Defense, Offense), targetPos* vector,
 * targetDir* number, shootPos* vector, * = optional
 */
export let MixedTeam: pb.ssl.TeamPlan | undefined = undefined;
export let SelectedOptions = undefined;

/** True if the world is simulated */
let _WorldStateSource: pb.world.WorldSource | undefined = undefined;
export function WorldStateSource(): pb.world.WorldSource {
	if (_WorldStateSource === undefined) {
		throw new Error("WorldStateSource can not be accessed at load-time");
	}
	return _WorldStateSource;
}

export interface BallModelType {
	/**
	 * acceleration which brakes the ball [m/s^2]
	 * measured by looking at the ball speed graph in the plotter
	 */
	BallDeceleration: number;

	/** accerlation which brakes the ball until it is rolling [m/s^2] */
	FastBallDeceleration: number;

	/** if ball is slower than switchRatio * shootSpeed then switch from fast to normal ball deceleration */
	BallSwitchRatio: number;

	/** vertical speed damping coeffient for a ball hitting the ground */
	FloorDampingZ: number;

	/** Speed damping coefficient for the ground velocity during volley shots */
	FloorDampingXY: number;
}
export let BallModel: BallModelType = <BallModelType> {};

export let TeamName: string = "";
export let OpponentTeamName: string = "";

export type RefereeStateType = "Halt" | "Stop" | "Game" | "GameForce"
	| "KickoffOffensivePrepare" | "KickoffOffensive"
	| "KickoffDefensivePrepare" | "KickoffDefensive"
	| "PenaltyOffensivePrepare" | "PenaltyOffensive" | "PenaltyOffensiveRunning"
	| "PenaltyDefensivePrepare" | "PenaltyDefensive" | "PenaltyDefensiveRunning"
	| "DirectOffensive" | "DirectDefensive"
	| "IndirectOffensive" | "IndirectDefensive"
	| "TimeoutOffensive" | "TimeoutDefensive"
	| "BallPlacementOffensive" | "BallPlacementDefensive"
	| "";

/** Current refereestate */
export let RefereeState: RefereeStateType = "";
export let NextRefereeState: RefereeStateType = "";

export type GameStageType = "FirstHalfPre" | "FirstHalf"
	| "HalfTime"
	| "SecondHalfPre" | "SecondHalf"
	| "ExtraTimeBreak"
	| "ExtraFirstHalfPre" | "ExtraFirstHalf"
	| "ExtraHalfTime"
	| "ExtraSecondHalfPre" | "ExtraSecondHalf"
	| "PenaltyShootoutBreak" | "PenaltyShootout"
	| "PostGame";

/** Current game stage */
export let GameStage: GameStageType = "" as GameStageType; // Will be initialized before usage
/** List of the remaining times for all active friendly yellow cards */
export let FriendlyYellowCards: number[] = [];
/** List of the remaining times for all active opponent yellow cards */
export let OpponentYellowCards: number[] = [];
/** number of red cards received for the own team */
export let FriendlyRedCards: number = 0;
/** number of red cards the opponent received */
export let OpponentRedCards: number = 0;
/** where the ball has to be placed */
export let BallPlacementPos: Readonly<Position> | undefined;
/** number of allowed friendly robots on the field based on division and cards */
export let MaxAllowedFriendlyRobots: number = 11;
/** number of allowed opponent robots on the field based on division and cards */
export let MaxAllowedOpponentRobots: number = 11;
/** The number of goals the friendly team scored */
export let FriendlyScore: number = 0;
/** The number of goals the opponent team scored */
export let OpponentScore: number = 0;

export let RULEVERSION: string = "";

export let DIVISION: "A" | "B" | "" = "";

/** Field geometry. Lengths in meter */
export interface GeometryType {
	/** Width of the playing field (short side) */
	FieldWidth: number;
	/** Height of the playing field (long side) */
	FieldHeight: number;
	/** Half width of the playing field (short side) */
	FieldWidthHalf: number;
	/** Half height of the playing field (long side) */
	FieldHeightHalf: number;
	/** Quarter width of the playing field (short side) */
	FieldWidthQuarter: number;
	/** Quarter height of the playing field (long side) */
	FieldHeightQuarter: number;
	/** Inner width of the goals */
	GoalWidth: number;
	/** Width of the goal walls */
	GoalWallWidth: number;
	/** Depth of the goal */
	GoalDepth: number;
	/** Height of the goals */
	GoalHeight: number;
	/** Width of the game field lines */
	LineWidth: number;
	/** Radius of the center circle */
	CenterCircleRadius: number;
	/** Distance to keep to opponent defense area during a freekick */
	FreeKickDefenseDist: number;
	/** Radius of the defense area corners (pre 2018) */
	DefenseRadius: number;
	/** Distance between the defense areas quarter circles (pre 2018) */
	DefenseStretch: number;
	/** Half distance between the defense areas quarter circles (pre 2018) */
	DefenseStretchHalf: number;
	/** Width of the rectangular defense area (longer side) (since 2018) */
	DefenseWidth: number;
	/** Half width of the rectangular defense area (longer side) (since 2018) */
	DefenseWidthHalf: number;
	/** Height of the rectangular defense area (shorter side) (since 2018) */
	DefenseHeight: number;
	/** Position of our own penalty spot */
	FriendlyPenaltySpot: Readonly<Position>;
	/** Position of the opponent's penalty spot */
	OpponentPenaltySpot: Readonly<Position>;
	/** Maximal distance from centerline during an offensive penalty */
	PenaltyLine: number;
	/** Maximal distance from centerline during an defensive penalty */
	OwnPenaltyLine: number;
	/** Center point of the goal on the line */
	FriendlyGoal: Readonly<Position>;
	/** Left side of the goal when oriented towards the opponent goal */
	FriendlyGoalLeft: Readonly<Position>;
	/** Right side of the goal when oriented towards the opponent goal */
	FriendlyGoalRight: Readonly<Position>;
	/** Center point of the goal on the line */
	OpponentGoal: Readonly<Position>;
	/** Left side of the goal when oriented towards the friendly goal */
	OpponentGoalLeft: Readonly<Position>;
	/** Right side of the goal when oriented towards the friendly goal */
	OpponentGoalRight: Readonly<Position>;
	/** Free distance around the playing field */
	BoundaryWidth: number;
}

// it is guaranteed to be set before being read, so casting is fine
export let Geometry: Readonly<GeometryType> = <GeometryType> {};

// initializes Team and Geometry data
export function _init() {
	TeamIsBlue = amunLocal.isBlue();
	let geom = amunLocal.getGeometry();
	_updateGeometry(geom);
	_updateRuleVersion(geom);
	updateDivision(geom);
	_updateTeam(amunLocal.getTeam());
}

/**
 * Update world state.
 * Has to be called once each frame
 * @returns false if no vision data was received since strategy start
 */
export function update() {
	if (SelectedOptions == undefined) {
		// TODO: getSelectedOptions is not yet implemented for typescript
		// SelectedOptions = amunLocal.getSelectedOptions();
	}
	let hasVisionData = _updateWorld(amunLocal.getWorldState());
	_updateGameState(amunLocal.getGameState());
	_updateUserInput(amunLocal.getUserInput());
	IsReplay = amunLocal.isReplay ? amunLocal.isReplay() : false;
	return hasVisionData;
}

/** Creates generation specific robot object for own team */
export function _updateTeam(state: pb.robot.Team) {
	let friendlyRobotsById: { [index: number]: FriendlyRobot } = {};
	let friendlyRobotsAll: FriendlyRobot[] = [];
	for (let rdata of state.robot || []) {
		let robot = new FriendlyRobot(rdata); // No generation types for now
		friendlyRobotsById[rdata.id] = robot;
		friendlyRobotsAll.push(robot);
	}
	FriendlyRobotsById = friendlyRobotsById;
	FriendlyRobotsAll = friendlyRobotsAll;
}

/** Get rule version from geometry */
export function _updateRuleVersion(geom: pb.world.Geometry) {
	if (geom.type == undefined || geom.type === "TYPE_2014") {
		RULEVERSION = "2017";
	} else {
		RULEVERSION = "2018";
	}
}

/** Get division from geometry */
function updateDivision(geom: pb.world.Geometry) {
	if (geom.division == undefined || geom.division === "A") {
		DIVISION = "A";
	} else {
		DIVISION = "B";
	}
}

let hasRaBallModel: boolean = false;
export function switchBallModelConstants(isSimulated: boolean) {
	// WARNING: these are only kept for compatibility reasons and replays
	// DO NOT EVER MODIFY these values, they can be updated in the Ra UI
	if (isSimulated) {
		BallModel.BallDeceleration = -0.35;
		BallModel.FastBallDeceleration = -4.5;
		BallModel.BallSwitchRatio = 0.69;
	} else {
		BallModel.BallDeceleration = -0.343;
		BallModel.FastBallDeceleration = -3.73375;
		BallModel.BallSwitchRatio = 0.7;
	}
	BallModel.FloorDampingZ = 0.55;
	BallModel.FloorDampingXY = 1;
}

// Setup field geometry
function _updateGeometry(geom: pb.world.Geometry) {
	let wgeom = <GeometryType> Geometry;
	wgeom.FieldWidth = geom.field_width;
	wgeom.FieldWidthHalf = geom.field_width / 2;
	wgeom.FieldWidthQuarter = geom.field_width / 4;
	wgeom.FieldHeight = geom.field_height;
	wgeom.FieldHeightHalf = geom.field_height / 2;
	wgeom.FieldHeightQuarter = geom.field_height / 4;

	wgeom.GoalWidth = geom.goal_width;
	wgeom.GoalWallWidth = geom.goal_wall_width;
	wgeom.GoalDepth = geom.goal_depth;
	wgeom.GoalHeight = geom.goal_height;

	wgeom.LineWidth = geom.line_width;
	wgeom.CenterCircleRadius = geom.center_circle_radius;
	wgeom.FreeKickDefenseDist = geom.free_kick_from_defense_dist;

	wgeom.DefenseRadius = geom.defense_radius;
	wgeom.DefenseStretch = geom.defense_stretch;
	wgeom.DefenseStretchHalf = geom.defense_stretch / 2;
	wgeom.DefenseWidth = geom.defense_width != undefined ? geom.defense_width : geom.defense_stretch;
	wgeom.DefenseHeight = geom.defense_height != undefined ? geom.defense_height : geom.defense_radius;
	wgeom.DefenseWidthHalf = (geom.defense_width != undefined ? geom.defense_width : geom.defense_stretch) / 2;

	wgeom.FriendlyPenaltySpot = new Vector(0, -wgeom.FieldHeightHalf + geom.penalty_spot_from_field_line_dist);
	wgeom.OpponentPenaltySpot = new Vector(0, wgeom.FieldHeightHalf - geom.penalty_spot_from_field_line_dist);
	wgeom.PenaltyLine = wgeom.OpponentPenaltySpot.y - geom.penalty_line_from_spot_dist;
	wgeom.OwnPenaltyLine = wgeom.FriendlyPenaltySpot.y + geom.penalty_line_from_spot_dist;

	// The goal posts are on the field lines
	wgeom.FriendlyGoal = new Vector(0, -wgeom.FieldHeightHalf);
	wgeom.FriendlyGoalLeft = new Vector(-wgeom.GoalWidth / 2, wgeom.FriendlyGoal.y);
	wgeom.FriendlyGoalRight = new Vector(wgeom.GoalWidth / 2, wgeom.FriendlyGoal.y);

	wgeom.OpponentGoal = new Vector(0, wgeom.FieldHeightHalf);
	wgeom.OpponentGoalLeft = new Vector(-wgeom.GoalWidth / 2, wgeom.OpponentGoal.y);
	wgeom.OpponentGoalRight = new Vector(wgeom.GoalWidth / 2, wgeom.OpponentGoal.y);

	wgeom.BoundaryWidth = geom.boundary_width;

	IsLargeField = wgeom.FieldWidth > 5 && wgeom.FieldHeight > 7;

	hasRaBallModel = geom.ball_model != undefined;
	if (geom.ball_model != undefined) {
		BallModel.BallDeceleration = -geom.ball_model.slow_deceleration!;
		BallModel.FastBallDeceleration = -geom.ball_model.fast_deceleration!;
		BallModel.BallSwitchRatio = geom.ball_model.switch_ratio!;
		BallModel.FloorDampingXY = geom.ball_model.xy_damping!;
		BallModel.FloorDampingZ = geom.ball_model.z_damping!;
	} else {
		switchBallModelConstants(false);
	}
}

export function _updateWorld(state: pb.world.State) {
	// Get time
	if (Time != undefined) {
		TimeDiff = state.time * 1E-9 - Time;
	} else {
		TimeDiff = 0;
	}
	Time = state.time * 1E-9;
	MathUtil.randomseed(state.time);
	for (let robot of FriendlyRobots) {
		robot.path.seedRandom(state.time);
	}
	if (Time <= 0) {
		throw new Error("Invalid Time. Outdated ra version!");
	}
	const prevWorldSource = _WorldStateSource;
	if (state.world_source != undefined) {
		if (state.world_source !== _WorldStateSource) {
			_WorldStateSource = state.world_source;
		}
	} else if (state.is_simulated != undefined) {
		_WorldStateSource = state.is_simulated ? pb.world.WorldSource.INTERNAL_SIMULATION : pb.world.WorldSource.REAL_LIFE;
	}
	if (_WorldStateSource !== prevWorldSource && !hasRaBallModel) {
		switchBallModelConstants(_WorldStateSource !== pb.world.WorldSource.REAL_LIFE);
	}

	let radioResponses: pb.robot.RadioResponse[] = state.radio_response || [];

	// update ball if available
	Ball._update(state.ball, Time, Geometry, Robots);

	let dataFriendly = TeamIsBlue ? state.blue : state.yellow;
	if (dataFriendly) {
		// sort data by robot id
		let dataById: { [id: number]: pb.world.Robot } = {};
		for (let rdata of dataFriendly) {
			dataById[rdata.id] = rdata;
		}

		// Update data of every own robot
		FriendlyRobots = [];
		FriendlyInvisibleRobots = [];
		for (let robot of FriendlyRobotsAll) {
			// get responses for the current robot
			// these are identified by the robot generation and id
			let robotResponses: pb.robot.RadioResponse[] = [];
			for (let response of radioResponses) {
				if (response.generation === robot.generation
						&& response.id === robot.id) {
					robotResponses.push(response);
				}
			}

			robot._update(dataById[robot.id], Time, robotResponses);
			robot._updatePathBoundaries(Geometry, AoI);
			// sort robot into visible / not visible
			if (robot.isVisible) {
				FriendlyRobots.push(robot);
			} else {
				FriendlyInvisibleRobots.push(robot);
			}
		}
	}

	let dataOpponent = TeamIsBlue ? state.yellow : state.blue;
	if (dataOpponent) {
		// only keep robots that are still existent
		let opponentRobotsById = OpponentRobotsById;
		OpponentRobots = [];
		OpponentRobotsById = {};
		// just update every opponent robot
		// robots that are invisible for more than one second are dropped by amun
		for (let rdata of dataOpponent) {
			let robot = opponentRobotsById[rdata.id];
			delete opponentRobotsById[rdata.id];
			if (!robot) {
				robot = new Robot(rdata.id);
			}
			robot._updateOpponent(rdata, Time);
			OpponentRobots.push(robot);
			OpponentRobotsById[rdata.id] = robot;
		}
		// mark dropped robots as invisible
		for (let robotId in opponentRobotsById) {
			opponentRobotsById[robotId]._updateOpponent(undefined, Time);
		}
	}

	Robots = FriendlyRobots.slice();
	Robots = Robots.concat(OpponentRobots);

	// mixed team has never been fully ported or at least used since we moved to TypeScript,
	// so it is always set to undefined
	MixedTeam = undefined;

	// update aoi data
	AoI = state.tracking_aoi;

	// no vision data only if the parameter is false
	return state.has_vision_data !== false;
}

let gameStageMapping: { [name: string]: string } = {
	NORMAL_FIRST_HALF_PRE: "FirstHalfPre",
	NORMAL_FIRST_HALF: "FirstHalf",
	NORMAL_HALF_TIME: "HalfTime",
	NORMAL_SECOND_HALF_PRE: "SecondHalfPre",
	NORMAL_SECOND_HALF: "SecondHalf",

	EXTRA_TIME_BREAK: "ExtraTimeBreak",
	EXTRA_FIRST_HALF_PRE: "ExtraFirstHalfPre",
	EXTRA_FIRST_HALF: "ExtraFirstHalf",
	EXTRA_HALF_TIME: "ExtraHalfTime",
	EXTRA_SECOND_HALF_PRE: "ExtraSecondHalfPre",
	EXTRA_SECOND_HALF: "ExtraSecondHalf",

	PENALTY_SHOOTOUT_BREAK: "PenaltyShootoutBreak",
	PENALTY_SHOOTOUT: "PenaltyShootout",
	POST_GAME: "PostGame"
};

// keep for use by debugcommands.sendRefereeCommand
let fullRefereeState: pb.amun.GameState | undefined = undefined;

export function _getFullRefereeState() {
	return fullRefereeState;
}

// updates referee command and keeper information
function _updateGameState(state: pb.amun.GameState) {
	fullRefereeState = state;
	// map referee command to own team
	const replaceWithTeamColor = (val: string) => {
		return TeamIsBlue
			? val.replace("Blue", "Offensive").replace("Yellow", "Defensive")
			: val.replace("Yellow", "Offensive").replace("Blue", "Defensive");
	};
	RefereeState = replaceWithTeamColor(state.state) as RefereeStateType;
	if (state.next_state) {
		NextRefereeState = replaceWithTeamColor(state.next_state) as RefereeStateType;
	}

	if (RefereeState === "TimeoutOffensive" || RefereeState === "TimeoutDefensive") {
		RefereeState = "Halt";
	}

	if (state.designated_position && state.designated_position.x != undefined) {
		BallPlacementPos = Coordinates.toLocal(new Vector(
			// refbox position message uses millimeters
			// ssl-vision's coordinate system is rotated by 90 degrees
			-state.designated_position.y / 1000,
			state.designated_position.x / 1000));
	}

	GameStage = gameStageMapping[state.stage] as GameStageType;

	let friendlyTeamInfo = TeamIsBlue ? state.blue : state.yellow;
	let opponentTeamInfo = TeamIsBlue ? state.yellow : state.blue;

	let friendlyKeeperId = friendlyTeamInfo.goalie;
	let opponentKeeperId = opponentTeamInfo.goalie;

	let friendlyKeeper: FriendlyRobot | undefined = FriendlyRobotsById[friendlyKeeperId];
	if (friendlyKeeper && !friendlyKeeper.isVisible) {
		friendlyKeeper = undefined;
	}

	debug.set("opponent keeper ID", opponentKeeperId);
	let opponentKeeper: Robot | undefined = OpponentRobotsById[opponentKeeperId];
	if (opponentKeeper && !opponentKeeper.isVisible) {
		opponentKeeper = undefined;
	}

	FriendlyKeeper = friendlyKeeper;
	OpponentKeeper = opponentKeeper;


	// 	optional sint32 stage_time_left = 2;
	// 	message TeamInfo {
	// 		// The team's name (empty string if operator has not typed anything).
	// 		required string name = 1;
	// 		// The number of goals scored by the team during normal play and overtime.
	// 		required uint32 score = 2;
	// 		// The number of red cards issued to the team since the beginning of the game.
	// 		required uint32 red_cards = 3;
	// 		// The amount of time (in microseconds) left on each yellow card issued to the team.
	// 		// If no yellow cards are issued, this array has no elements.
	// 		// Otherwise, times are ordered from smallest to largest.
	// 		repeated uint32 yellow_card_times = 4 [packed=true];
	// 		// The total number of yellow cards ever issued to the team.
	// 		required uint32 yellow_cards = 5;
	// 		// The number of timeouts this team can still call.
	// 		// If in a timeout right now, that timeout is excluded.
	// 		required uint32 timeouts = 6;
	// 		// The number of microseconds of timeout this team can use.
	// 		required uint32 timeout_time = 7;
	// 	}

	FriendlyYellowCards = [];
	if (friendlyTeamInfo.yellow_card_times != undefined) {
		for (let time of friendlyTeamInfo.yellow_card_times) {
			FriendlyYellowCards.push(time / 1000000);
		}
	}
	OpponentYellowCards = [];
	if (opponentTeamInfo.yellow_card_times != undefined) {
		for (let time of opponentTeamInfo.yellow_card_times) {
			OpponentYellowCards.push(time / 1000000);
		}
	}
	FriendlyRedCards = friendlyTeamInfo.red_cards;
	OpponentRedCards = opponentTeamInfo.red_cards;
	TeamName = friendlyTeamInfo.name;
	if (opponentTeamInfo.name !== OpponentTeamName) {
		OpponentTeamName = opponentTeamInfo.name;
		for (let r of OpponentRobots) {
			r.updateSpecs(OpponentTeamName);
		}
	}

	if (friendlyTeamInfo.max_allowed_bots != undefined) {
		MaxAllowedFriendlyRobots = friendlyTeamInfo.max_allowed_bots;
	} else {
		MaxAllowedFriendlyRobots = DIVISION === "A" ? 11 : 6;
	}
	if (opponentTeamInfo.max_allowed_bots != undefined) {
		MaxAllowedOpponentRobots = opponentTeamInfo.max_allowed_bots;
	} else {
		MaxAllowedOpponentRobots = DIVISION === "A" ? 11 : 6;
	}

	FriendlyScore = friendlyTeamInfo.score;
	OpponentScore = opponentTeamInfo.score;
}

/** update and handle user inputs set for own robots */
export function _updateUserInput(input: pb.amun.UserInput) {
	if (input.radio_command) {
		for (let robot of FriendlyRobotsAll) {
			robot._updateUserControl(undefined); // clear
		}
		for (let cmd of input.radio_command) {
			let robot = FriendlyRobotsById[cmd.id];
			if (robot) {
				robot._updateUserControl(cmd.command);
			}
		}
	}
	if (input.move_command) {
		// cache the movecommands for 0.3 seconds if it not there every frame
		for (let robot of FriendlyRobotsAll) {
			// < 0 for going back in logfiles while replaying
			if (robot.moveCommand && (Time - robot.moveCommand.time > 0.3 ||
					Time - robot.moveCommand.time < 0)) {
				robot.moveCommand = undefined;
			}
		}
		for (let cmd of input.move_command) {
			if (FriendlyRobotsById[cmd.id]) {
				FriendlyRobotsById[cmd.id].moveCommand = { time: Time, pos: Coordinates.toGlobal(new Vector(cmd.p_x || 0, cmd.p_y || 0)) };
			} else {
				let teamColorString = TeamIsBlue ? "blue" : "yellow";
				amunLocal.log(`<font color="red">WARNING: </font>please select robot ${cmd.id} for team ${teamColorString} for pulling it`);
			}
		}
	}
}


/** Stops own robots and enables standby */
export function haltOwnRobots() {
	for (let robot of FriendlyRobotsAll) {
		if (robot.moveCommand == undefined) {
			robot.setStandby(true);
			robot.halt();
		}
	}
}

/**
 * Set generated commands for our robots.
 * Robots without a command stop by default
 */
export function setRobotCommands() {
	if (amunLocal.setCommands) {
		let commands: [number, number, pb.robot.Command][] = [];
		for (let robot of FriendlyRobotsAll) {
			commands.push([robot.generation, robot.id, robot._command()]);
		}
		amunLocal.setCommands(commands);
	} else {
		for (let robot of FriendlyRobotsAll) {
			amunLocal.setCommand(robot.generation, robot.id, robot._command());
		}
	}
}

_init();

