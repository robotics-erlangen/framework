/**
 * @module amun
 * API for Ra.
 * Amun offers serveral guarantees to the strategy: <br/>
 * The values returned by getGeometry, getTeam, isBlue are guaranteed to remain constant for the whole strategy runtime.
 * That is if any of the values changes the strategy is restarted! <br/>
 * If coordinates are passed via the API these values are using <strong>global</strong> coordinates!
 * This API may only be used by coded that provides a mapping between Amun and Strategy
 */

/**************************************************************************
*   Copyright 2015 Alexander Danzer, Michael Eischer, Philipp Nordhus     *
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


import * as pb from "base/protobuf";

interface AmunPublic {
	isDebug: boolean;
	strategyPath: string;
	isPerformanceMode: boolean;
	/**
	 * Logs the equivalent of new String(value) to the log widget for each value of data, seperated by spaces
	 * @param data - The data to be logged, will be printed seperated by a space
	 */
	log(...data: any[]): void;
	/**
	 * Returns current time
	 * @returns time in nanoseconds (amun), seconds(strategy)
	 */
	getCurrentTime(): number;
	/** Set the exchange symbol for a robot */
	setRobotExchangeSymbol(generation: number, id: number, exchange: boolean): void;

	// game controller communication
	connectGameController(): boolean;
	sendGameControllerMessage(type: "TeamRegistration", message: pb.gameController.TeamRegistration): void;
	sendGameControllerMessage(type: "AutoRefRegistration", message: pb.gameController.AutoRefRegistration): void;
	sendGameControllerMessage(type: "TeamToController", message: pb.gameController.TeamToController): void;
	sendGameControllerMessage(type: "AutoRefToController", message: pb.gameController.AutoRefToController): void;
	getGameControllerMessage(): pb.gameController.ControllerToTeam | pb.gameController.ControllerToAutoRef | undefined;

	// only in debug
	/** Send arbitrary commands. Only works in debug mode */
	sendCommand(command: pb.amun.Command): void;

	/* eslint-disable @typescript-eslint/naming-convention */
	// ra version/feature tags
	readonly SUPPORTS_OPTION_DEFAULT: boolean | undefined;
	readonly SUPPORTS_EFFICIENT_PATHVIS: boolean | undefined;
	/* eslint-enable @typescript-eslint/naming-convention */
}

interface Amun extends AmunPublic {
	/** Returns world state */
	getWorldState(): pb.world.State;
	/** Returns world geometry */
	getGeometry(): pb.world.Geometry;
	/** Returns team information */
	getTeam(): pb.robot.Team;
	/**
	 * Query team color
	 * @returns true if this is the blue team, false otherwise
	 */
	isBlue(): boolean;
	/** Add a visualization */
	addVisualization(vis: pb.amun.Visualization): void;
	/** Adds a circle visualization, this is faster than the generic addVisualization */
	addCircleSimple(name: string, x: number, y: number, radius: number, r: number,
		g: number, b: number, alpha: number, filled: boolean, background: boolean, lineWidth: number): void;
	/**
	 * Adds a path visualization, pointCoordinates takes consecutive x and y coordinates of the points
	 * Two different version depending on what features the amun instance supports
	 * The one using the Float32Array is only available if amun.SUPPORTS_EFFICIENT_PATHVIS is true
	 * In that case, the values have to be given in the exact same order as the parameters for the second version
	 */
	addPathSimple(name: string, data: Float32Array): void;
	addPathSimple(name: string, r: number, g: number, b: number, alpha: number, width: number, background: boolean,
		pointCoordinates: number[]): void;
	/** Adds a polygon visualization, pointCoordinates takes consecutive x and y coordinates of the points */
	addPolygonSimple(name: string, r: number, g: number, b: number, alpha: number, filled: boolean,
		background: boolean, pointCoordinates: number[]): void;
	/** Set commands for a robot */
	setCommand(generation: number, id: number, cmd: pb.robot.Command): void;
	/** Takes an array of tuples of generation, id, and command. */
	setCommands(commands: [number, number, pb.robot.Command][]): void;
	/** Returns game state and referee information */
	getGameState(): pb.amun.GameState;
	/** Returns the user input */
	getUserInput(): pb.amun.UserInput;
	/** Returns the absolute path to the folder containing the init script */
	getStrategyPath(): string;
	/** Returns list with names of enabled options */
	getSelectedOptions(): string[];
	/** Sets a value in the debug tree */
	addDebug(key: string, value?: number | boolean | string): void;
	/** Add a value to the plotter */
	addPlot(name: string, value: number): void;
	/** Send internal referee command. Only works in debug mode. Must be fully populated */
	sendRefereeCommand(command: pb.SSL_Referee): void;
	/** Send mixed team info packet */
	sendMixedTeamInfo(data: pb.ssl.TeamPlan): void;
	/** Check if performance mode is active */
	getPerformanceMode(): boolean;
	/**
	 * Connect to the v8 debugger
	 * this function can be called as often as one wishes, if the debugger is
	 * already connected, it will do nothing and return false
	 * @param handleResponse - function to be called on a message response
	 * @param handleNotification - function to be called on a notification
	 * @param messageLoop - called when regular javascript is blocked as the debugger is paused
	 * @returns success - if the connection was successfull
	 */
	connectDebugger(handleResponse: (message: string) => void, handleNotification: (notification: string) => void,
		messageLoop: () => void): boolean;
	/**
	 * Send a command to the debugger
	 * only call this if the debugger is connected
	 */
	debuggerSend(command: string): void;
	tryCatch: <T>(tryBlock: () => void, thenBlock: (e: T) => void, catchBlock: (error: any, e: T) => void, e: T, printStackTrace: boolean) => void;
	/** Terminates the javascript execution immediately. Should only be used for script timeout or debugging */
	terminateExecution(): void;
	/**
	 * Resolve a javascript file, line and column number to the corresponding values in the typescript file
	 * The result is given as a string that is nicely human readable
	 */
	resolveJsToTs(filename: string, line: number, column: number): string;

