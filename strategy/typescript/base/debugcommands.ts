/**
 * @module debugcommands
 * Some functions to modify the world during debug.
 */

/**************************************************************************
*   Copyright 2018 Alexander Danzer, Michael Eischer, Tobias Heineken     *
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

import { Coordinates } from "base/coordinates";
import * as pb from "base/protobuf";
import { RobotState } from "base/robot";
import { Position, Vector } from "base/vector";
import * as World from "base/world";

let amunLocal = amun;

// See stageMapping in World
let stageNames = {
	FirstHalfPre: "NORMAL_FIRST_HALF_PRE",
	FirstHalf: "NORMAL_FIRST_HALF",
	HalfTime: "NORMAL_HALF_TIME",
	SecondHalfPre: "NORMAL_SECOND_HALF_PRE",
	SecondHalf: "NORMAL_SECOND_HALF",

	ExtraTimeBreak: "EXTRA_TIME_BREAK",
	ExtraFirstHalfPre: "EXTRA_FIRST_HALF_PRE",
	ExtraFirstHalf: "EXTRA_FIRST_HALF",
	ExtraHalfTime: "EXTRA_HALF_TIME",
	ExtraSecondHalfPre: "EXTRA_SECOND_HALF_PRE",
	ExtraSecondHalf: "EXTRA_SECOND_HALF",

	PenaltyShootoutBreak: "PENALTY_SHOOTOUT_BREAK",
	PenaltyShootout: "PENALTY_SHOOTOUT",
	PostGame: "POST_GAME"
};
let stageUnmapping: Map<string, string> = new Map(Object.entries(stageNames));

let commandNames = {
	Start: "NORMAL_START", // special value to start kickoff and penalty
	Halt: "HALT",
	Stop: "STOP",
	GameForce: "FORCE_START",
	KickoffYellowPrepare: "PREPARE_KICKOFF_YELLOW",
	KickoffBluePrepare: "PREPARE_KICKOFF_BLUE",
	PenaltyYellowPrepare: "PREPARE_PENALTY_YELLOW",
	PenaltyBluePrepare: "PREPARE_PENALTY_BLUE",
	DirectYellow: "DIRECT_FREE_YELLOW",
	DirectBlue: "DIRECT_FREE_BLUE",
	IndirectYellow: "INDIRECT_FREE_YELLOW",
	IndirectBlue: "INDIRECT_FREE_BLUE",
	TimeoutYellow: "TIMEOUT_YELLOW",
	TimeoutBlue: "TIMEOUT_B(LUE",
	BallPlacementBlue: "BALL_PLACEMENT_BLUE",
	BallPlacementYellow: "BALL_PLACEMENT_YELLOW"
};
let commandUnmapping: Map<string, string> = new Map(Object.entries(commandNames));

/**
 * Set referee command. The new values are not visible before the next frame!
 * refereeCommand uses most values of World.RefereeState. However "Game" does not exist
 * and "Kickoff.+", "Penalty.+" are only reachable via their "+.Prepare" state followed by sending "Start"
 * @example sendRefereeCommand("GameForce", "SecondHalf")
 * @example sendRefereeCommand("DirectOffensive")
 * @param refereeCommand - similar to values of World.RefereeState
 * @param gameStage - use World.GameStage
 * @param blueKeeperID - blue keeper id
 * @param yellowKeeperID - yellow keeper id
 */
export function sendRefereeCommand(refereeCommand: string, gameStage?: string, blueKeeperID?: number, yellowKeeperID?: number, pos?: Position) {
	if (amunLocal.isDebug === false) {
		throw new Error("only works in debug mode");
	}

	let origState = World._getFullRefereeState();
	// require origState to be populated, is guaranteed once World.update() was called
	if (origState === undefined) {
		throw new Error("Musn't be called before World.update(), that is outside of Entrypoints");
	}

	// fill message with default values
	let state: pb.SSL_Referee = {
		stage: origState.stage, // default values
		packet_timestamp: 0, command_timestamp: 0,
		stage_time_left: origState.stage_time_left,
		// internal referee uses the command counter as delta
		// 0 = don't change command, 1 = update command
		command_counter: 0,
		blue: origState.blue, yellow: origState.yellow,
		command: <any> undefined, // ra can handle it not being there
		designated_position: undefined
	};

	// update gamestage
	if (gameStage != undefined) {
		state.stage = <pb.SSL_Referee.Stage> stageUnmapping[gameStage];
		if (state.stage == undefined) {
			throw new Error("Invalid game stage name: "  +  gameStage);
		}
	}

	if (refereeCommand != undefined) {
		// map referee command from team local to global naming
		// that is revert *Offensive/Defensive to *Blue/Yellow
		let command;
		if (World.TeamIsBlue) {
			command = refereeCommand.replace("Offensive", "Blue").replace("Defensive", "Yellow");
		} else {
			command = refereeCommand.replace("Offensive", "Yellow").replace("Defensive", "Blue");
		}
		// map "refereeState" to command
		state.command = <pb.SSL_Referee.Command> commandUnmapping[command];
		if (state.command == undefined) {
			throw new Error("Invalid referee command name: "  +  refereeCommand);
		}
		state.command_counter = 1; // trigger command update
	}

	if (blueKeeperID != undefined) {
		state.blue.goalie = blueKeeperID;
	}

	if (yellowKeeperID != undefined) {
		state.yellow.goalie = yellowKeeperID;
	}

	if (pos != undefined) {
		pos = pos * 1000;
		pos = Coordinates.toGlobal(pos);
		state.designated_position = {x: pos.x, y: pos.y};
	}
	amunLocal.sendRefereeCommand(state);
}

