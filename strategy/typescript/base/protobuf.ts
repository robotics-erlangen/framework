// automatically generated, do not edit
/* tslint:disable:class-name */
// automatically generated, do not edit

export namespace amun {
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
			DirectYellow = "DirectYellow",
			IndirectYellow = "IndirectYellow",
			BallPlacementYellow = "BallPlacementYellow",
			KickoffBluePrepare = "KickoffBluePrepare",
			KickoffBlue = "KickoffBlue",
			PenaltyBluePrepare = "PenaltyBluePrepare",
			PenaltyBlue = "PenaltyBlue",
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
	export interface CameraSetup {
		num_cameras: number;
		camera_height: number;
	}
	export interface SimulatorSetup {
		geometry?: world.Geometry;
		camera_setup?: amun.CameraSetup;
	}
	export interface SimulatorWorstCaseVision {
		min_robot_detection_time?: number;
		min_ball_detection_time?: number;
	}
	export interface CommandSimulator {
		enable?: boolean;
		vision_delay?: number;
		vision_processing_time?: number;
		move_ball?: amun.SimulatorMoveBall;
		move_blue?: amun.SimulatorMoveRobot[];
		move_yellow?: amun.SimulatorMoveRobot[];
		stddev_ball_p?: number;
		stddev_robot_p?: number;
		stddev_robot_phi?: number;
		simulator_setup?: amun.SimulatorSetup;
		enable_invisible_ball?: boolean;
		ball_visibility_threshold?: number;
		camera_overlap?: number;
		vision_worst_case?: amun.SimulatorWorstCaseVision;
	}
	export interface CommandReferee {
		active?: boolean;
		command?: ArrayBuffer;
		use_internal_autoref?: boolean;
		autoref_command?: SSL_RefereeRemoteControlRequest;
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
		enable_refbox_control?: boolean;
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
	export interface CommandTransceiver {
		enable?: boolean;
		charge?: boolean;
		configuration?: amun.TransceiverConfiguration;
		network_configuration?: amun.HostAddress;
		use_network?: boolean;
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
		speed?: number;
		tracking?: amun.CommandTracking;
		amun?: amun.CommandAmun;
		mixed_team_destination?: amun.HostAddress;
		robot_move_blue?: amun.RobotMoveCommand[];
		robot_move_yellow?: amun.RobotMoveCommand[];
		debugger_input?: amun.CommandDebuggerInput;
		remote_control_port?: number;
		pause_simulator?: amun.PauseSimulatorCommand;
		replay?: amun.CommandReplay;
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
	}
	export interface UserInput {
		radio_command?: robot.RadioCommand[];
		move_command?: amun.RobotMoveCommand[];
	}
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
			kick_speed?: number;
			max_ball_height?: number;
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
		export const enum Type {
			UNKNOWN_GAME_EVENT_TYPE = "UNKNOWN_GAME_EVENT_TYPE",
			BALL_LEFT_FIELD_TOUCH_LINE = "BALL_LEFT_FIELD_TOUCH_LINE",
			BALL_LEFT_FIELD_GOAL_LINE = "BALL_LEFT_FIELD_GOAL_LINE",
			AIMLESS_KICK = "AIMLESS_KICK",
			POSSIBLE_GOAL = "POSSIBLE_GOAL",
			NO_PROGRESS_IN_GAME = "NO_PROGRESS_IN_GAME",
			ATTACKER_DOUBLE_TOUCHED_BALL = "ATTACKER_DOUBLE_TOUCHED_BALL",
			ATTACKER_TOO_CLOSE_TO_DEFENSE_AREA = "ATTACKER_TOO_CLOSE_TO_DEFENSE_AREA",
			DEFENDER_IN_DEFENSE_AREA = "DEFENDER_IN_DEFENSE_AREA",
			BOUNDARY_CROSSING = "BOUNDARY_CROSSING",
			KEEPER_HELD_BALL = "KEEPER_HELD_BALL",
			BOT_DRIBBLED_BALL_TOO_FAR = "BOT_DRIBBLED_BALL_TOO_FAR",
			ATTACKER_TOUCHED_BALL_IN_DEFENSE_AREA = "ATTACKER_TOUCHED_BALL_IN_DEFENSE_AREA",
			BOT_KICKED_BALL_TOO_FAST = "BOT_KICKED_BALL_TOO_FAST",
			BOT_CRASH_UNIQUE = "BOT_CRASH_UNIQUE",
			BOT_CRASH_DRAWN = "BOT_CRASH_DRAWN",
			DEFENDER_TOO_CLOSE_TO_KICK_POINT = "DEFENDER_TOO_CLOSE_TO_KICK_POINT",
			BOT_TOO_FAST_IN_STOP = "BOT_TOO_FAST_IN_STOP",
			BOT_INTERFERED_PLACEMENT = "BOT_INTERFERED_PLACEMENT",
			GOAL = "GOAL",
			INVALID_GOAL = "INVALID_GOAL",
			PLACEMENT_FAILED = "PLACEMENT_FAILED",
			PLACEMENT_SUCCEEDED = "PLACEMENT_SUCCEEDED",
			MULTIPLE_CARDS = "MULTIPLE_CARDS",
			MULTIPLE_FOULS = "MULTIPLE_FOULS",
			BOT_SUBSTITUTION = "BOT_SUBSTITUTION",
			TOO_MANY_ROBOTS = "TOO_MANY_ROBOTS",
			UNSPORTING_BEHAVIOR_MINOR = "UNSPORTING_BEHAVIOR_MINOR",
			UNSPORTING_BEHAVIOR_MAJOR = "UNSPORTING_BEHAVIOR_MAJOR",
			BOT_PUSHED_BOT = "BOT_PUSHED_BOT",
			BOT_HELD_BALL_DELIBERATELY = "BOT_HELD_BALL_DELIBERATELY",
			BOT_TIPPED_OVER = "BOT_TIPPED_OVER",
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
		type: gameController.GameEvent.Type;
		origin?: string[];
		ball_left_field_touch_line?: gameController.GameEvent.BallLeftField;
		ball_left_field_goal_line?: gameController.GameEvent.BallLeftField;
		aimless_kick?: gameController.GameEvent.AimlessKick;
		possible_goal?: gameController.GameEvent.Goal;
		no_progress_in_game?: gameController.GameEvent.NoProgressInGame;
		attacker_double_touched_ball?: gameController.GameEvent.AttackerDoubleTouchedBall;
		attacker_too_close_to_defense_area?: gameController.GameEvent.AttackerTooCloseToDefenseArea;
		defender_in_defense_area?: gameController.GameEvent.DefenderInDefenseArea;
		boundary_crossing?: gameController.GameEvent.BoundaryCrossing;
		keeper_held_ball?: gameController.GameEvent.KeeperHeldBall;
		bot_dribbled_ball_too_far?: gameController.GameEvent.BotDribbledBallTooFar;
		attacker_touched_ball_in_defense_area?: gameController.GameEvent.AttackerTouchedBallInDefenseArea;
		bot_kicked_ball_too_fast?: gameController.GameEvent.BotKickedBallTooFast;
		bot_crash_unique?: gameController.GameEvent.BotCrashUnique;
		bot_crash_drawn?: gameController.GameEvent.BotCrashDrawn;
		defender_too_close_to_kick_point?: gameController.GameEvent.DefenderTooCloseToKickPoint;
		bot_too_fast_in_stop?: gameController.GameEvent.BotTooFastInStop;
		bot_interfered_placement?: gameController.GameEvent.BotInterferedPlacement;
		goal?: gameController.GameEvent.Goal;
		invalid_goal?: gameController.GameEvent.Goal;
		placement_failed?: gameController.GameEvent.PlacementFailed;
		placement_succeeded?: gameController.GameEvent.PlacementSucceeded;
		multiple_cards?: gameController.GameEvent.MultipleCards;
		multiple_fouls?: gameController.GameEvent.MultipleFouls;
		bot_substitution?: gameController.GameEvent.BotSubstitution;
		too_many_robots?: gameController.GameEvent.TooManyRobots;
		unsporting_behavior_minor?: gameController.GameEvent.UnsportingBehaviorMinor;
		unsporting_behavior_major?: gameController.GameEvent.UnsportingBehaviorMajor;
		bot_pushed_bot?: gameController.GameEvent.BotPushedBot;
		bot_held_ball_deliberately?: gameController.GameEvent.BotHeldBallDeliberately;
		bot_tipped_over?: gameController.GameEvent.BotTippedOver;
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
	game_events?: gameController.GameEvent[];
	proposed_game_events?: ProposedGameEvent[];
	current_action_time_remaining?: number;
}
export interface ProposedGameEvent {
	valid_until: number;
	proposer_id: string;
	game_event: gameController.GameEvent;
}
export interface SSL_WrapperPacket {
	detection?: SSL_DetectionFrame;
	geometry?: SSL_GeometryData;
}
export namespace world {
	export namespace Geometry {
		export const enum GeometryType {
			TYPE_2014 = "TYPE_2014",
			TYPE_2018 = "TYPE_2018",
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
		vision_frames?: SSL_WrapperPacket[];
		simple_tracking_yellow?: world.Robot[];
		simple_tracking_blue?: world.Robot[];
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
export namespace SSL_RefereeRemoteControlRequest {
	export namespace CardInfo {
		export const enum CardType {
			CARD_YELLOW = "CARD_YELLOW",
			CARD_RED = "CARD_RED",
		}
		export const enum CardTeam {
			TEAM_YELLOW = "TEAM_YELLOW",
			TEAM_BLUE = "TEAM_BLUE",
		}
	}
	export interface CardInfo {
		type: SSL_RefereeRemoteControlRequest.CardInfo.CardType;
		team: SSL_RefereeRemoteControlRequest.CardInfo.CardTeam;
	}
}
export interface SSL_RefereeRemoteControlRequest {
	message_id: number;
	stage?: SSL_Referee.Stage;
	command?: SSL_Referee.Command;
	designated_position?: SSL_Referee.Point;
	card?: SSL_RefereeRemoteControlRequest.CardInfo;
	last_command_counter?: number;
	implementation_id?: string;
	game_event?: SSL_Referee_Game_Event;
}
export namespace SSL_RefereeRemoteControlReply {
	export const enum Outcome {
		OK = "OK",
		MULTIPLE_ACTIONS = "MULTIPLE_ACTIONS",
		BAD_STAGE = "BAD_STAGE",
		BAD_COMMAND = "BAD_COMMAND",
		BAD_DESIGNATED_POSITION = "BAD_DESIGNATED_POSITION",
		BAD_COMMAND_COUNTER = "BAD_COMMAND_COUNTER",
		BAD_CARD = "BAD_CARD",
		NO_MAJORITY = "NO_MAJORITY",
		COMMUNICATION_FAILED = "COMMUNICATION_FAILED",
	}
}
export interface SSL_RefereeRemoteControlReply {
	message_id: number;
	outcome: SSL_RefereeRemoteControlReply.Outcome;
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
	field_length: number;
	field_width: number;
	goal_width: number;
	goal_depth: number;
	boundary_width: number;
	field_lines?: SSL_FieldLineSegment[];
	field_arcs?: SSL_FieldCircularArc[];
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
}
export interface SSL_GeometryData {
	field: SSL_GeometryFieldSize;
	calib?: SSL_GeometryCameraCalibration[];
}
export namespace logfile {
	export interface UidEntry {
		hash: string;
		flags?: number;
	}
	export interface Uid {
		parts?: logfile.UidEntry[];
	}
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