	// undocumented
	luaRandomSetSeed(seed: number): void;
	luaRandom(): number;
	isReplay?: () => boolean;
}

declare global {
	let amun: Amun;
}

amun = {
	...amun,
	isDebug: (<any> amun.isDebug)(),
	isPerformanceMode: amun.getPerformanceMode!()
};

// only to be used for unit tests
export let fullAmun: Amun;

export function _hideFunctions() {
	fullAmun = amun;
	let isDebug = amun.isDebug;
	let isPerformanceMode = amun.isPerformanceMode;
	let strategyPath = amun.getStrategyPath!();
	let getCurrentTime = amun.getCurrentTime;
	let setRobotExchangeSymbol = amun.setRobotExchangeSymbol;
	let log = amun.log;
	let sendCommand = amun.sendCommand;
	let supportsOptionDefault = amun.SUPPORTS_OPTION_DEFAULT;
	let supportsEfficientPath = amun.SUPPORTS_EFFICIENT_PATHVIS;

	const makeDisabledFunction = function(name: string) {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		function DISABLED_FUNCTION(..._: any[]): any {
			throw new Error(`Usage of disabled amun function ${name}`);
		}
		return DISABLED_FUNCTION;
	};

	amun = {
		isDebug: isDebug,
		isPerformanceMode: isPerformanceMode,
		strategyPath: strategyPath,
		getCurrentTime: function() {
			return getCurrentTime() * 1E-9;
		},
		setRobotExchangeSymbol: setRobotExchangeSymbol,
		log: log,
		connectGameController: amun.connectGameController,
		sendGameControllerMessage: amun.sendGameControllerMessage,
		getGameControllerMessage: amun.getGameControllerMessage,
		sendCommand: isDebug ? sendCommand : makeDisabledFunction("sendCommand"),

		getWorldState: makeDisabledFunction("getWorldState"),
		getGeometry: makeDisabledFunction("getGeometry"),
		getTeam: makeDisabledFunction("getTeam"),
		isBlue: makeDisabledFunction("isBlue"),
		addVisualization: makeDisabledFunction("addVisualization"),
		addCircleSimple: makeDisabledFunction("addCircleSimple"),
		addPathSimple: makeDisabledFunction("addPathSimple"),
		addPolygonSimple: makeDisabledFunction("addPolygonSimple"),
		setCommand: makeDisabledFunction("setCommand"),
		setCommands: makeDisabledFunction("setCommands"),
		getGameState: makeDisabledFunction("getGameState"),
		getUserInput: makeDisabledFunction("getUserInput"),
		getStrategyPath: makeDisabledFunction("getStrategyPath"),
		getSelectedOptions: makeDisabledFunction("getSelectedOptions"),
		addDebug: makeDisabledFunction("addDebug"),
		addPlot: makeDisabledFunction("addPlot"),
		sendRefereeCommand: makeDisabledFunction("sendRefereeCommand"),
		sendMixedTeamInfo: makeDisabledFunction("sendMixedTeamInfo"),
		getPerformanceMode: makeDisabledFunction("getPerformanceMode"),
		connectDebugger: makeDisabledFunction("connectDebugger"),
		debuggerSend: makeDisabledFunction("debuggerSend"),
		terminateExecution: makeDisabledFunction("terminateExecution"),
		resolveJsToTs: makeDisabledFunction("resolveJsToTs"),

		luaRandomSetSeed: makeDisabledFunction("luaRandomSetSeed"),
		luaRandom: makeDisabledFunction("luaRandom"),
		tryCatch: makeDisabledFunction("tryCatch"),

		SUPPORTS_OPTION_DEFAULT: supportsOptionDefault,
		SUPPORTS_EFFICIENT_PATHVIS: supportsEfficientPath
	};
}

export const log = amun.log;

/**
 * Throws an error with the given message if the strategy is in debug mode.
 * Otherwise it just logs the error
 * @param msg - An error message
 */
export function throwInDebug(msg: string) {
	if (amun.isDebug) {
		throw new Error(msg);
	} else {
		log(msg);
	}
}

