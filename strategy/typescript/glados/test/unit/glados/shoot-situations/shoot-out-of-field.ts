/**************************************************************************
*   Copyright 2026 Robotics Erlangen e.V.                                 *
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

export const partialAmun: any = {
	getWorldState(): pb.world.State {
		return {
			"time": 1622569924016693000,
			"ball": {
				"p_x": 2.32802868,
				"p_y": -0.129443929,
				"v_x": 2.51651573,
				"v_y": -1.34709394,
				"p_z": 0,
				"v_z": 0,
				"is_bouncing": false
			},
			"yellow": [
				{
					"id": 6,
					"p_x": 0.461916596,
					"p_y": -3.33131957,
					"phi": 1.0973686,
					"v_x": 0.83585161,
					"v_y": 0.00722159119,
					"omega": -3.53765702,
					"raw": [
						{
							"time": 1622569923968388010,
							"p_x": 0.42203024,
							"p_y": -3.33252668,
							"phi": 1.26137888,
							"v_x": 0.844407,
							"v_y": -0.129257619,
							"system_delay": 0,
							"time_diff_scaled": 1.2611,
							"omega": -2.72490263,
							"camera_id": 0,
							"vision_processing_time": 9999990
						}
					]
				},
				{
					"id": 7,
					"p_x": -1.25231814,
					"p_y": 1.08237624,
					"phi": -0.369142056,
					"v_x": -1.08111799,
					"v_y": 2.13733149,
					"omega": -1.07252479,
					"raw": [
						{
							"time": 1622569923968388010,
							"p_x": -1.2003119,
							"p_y": 0.976966441,
							"phi": -0.327228934,
							"v_x": -1.14064133,
							"v_y": 1.92901921,
							"system_delay": 0,
							"time_diff_scaled": 1.2611,
							"omega": -1.65836179,
							"camera_id": 0,
							"vision_processing_time": 9999990
						}
					]
				},
				{
					"id": 8,
					"p_x": 1.6898427,
					"p_y": -0.144219458,
					"phi": 2.1739521,
					"v_x": 0.371552914,
					"v_y": -0.220659807,
					"omega": 0.266311944,
					"raw": [
						{
							"time": 1622569923968388010,
							"p_x": 1.67376494,
							"p_y": -0.134928882,
							"phi": 2.12874174,
							"v_x": 0.555550635,
							"v_y": -0.384594351,
							"system_delay": 0,
							"time_diff_scaled": 1.2611,
							"omega": -2.6678834,
							"camera_id": 0,
							"vision_processing_time": 9999990
						}
					]
				},
				{
					"id": 9,
					"p_x": 0.9097296,
					"p_y": -3.33338094,
					"phi": 1.55748713,
					"v_x": 0.687058628,
					"v_y": -0.0294443853,
					"omega": -0.96482867,
					"raw": [
						{
							"time": 1622569923968388010,
							"p_x": 0.874825299,
							"p_y": -3.33369875,
							"phi": 1.59143806,
							"v_x": 0.65233314,
							"v_y": -0.276740253,
							"system_delay": 0,
							"time_diff_scaled": 1.2611,
							"omega": -1.04033756,
							"camera_id": 0,
							"vision_processing_time": 9999990
						}
					]
				},
				{
					"id": 10,
					"p_x": 0.242662445,
					"p_y": -4.34997511,
					"phi": 1.13426709,
					"v_x": 0.00623409497,
					"v_y": 0.001247023,
					"omega": -0.55398947,
					"raw": [
						{
							"time": 1622569923968388010,
							"p_x": 0.242961153,
							"p_y": -4.34988689,
							"phi": 1.15499341,
							"v_x": 0.0712611303,
							"v_y": 0.142926365,
							"system_delay": 0,
							"time_diff_scaled": 1.2611,
							"omega": -1.82438135,
							"camera_id": 0,
							"vision_processing_time": 9999990
						}
					]
				},
				{
					"id": 11,
					"p_x": -0.279915422,
					"p_y": 0.972094476,
					"phi": -0.369356155,
					"v_x": 0.818843722,
					"v_y": 0.0168854278,
					"omega": 0.0138173671,
					"raw": [
						{
							"time": 1622569923968388010,
							"p_x": -0.321549833,
							"p_y": 0.971970737,
							"phi": -0.370334297,
							"v_x": 0.529850841,
							"v_y": -0.0414363593,
							"system_delay": 0,
							"time_diff_scaled": 1.2611,
							"omega": -0.148957253,
							"camera_id": 0,
							"vision_processing_time": 9999990
						}
					]
				}
			],
			"blue": [
				{
					"id": 0,
					"p_x": 0.0288471431,
					"p_y": 4.34896374,
					"phi": -1.1008594,
					"v_x": 0.157672688,
					"v_y": 0.0112222293,
					"omega": 0.328989655,
					"raw": [
						{
							"time": 1622569923968388010,
							"p_x": 0.0161254536,
							"p_y": 4.34841204,
							"phi": -1.12773335,
							"v_x": -0.094583407,
							"v_y": 0.0538809747,
							"system_delay": 0,
							"time_diff_scaled": 1.2611,
							"omega": -1.6416682,
							"camera_id": 0,
							"vision_processing_time": 9999990
						}
					]
				},
				{
					"id": 1,
					"p_x": -1.0079633,
					"p_y": 2.38340545,
					"phi": 0.398695618,
					"v_x": -1.18296874,
					"v_y": -2.25290608,
					"omega": -1.65019798,
					"raw": [
						{
							"time": 1622569923968388010,
							"p_x": -0.949536681,
							"p_y": 2.48893023,
							"phi": 0.490289181,
							"v_x": -0.921473324,
							"v_y": -2.33728099,
							"system_delay": 0,
							"time_diff_scaled": 1.2611,
							"omega": -5.0050106,
							"camera_id": 0,
							"vision_processing_time": 9999990
						}
					]
				},
				{
					"id": 2,
					"p_x": 0.506612539,
					"p_y": 3.32568359,
					"phi": -1.14609551,
					"v_x": 0.564954698,
					"v_y": 0.0217659865,
					"omega": 1.00075173,
					"raw": [
						{
							"time": 1622569923968388010,
							"p_x": 0.479736805,
							"p_y": 3.32419205,
							"phi": -1.20444143,
							"v_x": 0.82582283,
							"v_y": 0.0122697372,
							"system_delay": 0,
							"time_diff_scaled": 1.2611,
							"omega": 1.14766467,
							"camera_id": 0,
							"vision_processing_time": 9999990
						}
					]
				},
				{
					"id": 3,
					"p_x": -0.442934632,
					"p_y": 2.55110455,
					"phi": -1.09218729,
					"v_x": 0.247701645,
					"v_y": 2.00545478,
					"omega": -0.379844278,
					"raw": [
						{
							"time": 1622569923968388010,
							"p_x": -0.455247819,
							"p_y": 2.45145917,
							"phi": -1.09671295,
							"v_x": 0.589684725,
							"v_y": 2.05460429,
							"system_delay": 0,
							"time_diff_scaled": 1.2611,
							"omega": -1.3389895,
							"camera_id": 0,
							"vision_processing_time": 9999990
						}
					]
				},
				{
					"id": 4,
					"p_x": 1.44333041,
					"p_y": -1.23024023,
					"phi": -0.519478261,
					"v_x": 0.0872592106,
					"v_y": 1.92939305,
					"omega": 1.66754401,
					"raw": [
						{
							"time": 1622569923968388010,
							"p_x": 1.43613338,
							"p_y": -1.324826,
							"phi": -0.633808076,
							"v_x": 0.547251105,
							"v_y": 1.88529527,
							"system_delay": 0,
							"time_diff_scaled": 1.2611,
							"omega": 2.35998654,
							"camera_id": 0,
							"vision_processing_time": 9999990
						}
					]
				},
				{
					"id": 5,
					"p_x": 3.1331923,
					"p_y": -0.530066967,
					"phi": -3.13461757,
					"v_x": 0.225347161,
					"v_y": 0.0163329579,
					"omega": 0.0480216071,
					"raw": [
						{
							"time": 1622569923968388010,
							"p_x": 3.1173439,
							"p_y": -0.530962229,
							"phi": -3.13247204,
							"v_x": 0.253788829,
							"v_y": -0.0905153081,
							"system_delay": 0,
							"time_diff_scaled": 1.2611,
							"omega": -0.469766468,
							"camera_id": 0,
							"vision_processing_time": 9999990
						}
					]
				}
			],
			"is_simulated": true,
			"has_vision_data": true,
			"vision_frame_times": [
				1622569924008388000
			],
			"vision_transmission_delay": 30000000
		};
	},

	getGeometry(): pb.world.Geometry {
		return {
			"line_width": 0.01,
			"field_width": 6,
			"field_height": 9,
			"boundary_width": 0.3,
			"goal_width": 1,
			"goal_depth": 0.18,
			"goal_wall_width": 0.02,
			"center_circle_radius": 0.5,
			"defense_radius": 1.2,
			"defense_stretch": 2,
			"free_kick_from_defense_dist": 0.2,
			"penalty_spot_from_field_line_dist": 1,
			"penalty_line_from_spot_dist": 0.4,
			"goal_height": 0.155,
			"defense_width": 2,
			"defense_height": 1,
			"type": pb.world.Geometry.GeometryType.TYPE_2018,
			"division": pb.world.Geometry.Division.B
		};
	},

	isBlue(): boolean { return true; },

	getGameState(): pb.amun.GameState {
		return {
			"stage": pb.SSL_Referee.Stage.NORMAL_FIRST_HALF,
			"stage_time_left": 145141838,
			"state": pb.amun.GameState.State.Game,
			"yellow": {
				"name": "Unknown",
				"score": 0,
				"red_cards": 0,
				"yellow_cards": 0,
				"timeouts": 4,
				"timeout_time": 300000000,
				"goalie": 10,
				"foul_counter": 1,
				"ball_placement_failures": 0,
				"can_place_ball": true,
				"max_allowed_bots": 6,
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
				"max_allowed_bots": 6,
				"bot_substitution_intent": false,
				"ball_placement_failures_reached": false
			},
			"designated_position": {
				"x": 207.794617,
				"y": 2800
			},
			"goals_flipped": false,
			"is_real_game_running": false,
			"current_action_time_remaining": -6509668
		};
	},

	getTeam(): pb.robot.Team {
		return { robot: [{
			"generation": 4,
			"year": 2020,
			"id": 4,
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
			"id": 5,
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
			"id": 2,
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
			"id": 3,
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
			"id": 0,
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
			"id": 1,
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
