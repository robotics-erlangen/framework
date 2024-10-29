import * as pb from "base/protobuf";

export const partialAmun: any = {
	getWorldState(): pb.world.State {
		return {
			"time": 1621266475978617000,
			"ball": {
				"p_x": 1,
				"p_y": 2,
				"v_x": 3,
				"v_y": 4,
				"p_z": 0,
				"v_z": 0,
				"is_bouncing": false
			},
			"yellow": [
				{
					"id": 7,
					"p_x": 4.30870438,
					"p_y": -5.22023106,
					"phi": 0.0126100667,
					"v_x": -1.62467358e-29,
					"v_y": -1.23894387e-28,
					"omega": -3.7313506e-27
				},
				{
					"id": 8,
					"p_x": 4.30965042,
					"p_y": -4.91876936,
					"phi": 0.00743329572,
					"v_x": 1.87935046e-30,
					"v_y": -4.71110751e-30,
					"omega": -1.00518251e-27
				},
			],
			"blue": [
				{
					"id": 0,
					"p_x": 4.30891085,
					"p_y": 5.82158566,
					"phi": -0.00760990661,
					"v_x": -0.00181624223,
					"v_y": 0.011856067,
					"omega": -0.0921530798
				},
				{
					"id": 1,
					"p_x": 4.31230497,
					"p_y": 5.52151299,
					"phi": 0.0166212711,
					"v_x": 0.0228506513,
					"v_y": 0.00462615164,
					"omega": 0.099851869
				},
				{
					"id": 2,
					"p_x": 4.31096458,
					"p_y": 5.22332478,
					"phi": 0.0117666787,
					"v_x": 0.00700113596,
					"v_y": 0.0204283893,
					"omega": 0.141427085
				},
				{
					"id": 3,
					"p_x": 4.30894041,
					"p_y": 4.92111063,
					"phi": -0.000419268501,
					"v_x": -0.00949425437,
					"v_y": 0.00330419326,
					"omega": 0.0148897544
				},
				{
					"id": 4,
					"p_x": 4.30779648,
					"p_y": 4.61919403,
					"phi": 0.0226218849,
					"v_x": -0.0190080516,
					"v_y": -0.0124621531,
					"omega": 0.192788348
				},
			],
			"is_simulated": true,
			"has_vision_data": true,
			"vision_transmission_delay": 30000000
		};
	},

	getGeometry(): pb.world.Geometry {
		return {
			"line_width": 0.01,
			"field_width": 11,
			"field_height": 17,
			"boundary_width": 0.25,
			"goal_width": 1.8,
			"goal_depth": 0.18,
			"goal_wall_width": 0.02,
			"center_circle_radius": 0.5,
			"defense_radius": 1.2,
			"defense_stretch": 3.6,
			"free_kick_from_defense_dist": 0.2,
			"penalty_spot_from_field_line_dist": 1.8,
			"penalty_line_from_spot_dist": 0.4,
			"goal_height": 0.155,
			"defense_width": 3.6,
			"defense_height": 1.8,
			"type": pb.world.Geometry.GeometryType.TYPE_2018,
			"division": pb.world.Geometry.Division.A
		};
	},

	isBlue(): boolean { return false; },

	getGameState(): pb.amun.GameState {
		return {
			"stage": pb.SSL_Referee.Stage.NORMAL_FIRST_HALF,
			"stage_time_left": 300000000,
			"state": pb.amun.GameState.State.Stop,
			"yellow": {
				"name": "Unknown",
				"score": 0,
				"red_cards": 0,
				"yellow_cards": 0,
				"timeouts": 4,
				"timeout_time": 300000000,
				"goalie": 10,
				"foul_counter": 0,
				"ball_placement_failures": 0,
				"can_place_ball": true,
				"max_allowed_bots": 11,
				"bot_substitution_intent": false,
				"ball_placement_failures_reached": false
			},
			"blue": {
				"name": "Unknown",
				"score": 0,
				"red_cards": 0,
				"yellow_cards": 0,
				"timeouts": 4,
				"timeout_time": 300000000,
				"goalie": 0,
				"foul_counter": 0,
				"ball_placement_failures": 0,
				"can_place_ball": true,
				"max_allowed_bots": 11,
				"bot_substitution_intent": false,
				"ball_placement_failures_reached": false
			},
			"goals_flipped": false,
			"is_real_game_running": false,
			"current_action_time_remaining": 0
		};
	},

	getTeam(): pb.robot.Team {
		return { robot: [{
			"generation": 4,
			"year": 2020,
			"id": 7,
			"radius": 0.089,
			"height": 0.15,
			"mass": 1.5,
			"angle": 0.98291,
			"v_max": 3.5,
			"omega_max": 6,
			"shot_linear_max": 6.5,
			"shot_chip_max": 3,
			"dribbler_width": 0.07,
			"acceleration": {
				"a_speedup_f_max": 7,
				"a_speedup_s_max": 6,
				"a_speedup_phi_max": 60,
				"a_brake_f_max": 7,
				"a_brake_s_max": 6,
				"a_brake_phi_max": 60
			},
			"ir_param": 40,
			"strategy": {
				"a_speedup_f_max": 4,
				"a_speedup_s_max": 3,
				"a_speedup_phi_max": 45,
				"a_brake_f_max": 3,
				"a_brake_s_max": 3,
				"a_brake_phi_max": 45
			},
			"shoot_radius": 0.067,
			"dribbler_height": 0.04,
			"type": pb.robot.Specs.GenerationType.Regular,
			"pattern_rotation": 0
		},
		{
			"generation": 4,
			"year": 2020,
			"id": 8,
			"radius": 0.089,
			"height": 0.15,
			"mass": 1.5,
			"angle": 0.98291,
			"v_max": 3.5,
			"omega_max": 6,
			"shot_linear_max": 6.5,
			"shot_chip_max": 3,
			"dribbler_width": 0.07,
			"acceleration": {
				"a_speedup_f_max": 7,
				"a_speedup_s_max": 6,
				"a_speedup_phi_max": 60,
				"a_brake_f_max": 7,
				"a_brake_s_max": 6,
				"a_brake_phi_max": 60
			},
			"ir_param": 40,
			"strategy": {
				"a_speedup_f_max": 4,
				"a_speedup_s_max": 3,
				"a_speedup_phi_max": 45,
				"a_brake_f_max": 3,
				"a_brake_s_max": 3,
				"a_brake_phi_max": 45
			},
			"shoot_radius": 0.067,
			"dribbler_height": 0.04,
			"type": pb.robot.Specs.GenerationType.Regular,
			"pattern_rotation": 0
		},
		] };
	},
};
