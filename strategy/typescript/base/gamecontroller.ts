/**
 * @module gamecontroller
 * Interface to the ssl gamecontroller protocol
 */

/**************************************************************************
*   Copyright 2018 Paul Bergmann                                          *
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

const amunLocal = amun;

import { throwInDebug } from "base/amun";
import { gameController } from "base/protobuf";
import * as Referee from "base/referee";
import * as World from "base/world";

type ConnectionState = "CONNECTED" | "UNCONNECTED";
let state: ConnectionState = "UNCONNECTED";

let message: gameController.ControllerToTeam | undefined = undefined;

/**
 * Check connection to the game controller and receive new messages
 */
export function _update() {
	message = undefined;
	if (!World.IsReplay && World.TeamName === "ER-Force" && (World.OpponentTeamName !== "ER-Force" || World.TeamIsBlue)) {
		if (amunLocal.connectGameController()) {
			if (state === "UNCONNECTED") {
				state = "CONNECTED";
				amun.log("Connect to gameController");
				amunLocal.sendGameControllerMessage("TeamRegistration", { team_name: "ER-Force" });
			}

			message = amunLocal.getGameControllerMessage();
		} else {
			state = "UNCONNECTED";
		}
	}
}

/**
 * Check if a connection to the game controller is established
 * @returns true if connected to the game controller
 */
export function isConnected(): boolean {
	return state === "CONNECTED";
}

/**
 * Request to change the keeper to the desired robot.
 * Will crash in debug while not in STOP
 * @param id - the id of the desired new keeper
 */
export function requestDesiredKeeper(id: number) {
	if (World.RefereeState !== "Stop") {
		throwInDebug("Trying to change keeper while not in STOP. The request would be rejected");
	}
	amunLocal.sendGameControllerMessage("TeamToController", { desired_keeper: id });
}

/**
 * Request a substitution at the next possibility
 */
export function requestSubstitution() {
	amunLocal.sendGameControllerMessage("TeamToController", { substitute_bot: true });
}

// use a custom type instead of the protobuf one because this is nicer
type AdvantageReponse = "stop" | "continue";

/**
 * Respond with an advantage choice.
 * Will crash in debug if we are not allowed to make this choice.
 * @param resp - "continue" if we wish to continue playing after the foul, "stop" otherwise
 */
export function sendAdvantageReponse(resp: AdvantageReponse) {
	if (amunLocal.isDebug && !Referee.hasTooManyOpponentRobots()) {
		throw new Error("Trying to send advantage reponse while no foul occured. This will be rejected");
	}
	amunLocal.sendGameControllerMessage("TeamToController", {
		advantage_choice: resp === "continue"
			? gameController.AdvantageChoice.CONTINUE
			: gameController.AdvantageChoice.STOP
	});
}

