
/* tslint:disable:prefer-method-signature */

/*
/// API for Ra. <br/>
// Amun offers serveral guarantees to the strategy: <br/>
// The values returned by getGeometry, getTeam, isBlue are guaranteed to remain constant for the whole strategy runtime.
// That is if any of the values changes the strategy is restarted! <br/>
// If coordinates are passed via the API these values are using <strong>global</strong> coordinates!
// This API may only be used by coded that provides a mapping between Amun and Strategy
module "amun"
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

/// Returns world state
// @class function
// @name getWorldState
// @return protobuf.world.State - converted to lua table

/*
separator for luadoc*/

/// Returns world geometry
// @class function
// @name getGeometry
// @return protobuf.world.Geometry - converted to lua table

/*
separator for luadoc*/

/// Returns team information
// @class function
// @name getTeam
// @return protobuf.robot.Team - converted to lua table

/*
separator for luadoc*/

/// Query team color
// @class function
// @name isBlue
// @return bool - true if this is the blue team, false otherwise

/*
separator for luadoc*/

/// Add a visualization
// @class function
// @name addVisualization
// @param vis protobuf.amun.Visualization as table

/*
separator for luadoc*/

/*
separator for luadoc*/

/// Set commands for a robot
// @class function
// @name setCommand
// @param int generation
// @param int robotid
// @param cmd protobuf.robot.StrategyCommand

/*
separator for luadoc*/

/// Log function.
// If data is a string use ... as parameters for format.
// Otherweise logs tostring(data)
// @class function
// @name log
// @param data any - data to log
// @param ... any - params for format (optional)

/*
separator for luadoc*/

/// Returns game state and referee information
// @class function
// @name getGameState
// @return protobuf.GameState - converted to lua table

/*
separator for luadoc*/

/// Returns the user input
// @class function
// @name getUserInput
// @return protobuf.UserInput - converted to lua table

/*
separator for luadoc*/

/// Returns current time
// @class function
// @name getCurrentTime
// @return Number - time in nanoseconds (amun), seconds(strategy)

/*
separator for luadoc*/

/// Returns the absolute path to the folder containing the init script
// @class function
// @name getStrategyPath
// @return String - path

/*
separator for luadoc*/

/// Returns list with names of enabled options
// @class function
// @name getSelectedOptions
// @return String[] - options

/*
separator for luadoc*/

/// Sets a value in the debug tree
// @class function
// @name addDebug
// @param key string
// @param value number|bool|string|nil

/*
separator for luadoc*/

/// Add a value to the plotter
// @class function
// @name addPlot
// @param name string
// @param value number

/*
separator for luadoc*/

/// Set the exchange symbol for a robot
// @class function
// @name setRobotExchangeSymbol
// @param generation number
// @param id number
// @param exchange bool

/*
separator for luadoc*/

/// Send arbitrary commands. Only works in debug mode
// @class function
// @name sendCommand
// @param command amun.Command

/*
separator for luadoc*/

/// Send internal referee command. Only works in debug mode. Must be fully populated
// @class function
// @name sendRefereeCommand
// @param command SSL_Referee

/*
separator for luadoc*/

/// Send mixed team info packet
// @class function
// @name sendMixedTeamInfo
// @param data ssl::TeamPlan

/*
separator for luadoc*/

/// Send referee command over network. Only works in debug mode or as autoref. Must be fully populated
// Only sends the data passed to the last call of this function during a strategy run.
// The command_counter must be increased for every command change
// @class function
// @name sendNetworkRefereeCommand
// @param command SSL_Referee

/// Check if performance mode is active
// @class function
// @name getPerformanceMode
// @return mode boolean


/// Fetch the last referee remote control request reply
// @class function
// @name nextRefboxReply
// @return reply table - the last reply or nil if none is available


/// Connect to the v8 debugger
// this function can be called as often as one wishes, if the debugger is
// already connected, it will do nothing and return false
// @class function
// @name connectDebugger
// @param handleResponse - (message: string) => void - function to be called on a message response
// @param handleNotification - (notification: string) => void - function to be called on a notification
// @param messageLoop - () => void - called when regular javascript execution is blocket as the debugger is paused
// @return success - boolean - if the connection was successfull

/// Send a command to the debugger
// only call this if the debugger is connected
// @class function
// @name debuggerSend
// @param command - string

/// Disconnects from the v8 debugger
// @class function
// @name disconnectDebugger

import * as pb from "base/protobuf";

