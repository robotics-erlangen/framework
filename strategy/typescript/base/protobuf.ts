/* tslint:disable:class-name */
// automatically generated, do not edit

export namespace amun {
	export interface SimulatorMoveBall {
		p_x?: number;
		p_y?: number;
		p_z?: number;
		position?: boolean;
		v_x?: number;
		v_y?: number;
		v_z?: number;
		teleport_safely?: boolean;
	}
	export interface SimulatorMoveRobot {
		id: number;
		p_x?: number;
		p_y?: number;
		phi?: number;
		position?: boolean;
		v_x?: number;
		v_y?: number;
		omega?: number;
	}
	export interface RobotMoveCommand {
		id: number;
		p_x?: number;
		p_y?: number;
	}
	export interface SimulatorSetup {
		geometry: world.Geometry;
		camera_setup?: SSL_GeometryCameraCalibration[];
	}
	export interface SimulatorWorstCaseVision {
		min_robot_detection_time?: number;
		min_ball_detection_time?: number;
	}
	export interface CommandSimulator {
		enable?: boolean;
		simulator_setup?: amun.SimulatorSetup;
		vision_worst_case?: amun.SimulatorWorstCaseVision;
		realism_config?: RealismConfigErForce;
		set_simulator_state?: world.SimulatorState;
		ssl_control?: sslsim.SimulatorControl;
	}
	export interface CommandReferee {
		active?: boolean;
		command?: ArrayBuffer;
		use_internal_autoref?: boolean;
		flipped?: boolean;
	}
	export interface CommandStrategyLoad {
		filename: string;
		entry_point?: string;
	}
	export interface CommandStrategyClose {
	}
	export interface CommandStrategyTriggerDebugger {
	}
	export interface CommandStrategy {
		load?: amun.CommandStrategyLoad;
		close?: amun.CommandStrategyClose;
		reload?: boolean;
		auto_reload?: boolean;
		enable_debug?: boolean;
		debug?: amun.CommandStrategyTriggerDebugger;
		performance_mode?: boolean;
		start_profiling?: boolean;
		finish_and_save_profile?: string;
		tournament_mode?: boolean;
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
	export interface SimulatorNetworking {
		control_simulator: boolean;
		control_blue: boolean;
		control_yellow: boolean;
		port_blue: number;
		port_yellow: number;
	}
	export interface CommandTransceiver {
		enable?: boolean;
		charge?: boolean;
		configuration?: amun.TransceiverConfiguration;
		network_configuration?: amun.HostAddress;
		use_network?: boolean;
		simulator_configuration?: amun.SimulatorNetworking;
	}
	export interface VirtualFieldTransform {
		a11: number;
		a12: number;
		a21: number;
		a22: number;
		offset_x: number;
		offset_y: number;
	}
	export interface CommandTracking {
		aoi_enabled?: boolean;
		aoi?: world.TrackingAOI;
		system_delay?: number;
		reset?: boolean;
		enable_virtual_field?: boolean;
		field_transform?: amun.VirtualFieldTransform;
		virtual_geometry?: world.Geometry;
		tracking_replay_enabled?: boolean;
	}
	export interface CommandStrategyChangeOption {
		name: string;
		value: boolean;
	}
	export interface CommandAmun {
		vision_port?: number;
		referee_port?: number;
		change_option?: amun.CommandStrategyChangeOption;
	}
	export const enum DebuggerInputTarget {
		DITStrategyYellow = "DITStrategyYellow",
		DITStrategyBlue = "DITStrategyBlue",
		DITAutoref = "DITAutoref",
	}
	export interface CommandDebuggerInputDisable {
	}
	export interface CommandDebuggerInputLine {
		line?: string;
	}
	export interface CommandDebuggerInput {
		strategy_type: amun.DebuggerInputTarget;
		disable?: amun.CommandDebuggerInputDisable;
		queue_line?: amun.CommandDebuggerInputLine;
	}
	export const enum PauseSimulatorReason {
		Ui = "Ui",
		WindowFocus = "WindowFocus",
		DebugBlueStrategy = "DebugBlueStrategy",
		DebugYellowStrategy = "DebugYellowStrategy",
		DebugAutoref = "DebugAutoref",
		Replay = "Replay",
		Horus = "Horus",
		Logging = "Logging",
	}
	export interface PauseSimulatorCommand {
		reason: amun.PauseSimulatorReason;
		pause?: boolean;
		toggle?: boolean;
	}
	export interface CommandReplay {
		enable?: boolean;
		enable_blue_strategy?: boolean;
		blue_strategy?: amun.CommandStrategy;
		enable_yellow_strategy?: boolean;
		yellow_strategy?: amun.CommandStrategy;
	}
	export interface Flag {
	}
	export interface CommandPlayback {
		seek_time?: number;
		seek_packet?: number;
		seek_time_backwards?: number;
		playback_speed?: number;
		toggle_paused?: amun.Flag;
		run_playback?: boolean;
		log_path?: logfile.LogRequest;
		instant_replay?: amun.Flag;
		export_vision_log?: string;
		get_uid?: amun.Flag;
		find_logfile?: string;
		playback_limit?: number;
	}
	export interface CommandRecord {
		use_logfile_location?: boolean;
		save_backlog?: amun.Flag;
		run_logging?: boolean;
		for_replay?: boolean;
		request_backlog?: number;
		overwrite_record_filename?: string;
	}
	export interface Command {
		simulator?: amun.CommandSimulator;
		referee?: amun.CommandReferee;
		set_team_blue?: robot.Team;
		set_team_yellow?: robot.Team;
		strategy_blue?: amun.CommandStrategy;
		strategy_yellow?: amun.CommandStrategy;
		strategy_autoref?: amun.CommandStrategy;
		control?: amun.CommandControl;
		transceiver?: amun.CommandTransceiver;
		tracking?: amun.CommandTracking;
		amun?: amun.CommandAmun;
		mixed_team_destination?: amun.HostAddress;
		robot_move_blue?: amun.RobotMoveCommand[];
		robot_move_yellow?: amun.RobotMoveCommand[];
		debugger_input?: amun.CommandDebuggerInput;
		pause_simulator?: amun.PauseSimulatorCommand;
		replay?: amun.CommandReplay;
		playback?: amun.CommandPlayback;
		record?: amun.CommandRecord;
	}
	export namespace GameState {
		export const enum State {
			Halt = "Halt",
			Stop = "Stop",
			Game = "Game",
			GameForce = "GameForce",
			KickoffYellowPrepare = "KickoffYellowPrepare",
			KickoffYellow = "KickoffYellow",
			PenaltyYellowPrepare = "PenaltyYellowPrepare",
			PenaltyYellow = "PenaltyYellow",
			PenaltyYellowRunning = "PenaltyYellowRunning",
			DirectYellow = "DirectYellow",
			IndirectYellow = "IndirectYellow",
			BallPlacementYellow = "BallPlacementYellow",
			KickoffBluePrepare = "KickoffBluePrepare",
			KickoffBlue = "KickoffBlue",
			PenaltyBluePrepare = "PenaltyBluePrepare",
			PenaltyBlue = "PenaltyBlue",
			PenaltyBlueRunning = "PenaltyBlueRunning",
			DirectBlue = "DirectBlue",
			IndirectBlue = "IndirectBlue",
			BallPlacementBlue = "BallPlacementBlue",
			TimeoutYellow = "TimeoutYellow",
			TimeoutBlue = "TimeoutBlue",
		}
	}
	export interface GameState {
		stage: SSL_Referee.Stage;
		stage_time_left?: number;
		state: amun.GameState.State;
		yellow: SSL_Referee.TeamInfo;
		blue: SSL_Referee.TeamInfo;
		designated_position?: SSL_Referee.Point;
		game_event?: SSL_Referee_Game_Event;
		goals_flipped?: boolean;
		is_real_game_running?: boolean;
		current_action_time_remaining?: number;
		next_state?: amun.GameState.State;
		game_event_2019?: gameController.GameEvent;
	}
	export interface Color {
		red?: number;
		green?: number;
		blue?: number;
		alpha?: number;
	}
	export namespace Pen {
		export const enum Style {
			DashLine = "DashLine",
			DotLine = "DotLine",
			DashDotLine = "DashDotLine",
			DashDotDotLine = "DashDotDotLine",
		}
	}
	export interface Pen {
		style?: amun.Pen.Style;
		color?: amun.Color;
	}
	export interface Circle {
		p_x: number;
		p_y: number;
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
		float_value?: number;
		bool_value?: boolean;
		string_value?: string;
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
		StrategyBlue = "StrategyBlue",
		StrategyYellow = "StrategyYellow",
		Controller = "Controller",
		Autoref = "Autoref",
		Tracking = "Tracking",
		RadioResponse = "RadioResponse",
		ReplayBlue = "ReplayBlue",
		ReplayYellow = "ReplayYellow",
		NetworkTransceiver = "NetworkTransceiver",
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
		debugger_output?: amun.DebuggerOutput;
	}
	export interface StrategyOption {
		name: string;
		default_value?: boolean;
	}
	export namespace StatusStrategy {
		export const enum STATE {
			CLOSED = "CLOSED",
			RUNNING = "RUNNING",
			FAILED = "FAILED",
			COMPILING = "COMPILING",
		}
	}
	export interface StatusStrategy {
		state: amun.StatusStrategy.STATE;
		filename?: string;
		name?: string;
		current_entry_point?: string;
		entry_point?: string[];
		has_debugger?: boolean;
		options?: amun.StrategyOption[];
	}
	export namespace StatusStrategyWrapper {
		export const enum StrategyType {
			BLUE = "BLUE",
			YELLOW = "YELLOW",
			AUTOREF = "AUTOREF",
			REPLAY_BLUE = "REPLAY_BLUE",
			REPLAY_YELLOW = "REPLAY_YELLOW",
		}
	}
	export interface StatusStrategyWrapper {
		type: amun.StatusStrategyWrapper.StrategyType;
		status: amun.StatusStrategy;
	}
	export interface Timing {
		blue_total?: number;
		blue_path?: number;
		yellow_total?: number;
		yellow_path?: number;
		autoref_total?: number;
		tracking?: number;
		controller?: number;
		transceiver?: number;
		transceiver_rtt?: number;
		simulator?: number;
	}
	export interface StatusTransceiver {
		active: boolean;
		error?: string;
		dropped_usb_packets?: number;
		dropped_commands?: number;
	}
	export interface PortBindError {
		port: number;
	}
	export interface OptionStatus {
		name: string;
		value: boolean;
	}
	export interface StatusAmun {
		port_bind_error?: amun.PortBindError;
		options?: amun.OptionStatus[];
	}
	export interface Status {
		time: number;
		game_state?: amun.GameState;
		world_state?: world.State;
		geometry?: world.Geometry;
		team_blue?: robot.Team;
		team_yellow?: robot.Team;
		strategy_blue?: amun.StatusStrategy;
		strategy_yellow?: amun.StatusStrategy;
		strategy_autoref?: amun.StatusStrategy;
		debug?: amun.DebugValues[];
		timing?: amun.Timing;
		radio_command?: robot.RadioCommand[];
		transceiver?: amun.StatusTransceiver;
		user_input_blue?: amun.UserInput;
		user_input_yellow?: amun.UserInput;
		amun_state?: amun.StatusAmun;
		timer_scaling?: number;
		blue_running?: boolean;
		yellow_running?: boolean;
		autoref_running?: boolean;
		execution_state?: world.State;
		execution_game_state?: amun.GameState;
		execution_user_input?: amun.UserInput;
		log_id?: logfile.Uid;
		original_frame_number?: number;
		status_strategy?: amun.StatusStrategyWrapper;
		pure_ui_response?: amun.UiResponse;
	}
	export interface UiResponse {
		enable_logging?: boolean;
		is_logging?: boolean;
		logger_status?: amun.Status[];
		playback_burst_end?: boolean;
		playback_paused?: boolean;
		log_info?: amun.LogPlaybackInfo;
		frame_number?: number;
		force_ra_horus?: boolean;
		log_open?: amun.LogfileOpenInfo;
		export_visionlog_error?: string;
		requested_log_uid?: string;
		log_offers?: logfile.LogOffer;
		log_uid_parser_error?: string;
	}
	export interface LogPlaybackInfo {
		start_time: number;
		duration: number;
		packet_count: number;
	}
	export interface LogfileOpenInfo {
		success: boolean;
		filename: string;
	}
	export interface UserInput {
		radio_command?: robot.RadioCommand[];
		move_command?: amun.RobotMoveCommand[];
	}
}
export interface grSim_Robot_Command {
	id: number;
	kickspeedx: number;
	kickspeedz: number;
	veltangent: number;
	velnormal: number;
	velangular: number;
	spinner: boolean;
	wheelsspeed: boolean;
	wheel1?: number;
	wheel2?: number;
	wheel3?: number;
	wheel4?: number;
}
export interface grSim_Commands {
	timestamp: number;
	isteamyellow: boolean;
	robot_commands?: grSim_Robot_Command[];
}
export interface grSim_Packet {
	commands?: grSim_Commands;
	replacement?: grSim_Replacement;
}
export interface grSim_RobotReplacement {
	x: number;
	y: number;
	dir: number;
	id: number;
	yellowteam: boolean;
	turnon?: boolean;
}
export interface grSim_BallReplacement {
	x?: number;
	y?: number;
	vx?: number;
	vy?: number;
}
export interface grSim_Replacement {
	ball?: grSim_BallReplacement;
	robots?: grSim_RobotReplacement[];
}
export namespace logfile {
	export interface UidEntry {
		hash: string;
		flags?: number;
	}
	export interface Uid {
		parts?: logfile.UidEntry[];
	}
	export interface LogRequest {
		path: string;
	}
	export namespace LogOfferEntry {
		export const enum QUALITY {
			PERFECT = "PERFECT",
			UNKNOWN = "UNKNOWN",
			UNREADABLE = "UNREADABLE",
		}
	}
	export interface LogOfferEntry {
		name: string;
		quality: logfile.LogOfferEntry.QUALITY;
		uri: logfile.LogRequest;
	}
	export interface LogOffer {
		entries?: logfile.LogOfferEntry[];
	}
}
export namespace pathfinding {
	export interface Vector {
		x?: number;
		y?: number;
	}
	export interface CircleObstacle {
		center?: pathfinding.Vector;
	}
	export interface RectObstacle {
		bottom_left?: pathfinding.Vector;
		top_right?: pathfinding.Vector;
	}
	export interface TriangleObstacle {
		p1?: pathfinding.Vector;
		p2?: pathfinding.Vector;
		p3?: pathfinding.Vector;
	}
	export interface LineObstacle {
		start?: pathfinding.Vector;
		end?: pathfinding.Vector;
	}
	export interface MovingCircleObstacle {
		start_pos?: pathfinding.Vector;
		speed?: pathfinding.Vector;
		acc?: pathfinding.Vector;
		start_time?: number;
		end_time?: number;
	}
	export interface MovingLineObstacle {
		start_pos1?: pathfinding.Vector;
		speed1?: pathfinding.Vector;
		acc1?: pathfinding.Vector;
		start_pos2?: pathfinding.Vector;
		speed2?: pathfinding.Vector;
		acc2?: pathfinding.Vector;
		start_time?: number;
		end_time?: number;
	}
	export interface TrajectoryPoint {
		pos?: pathfinding.Vector;
		speed?: pathfinding.Vector;
		time?: number;
	}
	export interface FriendlyRobotObstacle {
		robot_trajectory?: pathfinding.TrajectoryPoint[];
	}
	export interface Obstacle {
		name?: string;
		prio?: number;
		radius?: number;
		circle?: pathfinding.CircleObstacle;
		rectangle?: pathfinding.RectObstacle;
		triangle?: pathfinding.TriangleObstacle;
		line?: pathfinding.LineObstacle;
		moving_circle?: pathfinding.MovingCircleObstacle;
		moving_line?: pathfinding.MovingLineObstacle;
		friendly_robot?: pathfinding.FriendlyRobotObstacle;
	}
	export interface WorldState {
		obstacles?: pathfinding.Obstacle[];
		out_of_field_priority?: number;
		boundary?: pathfinding.RectObstacle;
		radius?: number;
		robot_id?: number;
	}
	export interface TrajectoryInput {
		v0?: pathfinding.Vector;
		v1?: pathfinding.Vector;
		distance?: pathfinding.Vector;
		s0?: pathfinding.Vector;
		s1?: pathfinding.Vector;
		max_speed?: number;
		acceleration?: number;
	}
	export const enum InputSourceType {
		None = "None",
		AllSamplers = "AllSamplers",
		StandardSampler = "StandardSampler",
		EndInObstacleSampler = "EndInObstacleSampler",
		EscapeObstacleSampler = "EscapeObstacleSampler",
	}
	export interface PathFindingTask {
		state?: pathfinding.WorldState;
		input?: pathfinding.TrajectoryInput;
		type?: pathfinding.InputSourceType;
	}
	export interface StandardSamplerPoint {
		time?: number;
		angle?: number;
		mid_speed_x?: number;
		mid_speed_y?: number;
	}
	export interface StandardSamplerPrecomputationSegment {
		precomputed_points?: pathfinding.StandardSamplerPoint[];
		min_distance?: number;
		max_distance?: number;
	}
	export interface StandardSamplerPrecomputation {
		segments?: pathfinding.StandardSamplerPrecomputationSegment[];
	}
}
export interface SSL_DetectionBall {
	confidence: number;
	area?: number;
	x: number;
	y: number;
	z?: number;
	pixel_x: number;
	pixel_y: number;
}
export interface SSL_DetectionRobot {
	confidence: number;
	robot_id?: number;
	x: number;
	y: number;
	orientation?: number;
	pixel_x: number;
	pixel_y: number;
	height?: number;
}
export interface SSL_DetectionFrame {
	frame_number: number;
	t_capture: number;
	t_sent: number;
	camera_id: number;
	balls?: SSL_DetectionBall[];
	robots_yellow?: SSL_DetectionRobot[];
	robots_blue?: SSL_DetectionRobot[];
}
export namespace robot {
	export interface LimitParameters {
		a_speedup_f_max?: number;
		a_speedup_s_max?: number;
		a_speedup_phi_max?: number;
		a_brake_f_max?: number;
		a_brake_s_max?: number;
		a_brake_phi_max?: number;
	}
	export namespace Specs {
		export const enum GenerationType {
			Regular = "Regular",
			Ally = "Ally",
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
		v_max?: number;
		omega_max?: number;
		shot_linear_max?: number;
		shot_chip_max?: number;
		dribbler_width?: number;
		acceleration?: robot.LimitParameters;
		strategy?: robot.LimitParameters;
		ir_param?: number;
		shoot_radius?: number;
		dribbler_height?: number;
		pattern_rotation?: number;
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
		t_start: number;
		t_end: number;
		x: robot.Polynomial;
		y: robot.Polynomial;
		phi: robot.Polynomial;
	}
	export interface ControllerInput {
		spline?: robot.Spline[];
	}
	export interface SpeedVector {
		v_s?: number;
		v_f?: number;
		omega?: number;
	}
	export namespace Command {
		export const enum KickStyle {
			Linear = "Linear",
			Chip = "Chip",
		}
	}
	export interface Command {
		controller?: robot.ControllerInput;
		v_f?: number;
		v_s?: number;
		omega?: number;
		kick_style?: robot.Command.KickStyle;
		kick_power?: number;
		dribbler?: number;
		local?: boolean;
		standby?: boolean;
		strategy_controlled?: boolean;
		force_kick?: boolean;
		network_controlled?: boolean;
		eject_sdcard?: boolean;
		cur_vf?: number;
		cur_vs?: number;
		cur_omega?: number;
		output0?: robot.SpeedVector;
		output1?: robot.SpeedVector;
		output2?: robot.SpeedVector;
	}
	export interface RadioCommand {
		generation: number;
		id: number;
		is_blue?: boolean;
		command: robot.Command;
		command_time?: number;
	}
	export interface SpeedStatus {
		v_f: number;
		v_s: number;
		omega: number;
	}
	export interface ExtendedError {
		motor_1_error: boolean;
		motor_2_error: boolean;
		motor_3_error: boolean;
		motor_4_error: boolean;
		dribbler_error: boolean;
		kicker_error: boolean;
		kicker_break_beam_error?: boolean;
		motor_encoder_error?: boolean;
		main_sensor_error?: boolean;
		temperature?: number;
	}
	export interface RadioResponse {
		time?: number;
		generation: number;
		id: number;
		battery?: number;
		packet_loss_rx?: number;
		packet_loss_tx?: number;
		estimated_speed?: robot.SpeedStatus;
		ball_detected?: boolean;
		cap_charged?: boolean;
		error_present?: boolean;
		radio_rtt?: number;
		extended_error?: robot.ExtendedError;
		is_blue?: boolean;
	}
}
export namespace gameController {
	export interface AutoRefRegistration {
		identifier: string;
		signature?: gameController.Signature;
	}
	export interface AutoRefToController {
		signature?: gameController.Signature;
		game_event?: gameController.GameEvent;
	}
	export interface ControllerToAutoRef {
		controller_reply?: gameController.ControllerReply;
	}
	export const enum Team {
		UNKNOWN = "UNKNOWN",
		YELLOW = "YELLOW",
		BLUE = "BLUE",
	}
	export interface BotId {
		id?: number;
		team?: gameController.Team;
	}
	export const enum Division {
		DIV_UNKNOWN = "DIV_UNKNOWN",
		DIV_A = "DIV_A",
		DIV_B = "DIV_B",
	}
	export interface Location {
		x: number;
		y: number;
	}
	export namespace ControllerReply {
		export const enum StatusCode {
			UNKNOWN_STATUS_CODE = "UNKNOWN_STATUS_CODE",
			OK = "OK",
			REJECTED = "REJECTED",
		}
		export const enum Verification {
			UNKNOWN_VERIFICATION = "UNKNOWN_VERIFICATION",
			VERIFIED = "VERIFIED",
			UNVERIFIED = "UNVERIFIED",
		}
	}
	export interface ControllerReply {
		status_code?: gameController.ControllerReply.StatusCode;
		reason?: string;
		next_token?: string;
		verification?: gameController.ControllerReply.Verification;
	}
	export interface Signature {
		token: string;
		pkcs1v15: ArrayBuffer;
	}
	export interface BallSpeedMeasurement {
		timestamp: number;
		ball_speed: number;
		initial_ball_speed?: number;
	}
	export interface Vector2 {
		x: number;
		y: number;
	}
	export interface Vector3 {
		x: number;
		y: number;
		z: number;
	}
	export interface TeamRegistration {
		team_name: string;
		signature?: gameController.Signature;
	}
	export interface TeamToController {
		signature?: gameController.Signature;
		desired_keeper?: number;
		substitute_bot?: boolean;
		ping?: boolean;
	}
	export interface ControllerToTeam {
		controller_reply?: gameController.ControllerReply;
	}
	export namespace GameEvent {
		export interface BallLeftField {
			by_team: gameController.Team;
			by_bot?: number;
			location?: gameController.Vector2;
		}
		export interface AimlessKick {
			by_team: gameController.Team;
			by_bot?: number;
			location?: gameController.Vector2;
			kick_location?: gameController.Vector2;
		}
		export interface Goal {
			by_team: gameController.Team;
			kicking_team?: gameController.Team;
			kicking_bot?: number;
			location?: gameController.Vector2;
			kick_location?: gameController.Vector2;
			max_ball_height?: number;
			num_robots_by_team?: number;
			last_touch_by_team?: number;
			message?: string;
		}
		export interface IndirectGoal {
			by_team: gameController.Team;
			by_bot?: number;
			location?: gameController.Vector2;
			kick_location?: gameController.Vector2;
		}
		export interface ChippedGoal {
			by_team: gameController.Team;
			by_bot?: number;
			location?: gameController.Vector2;
			kick_location?: gameController.Vector2;
			max_ball_height?: number;
		}
		export interface BotTooFastInStop {
			by_team: gameController.Team;
			by_bot?: number;
			location?: gameController.Vector2;
			speed?: number;
		}
		export interface DefenderTooCloseToKickPoint {
			by_team: gameController.Team;
			by_bot?: number;
			location?: gameController.Vector2;
			distance?: number;
		}
		export interface BotCrashDrawn {
			bot_yellow?: number;
			bot_blue?: number;
			location?: gameController.Vector2;
			crash_speed?: number;
			speed_diff?: number;
			crash_angle?: number;
		}
		export interface BotCrashUnique {
			by_team: gameController.Team;
			violator?: number;
			victim?: number;
			location?: gameController.Vector2;
			crash_speed?: number;
			speed_diff?: number;
			crash_angle?: number;
		}
		export interface BotPushedBot {
			by_team: gameController.Team;
			violator?: number;
			victim?: number;
			location?: gameController.Vector2;
			pushed_distance?: number;
		}
		export interface BotTippedOver {
			by_team: gameController.Team;
			by_bot?: number;
			location?: gameController.Vector2;
			ball_location?: gameController.Vector2;
		}
		export interface DefenderInDefenseArea {
			by_team: gameController.Team;
			by_bot?: number;
			location?: gameController.Vector2;
			distance?: number;
		}
		export interface DefenderInDefenseAreaPartially {
			by_team: gameController.Team;
			by_bot?: number;
			location?: gameController.Vector2;
			distance?: number;
			ball_location?: gameController.Vector2;
		}
		export interface AttackerTouchedBallInDefenseArea {
			by_team: gameController.Team;
			by_bot?: number;
			location?: gameController.Vector2;
			distance?: number;
		}
		export interface BotKickedBallTooFast {
			by_team: gameController.Team;
			by_bot?: number;
			location?: gameController.Vector2;
			initial_ball_speed?: number;
			chipped?: boolean;
		}
		export interface BotDribbledBallTooFar {
			by_team: gameController.Team;
			by_bot?: number;
			start?: gameController.Vector2;
			end?: gameController.Vector2;
		}
		export interface AttackerTouchedOpponentInDefenseArea {
			by_team: gameController.Team;
			by_bot?: number;
			victim?: number;
			location?: gameController.Vector2;
		}
		export interface AttackerDoubleTouchedBall {
			by_team: gameController.Team;
			by_bot?: number;
			location?: gameController.Vector2;
		}
		export interface AttackerTooCloseToDefenseArea {
			by_team: gameController.Team;
			by_bot?: number;
			location?: gameController.Vector2;
			distance?: number;
			ball_location?: gameController.Vector2;
		}
		export interface BotHeldBallDeliberately {
			by_team: gameController.Team;
			by_bot?: number;
			location?: gameController.Vector2;
			duration?: number;
		}
		export interface BotInterferedPlacement {
			by_team: gameController.Team;
			by_bot?: number;
			location?: gameController.Vector2;
		}
		export interface MultipleCards {
			by_team: gameController.Team;
		}
		export interface MultipleFouls {
			by_team: gameController.Team;
		}
		export interface MultiplePlacementFailures {
			by_team: gameController.Team;
		}
		export interface KickTimeout {
			by_team: gameController.Team;
			location?: gameController.Vector2;
			time?: number;
		}
		export interface NoProgressInGame {
			location?: gameController.Vector2;
			time?: number;
		}
		export interface PlacementFailed {
			by_team: gameController.Team;
			remaining_distance?: number;
		}
		export interface UnsportingBehaviorMinor {
			by_team: gameController.Team;
			reason: string;
		}
		export interface UnsportingBehaviorMajor {
			by_team: gameController.Team;
			reason: string;
		}
		export interface KeeperHeldBall {
			by_team: gameController.Team;
			location?: gameController.Vector2;
			duration?: number;
		}
		export interface PlacementSucceeded {
			by_team: gameController.Team;
			time_taken?: number;
			precision?: number;
			distance?: number;
		}
		export interface Prepared {
			time_taken?: number;
		}
		export interface BotSubstitution {
			by_team: gameController.Team;
		}
		export interface ChallengeFlag {
			by_team: gameController.Team;
		}
		export interface EmergencyStop {
			by_team: gameController.Team;
		}
		export interface TooManyRobots {
			by_team: gameController.Team;
			num_robots_allowed?: number;
			num_robots_on_field?: number;
			ball_location?: gameController.Vector2;
		}
		export interface BoundaryCrossing {
			by_team: gameController.Team;
			location?: gameController.Vector2;
		}
		export interface PenaltyKickFailed {
			by_team: gameController.Team;
			location?: gameController.Vector2;
		}
		export const enum Type {
			UNKNOWN_GAME_EVENT_TYPE = "UNKNOWN_GAME_EVENT_TYPE",
			BALL_LEFT_FIELD_TOUCH_LINE = "BALL_LEFT_FIELD_TOUCH_LINE",
			BALL_LEFT_FIELD_GOAL_LINE = "BALL_LEFT_FIELD_GOAL_LINE",
			AIMLESS_KICK = "AIMLESS_KICK",
			ATTACKER_TOO_CLOSE_TO_DEFENSE_AREA = "ATTACKER_TOO_CLOSE_TO_DEFENSE_AREA",
			DEFENDER_IN_DEFENSE_AREA = "DEFENDER_IN_DEFENSE_AREA",
			BOUNDARY_CROSSING = "BOUNDARY_CROSSING",
			KEEPER_HELD_BALL = "KEEPER_HELD_BALL",
			BOT_DRIBBLED_BALL_TOO_FAR = "BOT_DRIBBLED_BALL_TOO_FAR",
			BOT_PUSHED_BOT = "BOT_PUSHED_BOT",
			BOT_HELD_BALL_DELIBERATELY = "BOT_HELD_BALL_DELIBERATELY",
			BOT_TIPPED_OVER = "BOT_TIPPED_OVER",
			ATTACKER_TOUCHED_BALL_IN_DEFENSE_AREA = "ATTACKER_TOUCHED_BALL_IN_DEFENSE_AREA",
			BOT_KICKED_BALL_TOO_FAST = "BOT_KICKED_BALL_TOO_FAST",
			BOT_CRASH_UNIQUE = "BOT_CRASH_UNIQUE",
			BOT_CRASH_DRAWN = "BOT_CRASH_DRAWN",
			DEFENDER_TOO_CLOSE_TO_KICK_POINT = "DEFENDER_TOO_CLOSE_TO_KICK_POINT",
			BOT_TOO_FAST_IN_STOP = "BOT_TOO_FAST_IN_STOP",
			BOT_INTERFERED_PLACEMENT = "BOT_INTERFERED_PLACEMENT",
			POSSIBLE_GOAL = "POSSIBLE_GOAL",
			GOAL = "GOAL",
			INVALID_GOAL = "INVALID_GOAL",
			ATTACKER_DOUBLE_TOUCHED_BALL = "ATTACKER_DOUBLE_TOUCHED_BALL",
			PLACEMENT_SUCCEEDED = "PLACEMENT_SUCCEEDED",
			PENALTY_KICK_FAILED = "PENALTY_KICK_FAILED",
			NO_PROGRESS_IN_GAME = "NO_PROGRESS_IN_GAME",
			PLACEMENT_FAILED = "PLACEMENT_FAILED",
			MULTIPLE_CARDS = "MULTIPLE_CARDS",
			MULTIPLE_FOULS = "MULTIPLE_FOULS",
			BOT_SUBSTITUTION = "BOT_SUBSTITUTION",
			TOO_MANY_ROBOTS = "TOO_MANY_ROBOTS",
			CHALLENGE_FLAG = "CHALLENGE_FLAG",
			EMERGENCY_STOP = "EMERGENCY_STOP",
			UNSPORTING_BEHAVIOR_MINOR = "UNSPORTING_BEHAVIOR_MINOR",
			UNSPORTING_BEHAVIOR_MAJOR = "UNSPORTING_BEHAVIOR_MAJOR",
			PREPARED = "PREPARED",
			INDIRECT_GOAL = "INDIRECT_GOAL",
			CHIPPED_GOAL = "CHIPPED_GOAL",
			KICK_TIMEOUT = "KICK_TIMEOUT",
			ATTACKER_TOUCHED_OPPONENT_IN_DEFENSE_AREA = "ATTACKER_TOUCHED_OPPONENT_IN_DEFENSE_AREA",
			ATTACKER_TOUCHED_OPPONENT_IN_DEFENSE_AREA_SKIPPED = "ATTACKER_TOUCHED_OPPONENT_IN_DEFENSE_AREA_SKIPPED",
			BOT_CRASH_UNIQUE_SKIPPED = "BOT_CRASH_UNIQUE_SKIPPED",
			BOT_PUSHED_BOT_SKIPPED = "BOT_PUSHED_BOT_SKIPPED",
			DEFENDER_IN_DEFENSE_AREA_PARTIALLY = "DEFENDER_IN_DEFENSE_AREA_PARTIALLY",
			MULTIPLE_PLACEMENT_FAILURES = "MULTIPLE_PLACEMENT_FAILURES",
		}
	}
	export interface GameEvent {
		type?: gameController.GameEvent.Type;
		origin?: string[];
		ball_left_field_touch_line?: gameController.GameEvent.BallLeftField;
		ball_left_field_goal_line?: gameController.GameEvent.BallLeftField;
		aimless_kick?: gameController.GameEvent.AimlessKick;
		attacker_too_close_to_defense_area?: gameController.GameEvent.AttackerTooCloseToDefenseArea;
		defender_in_defense_area?: gameController.GameEvent.DefenderInDefenseArea;
		boundary_crossing?: gameController.GameEvent.BoundaryCrossing;
		keeper_held_ball?: gameController.GameEvent.KeeperHeldBall;
		bot_dribbled_ball_too_far?: gameController.GameEvent.BotDribbledBallTooFar;
		bot_pushed_bot?: gameController.GameEvent.BotPushedBot;
		bot_held_ball_deliberately?: gameController.GameEvent.BotHeldBallDeliberately;
		bot_tipped_over?: gameController.GameEvent.BotTippedOver;
		attacker_touched_ball_in_defense_area?: gameController.GameEvent.AttackerTouchedBallInDefenseArea;
		bot_kicked_ball_too_fast?: gameController.GameEvent.BotKickedBallTooFast;
		bot_crash_unique?: gameController.GameEvent.BotCrashUnique;
		bot_crash_drawn?: gameController.GameEvent.BotCrashDrawn;
		defender_too_close_to_kick_point?: gameController.GameEvent.DefenderTooCloseToKickPoint;
		bot_too_fast_in_stop?: gameController.GameEvent.BotTooFastInStop;
		bot_interfered_placement?: gameController.GameEvent.BotInterferedPlacement;
		possible_goal?: gameController.GameEvent.Goal;
		goal?: gameController.GameEvent.Goal;
		invalid_goal?: gameController.GameEvent.Goal;
		attacker_double_touched_ball?: gameController.GameEvent.AttackerDoubleTouchedBall;
		placement_succeeded?: gameController.GameEvent.PlacementSucceeded;
		penalty_kick_failed?: gameController.GameEvent.PenaltyKickFailed;
		no_progress_in_game?: gameController.GameEvent.NoProgressInGame;
		placement_failed?: gameController.GameEvent.PlacementFailed;
		multiple_cards?: gameController.GameEvent.MultipleCards;
		multiple_fouls?: gameController.GameEvent.MultipleFouls;
		bot_substitution?: gameController.GameEvent.BotSubstitution;
		too_many_robots?: gameController.GameEvent.TooManyRobots;
		challenge_flag?: gameController.GameEvent.ChallengeFlag;
		emergency_stop?: gameController.GameEvent.EmergencyStop;
		unsporting_behavior_minor?: gameController.GameEvent.UnsportingBehaviorMinor;
		unsporting_behavior_major?: gameController.GameEvent.UnsportingBehaviorMajor;
		prepared?: gameController.GameEvent.Prepared;
		indirect_goal?: gameController.GameEvent.IndirectGoal;
		chipped_goal?: gameController.GameEvent.ChippedGoal;
		kick_timeout?: gameController.GameEvent.KickTimeout;
		attacker_touched_opponent_in_defense_area?: gameController.GameEvent.AttackerTouchedOpponentInDefenseArea;
		attacker_touched_opponent_in_defense_area_skipped?: gameController.GameEvent.AttackerTouchedOpponentInDefenseArea;
		bot_crash_unique_skipped?: gameController.GameEvent.BotCrashUnique;
		bot_pushed_bot_skipped?: gameController.GameEvent.BotPushedBot;
		defender_in_defense_area_partially?: gameController.GameEvent.DefenderInDefenseAreaPartially;
		multiple_placement_failures?: gameController.GameEvent.MultiplePlacementFailures;
	}
	export interface Output {
		match_state?: gameController.State;
		gc_state?: gameController.GcState;
		protocol?: gameController.Protocol;
		config?: gameController.Config;
	}
	export interface Protocol {
		delta?: boolean;
		entry?: gameController.ProtocolEntry[];
	}
	export interface ProtocolEntry {
		id?: number;
		change?: gameController.Change;
		match_time_elapsed?: google.protobuf.Duration;
		stage_time_elapsed?: google.protobuf.Duration;
	}
	export interface Input {
		change?: gameController.Change;
		reset_match?: boolean;
		config_delta?: gameController.Config;
	}
	export interface StateChange {
		id?: number;
		state_pre?: gameController.State;
		state?: gameController.State;
		change?: gameController.Change;
		timestamp?: google.protobuf.Timestamp;
	}
	export interface Change {
		origin?: string;
		revertible?: boolean;
		new_command?: gameController.NewCommand;
		change_stage?: gameController.ChangeStage;
		set_ball_placement_pos?: gameController.SetBallPlacementPos;
		add_yellow_card?: gameController.AddYellowCard;
		add_red_card?: gameController.AddRedCard;
		yellow_card_over?: gameController.YellowCardOver;
		add_game_event?: gameController.AddGameEvent;
		add_passive_game_event?: gameController.AddPassiveGameEvent;
		add_proposal?: gameController.AddProposal;
		start_ball_placement?: gameController.StartBallPlacement;
		continue?: gameController.Continue;
		update_config?: gameController.UpdateConfig;
		update_team_state?: gameController.UpdateTeamState;
		switch_colors?: gameController.SwitchColors;
		revert?: gameController.Revert;
		new_game_state?: gameController.NewGameState;
		accept_proposal_group?: gameController.AcceptProposalGroup;
	}
	export interface NewCommand {
		command?: gameController.Command;
	}
	export interface ChangeStage {
		new_stage?: SSL_Referee.Stage;
	}
	export interface SetBallPlacementPos {
		pos?: gameController.Vector2;
	}
	export interface AddYellowCard {
		for_team?: gameController.Team;
		caused_by_game_event?: gameController.GameEvent;
	}
	export interface AddRedCard {
		for_team?: gameController.Team;
		caused_by_game_event?: gameController.GameEvent;
	}
	export interface YellowCardOver {
		for_team?: gameController.Team;
	}
	export interface AddGameEvent {
		game_event?: gameController.GameEvent;
	}
	export interface AddPassiveGameEvent {
		game_event?: gameController.GameEvent;
	}
	export interface AddProposal {
		proposal?: gameController.Proposal;
	}
	export interface AcceptProposalGroup {
		group_id?: number;
		accepted_by?: string;
	}
	export interface StartBallPlacement {
	}
	export interface Continue {
	}
	export interface UpdateConfig {
		division?: gameController.Division;
		first_kickoff_team?: gameController.Team;
		auto_continue?: boolean;
	}
	export interface UpdateTeamState {
		for_team?: gameController.Team;
		team_name?: string;
		goals?: number;
		goalkeeper?: number;
		timeouts_left?: number;
		timeout_time_left?: string;
		on_positive_half?: boolean;
		ball_placement_failures?: number;
		can_place_ball?: boolean;
		challenge_flags_left?: number;
		requests_bot_substitution?: boolean;
		requests_timeout?: boolean;
		requests_challenge?: boolean;
		requests_emergency_stop?: boolean;
		yellow_card?: gameController.YellowCard;
		red_card?: gameController.RedCard;
		foul?: gameController.Foul;
		remove_yellow_card?: number;
		remove_red_card?: number;
		remove_foul?: number;
	}
	export interface SwitchColors {
	}
	export interface Revert {
		change_id?: number;
	}
	export interface NewGameState {
		game_state?: gameController.GameState;
	}
	export interface CiInput {
		timestamp?: number;
		tracker_packet?: gameController.TrackerWrapperPacket;
		api_inputs?: gameController.Input[];
	}
	export interface CiOutput {
		referee_msg?: SSL_Referee;
	}
	export namespace Config {
		export const enum Behavior {
			BEHAVIOR_UNKNOWN = "BEHAVIOR_UNKNOWN",
			BEHAVIOR_ACCEPT = "BEHAVIOR_ACCEPT",
			BEHAVIOR_ACCEPT_MAJORITY = "BEHAVIOR_ACCEPT_MAJORITY",
			BEHAVIOR_PROPOSE_ONLY = "BEHAVIOR_PROPOSE_ONLY",
			BEHAVIOR_LOG = "BEHAVIOR_LOG",
			BEHAVIOR_IGNORE = "BEHAVIOR_IGNORE",
		}
	}
	export interface Config {
		game_event_behavior?: gameController.Config.Behavior;
		auto_ref_configs?: gameController.AutoRefConfig;
		active_tracker_source?: string;
		teams?: string[];
	}
	export namespace AutoRefConfig {
		export const enum Behavior {
			BEHAVIOR_UNKNOWN = "BEHAVIOR_UNKNOWN",
			BEHAVIOR_ACCEPT = "BEHAVIOR_ACCEPT",
			BEHAVIOR_LOG = "BEHAVIOR_LOG",
			BEHAVIOR_IGNORE = "BEHAVIOR_IGNORE",
		}
	}
	export interface AutoRefConfig {
		game_event_behavior?: gameController.AutoRefConfig.Behavior;
	}
	export interface GcState {
		team_state?: gameController.GcStateTeam;
		auto_ref_state?: gameController.GcStateAutoRef;
		tracker_state?: gameController.GcStateTracker;
		tracker_state_gc?: gameController.GcStateTracker;
		ready_to_continue?: boolean;
	}
	export interface GcStateTeam {
		connected?: boolean;
		connection_verified?: boolean;
		remote_control_connected?: boolean;
		remote_control_connection_verified?: boolean;
	}
	export interface GcStateAutoRef {
		connection_verified?: boolean;
	}
	export interface GcStateTracker {
		source_name?: string;
		uuid?: string;
		ball?: gameController.Ball;
		robots?: gameController.Robot[];
	}
	export interface Ball {
		pos?: gameController.Vector3;
		vel?: gameController.Vector3;
	}
	export interface Robot {
		id?: gameController.BotId;
		pos?: gameController.Vector2;
	}
	export interface YellowCard {
		id?: number;
		caused_by_game_event?: gameController.GameEvent;
		time_remaining?: google.protobuf.Duration;
	}
	export interface RedCard {
		id?: number;
		caused_by_game_event?: gameController.GameEvent;
	}
	export interface Foul {
		id?: number;
		caused_by_game_event?: gameController.GameEvent;
		timestamp?: google.protobuf.Timestamp;
	}
	export namespace Command {
		export const enum Type {
			UNKNOWN = "UNKNOWN",
			HALT = "HALT",
			STOP = "STOP",
			NORMAL_START = "NORMAL_START",
			FORCE_START = "FORCE_START",
			DIRECT = "DIRECT",
			INDIRECT = "INDIRECT",
			KICKOFF = "KICKOFF",
			PENALTY = "PENALTY",
			TIMEOUT = "TIMEOUT",
			BALL_PLACEMENT = "BALL_PLACEMENT",
		}
	}
	export interface Command {
		type: gameController.Command.Type;
		for_team?: gameController.Team;
	}
	export namespace GameState {
		export const enum Type {
			UNKNOWN = "UNKNOWN",
			HALT = "HALT",
			STOP = "STOP",
			RUNNING = "RUNNING",
			FREE_KICK = "FREE_KICK",
			KICKOFF = "KICKOFF",
			PENALTY = "PENALTY",
			TIMEOUT = "TIMEOUT",
			BALL_PLACEMENT = "BALL_PLACEMENT",
		}
	}
	export interface GameState {
		type: gameController.GameState.Type;
		for_team?: gameController.Team;
	}
	export interface Proposal {
		timestamp?: google.protobuf.Timestamp;
		game_event?: gameController.GameEvent;
	}
	export interface ProposalGroup {
		proposals?: gameController.Proposal[];
		accepted?: boolean;
	}
	export interface TeamInfo {
		name?: string;
		goals?: number;
		goalkeeper?: number;
		yellow_cards?: gameController.YellowCard[];
		red_cards?: gameController.RedCard[];
		timeouts_left?: number;
		timeout_time_left?: google.protobuf.Duration;
		on_positive_half?: boolean;
		fouls?: gameController.Foul[];
		ball_placement_failures?: number;
		ball_placement_failures_reached?: boolean;
		can_place_ball?: boolean;
		max_allowed_bots?: number;
		requests_bot_substitution_since?: google.protobuf.Timestamp;
		requests_timeout_since?: google.protobuf.Timestamp;
		requests_emergency_stop_since?: google.protobuf.Timestamp;
		challenge_flags?: number;
	}
	export interface State {
		stage?: SSL_Referee.Stage;
		command?: gameController.Command;
		game_state?: gameController.GameState;
		stage_time_elapsed?: google.protobuf.Duration;
		stage_time_left?: google.protobuf.Duration;
		match_time_start?: google.protobuf.Timestamp;
		team_state?: gameController.TeamInfo;
		placement_pos?: gameController.Vector2;
		next_command?: gameController.Command;
		current_action_time_remaining?: google.protobuf.Duration;
		game_events?: gameController.GameEvent[];
		proposal_groups?: gameController.ProposalGroup[];
		division?: gameController.Division;
		auto_continue?: boolean;
		first_kickoff_team?: gameController.Team;
	}
	export const enum Capability {
		CAPABILITY_UNKNOWN = "CAPABILITY_UNKNOWN",
		CAPABILITY_DETECT_FLYING_BALLS = "CAPABILITY_DETECT_FLYING_BALLS",
		CAPABILITY_DETECT_MULTIPLE_BALLS = "CAPABILITY_DETECT_MULTIPLE_BALLS",
		CAPABILITY_DETECT_KICKED_BALLS = "CAPABILITY_DETECT_KICKED_BALLS",
	}
	export interface TrackedBall {
		pos: gameController.Vector3;
		vel?: gameController.Vector3;
		visibility?: number;
	}
	export interface KickedBall {
		pos: gameController.Vector2;
		vel: gameController.Vector3;
		start_timestamp: number;
		stop_timestamp?: number;
		stop_pos?: gameController.Vector2;
		robot_id?: gameController.BotId;
	}
	export interface TrackedRobot {
		robot_id: gameController.BotId;
		pos: gameController.Vector2;
		orientation: number;
		vel?: gameController.Vector2;
		vel_angular?: number;
		visibility?: number;
	}
	export interface TrackedFrame {
		frame_number: number;
		timestamp: number;
		balls?: gameController.TrackedBall[];
		robots?: gameController.TrackedRobot[];
		kicked_ball?: gameController.KickedBall;
		capabilities?: gameController.Capability[];
	}
	export interface TrackerWrapperPacket {
		uuid: string;
		source_name?: string;
		tracked_frame?: gameController.TrackedFrame;
	}
}
export namespace Game_Event {
	export const enum GameEventType {
		UNKNOWN = "UNKNOWN",
		CUSTOM = "CUSTOM",
		NUMBER_OF_PLAYERS = "NUMBER_OF_PLAYERS",
		BALL_LEFT_FIELD = "BALL_LEFT_FIELD",
		GOAL = "GOAL",
		KICK_TIMEOUT = "KICK_TIMEOUT",
		NO_PROGRESS_IN_GAME = "NO_PROGRESS_IN_GAME",
		BOT_COLLISION = "BOT_COLLISION",
		MULTIPLE_DEFENDER = "MULTIPLE_DEFENDER",
		MULTIPLE_DEFENDER_PARTIALLY = "MULTIPLE_DEFENDER_PARTIALLY",
		ATTACKER_IN_DEFENSE_AREA = "ATTACKER_IN_DEFENSE_AREA",
		ICING = "ICING",
		BALL_SPEED = "BALL_SPEED",
		ROBOT_STOP_SPEED = "ROBOT_STOP_SPEED",
		BALL_DRIBBLING = "BALL_DRIBBLING",
		ATTACKER_TOUCH_KEEPER = "ATTACKER_TOUCH_KEEPER",
		DOUBLE_TOUCH = "DOUBLE_TOUCH",
		ATTACKER_TO_DEFENCE_AREA = "ATTACKER_TO_DEFENCE_AREA",
		DEFENDER_TO_KICK_POINT_DISTANCE = "DEFENDER_TO_KICK_POINT_DISTANCE",
		BALL_HOLDING = "BALL_HOLDING",
		INDIRECT_GOAL = "INDIRECT_GOAL",
		BALL_PLACEMENT_FAILED = "BALL_PLACEMENT_FAILED",
		CHIP_ON_GOAL = "CHIP_ON_GOAL",
	}
	export const enum Team {
		TEAM_UNKNOWN = "TEAM_UNKNOWN",
		TEAM_YELLOW = "TEAM_YELLOW",
		TEAM_BLUE = "TEAM_BLUE",
	}
	export interface Originator {
		team: Game_Event.Team;
		bot_id?: number;
	}
}
export interface Game_Event {
	game_event_type: Game_Event.GameEventType;
	originator?: Game_Event.Originator;
	message?: string;
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
	type?: SSL_FieldShapeType;
}
export interface SSL_FieldCircularArc {
	name: string;
	center: Vector2f;
	radius: number;
	a1: number;
	a2: number;
	thickness: number;
	type?: SSL_FieldShapeType;
}
export interface SSL_GeometryFieldSize {
	field_length: number;
	field_width: number;
	goal_width: number;
	goal_depth: number;
	boundary_width: number;
	field_lines?: SSL_FieldLineSegment[];
	field_arcs?: SSL_FieldCircularArc[];
	penalty_area_depth?: number;
	penalty_area_width?: number;
}
export interface SSL_GeometryCameraCalibration {
	camera_id: number;
	focal_length: number;
	principal_point_x: number;
	principal_point_y: number;
	distortion: number;
	q0: number;
	q1: number;
	q2: number;
	q3: number;
	tx: number;
	ty: number;
	tz: number;
	derived_camera_world_tx?: number;
	derived_camera_world_ty?: number;
	derived_camera_world_tz?: number;
	pixel_image_width?: number;
	pixel_image_height?: number;
}
export interface SSL_BallModelStraightTwoPhase {
	acc_slide: number;
	acc_roll: number;
	k_switch: number;
}
export interface SSL_BallModelChipFixedLoss {
	damping_xy_first_hop: number;
	damping_xy_other_hops: number;
	damping_z: number;
}
export interface SSL_GeometryModels {
	straight_two_phase?: SSL_BallModelStraightTwoPhase;
	chip_fixed_loss?: SSL_BallModelChipFixedLoss;
}
export interface SSL_GeometryData {
	field: SSL_GeometryFieldSize;
	calib?: SSL_GeometryCameraCalibration[];
	models?: SSL_GeometryModels;
}
export const enum SSL_FieldShapeType {
	Undefined = "Undefined",
	CenterCircle = "CenterCircle",
	TopTouchLine = "TopTouchLine",
	BottomTouchLine = "BottomTouchLine",
	LeftGoalLine = "LeftGoalLine",
	RightGoalLine = "RightGoalLine",
	HalfwayLine = "HalfwayLine",
	CenterLine = "CenterLine",
	LeftPenaltyStretch = "LeftPenaltyStretch",
	RightPenaltyStretch = "RightPenaltyStretch",
	LeftFieldLeftPenaltyStretch = "LeftFieldLeftPenaltyStretch",
	LeftFieldRightPenaltyStretch = "LeftFieldRightPenaltyStretch",
	RightFieldLeftPenaltyStretch = "RightFieldLeftPenaltyStretch",
	RightFieldRightPenaltyStretch = "RightFieldRightPenaltyStretch",
}
export namespace ssl {
	export interface TeamPlan {
		plans?: ssl.RobotPlan[];
	}
	export namespace RobotPlan {
		export const enum RobotRole {
			Default = "Default",
			Goalie = "Goalie",
			Defense = "Defense",
			Offense = "Offense",
		}
	}
	export interface RobotPlan {
		robot_id: number;
		role?: ssl.RobotPlan.RobotRole;
		nav_target?: ssl.Pose;
		shot_target?: ssl.Location;
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
export namespace SSL_Referee_Game_Event {
	export const enum GameEventType {
		UNKNOWN = "UNKNOWN",
		CUSTOM = "CUSTOM",
		NUMBER_OF_PLAYERS = "NUMBER_OF_PLAYERS",
		BALL_LEFT_FIELD = "BALL_LEFT_FIELD",
		GOAL = "GOAL",
		KICK_TIMEOUT = "KICK_TIMEOUT",
		NO_PROGRESS_IN_GAME = "NO_PROGRESS_IN_GAME",
		BOT_COLLISION = "BOT_COLLISION",
		MULTIPLE_DEFENDER = "MULTIPLE_DEFENDER",
		MULTIPLE_DEFENDER_PARTIALLY = "MULTIPLE_DEFENDER_PARTIALLY",
		ATTACKER_IN_DEFENSE_AREA = "ATTACKER_IN_DEFENSE_AREA",
		ICING = "ICING",
		BALL_SPEED = "BALL_SPEED",
		ROBOT_STOP_SPEED = "ROBOT_STOP_SPEED",
		BALL_DRIBBLING = "BALL_DRIBBLING",
		ATTACKER_TOUCH_KEEPER = "ATTACKER_TOUCH_KEEPER",
		DOUBLE_TOUCH = "DOUBLE_TOUCH",
		ATTACKER_TO_DEFENCE_AREA = "ATTACKER_TO_DEFENCE_AREA",
		DEFENDER_TO_KICK_POINT_DISTANCE = "DEFENDER_TO_KICK_POINT_DISTANCE",
		BALL_HOLDING = "BALL_HOLDING",
		INDIRECT_GOAL = "INDIRECT_GOAL",
		BALL_PLACEMENT_FAILED = "BALL_PLACEMENT_FAILED",
		CHIP_ON_GOAL = "CHIP_ON_GOAL",
	}
	export const enum Team {
		TEAM_UNKNOWN = "TEAM_UNKNOWN",
		TEAM_YELLOW = "TEAM_YELLOW",
		TEAM_BLUE = "TEAM_BLUE",
	}
	export interface Originator {
		team: SSL_Referee_Game_Event.Team;
		bot_id?: number;
	}
}
export interface SSL_Referee_Game_Event {
	game_event_type: SSL_Referee_Game_Event.GameEventType;
	originator?: SSL_Referee_Game_Event.Originator;
	message?: string;
}
export namespace SSL_Referee {
	export const enum Stage {
		NORMAL_FIRST_HALF_PRE = "NORMAL_FIRST_HALF_PRE",
		NORMAL_FIRST_HALF = "NORMAL_FIRST_HALF",
		NORMAL_HALF_TIME = "NORMAL_HALF_TIME",
		NORMAL_SECOND_HALF_PRE = "NORMAL_SECOND_HALF_PRE",
		NORMAL_SECOND_HALF = "NORMAL_SECOND_HALF",
		EXTRA_TIME_BREAK = "EXTRA_TIME_BREAK",
		EXTRA_FIRST_HALF_PRE = "EXTRA_FIRST_HALF_PRE",
		EXTRA_FIRST_HALF = "EXTRA_FIRST_HALF",
		EXTRA_HALF_TIME = "EXTRA_HALF_TIME",
		EXTRA_SECOND_HALF_PRE = "EXTRA_SECOND_HALF_PRE",
		EXTRA_SECOND_HALF = "EXTRA_SECOND_HALF",
		PENALTY_SHOOTOUT_BREAK = "PENALTY_SHOOTOUT_BREAK",
		PENALTY_SHOOTOUT = "PENALTY_SHOOTOUT",
		POST_GAME = "POST_GAME",
	}
	export const enum Command {
		HALT = "HALT",
		STOP = "STOP",
		NORMAL_START = "NORMAL_START",
		FORCE_START = "FORCE_START",
		PREPARE_KICKOFF_YELLOW = "PREPARE_KICKOFF_YELLOW",
		PREPARE_KICKOFF_BLUE = "PREPARE_KICKOFF_BLUE",
		PREPARE_PENALTY_YELLOW = "PREPARE_PENALTY_YELLOW",
		PREPARE_PENALTY_BLUE = "PREPARE_PENALTY_BLUE",
		DIRECT_FREE_YELLOW = "DIRECT_FREE_YELLOW",
		DIRECT_FREE_BLUE = "DIRECT_FREE_BLUE",
		INDIRECT_FREE_YELLOW = "INDIRECT_FREE_YELLOW",
		INDIRECT_FREE_BLUE = "INDIRECT_FREE_BLUE",
		TIMEOUT_YELLOW = "TIMEOUT_YELLOW",
		TIMEOUT_BLUE = "TIMEOUT_BLUE",
		GOAL_YELLOW = "GOAL_YELLOW",
		GOAL_BLUE = "GOAL_BLUE",
		BALL_PLACEMENT_YELLOW = "BALL_PLACEMENT_YELLOW",
		BALL_PLACEMENT_BLUE = "BALL_PLACEMENT_BLUE",
	}
	export interface TeamInfo {
		name: string;
		score: number;
		red_cards: number;
		yellow_card_times?: number[];
		yellow_cards: number;
		timeouts: number;
		timeout_time: number;
		goalie: number;
		foul_counter?: number;
		ball_placement_failures?: number;
		can_place_ball?: boolean;
		max_allowed_bots?: number;
		bot_substitution_intent?: boolean;
		ball_placement_failures_reached?: boolean;
	}
	export interface Point {
		x: number;
		y: number;
	}
}
export interface SSL_Referee {
	packet_timestamp: number;
	stage: SSL_Referee.Stage;
	stage_time_left?: number;
	command: SSL_Referee.Command;
	command_counter: number;
	command_timestamp: number;
	yellow: SSL_Referee.TeamInfo;
	blue: SSL_Referee.TeamInfo;
	designated_position?: SSL_Referee.Point;
	blue_team_on_positive_half?: boolean;
	game_event?: SSL_Referee_Game_Event;
	next_command?: SSL_Referee.Command;
	game_events_old?: gameController.GameEvent[];
	game_events?: gameController.GameEvent[];
	proposed_game_events?: ProposedGameEvent[];
	game_event_proposals?: GameEventProposalGroup[];
	current_action_time_remaining?: number;
}
export interface ProposedGameEvent {
	valid_until: number;
	proposer_id: string;
	game_event: gameController.GameEvent;
}
export interface GameEventProposalGroup {
	game_event?: gameController.GameEvent[];
	accepted?: boolean;
}
export namespace sslsim {
	export interface RobotLimits {
		acc_speedup_absolute_max?: number;
		acc_speedup_angular_max?: number;
		acc_brake_absolute_max?: number;
		acc_brake_angular_max?: number;
		vel_absolute_max?: number;
		vel_angular_max?: number;
	}
	export interface RobotWheelAngles {
		front_right: number;
		back_right: number;
		back_left: number;
		front_left: number;
	}
	export interface RobotSpecs {
		id: gameController.BotId;
		radius?: number;
		height?: number;
		mass?: number;
		max_linear_kick_speed?: number;
		max_chip_kick_speed?: number;
		center_to_dribbler?: number;
		limits?: sslsim.RobotLimits;
		wheel_angles?: sslsim.RobotWheelAngles;
		custom?: google.protobuf.Any[];
	}
	export interface RealismConfig {
		custom?: google.protobuf.Any[];
	}
	export interface SimulatorConfig {
		geometry?: SSL_GeometryData;
		robot_specs?: sslsim.RobotSpecs[];
		realism_config?: sslsim.RealismConfig;
		vision_port?: number;
	}
	export interface TeleportBall {
		x?: number;
		y?: number;
		z?: number;
		vx?: number;
		vy?: number;
		vz?: number;
		teleport_safely?: boolean;
		roll?: boolean;
		by_force?: boolean;
	}
	export interface TeleportRobot {
		id: gameController.BotId;
		x?: number;
		y?: number;
		orientation?: number;
		v_x?: number;
		v_y?: number;
		v_angular?: number;
		present?: boolean;
		by_force?: boolean;
	}
	export interface SimulatorControl {
		teleport_ball?: sslsim.TeleportBall;
		teleport_robot?: sslsim.TeleportRobot[];
		simulation_speed?: number;
	}
	export interface SimulatorCommand {
		control?: sslsim.SimulatorControl;
		config?: sslsim.SimulatorConfig;
	}
	export interface SimulatorResponse {
		errors?: sslsim.SimulatorError[];
	}
	export interface RobotSpecErForce {
		shoot_radius?: number;
		dribbler_height?: number;
		dribbler_width?: number;
	}
	export interface SimulatorError {
		code?: string;
		message?: string;
	}
	export interface RobotCommand {
		id: number;
		move_command?: sslsim.RobotMoveCommand;
		kick_speed?: number;
		kick_angle?: number;
		dribbler_speed?: number;
	}
	export interface RobotMoveCommand {
		wheel_velocity?: sslsim.MoveWheelVelocity;
		local_velocity?: sslsim.MoveLocalVelocity;
		global_velocity?: sslsim.MoveGlobalVelocity;
	}
	export interface MoveWheelVelocity {
		front_right: number;
		back_right: number;
		back_left: number;
		front_left: number;
	}
	export interface MoveLocalVelocity {
		forward: number;
		left: number;
		angular: number;
	}
	export interface MoveGlobalVelocity {
		x: number;
		y: number;
		angular: number;
	}
	export interface RobotControl {
		robot_commands?: sslsim.RobotCommand[];
	}
	export interface RobotFeedback {
		id: number;
		dribbler_ball_contact?: boolean;
		custom?: google.protobuf.Any;
	}
	export interface RobotControlResponse {
		errors?: sslsim.SimulatorError[];
		feedback?: sslsim.RobotFeedback[];
	}
}
export interface RealismConfigErForce {
	stddev_ball_p?: number;
	stddev_robot_p?: number;
	stddev_robot_phi?: number;
	stddev_ball_area?: number;
	enable_invisible_ball?: boolean;
	ball_visibility_threshold?: number;
	camera_overlap?: number;
	dribbler_ball_detections?: number;
	camera_position_error?: number;
	robot_command_loss?: number;
	robot_response_loss?: number;
	missing_ball_detections?: number;
	vision_delay?: number;
	vision_processing_time?: number;
	simulate_dribbling?: boolean;
}
export interface SSL_WrapperPacket {
	detection?: SSL_DetectionFrame;
	geometry?: SSL_GeometryData;
}
export namespace timeline {
	export interface FrameLookup {
		uid: logfile.UidEntry;
		frame_number: number;
	}
	export interface FrameDescriptor {
		base_hash: string;
		base_frame_number: number;
		frame_infos?: timeline.FrameLookup[];
	}
	export namespace GameEvent {
		export const enum Progress {
			Open = "Open",
			Closed = "Closed",
			Postponed = "Postponed",
			Resolved = "Resolved",
			InProgress = "InProgress",
			Info = "Info",
			Merged = "Merged",
		}
	}
	export interface GameEvent {
		location: timeline.FrameDescriptor;
		progress: timeline.GameEvent.Progress;
		random_id: string;
		description?: string;
		tag?: string[];
		assignee?: string;
	}
	export namespace TimelineInit {
		export const enum Resolved {
			Solved = "Solved",
			Conflicting = "Conflicting",
		}
	}
	export interface TimelineInit {
		primary: logfile.UidEntry;
		secondary?: logfile.UidEntry[];
		partially?: logfile.UidEntry[];
		state: timeline.TimelineInit.Resolved;
	}
	export interface EventWrapper {
		tag: string;
		conflicting?: timeline.GameEvent[];
	}
	export interface Status {
		wrapper?: timeline.EventWrapper;
		game_event?: timeline.GameEvent;
	}
}
export namespace world {
	export namespace Geometry {
		export const enum GeometryType {
			TYPE_2014 = "TYPE_2014",
			TYPE_2018 = "TYPE_2018",
		}
		export const enum Division {
			A = "A",
			B = "B",
		}
	}
	export interface Geometry {
		line_width: number;
		field_width: number;
		field_height: number;
		boundary_width: number;
		goal_width: number;
		goal_depth: number;
		goal_wall_width: number;
		center_circle_radius: number;
		defense_radius: number;
		defense_stretch: number;
		free_kick_from_defense_dist: number;
		penalty_spot_from_field_line_dist: number;
		penalty_line_from_spot_dist: number;
		goal_height: number;
		defense_width?: number;
		defense_height?: number;
		type?: world.Geometry.GeometryType;
		division?: world.Geometry.Division;
	}
	export interface DivisionDimensions {
		field_width_a: number;
		field_height_a: number;
		field_width_b: number;
		field_height_b: number;
	}
	export interface BallPosition {
		time: number;
		p_x: number;
		p_y: number;
		derived_z?: number;
		v_x?: number;
		v_y?: number;
		system_delay?: number;
		time_diff_scaled?: number;
		camera_id?: number;
		area?: number;
		vision_processing_time?: number;
	}
	export interface Ball {
		p_x: number;
		p_y: number;
		p_z?: number;
		v_x: number;
		v_y: number;
		v_z?: number;
		touchdown_x?: number;
		touchdown_y?: number;
		is_bouncing?: boolean;
		raw?: world.BallPosition[];
	}
	export interface RobotPosition {
		time: number;
		p_x: number;
		p_y: number;
		phi: number;
		v_x?: number;
		v_y?: number;
		system_delay?: number;
		time_diff_scaled?: number;
		omega?: number;
		camera_id?: number;
		vision_processing_time?: number;
	}
	export interface Robot {
		id: number;
		p_x: number;
		p_y: number;
		phi: number;
		v_x: number;
		v_y: number;
		omega: number;
		raw?: world.RobotPosition[];
	}
	export interface TrackingAOI {
		x1: number;
		y1: number;
		x2: number;
		y2: number;
	}
	export const enum WorldSource {
		INTERNAL_SIMULATION = "INTERNAL_SIMULATION",
		EXTERNAL_SIMULATION = "EXTERNAL_SIMULATION",
		REAL_LIFE = "REAL_LIFE"
	}
	export interface State {
		time: number;
		ball?: world.Ball;
		yellow?: world.Robot[];
		blue?: world.Robot[];
		radio_response?: robot.RadioResponse[];
		is_simulated?: boolean;
		has_vision_data?: boolean;
		mixed_team_info?: ssl.TeamPlan;
		tracking_aoi?: world.TrackingAOI;
		simple_tracking_yellow?: world.Robot[];
		simple_tracking_blue?: world.Robot[];
		reality?: world.SimulatorState[];
		vision_frames?: SSL_WrapperPacket[];
		vision_frame_times?: number[];
		system_delay?: number;
		world_source?: WorldSource;
	}
	export interface SimulatorState {
		blue_robots?: world.SimRobot[];
		yellow_robots?: world.SimRobot[];
		ball?: world.SimBall;
	}
	export interface SimBall {
		p_x: number;
		p_y: number;
		p_z: number;
		v_x: number;
		v_y: number;
		v_z: number;
		angular_x?: number;
		angular_y?: number;
		angular_z?: number;
	}
	export interface Quaternion {
		real: number;
		i: number;
		j: number;
		k: number;
	}
	export interface SimRobot {
		id: number;
		p_x: number;
		p_y: number;
		p_z: number;
		rotation: world.Quaternion;
		v_x: number;
		v_y: number;
		v_z: number;
		r_x: number;
		r_y: number;
		r_z: number;
	}
}
export namespace google {
	export namespace protobuf {
		export interface Duration {
			seconds?: number;
			nanos?: number;
		}
		export interface Timestamp {
			seconds?: number;
			nanos?: number;
		}
		export interface Any {
			type_url?: string;
			value?: ArrayBuffer;
		}
	}
}

