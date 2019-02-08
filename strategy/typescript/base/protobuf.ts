// automatically generated, do not edit
/* tslint:disable:class-name */

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
		stage_time_left?: number;
		state: amun.GameState.State;
		yellow: SSL_Referee.TeamInfo;
		blue: SSL_Referee.TeamInfo;
		designated_position?: SSL_Referee.Point;
		game_event?: SSL_Referee_Game_Event;
		goals_flipped?: boolean;
		is_real_game_running?: boolean;
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
		debugger_output?: amun.DebuggerOutput;
	}
	export interface SimulatorMoveBall {
		p_x?: number;
		p_y?: number;
		p_z?: number;
		position?: boolean;
		v_x?: number;
		v_y?: number;
		v_z?: number;
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
	export namespace CommandSimulator {
		export const enum RuleVersion {
			RULES2017 = 1,
			RULES2018 = 2,
		}
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
		rule_version?: amun.CommandSimulator.RuleVersion;
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
	export interface CommandStrategySetOptions {
		option?: string[];
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
		options?: amun.CommandStrategySetOptions;
		debug?: amun.CommandStrategyTriggerDebugger;
		performance_mode?: boolean;
		start_profiling?: boolean;
		finish_and_save_profile?: string;
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
	export interface CommandAmun {
		vision_port?: number;
		referee_port?: number;
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
		strategy_type: amun.DebuggerInputTarget;
		disable?: amun.CommandDebuggerInputDisable;
		queue_line?: amun.CommandDebuggerInputLine;
	}
	export const enum PauseSimulatorReason {
		Ui = 1,
		WindowFocus = 2,
		DebugBlueStrategy = 3,
		DebugYellowStrategy = 4,
		DebugAutoref = 5,
		Replay = 6,
		Horus = 7,
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
	export interface UserInput {
		radio_command?: robot.RadioCommand[];
		move_command?: amun.RobotMoveCommand[];
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
		current_entry_point?: string;
		entry_point?: string[];
		option?: string[];
		has_debugger?: boolean;
	}
	export namespace StatusStrategyWrapper {
		export const enum StrategyType {
			BLUE = 1,
			YELLOW = 2,
			AUTOREF = 3,
			REPLAY_BLUE = 4,
			REPLAY_YELLOW = 5,
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
	export interface StatusAmun {
		port_bind_error?: amun.PortBindError;
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
			Linear = 1,
			Chip = 2,
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
		is_blue: boolean;
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
		auto_ref_message?: gameController.AutoRefMessage;
	}
	export interface ControllerToAutoRef {
		controller_reply?: gameController.ControllerReply;
	}
	export namespace AutoRefMessage {
		export namespace WaitForBots {
			export interface Violator {
				bot_id: gameController.BotId;
				distance: number;
			}
		}
		export interface WaitForBots {
			violators?: gameController.AutoRefMessage.WaitForBots.Violator[];
		}
	}
	export interface AutoRefMessage {
		custom?: string;
		wait_for_bots?: gameController.AutoRefMessage.WaitForBots;
	}
	export interface TeamRegistration {
		team_name: string;
		signature?: gameController.Signature;
	}
	export namespace TeamToController {
		export const enum AdvantageResponse {
			UNDECIDED = 0,
			STOP = 0,
			CONTINUE = 1,
		}
	}
	export interface TeamToController {
		signature?: gameController.Signature;
		desired_keeper?: number;
		advantage_response?: gameController.TeamToController.AdvantageResponse;
		substitute_bot?: boolean;
	}
	export interface ControllerToTeam {
		controller_reply?: gameController.ControllerReply;
		advantage_choice?: gameController.AdvantageChoice;
	}
	export namespace AdvantageChoice {
		export const enum Foul {
			UNKNOWN = 0,
			COLLISION = 1,
			PUSHING = 2,
		}
	}
	export interface AdvantageChoice {
		foul: gameController.AdvantageChoice.Foul;
	}
	export const enum Team {
		UNKNOWN = 0,
		YELLOW = 1,
		BLUE = 2,
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
			UNKNOWN_STATUS_CODE = 0,
			OK = 1,
			REJECTED = 2,
		}
		export const enum Verification {
			UNKNOWN_VERIFICATION = 0,
			VERIFIED = 1,
			UNVERIFIED = 2,
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
	export namespace GameEvent {
		export interface BallLeftFieldEvent {
			by_team: gameController.Team;
			by_bot?: number;
			location?: gameController.Location;
		}
		export interface AimlessKick {
			by_team: gameController.Team;
			by_bot?: number;
			location?: gameController.Location;
			kick_location?: gameController.Location;
		}
		export interface Goal {
			by_team: gameController.Team;
			by_bot?: number;
			location?: gameController.Location;
			kick_location?: gameController.Location;
		}
		export interface IndirectGoal {
			by_team: gameController.Team;
			by_bot?: number;
			location?: gameController.Location;
			kick_location?: gameController.Location;
		}
		export interface ChippedGoal {
			by_team: gameController.Team;
			by_bot?: number;
			location?: gameController.Location;
			kick_location?: gameController.Location;
			max_ball_height?: number;
		}
		export interface BotTooFastInStop {
			by_team: gameController.Team;
			by_bot?: number;
			location?: gameController.Location;
			speed?: number;
		}
		export interface DefenderTooCloseToKickPoint {
			by_team: gameController.Team;
			by_bot?: number;
			location?: gameController.Location;
			distance?: number;
		}
		export interface BotCrashDrawn {
			bot_yellow?: number;
			bot_blue?: number;
			location?: gameController.Location;
			crash_speed?: number;
			speed_diff?: number;
			crash_angle?: number;
		}
		export interface BotCrashUnique {
			by_team: gameController.Team;
			violator?: number;
			victim?: number;
			location?: gameController.Location;
			crash_speed?: number;
			speed_diff?: number;
			crash_angle?: number;
		}
		export interface BotPushedBot {
			by_team: gameController.Team;
			violator?: number;
			victim?: number;
			location?: gameController.Location;
			pushed_distance?: number;
		}
		export interface BotTippedOver {
			by_team: gameController.Team;
			by_bot?: number;
			location?: gameController.Location;
		}
		export interface DefenderInDefenseArea {
			by_team: gameController.Team;
			by_bot?: number;
			location?: gameController.Location;
			distance?: number;
		}
		export interface DefenderInDefenseAreaPartially {
			by_team: gameController.Team;
			by_bot?: number;
			location?: gameController.Location;
			distance?: number;
		}
		export interface AttackerInDefenseArea {
			by_team: gameController.Team;
			by_bot?: number;
			location?: gameController.Location;
			distance?: number;
		}
		export interface BotKickedBallTooFast {
			by_team: gameController.Team;
			by_bot?: number;
			location?: gameController.Location;
			initial_ball_speed?: number;
			max_ball_height?: number;
		}
		export interface BotDribbledBallTooFar {
			by_team: gameController.Team;
			by_bot?: number;
			start?: gameController.Location;
			end?: gameController.Location;
		}
		export interface AttackerTouchedKeeper {
			by_team: gameController.Team;
			by_bot?: number;
			location?: gameController.Location;
		}
		export interface AttackerDoubleTouchedBall {
			by_team: gameController.Team;
			by_bot?: number;
			location?: gameController.Location;
		}
		export interface AttackerTooCloseToDefenseArea {
			by_team: gameController.Team;
			by_bot?: number;
			location?: gameController.Location;
			distance?: number;
		}
		export interface BotHeldBallDeliberately {
			by_team: gameController.Team;
			by_bot?: number;
			location?: gameController.Location;
			duration?: number;
		}
		export interface BotInterferedPlacement {
			by_team: gameController.Team;
			by_bot?: number;
			location?: gameController.Location;
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
			time?: number;
		}
		export interface NoProgressInGame {
			location?: gameController.Location;
			time?: number;
		}
		export interface PlacementFailedByTeamInFavor {
			by_team: gameController.Team;
			remaining_distance?: number;
		}
		export interface PlacementFailedByOpponent {
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
			location?: gameController.Location;
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
		}
	}
	export interface GameEvent {
		prepared?: gameController.GameEvent.Prepared;
		no_progress_in_game?: gameController.GameEvent.NoProgressInGame;
		placement_failed_by_team_in_favor?: gameController.GameEvent.PlacementFailedByTeamInFavor;
		placement_failed_by_opponent?: gameController.GameEvent.PlacementFailedByOpponent;
		placement_succeeded?: gameController.GameEvent.PlacementSucceeded;
		bot_substitution?: gameController.GameEvent.BotSubstitution;
		too_many_robots?: gameController.GameEvent.TooManyRobots;
		ball_left_field_touch_line?: gameController.GameEvent.BallLeftFieldEvent;
		ball_left_field_goal_line?: gameController.GameEvent.BallLeftFieldEvent;
		possible_goal?: gameController.GameEvent.Goal;
		goal?: gameController.GameEvent.Goal;
		indirect_goal?: gameController.GameEvent.IndirectGoal;
		chipped_goal?: gameController.GameEvent.ChippedGoal;
		aimless_kick?: gameController.GameEvent.AimlessKick;
		kick_timeout?: gameController.GameEvent.KickTimeout;
		keeper_held_ball?: gameController.GameEvent.KeeperHeldBall;
		attacker_double_touched_ball?: gameController.GameEvent.AttackerDoubleTouchedBall;
		attacker_in_defense_area?: gameController.GameEvent.AttackerInDefenseArea;
		attacker_touched_keeper?: gameController.GameEvent.AttackerTouchedKeeper;
		bot_dribbled_ball_too_far?: gameController.GameEvent.BotDribbledBallTooFar;
		bot_kicked_ball_too_fast?: gameController.GameEvent.BotKickedBallTooFast;
		attacker_too_close_to_defense_area?: gameController.GameEvent.AttackerTooCloseToDefenseArea;
		bot_interfered_placement?: gameController.GameEvent.BotInterferedPlacement;
		bot_crash_drawn?: gameController.GameEvent.BotCrashDrawn;
		bot_crash_unique?: gameController.GameEvent.BotCrashUnique;
		bot_crash_unique_skipped?: gameController.GameEvent.BotCrashUnique;
		bot_pushed_bot?: gameController.GameEvent.BotPushedBot;
		bot_pushed_bot_skipped?: gameController.GameEvent.BotPushedBot;
		bot_held_ball_deliberately?: gameController.GameEvent.BotHeldBallDeliberately;
		bot_tipped_over?: gameController.GameEvent.BotTippedOver;
		bot_too_fast_in_stop?: gameController.GameEvent.BotTooFastInStop;
		defender_too_close_to_kick_point?: gameController.GameEvent.DefenderTooCloseToKickPoint;
		defender_in_defense_area_partially?: gameController.GameEvent.DefenderInDefenseAreaPartially;
		defender_in_defense_area?: gameController.GameEvent.DefenderInDefenseArea;
		multiple_cards?: gameController.GameEvent.MultipleCards;
		multiple_placement_failures?: gameController.GameEvent.MultiplePlacementFailures;
		multiple_fouls?: gameController.GameEvent.MultipleFouls;
		unsporting_behavior_minor?: gameController.GameEvent.UnsportingBehaviorMinor;
		unsporting_behavior_major?: gameController.GameEvent.UnsportingBehaviorMajor;
	}
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
	message_id: number;
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
		red_cards: number;
		yellow_card_times?: number[];
		yellow_cards: number;
		timeouts: number;
		timeout_time: number;
		goalie: number;
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
		bot_id?: number;
	}
}
export interface SSL_Referee_Game_Event {
	game_event_type: SSL_Referee_Game_Event.GameEventType;
	originator?: SSL_Referee_Game_Event.Originator;
	message?: string;
}
export interface SSL_WrapperPacket {
	detection?: SSL_DetectionFrame;
	geometry?: SSL_GeometryData;
}
export namespace world {
	export namespace Geometry {
		export const enum GeometryType {
			TYPE_2014 = 1,
			TYPE_2018 = 2,
		}
	}
	export interface Geometry {
		line_width: number;
		field_width: number;
		field_height: number;
		boundary_width: number;
		referee_width: number;
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
	}
}
export interface SSL_RadioProtocolCommand {
	robot_id: number;
	velocity_x: number;
	velocity_y: number;
	velocity_r: number;
	flat_kick?: number;
	chip_kick?: number;
	dribbler_spin?: number;
}
export interface SSL_RadioProtocolWrapper {
	command?: SSL_RadioProtocolCommand[];
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