interface AmunPublic {
	isDebug: boolean;
	strategyPath: string;
	isPerformanceMode: boolean;
	log(data: any, ...params: any[]): void;
	getCurrentTime(): number;
	setRobotExchangeSymbol(generation: number, id: number, exchange: boolean): void;
	nextRefboxReply(): pb.SSL_RefereeRemoteControlReply;

	// only in debug
	sendCommand(command: pb.amun.Command): void;
	sendNetworkRefereeCommand(command: pb.SSL_Referee): void;
}

interface Amun extends AmunPublic {
	getWorldState(): pb.world.State;
	getGeometry(): pb.world.Geometry;
	getTeam(): pb.robot.Team;
	isBlue(): boolean;
	addVisualization(vis: pb.amun.Visualization): void;
	/** Adds a circle visualization, this is faster than the generic addVisualization */
	addCircleSimple(name: string, x: number, y: number, radius: number, r: number,
		g: number, b: number, alpha: number, filled: boolean, background: boolean, lineWidth: number): void;
	/** Adds a path visualization, pointCoordinates takes consecutive x and y coordinates of the points */
	addPathSimple(name: string, r: number, g: number, b: number, alpha: number, width: number, background: boolean,
		pointCoordinates: number[]): void;
	/** Adds a polygon visualization, pointCoordinates takes consecutive x and y coordinates of the points */
	addPolygonSimple(name: string, r: number, g: number, b: number, alpha: number, filled: boolean,
		background: boolean, pointCoordinates: number[]): void;
	setCommand(generation: number, id: number, cmd: pb.robot.Command): void;
	/** Takes an array of tuples of generation, id, and command. */
	setCommands(commands: [number, number, pb.robot.Command][]): void;
	getGameState(): pb.amun.GameState;
	getUserInput(): pb.amun.UserInput;
	getStrategyPath(): string;
	getSelectedOptions(): string[];
	addDebug(key: string, value?: number | boolean | string): void;
	addPlot(name: string, value: number): void;
	sendRefereeCommand(command: pb.SSL_Referee): void;
	sendMixedTeamInfo(data: pb.ssl.TeamPlan): void;
	getPerformanceMode(): boolean;
	connectDebugger(handleResponse: (message: string) => void, handleNotification: (notification: string) => void,
		messageLoop: () => void): boolean;
	debuggerSend(command: string): void;
	disconnectDebugger(): void;

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
	isDebug: true, // TODO
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
	let nextRefboxReply = amun.nextRefboxReply;
	let log = amun.log;
	let sendCommand = amun.sendCommand;
	let sendNetworkRefereeCommand = amun.sendNetworkRefereeCommand;

	const DISABLED_FUNCTION = function(..._: any[]): any {
		throw new Error("Usage of disabled amun function");
	};

	amun = {
		isDebug: isDebug,
		isPerformanceMode: isPerformanceMode,
		strategyPath: strategyPath,
		getCurrentTime: function() {
			return getCurrentTime() * 1E-9;
		},
		setRobotExchangeSymbol: setRobotExchangeSymbol,
		nextRefboxReply: nextRefboxReply,
		log: log,
		sendCommand: isDebug ? sendCommand : DISABLED_FUNCTION,
		sendNetworkRefereeCommand: isDebug ? sendNetworkRefereeCommand : DISABLED_FUNCTION,

		getWorldState: DISABLED_FUNCTION,
		getGeometry: DISABLED_FUNCTION,
		getTeam: DISABLED_FUNCTION,
		isBlue: DISABLED_FUNCTION,
		addVisualization: DISABLED_FUNCTION,
		addCircleSimple: DISABLED_FUNCTION,
		addPathSimple: DISABLED_FUNCTION,
		addPolygonSimple: DISABLED_FUNCTION,
		setCommand: DISABLED_FUNCTION,
		setCommands: DISABLED_FUNCTION,
		getGameState: DISABLED_FUNCTION,
		getUserInput: DISABLED_FUNCTION,
		getStrategyPath: DISABLED_FUNCTION,
		getSelectedOptions: DISABLED_FUNCTION,
		addDebug: DISABLED_FUNCTION,
		addPlot: DISABLED_FUNCTION,
		sendRefereeCommand: DISABLED_FUNCTION,
		sendMixedTeamInfo: DISABLED_FUNCTION,
		getPerformanceMode: DISABLED_FUNCTION,
		connectDebugger: DISABLED_FUNCTION,
		debuggerSend: DISABLED_FUNCTION,
		disconnectDebugger: DISABLED_FUNCTION,

		luaRandomSetSeed: DISABLED_FUNCTION,
		luaRandom: DISABLED_FUNCTION
	};
}

export const log = amun.log;


