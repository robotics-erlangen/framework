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
const stageNames: Readonly<Record<World.GameStageType, pb.SSL_Referee.Stage>> = {
	FirstHalfPre: pb.SSL_Referee.Stage.NORMAL_FIRST_HALF_PRE,
	FirstHalf: pb.SSL_Referee.Stage.NORMAL_FIRST_HALF,
	HalfTime: pb.SSL_Referee.Stage.NORMAL_HALF_TIME,
	SecondHalfPre: pb.SSL_Referee.Stage.NORMAL_SECOND_HALF_PRE,
	SecondHalf: pb.SSL_Referee.Stage.NORMAL_SECOND_HALF,

	ExtraTimeBreak: pb.SSL_Referee.Stage.EXTRA_TIME_BREAK,
	ExtraFirstHalfPre: pb.SSL_Referee.Stage.EXTRA_FIRST_HALF_PRE,
	ExtraFirstHalf: pb.SSL_Referee.Stage.EXTRA_FIRST_HALF,
	ExtraHalfTime: pb.SSL_Referee.Stage.EXTRA_HALF_TIME,
	ExtraSecondHalfPre: pb.SSL_Referee.Stage.EXTRA_SECOND_HALF_PRE,
	ExtraSecondHalf: pb.SSL_Referee.Stage.EXTRA_SECOND_HALF,

	PenaltyShootoutBreak: pb.SSL_Referee.Stage.PENALTY_SHOOTOUT_BREAK,
	PenaltyShootout: pb.SSL_Referee.Stage.PENALTY_SHOOTOUT,
	PostGame: pb.SSL_Referee.Stage.POST_GAME,
};

/** Similar to {@link World.RefereeStateType}. However, as this represents a
 * command and not a state, it
 * - includes "Start" as a special value to start kickoff and penalty
 * - omits "{Kickoff,Penalty}{Offensive,Defensive}{,Running}" as kickoffs and
 *   penalties should be started via the corresponding prepare command, followed
 *   by "Start"
 */
type DebugRefereeCommand = "Start" | "Halt" | "Stop" | "GameForce"
	| "KickoffOffensivePrepare" | "KickoffDefensivePrepare"
	| "PenaltyOffensivePrepare" | "PenaltyDefensivePrepare"
	| "DirectOffensive" | "DirectDefensive"
	| "IndirectOffensive" | "IndirectDefensive"
	| "TimeoutOffensive" | "TimeoutDefensive"
	| "BallPlacementDefensive" | "BallPlacementOffensive";

type ReplaceOffensiveDefensive<T extends string> = T extends `${infer P}Offensive${infer S}`
	? `${P}Yellow${S}`
	: T extends `${infer P}Defensive${infer S}`
	? `${P}Blue${S}`
	: T;

/** Amun requires debug commands to be specified for a concrete team (i.e.
 * yellow/blue), not relative to the currently running script (i.e.
 * offensive/defensive)
 */
type AbsoluteDebugRefereeCommand = ReplaceOffensiveDefensive<DebugRefereeCommand>;

const commandNames: Readonly<Record<AbsoluteDebugRefereeCommand, pb.SSL_Referee.Command>> = {
	Start: pb.SSL_Referee.Command.NORMAL_START,
	Halt: pb.SSL_Referee.Command.HALT,
	Stop: pb.SSL_Referee.Command.STOP,
	GameForce: pb.SSL_Referee.Command.FORCE_START,
	KickoffYellowPrepare: pb.SSL_Referee.Command.PREPARE_KICKOFF_YELLOW,
	KickoffBluePrepare: pb.SSL_Referee.Command.PREPARE_KICKOFF_BLUE,
	PenaltyYellowPrepare: pb.SSL_Referee.Command.PREPARE_PENALTY_YELLOW,
	PenaltyBluePrepare: pb.SSL_Referee.Command.PREPARE_PENALTY_BLUE,
	DirectYellow: pb.SSL_Referee.Command.DIRECT_FREE_YELLOW,
	DirectBlue: pb.SSL_Referee.Command.DIRECT_FREE_BLUE,
	IndirectYellow: pb.SSL_Referee.Command.INDIRECT_FREE_YELLOW,
	IndirectBlue: pb.SSL_Referee.Command.INDIRECT_FREE_BLUE,
	TimeoutYellow: pb.SSL_Referee.Command.TIMEOUT_YELLOW,
	TimeoutBlue: pb.SSL_Referee.Command.TIMEOUT_BLUE,
	BallPlacementBlue: pb.SSL_Referee.Command.BALL_PLACEMENT_BLUE,
	BallPlacementYellow: pb.SSL_Referee.Command.BALL_PLACEMENT_YELLOW,
};

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
export function sendRefereeCommand(refereeCommand: DebugRefereeCommand, gameStage?: World.GameStageType, blueKeeperID?: number, yellowKeeperID?: number, pos?: Position) {
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
		state.stage = stageNames[gameStage];
		if (state.stage == undefined) {
			throw new Error(`Invalid game stage name: ${gameStage}`);
		}
	}

	if (refereeCommand != undefined) {
		// map referee command from team local to global naming
		// that is revert *Offensive/Defensive to *Blue/Yellow
		let command: AbsoluteDebugRefereeCommand;
		if (World.TeamIsBlue) {
			command = refereeCommand
				.replace("Offensive", "Blue")
				.replace("Defensive", "Yellow") as AbsoluteDebugRefereeCommand;
		} else {
			command = refereeCommand
				.replace("Offensive", "Yellow")
				.replace("Defensive", "Blue") as AbsoluteDebugRefereeCommand;
		}
		// map "refereeState" to command
		state.command = commandNames[command];
		if (state.command == undefined) {
			throw new Error(`Invalid referee command name: ${refereeCommand}`);
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
		state.designated_position = { x: pos.x, y: pos.y };
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
export type BallInfo = { pos: Vector; posZ?: number; speed: Vector; speedZ?: number };
export function moveObjects(ball?: BallInfo, friendlyRobots?: RobotState[], opponentRobots?: RobotState[]) {
	if (!amun.isDebug) {
		throw new Error("only works in debug mode");
	}
	if (World.WorldStateSource() !== pb.world.WorldSource.INTERNAL_SIMULATION) {
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
				id: { id: robot.id, team: team },
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

	amun.sendCommand({ simulator: { ssl_control: simCommand }, tracking: { reset: true } });
}
