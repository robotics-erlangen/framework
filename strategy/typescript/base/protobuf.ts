/* tslint:disable:class-name */
// automatically generated, do not edit

export namespace amun {
	export namespace GameState {
		export const enum State {
			Halt = 1,
			Stop = 2,
			Game = 3,
			GameForce = 4,
			KickoffYellowPrepare = 5,
			KickoffYellow = 6,
			PenaltyYellowPrepare = 7,
			PenaltyYellow = 8,
			DirectYellow = 9,
			IndirectYellow = 10,
			BallPlacementYellow = 19,
			KickoffBluePrepare = 11,
			KickoffBlue = 12,
			PenaltyBluePrepare = 13,
			PenaltyBlue = 14,
			DirectBlue = 15,
			IndirectBlue = 16,
			BallPlacementBlue = 20,
			TimeoutYellow = 17,
			TimeoutBlue = 18,
		}
	}
	export interface GameState {
		stage: SSL_Referee.Stage;
		stageTimeLeft?: number;
		state: amun.GameState.State;
		yellow: SSL_Referee.TeamInfo;
		blue: SSL_Referee.TeamInfo;
		designatedPosition?: SSL_Referee.Point;
		gameEvent?: SSL_Referee_Game_Event;
		goalsFlipped?: boolean;
		isRealGameRunning?: boolean;
	}
	export interface Color {
		red?: number;
		green?: number;
		blue?: number;
		alpha?: number;
	}
	export namespace Pen {
		export const enum Style {
			DashLine = 1,
			DotLine = 2,
			DashDotLine = 3,
			DashDotDotLine = 4,
		}
	}
	export interface Pen {
		style?: amun.Pen.Style;
		color?: amun.Color;
	}
	export interface Circle {
		pX: number;
		pY: number;
		radius: number;
	}
	export interface Point {
		x: number;
		y: number;
	}
	export interface Polygon {
		point?: amun.Point[];
	}
	export interface Path {
		point?: amun.Point[];
	}
	export interface Visualization {
		name: string;
		pen?: amun.Pen;
		brush?: amun.Color;
		width?: number;
		circle?: amun.Circle;
		polygon?: amun.Polygon;
		path?: amun.Path;
		background?: boolean;
	}
	export interface DebugValue {
		key: string;
		floatValue?: number;
		boolValue?: boolean;
		stringValue?: string;
	}
	export interface StatusLog {
		timestamp: number;
		text: string;
	}
	export interface PlotValue {
		name: string;
		value: number;
	}
	export const enum DebugSource {
		StrategyBlue = 1,
		StrategyYellow = 2,
		Controller = 3,
		Autoref = 4,
		Tracking = 5,
		RadioResponse = 6,
		ReplayBlue = 7,
		ReplayYellow = 8,
	}
	export interface RobotValue {
		generation: number;
		id: number;
		exchange?: boolean;
	}
	export interface DebuggerOutput {
		line?: string;
	}
	export interface DebugValues {
		source: amun.DebugSource;
		time?: number;
		value?: amun.DebugValue[];
		visualization?: amun.Visualization[];
		log?: amun.StatusLog[];
		plot?: amun.PlotValue[];
		robot?: amun.RobotValue[];
		debuggerOutput?: amun.DebuggerOutput;
	}
	export interface SimulatorMoveBall {
		pX?: number;
		pY?: number;
		pZ?: number;
		position?: boolean;
		vX?: number;
		vY?: number;
		vZ?: number;
	}
	export interface SimulatorMoveRobot {
		id: number;
		pX?: number;
		pY?: number;
		phi?: number;
		position?: boolean;
		vX?: number;
		vY?: number;
		omega?: number;
	}
	export interface RobotMoveCommand {
		id: number;
		pX?: number;
		pY?: number;
	}
	export namespace CommandSimulator {
		export const enum RuleVersion {
			RULES2017 = 1,
			RULES2018 = 2,
		}
	}
	export interface CommandSimulator {
		enable?: boolean;
		visionDelay?: number;
		visionProcessingTime?: number;
		moveBall?: amun.SimulatorMoveBall;
		moveBlue?: amun.SimulatorMoveRobot[];
		moveYellow?: amun.SimulatorMoveRobot[];
		stddevBallP?: number;
		stddevRobotP?: number;
		stddevRobotPhi?: number;
		ruleVersion?: amun.CommandSimulator.RuleVersion;
	}
	export interface CommandReferee {
		active?: boolean;
		command?: ArrayBuffer;
		useInternalAutoref?: boolean;
		autorefCommand?: SSL_RefereeRemoteControlRequest;
		flipped?: boolean;
	}
	export interface CommandStrategyLoad {
		filename: string;
		entryPoint?: string;
	}
	export interface CommandStrategyClose {
	}
	export interface CommandStrategySetOptions {
		option?: string[];
	}
	export interface CommandStrategyTriggerDebugger {
	}
	export interface CommandStrategy {
		load?: amun.CommandStrategyLoad;
		close?: amun.CommandStrategyClose;
		reload?: boolean;
		autoReload?: boolean;
		enableDebug?: boolean;
		enableRefboxControl?: boolean;
		options?: amun.CommandStrategySetOptions;
		debug?: amun.CommandStrategyTriggerDebugger;
		performanceMode?: boolean;
	}
	export interface CommandControl {
		commands?: robot.RadioCommand[];
	}
	export interface TransceiverConfiguration {
		channel: number;
	}
	export interface HostAddress {
		host: string;
		port: number;
	}
	export interface CommandTransceiver {
		enable?: boolean;
		charge?: boolean;
		configuration?: amun.TransceiverConfiguration;
		networkConfiguration?: amun.HostAddress;
		useNetwork?: boolean;
	}
	export interface TrackingAOI {
		x1: number;
		y1: number;
		x2: number;
		y2: number;
	}
	export interface CommandTracking {
		aoiEnabled?: boolean;
		aoi?: amun.TrackingAOI;
		systemDelay?: number;
		reset?: boolean;
	}
	export interface CommandAmun {
		visionPort?: number;
		refereePort?: number;
	}
	export const enum DebuggerInputTarget {
		DITStrategyYellow = 0,
		DITStrategyBlue = 1,
		DITAutoref = 2,
	}
	export interface CommandDebuggerInputDisable {
	}
	export interface CommandDebuggerInputLine {
		line?: string;
	}
	export interface CommandDebuggerInput {
		strategyType: amun.DebuggerInputTarget;
		disable?: amun.CommandDebuggerInputDisable;
		queueLine?: amun.CommandDebuggerInputLine;
	}
	export interface Command {
		simulator?: amun.CommandSimulator;
		referee?: amun.CommandReferee;
		setTeamBlue?: robot.Team;
		setTeamYellow?: robot.Team;
		strategyBlue?: amun.CommandStrategy;
		strategyYellow?: amun.CommandStrategy;
		strategyAutoref?: amun.CommandStrategy;
		control?: amun.CommandControl;
		transceiver?: amun.CommandTransceiver;
		speed?: number;
		tracking?: amun.CommandTracking;
		amun?: amun.CommandAmun;
		mixedTeamDestination?: amun.HostAddress;
		robotMoveBlue?: amun.RobotMoveCommand[];
		robotMoveYellow?: amun.RobotMoveCommand[];
		debuggerInput?: amun.CommandDebuggerInput;
		remoteControlPort?: number;
	}
	export interface UserInput {
		radioCommand?: robot.RadioCommand[];
		moveCommand?: amun.RobotMoveCommand[];
	}
	export namespace StatusStrategy {
		export const enum STATE {
			CLOSED = 1,
			RUNNING = 3,
			FAILED = 4,
		}
	}
	export interface StatusStrategy {
		state: amun.StatusStrategy.STATE;
		filename?: string;
		name?: string;
		currentEntryPoint?: string;
		entryPoint?: string[];
		option?: string[];
		hasDebugger?: boolean;
	}
	export interface Timing {
		blueTotal?: number;
		bluePath?: number;
		yellowTotal?: number;
		yellowPath?: number;
		autorefTotal?: number;
		tracking?: number;
		controller?: number;
		transceiver?: number;
		transceiverRtt?: number;
		simulator?: number;
	}
	export interface StatusTransceiver {
		active: boolean;
		error?: string;
		droppedUsbPackets?: number;
		droppedCommands?: number;
	}
	export interface PortBindError {
		port: number;
	}
	export interface StatusAmun {
		portBindError?: amun.PortBindError;
	}
	export interface Status {
		time: number;
		gameState?: amun.GameState;
		worldState?: world.State;
		geometry?: world.Geometry;
		teamBlue?: robot.Team;
		teamYellow?: robot.Team;
		strategyBlue?: amun.StatusStrategy;
		strategyYellow?: amun.StatusStrategy;
		strategyAutoref?: amun.StatusStrategy;
		debug?: amun.DebugValues;
		timing?: amun.Timing;
		radioCommand?: robot.RadioCommand[];
		transceiver?: amun.StatusTransceiver;
		userInputBlue?: amun.UserInput;
		userInputYellow?: amun.UserInput;
		amunState?: amun.StatusAmun;
		timerScaling?: number;
		blueRunning?: boolean;
		yellowRunning?: boolean;
		autorefRunning?: boolean;
		executionState?: world.State;
		executionGameState?: amun.GameState;
		executionUserInput?: amun.UserInput;
	}
}
export namespace robot {
	export interface LimitParameters {
		aSpeedupFMax?: number;
		aSpeedupSMax?: number;
		aSpeedupPhiMax?: number;
		aBrakeFMax?: number;
		aBrakeSMax?: number;
		aBrakePhiMax?: number;
	}
	export namespace Specs {
		export const enum GenerationType {
			Regular = 1,
			Ally = 2,
		}
	}
	export interface Specs {
		generation: number;
		year: number;
		id: number;
		type?: robot.Specs.GenerationType;
		radius?: number;
		height?: number;
		mass?: number;
		angle?: number;
		vMax?: number;
		omegaMax?: number;
		shotLinearMax?: number;
		shotChipMax?: number;
		dribblerWidth?: number;
		acceleration?: robot.LimitParameters;
		strategy?: robot.LimitParameters;
		irParam?: number;
		shootRadius?: number;
		dribblerHeight?: number;
		patternRotation?: number;
	}
	export interface Generation {
		default: robot.Specs;
		robot?: robot.Specs[];
	}
	export interface Team {
		robot?: robot.Specs[];
	}
	export interface Polynomial {
		a0: number;
		a1: number;
		a2: number;
		a3: number;
	}
	export interface Spline {
		tStart: number;
		tEnd: number;
		x: robot.Polynomial;
		y: robot.Polynomial;
		phi: robot.Polynomial;
	}
	export interface ControllerInput {
		spline?: robot.Spline[];
	}
	export interface SpeedVector {
		vS?: number;
		vF?: number;
		omega?: number;
	}
	export namespace Command {
		export const enum KickStyle {
			Linear = 1,
			Chip = 2,
		}
	}
	export interface Command {
		controller?: robot.ControllerInput;
		vF?: number;
		vS?: number;
		omega?: number;
		kickStyle?: robot.Command.KickStyle;
		kickPower?: number;
		dribbler?: number;
		local?: boolean;
		standby?: boolean;
		strategyControlled?: boolean;
		forceKick?: boolean;
		networkControlled?: boolean;
		ejectSdcard?: boolean;
		curVF?: number;
		curVS?: number;
		curOmega?: number;
		output0?: robot.SpeedVector;
		output1?: robot.SpeedVector;
		output2?: robot.SpeedVector;
	}
	export interface RadioCommand {
		generation: number;
		id: number;
		isBlue: boolean;
		command: robot.Command;
	}
	export interface SpeedStatus {
		vF: number;
		vS: number;
		omega: number;
	}
	export interface ExtendedError {
		motor_1Error: boolean;
		motor_2Error: boolean;
		motor_3Error: boolean;
		motor_4Error: boolean;
		dribblerError: boolean;
		kickerError: boolean;
		kickerBreakBeamError?: boolean;
		motorEncoderError?: boolean;
		mainSensorError?: boolean;
		temperature?: number;
	}
	export interface RadioResponse {
		time?: number;
		generation: number;
		id: number;
		battery?: number;
		packetLossRx?: number;
		packetLossTx?: number;
		estimatedSpeed?: robot.SpeedStatus;
		ballDetected?: boolean;
		capCharged?: boolean;
		errorPresent?: boolean;
		radioRtt?: number;
		extendedError?: robot.ExtendedError;
	}
}
export interface SSL_DetectionBall {
	confidence: number;
	area?: number;
	x: number;
	y: number;
	z?: number;
	pixelX: number;
	pixelY: number;
}
export interface SSL_DetectionRobot {
	confidence: number;
	robotId?: number;
	x: number;
	y: number;
	orientation?: number;
	pixelX: number;
	pixelY: number;
	height?: number;
}
export interface SSL_DetectionFrame {
	frameNumber: number;
	tCapture: number;
	tSent: number;
	cameraId: number;
	balls?: SSL_DetectionBall[];
	robotsYellow?: SSL_DetectionRobot[];
	robotsBlue?: SSL_DetectionRobot[];
}
export interface Vector2f {
	x: number;
	y: number;
}
export interface SSL_FieldLineSegment {
	name: string;
	p1: Vector2f;
	p2: Vector2f;
	thickness: number;
}
export interface SSL_FieldCircularArc {
	name: string;
	center: Vector2f;
	radius: number;
	a1: number;
	a2: number;
	thickness: number;
}
export interface SSL_GeometryFieldSize {
	fieldLength: number;
	fieldWidth: number;
	goalWidth: number;
	goalDepth: number;
	boundaryWidth: number;
	fieldLines?: SSL_FieldLineSegment[];
	fieldArcs?: SSL_FieldCircularArc[];
}
export interface SSL_GeometryCameraCalibration {
	cameraId: number;
	focalLength: number;
	principalPointX: number;
	principalPointY: number;
	distortion: number;
	q0: number;
	q1: number;
	q2: number;
	q3: number;
	tx: number;
	ty: number;
	tz: number;
	derivedCameraWorldTx?: number;
	derivedCameraWorldTy?: number;
	derivedCameraWorldTz?: number;
}
export interface SSL_GeometryData {
	field: SSL_GeometryFieldSize;
	calib?: SSL_GeometryCameraCalibration[];
}
export namespace ssl {
	export interface TeamPlan {
		plans?: ssl.RobotPlan[];
	}
	export namespace RobotPlan {
		export const enum RobotRole {
			Default = 0,
			Goalie = 1,
			Defense = 2,
			Offense = 3,
		}
	}
	export interface RobotPlan {
		robotId: number;
		role?: ssl.RobotPlan.RobotRole;
		navTarget?: ssl.Pose;
		shotTarget?: ssl.Location;
	}
	export interface Location {
		x: number;
		y: number;
	}
	export interface Pose {
		loc?: ssl.Location;
		heading?: number;
	}
}
export interface SSL_RadioProtocolCommand {
	robotId: number;
	velocityX: number;
	velocityY: number;
	velocityR: number;
	flatKick?: number;
	chipKick?: number;
	dribblerSpin?: number;
}
export interface SSL_RadioProtocolWrapper {
	command?: SSL_RadioProtocolCommand[];
}
export namespace SSL_Referee_Game_Event {
	export const enum GameEventType {
		UNKNOWN = 0,
		CUSTOM = 1,
		NUMBER_OF_PLAYERS = 2,
		BALL_LEFT_FIELD = 3,
		GOAL = 4,
		KICK_TIMEOUT = 5,
		NO_PROGRESS_IN_GAME = 6,
		BOT_COLLISION = 7,
		MULTIPLE_DEFENDER = 8,
		MULTIPLE_DEFENDER_PARTIALLY = 9,
		ATTACKER_IN_DEFENSE_AREA = 10,
		ICING = 11,
		BALL_SPEED = 12,
		ROBOT_STOP_SPEED = 13,
		BALL_DRIBBLING = 14,
		ATTACKER_TOUCH_KEEPER = 15,
		DOUBLE_TOUCH = 16,
		ATTACKER_TO_DEFENCE_AREA = 17,
		DEFENDER_TO_KICK_POINT_DISTANCE = 18,
		BALL_HOLDING = 19,
		INDIRECT_GOAL = 20,
		BALL_PLACEMENT_FAILED = 21,
		CHIP_ON_GOAL = 22,
	}
	export const enum Team {
		TEAM_UNKNOWN = 0,
		TEAM_YELLOW = 1,
		TEAM_BLUE = 2,
	}
	export interface Originator {
		team: SSL_Referee_Game_Event.Team;
		botId?: number;
	}
}
export interface SSL_Referee_Game_Event {
	gameEventType: SSL_Referee_Game_Event.GameEventType;
	originator?: SSL_Referee_Game_Event.Originator;
	message?: string;
}
export interface SSL_WrapperPacket {
	detection?: SSL_DetectionFrame;
	geometry?: SSL_GeometryData;
}
export namespace SSL_RefereeRemoteControlRequest {
	export namespace CardInfo {
		export const enum CardType {
			CARD_YELLOW = 0,
			CARD_RED = 1,
		}
		export const enum CardTeam {
			TEAM_YELLOW = 0,
			TEAM_BLUE = 1,
		}
	}
	export interface CardInfo {
		type: SSL_RefereeRemoteControlRequest.CardInfo.CardType;
		team: SSL_RefereeRemoteControlRequest.CardInfo.CardTeam;
	}
}
export interface SSL_RefereeRemoteControlRequest {
	messageId: number;
	stage?: SSL_Referee.Stage;
	command?: SSL_Referee.Command;
	designatedPosition?: SSL_Referee.Point;
	card?: SSL_RefereeRemoteControlRequest.CardInfo;
	lastCommandCounter?: number;
	implementationId?: string;
	gameEvent?: SSL_Referee_Game_Event;
}
export namespace SSL_RefereeRemoteControlReply {
	export const enum Outcome {
		OK = 0,
		MULTIPLE_ACTIONS = 1,
		BAD_STAGE = 2,
		BAD_COMMAND = 3,
		BAD_DESIGNATED_POSITION = 4,
		BAD_COMMAND_COUNTER = 5,
		BAD_CARD = 6,
		NO_MAJORITY = 7,
		COMMUNICATION_FAILED = 8,
	}
}
export interface SSL_RefereeRemoteControlReply {
	messageId: number;
	outcome: SSL_RefereeRemoteControlReply.Outcome;
}
export namespace SSL_Referee {
	export const enum Stage {
		NORMAL_FIRST_HALF_PRE = 0,
		NORMAL_FIRST_HALF = 1,
		NORMAL_HALF_TIME = 2,
		NORMAL_SECOND_HALF_PRE = 3,
		NORMAL_SECOND_HALF = 4,
		EXTRA_TIME_BREAK = 5,
		EXTRA_FIRST_HALF_PRE = 6,
		EXTRA_FIRST_HALF = 7,
		EXTRA_HALF_TIME = 8,
		EXTRA_SECOND_HALF_PRE = 9,
		EXTRA_SECOND_HALF = 10,
		PENALTY_SHOOTOUT_BREAK = 11,
		PENALTY_SHOOTOUT = 12,
		POST_GAME = 13,
	}
	export const enum Command {
		HALT = 0,
		STOP = 1,
		NORMAL_START = 2,
		FORCE_START = 3,
		PREPARE_KICKOFF_YELLOW = 4,
		PREPARE_KICKOFF_BLUE = 5,
		PREPARE_PENALTY_YELLOW = 6,
		PREPARE_PENALTY_BLUE = 7,
		DIRECT_FREE_YELLOW = 8,
		DIRECT_FREE_BLUE = 9,
		INDIRECT_FREE_YELLOW = 10,
		INDIRECT_FREE_BLUE = 11,
		TIMEOUT_YELLOW = 12,
		TIMEOUT_BLUE = 13,
		GOAL_YELLOW = 14,
		GOAL_BLUE = 15,
		BALL_PLACEMENT_YELLOW = 16,
		BALL_PLACEMENT_BLUE = 17,
	}
	export interface TeamInfo {
		name: string;
		score: number;
		redCards: number;
		yellowCardTimes?: number[];
		yellowCards: number;
		timeouts: number;
		timeoutTime: number;
		goalie: number;
	}
	export interface Point {
		x: number;
		y: number;
	}
}
export interface SSL_Referee {
	packetTimestamp: number;
	stage: SSL_Referee.Stage;
	stageTimeLeft?: number;
	command: SSL_Referee.Command;
	commandCounter: number;
	commandTimestamp: number;
	yellow: SSL_Referee.TeamInfo;
	blue: SSL_Referee.TeamInfo;
	designatedPosition?: SSL_Referee.Point;
	blueTeamOnPositiveHalf?: boolean;
	gameEvent?: SSL_Referee_Game_Event;
}
export namespace world {
	export namespace Geometry {
		export const enum GeometryType {
			TYPE_2014 = 1,
			TYPE_2018 = 2,
		}
	}
	export interface Geometry {
		lineWidth: number;
		fieldWidth: number;
		fieldHeight: number;
		boundaryWidth: number;
		refereeWidth: number;
		goalWidth: number;
		goalDepth: number;
		goalWallWidth: number;
		centerCircleRadius: number;
		defenseRadius: number;
		defenseStretch: number;
		freeKickFromDefenseDist: number;
		penaltySpotFromFieldLineDist: number;
		penaltyLineFromSpotDist: number;
		goalHeight: number;
		defenseWidth?: number;
		defenseHeight?: number;
		type?: world.Geometry.GeometryType;
	}
	export interface BallPosition {
		time: number;
		pX: number;
		pY: number;
		derivedZ?: number;
		vX?: number;
		vY?: number;
		systemDelay?: number;
		timeDiffScaled?: number;
		cameraId?: number;
		area?: number;
		visionProcessingTime?: number;
	}
	export interface Ball {
		pX: number;
		pY: number;
		pZ?: number;
		vX: number;
		vY: number;
		vZ?: number;
		touchdownX?: number;
		touchdownY?: number;
		isBouncing?: boolean;
		raw?: world.BallPosition[];
	}
	export interface RobotPosition {
		time: number;
		pX: number;
		pY: number;
		phi: number;
		vX?: number;
		vY?: number;
		systemDelay?: number;
		timeDiffScaled?: number;
		omega?: number;
		cameraId?: number;
		visionProcessingTime?: number;
	}
	export interface Robot {
		id: number;
		pX: number;
		pY: number;
		phi: number;
		vX: number;
		vY: number;
		omega: number;
		raw?: world.RobotPosition[];
	}
	export interface State {
		time: number;
		ball?: world.Ball;
		yellow?: world.Robot[];
		blue?: world.Robot[];
		radioResponse?: robot.RadioResponse[];
		isSimulated?: boolean;
		hasVisionData?: boolean;
		mixedTeamInfo?: ssl.TeamPlan;
		trackingAoi?: amun.TrackingAOI;
		visionFrames?: SSL_WrapperPacket[];
	}
}