/**
 * Move ball and robots to a given position.
 * Every parameter except posZ and speedZ in these data structures is required!
 * ball: { pos = Vector, posZ = number, speed = Vector, speedZ = number } <br/>
 * robot: { id = number, pos = Vector, dir = number, speed = Vector, angularSpeed = number }
 * @param ball - ball target
 * @param friendlyRobots - friendly by id
 * @param opponentRobots - opponent robots by id
 */
export type BallInfo = { pos: Vector, posZ?: number, speed: Vector, speedZ?: number };
export function moveObjects(ball?: BallInfo, friendlyRobots?: RobotState[], opponentRobots?: RobotState[]) {
	if (!amun.isDebug) {
		throw new Error("only works in debug mode");
	}
	if (World.WorldStateSource !== pb.world.WorldSource.INTERNAL_SIMULATION) {
		throw new Error("This can only be used in the internal simulator!");
	}

	// teleport_robot gets initialized further down, because otherwise the typescript compiler is sad
	let simCommand: pb.sslsim.SimulatorControl = { teleport_ball: {} };
	if (ball != undefined) {
		if (ball.pos == undefined || ball.speed == undefined) {
			throw new Error("ball parameter missing");
		}
		// convert to global coordinate system
		let pos = Coordinates.toVision(ball.pos);
		let speed = Coordinates.toVision(ball.speed);
		simCommand.teleport_ball = {
			x: pos.x, y: pos.y, z: ball.posZ || 0,
			vx: speed.x, vy: speed.y, vz: ball.speedZ || 0
		};
	}

	// handle blue / yellow team selection
	let friendly: pb.gameController.Team;
	let opponent: pb.gameController.Team;
	if (World.TeamIsBlue) {
		friendly = pb.gameController.Team.BLUE;
		opponent = pb.gameController.Team.YELLOW;
	} else {
		friendly = pb.gameController.Team.YELLOW;
		opponent = pb.gameController.Team.BLUE;
	}

	let createTeleportCommandsForRobots = (robots: RobotState[], team: pb.gameController.Team) =>
		robots.map((robot: RobotState) => {
			if (robot.id == undefined || robot.pos == undefined || robot.speed == undefined || robot.dir == undefined || robot.angularSpeed == undefined) {
				throw new Error("robot parameter missing");
			}
			let pos = Coordinates.toVision(robot.pos);
			let speed = Coordinates.toVision(robot.speed);
			return {
				id: {id: robot.id, team: team},
				x: pos.x, y: pos.y, orientation: Coordinates.toVision(robot.dir),
				v_x: speed.x, v_y: speed.y, v_angular: robot.angularSpeed
			};
		});

	simCommand.teleport_robot = [];
	if (friendlyRobots != undefined) {
		simCommand.teleport_robot = simCommand.teleport_robot.concat(createTeleportCommandsForRobots(friendlyRobots, friendly));
	}
	if (opponentRobots != undefined) {
		simCommand.teleport_robot = simCommand.teleport_robot.concat(createTeleportCommandsForRobots(opponentRobots, opponent));
	}

	amun.sendCommand({ simulator: {ssl_control: simCommand}, tracking: { reset: true } });
}

export function moveObjectsToJSON(jsonString: string) {
	let positions = JSON.parse(jsonString);
	let ball = positions.ball;

	// third entry of pos is angle, which doesn't make sense for ball
	let ballPos: BallInfo = {
		// necessary transformation, because moveObjects assumes local coordinates
		pos: Coordinates.toLocal(new Vector(ball.pos[0], ball.pos[1])),
		posZ: 0,
		speed: new Vector(0, 0),
		speedZ: 0,
	};

	let yellowRobots = positions.bots.filter((x: any) =>  x.id.color === "YELLOW");
	let blueRobots = positions.bots.filter((x: any) =>  x.id.color === "BLUE");

	// use existing ids for each team (e.g. team yellow might not have a robot with id 0 as in the JSON)
	if (World.TeamIsBlue) {
		blueRobots = blueRobots.map((x: any, i: number) => [x, World.FriendlyRobots[i].id]);
		yellowRobots = yellowRobots.map((x: any, i: number) => [x, World.OpponentRobots[i].id]);
	} else {
		blueRobots = blueRobots.map((x: any, i: number) => [x, World.OpponentRobots[i].id]);
		yellowRobots = yellowRobots.map((x: any, i: number) => [x, World.FriendlyRobots[i].id]);
	}

	let getTransform: (([jsonBot, id]: [any, number]) => RobotState) = ([jsonBot, id]) => {
		// necessary transformation, because moveObjects assumes local coordinates
		let pos = Coordinates.toLocal(new Vector(jsonBot.obj.pos[0], jsonBot.obj.pos[1]));
		let angle = Coordinates.toLocal(<number> jsonBot.obj.pos[2]);
		return {
			id: id,
			pos: pos,
			dir: angle,
			speed: new Vector(0, 0),
			angularSpeed: 0,
		};
	};

	let yellowTransforms = yellowRobots.map(getTransform);
	let blueTransforms = blueRobots.map(getTransform);

	let friendlyTransforms;
	let opponentTransforms;
	if (World.TeamIsBlue) {
		friendlyTransforms = blueTransforms;
		opponentTransforms = yellowTransforms;
	} else {
		friendlyTransforms = yellowTransforms;
		opponentTransforms = blueTransforms;
	}

	moveObjects(ballPos, friendlyTransforms, opponentTransforms);
}
