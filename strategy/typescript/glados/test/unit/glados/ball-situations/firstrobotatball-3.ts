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
			"time": 1624472214991190000,
			"ball": {
				"p_x": 0.59949,
				"p_y": -0.321665555,
				"v_x": -2.01354718,
				"v_y": 0.915932953,
				"p_z": 0,
				"v_z": 0,
				"is_bouncing": false
			},
			"yellow": [
				{
					"id": 0,
					"p_x": -1.12234426,
					"p_y": -3.45538044,
					"phi": 1.7068162,
					"v_x": 0.461020261,
					"v_y": 0.4182733,
					"omega": -0.422517598
				},
				{
					"id": 2,
					"p_x": 0.242597908,
					"p_y": -4.35225153,
					"phi": 1.51460016,
					"v_x": 0.00267456239,
					"v_y": 0.0117425518,
					"omega": -0.0259029809
				},
				{
					"id": 3,
					"p_x": 0.680416584,
					"p_y": -3.32839084,
					"phi": 1.65290725,
					"v_x": -0.455590069,
					"v_y": -0.0027649668,
					"omega": -0.022126032
				},
				{
					"id": 4,
					"p_x": 0.342034608,
					"p_y": -3.33158517,
					"phi": 1.59240413,
					"v_x": -0.281166375,
					"v_y": 0.0137219634,
					"omega": 0.0200858749
				},
				{
					"id": 5,
					"p_x": 0.76412189,
					"p_y": -0.927531183,
					"phi": 2.35522509,
					"v_x": -2.27220869,
					"v_y": 0.735069335,
					"omega": -1.08689356
				}
			],
			"blue": [
				{
					"id": 0,
					"p_x": 0.0984157845,
					"p_y": 4.14109,
					"phi": -1.38806283,
					"v_x": -0.139654517,
					"v_y": 0.0167804714,
					"omega": -0.0883951336
				},
				{
					"id": 1,
					"p_x": 2.33255363,
					"p_y": -0.474268824,
					"phi": 3.03385353,
					"v_x": -0.625799239,
					"v_y": 1.34951031,
					"omega": 0.383363664
				},
				{
					"id": 2,
					"p_x": -1.77122176,
					"p_y": -2.43633318,
					"phi": 0.302604347,
					"v_x": 1.48484087,
					"v_y": -0.498485953,
					"omega": -0.0649585202
				},
				{
					"id": 3,
					"p_x": -0.458732277,
					"p_y": -0.615991294,
					"phi": 0.244980723,
					"v_x": 0.288733155,
					"v_y": 1.44735837,
					"omega": 0.114673145
				},
				{
					"id": 4,
					"p_x": 0.530351758,
					"p_y": -0.280161917,
					"phi": -0.414667904,
					"v_x": -0.00895586144,
					"v_y": -2.1331336e-05,
					"omega": 0.0081384629
				}
			],
			"is_simulated": true,
			"has_vision_data": true,
			"vision_transmission_delay": 30000000,
			"world_source": pb.world.WorldSource.EXTERNAL_SIMULATION
		};
	},

	getGeometry(): pb.world.Geometry {
		return {
			"line_width": 0.01,
			"field_width": 6,
			"field_height": 9,
			"boundary_width": 0.3,
			"goal_width": 1,
			"goal_depth": 0.3,
			"goal_wall_width": 0.02,
			"center_circle_radius": 0.495,
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

	isBlue(): boolean { return false; },

	getGameState(): pb.amun.GameState {
		return {
			"stage": pb.SSL_Referee.Stage.NORMAL_FIRST_HALF,
			"stage_time_left": 230289487,
			"state": pb.amun.GameState.State.Game,
			"yellow": {
				"name": "ER-Force",
				"score": 1,
				"red_cards": 0,
				"yellow_card_times": [
					67013578
				],
				"yellow_cards": 1,
				"timeouts": 4,
				"timeout_time": 300000000,
				"goalie": 2,
				"foul_counter": 3,
				"ball_placement_failures": 0,
				"can_place_ball": true,
				"max_allowed_bots": 5,
				"bot_substitution_intent": false,
				"ball_placement_failures_reached": false
			},
			"blue": {
				"name": "RoboFEI",
				"score": 0,
				"red_cards": 0,
				"yellow_card_times": [
					77028782
				],
				"yellow_cards": 1,
				"timeouts": 3,
				"timeout_time": 257435094,
				"goalie": 0,
				"foul_counter": 3,
				"ball_placement_failures": 0,
				"can_place_ball": true,
				"max_allowed_bots": 5,
				"bot_substitution_intent": false,
				"ball_placement_failures_reached": false
			},
			"designated_position": {
				"x": -1424.29102,
				"y": -2800
			},
			"goals_flipped": true,
			"is_real_game_running": true,
			"current_action_time_remaining": 1222471
		};
	},

	getTeam(): pb.robot.Team {
		return { robot: [{
			"generation": 3,
			"year": 2014,
			"id": 0,
			"radius": 0.089,
			"height": 0.138,
			"mass": 1.5,
			"angle": 0.98291,
			"v_max": 3.5,
			"omega_max": 6,
			"shot_linear_max": 9.1,
			"shot_chip_max": 3.4,
			"dribbler_width": 0.07,
			"acceleration": {
				"a_speedup_f_max": 4.7,
				"a_speedup_s_max": 4.7,
				"a_speedup_phi_max": 50.8,
				"a_brake_f_max": 5.9,
				"a_brake_s_max": 5.9,
				"a_brake_phi_max": 51.6
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
			"generation": 3,
			"year": 2014,
			"id": 7,
			"radius": 0.089,
			"height": 0.138,
			"mass": 1.5,
			"angle": 0.98291,
			"v_max": 3.5,
			"omega_max": 6,
			"shot_linear_max": 8.8,
			"shot_chip_max": 4,
			"dribbler_width": 0.07,
			"acceleration": {
				"a_speedup_f_max": 4.7,
				"a_speedup_s_max": 4.7,
				"a_speedup_phi_max": 50.8,
				"a_brake_f_max": 5.9,
				"a_brake_s_max": 5.9,
				"a_brake_phi_max": 51.6
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
			"generation": 3,
			"year": 2014,
			"id": 6,
			"radius": 0.089,
			"height": 0.138,
			"mass": 1.5,
			"angle": 0.98291,
			"v_max": 3.5,
			"omega_max": 6,
			"shot_linear_max": 8.6,
			"shot_chip_max": 3.6,
			"dribbler_width": 0.07,
			"acceleration": {
				"a_speedup_f_max": 4.7,
				"a_speedup_s_max": 4.7,
				"a_speedup_phi_max": 50.8,
				"a_brake_f_max": 5.9,
				"a_brake_s_max": 5.9,
				"a_brake_phi_max": 51.6
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
			"generation": 3,
			"year": 2014,
			"id": 5,
			"radius": 0.089,
			"height": 0.138,
			"mass": 1.5,
			"angle": 0.98291,
			"v_max": 3.5,
			"omega_max": 6,
			"shot_linear_max": 8.5,
			"shot_chip_max": 3.5,
			"dribbler_width": 0.07,
			"acceleration": {
				"a_speedup_f_max": 4.7,
				"a_speedup_s_max": 4.7,
				"a_speedup_phi_max": 50.8,
				"a_brake_f_max": 5.9,
				"a_brake_s_max": 5.9,
				"a_brake_phi_max": 51.6
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
			"generation": 3,
			"year": 2014,
			"id": 4,
			"radius": 0.089,
			"height": 0.138,
			"mass": 1.5,
			"angle": 0.98291,
			"v_max": 3.5,
			"omega_max": 6,
			"shot_linear_max": 9.3,
			"shot_chip_max": 3.24,
			"dribbler_width": 0.07,
			"acceleration": {
				"a_speedup_f_max": 4.7,
				"a_speedup_s_max": 4.7,
				"a_speedup_phi_max": 50.8,
				"a_brake_f_max": 5.9,
				"a_brake_s_max": 5.9,
				"a_brake_phi_max": 51.6
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
			"generation": 3,
			"year": 2014,
			"id": 11,
			"radius": 0.089,
			"height": 0.138,
			"mass": 1.5,
			"angle": 0.98291,
			"v_max": 3.5,
			"omega_max": 6,
			"shot_linear_max": 9.5,
			"shot_chip_max": 3.8,
			"dribbler_width": 0.07,
			"acceleration": {
				"a_speedup_f_max": 4.7,
				"a_speedup_s_max": 4.7,
				"a_speedup_phi_max": 50.8,
				"a_brake_f_max": 5.9,
				"a_brake_s_max": 5.9,
				"a_brake_phi_max": 51.6
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
			"generation": 3,
			"year": 2014,
			"id": 10,
			"radius": 0.089,
			"height": 0.138,
			"mass": 1.5,
			"angle": 0.98291,
			"v_max": 3.5,
			"omega_max": 6,
			"shot_linear_max": 10,
			"shot_chip_max": 3.5,
			"dribbler_width": 0.07,
			"acceleration": {
				"a_speedup_f_max": 4.7,
				"a_speedup_s_max": 4.7,
				"a_speedup_phi_max": 50.8,
				"a_brake_f_max": 5.9,
				"a_brake_s_max": 5.9,
				"a_brake_phi_max": 51.6
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
			"generation": 3,
			"year": 2014,
			"id": 9,
			"radius": 0.089,
			"height": 0.138,
			"mass": 1.5,
			"angle": 0.98291,
			"v_max": 3.5,
			"omega_max": 6,
			"shot_linear_max": 8.6,
			"shot_chip_max": 3.1,
			"dribbler_width": 0.07,
			"acceleration": {
				"a_speedup_f_max": 4.7,
				"a_speedup_s_max": 4.7,
				"a_speedup_phi_max": 50.8,
				"a_brake_f_max": 5.9,
				"a_brake_s_max": 5.9,
				"a_brake_phi_max": 51.6
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
			"generation": 3,
			"year": 2014,
			"id": 8,
			"radius": 0.089,
			"height": 0.138,
			"mass": 1.5,
			"angle": 0.98291,
			"v_max": 3.5,
			"omega_max": 6,
			"shot_linear_max": 9.2,
			"shot_chip_max": 2.8,
			"dribbler_width": 0.07,
			"acceleration": {
				"a_speedup_f_max": 4.7,
				"a_speedup_s_max": 4.7,
				"a_speedup_phi_max": 50.8,
				"a_brake_f_max": 5.9,
				"a_brake_s_max": 5.9,
				"a_brake_phi_max": 51.6
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
			"generation": 3,
			"year": 2014,
			"id": 15,
			"radius": 0.089,
			"height": 0.138,
			"mass": 1.5,
			"angle": 0.98291,
			"v_max": 3.5,
			"omega_max": 6,
			"shot_linear_max": 6.5,
			"shot_chip_max": 3,
			"dribbler_width": 0.07,
			"acceleration": {
				"a_speedup_f_max": 4.7,
				"a_speedup_s_max": 4.7,
				"a_speedup_phi_max": 50.8,
				"a_brake_f_max": 5.9,
				"a_brake_s_max": 5.9,
				"a_brake_phi_max": 51.6
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
			"generation": 3,
			"year": 2014,
			"id": 14,
			"radius": 0.089,
			"height": 0.138,
			"mass": 1.5,
			"angle": 0.98291,
			"v_max": 3.5,
			"omega_max": 6,
			"shot_linear_max": 6.5,
			"shot_chip_max": 3,
			"dribbler_width": 0.07,
			"acceleration": {
				"a_speedup_f_max": 4.7,
				"a_speedup_s_max": 4.7,
				"a_speedup_phi_max": 50.8,
				"a_brake_f_max": 5.9,
				"a_brake_s_max": 5.9,
				"a_brake_phi_max": 51.6
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
			"generation": 3,
			"year": 2014,
			"id": 13,
			"radius": 0.089,
			"height": 0.138,
			"mass": 1.5,
			"angle": 0.98291,
			"v_max": 3.5,
			"omega_max": 6,
			"shot_linear_max": 6.5,
			"shot_chip_max": 3,
			"dribbler_width": 0.07,
			"acceleration": {
				"a_speedup_f_max": 4.7,
				"a_speedup_s_max": 4.7,
				"a_speedup_phi_max": 50.8,
				"a_brake_f_max": 5.9,
				"a_brake_s_max": 5.9,
				"a_brake_phi_max": 51.6
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
			"generation": 3,
			"year": 2014,
			"id": 12,
			"radius": 0.089,
			"height": 0.138,
			"mass": 1.5,
			"angle": 0.98291,
			"v_max": 3.5,
			"omega_max": 6,
			"shot_linear_max": 6.5,
			"shot_chip_max": 3,
			"dribbler_width": 0.07,
			"acceleration": {
				"a_speedup_f_max": 4.7,
				"a_speedup_s_max": 4.7,
				"a_speedup_phi_max": 50.8,
				"a_brake_f_max": 5.9,
				"a_brake_s_max": 5.9,
				"a_brake_phi_max": 51.6
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
			"generation": 3,
			"year": 2014,
			"id": 3,
			"radius": 0.089,
			"height": 0.138,
			"mass": 1.5,
			"angle": 0.98291,
			"v_max": 3.5,
			"omega_max": 6,
			"shot_linear_max": 6.5,
			"shot_chip_max": 4,
			"dribbler_width": 0.07,
			"acceleration": {
				"a_speedup_f_max": 4.7,
				"a_speedup_s_max": 4.7,
				"a_speedup_phi_max": 50.8,
				"a_brake_f_max": 5.9,
				"a_brake_s_max": 5.9,
				"a_brake_phi_max": 51.6
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
			"generation": 3,
			"year": 2014,
			"id": 2,
			"radius": 0.089,
			"height": 0.138,
			"mass": 1.5,
			"angle": 0.98291,
			"v_max": 3.5,
			"omega_max": 6,
			"shot_linear_max": 8.6,
			"shot_chip_max": 3.57,
			"dribbler_width": 0.07,
			"acceleration": {
				"a_speedup_f_max": 4.7,
				"a_speedup_s_max": 4.7,
				"a_speedup_phi_max": 50.8,
				"a_brake_f_max": 5.9,
				"a_brake_s_max": 5.9,
				"a_brake_phi_max": 51.6
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
			"generation": 3,
			"year": 2014,
			"id": 1,
			"radius": 0.089,
			"height": 0.138,
			"mass": 1.5,
			"angle": 0.98291,
			"v_max": 3.5,
			"omega_max": 6,
			"shot_linear_max": 8.7,
			"shot_chip_max": 3.4,
			"dribbler_width": 0.07,
			"acceleration": {
				"a_speedup_f_max": 4.7,
				"a_speedup_s_max": 4.7,
				"a_speedup_phi_max": 50.8,
				"a_brake_f_max": 5.9,
				"a_brake_s_max": 5.9,
				"a_brake_phi_max": 51.6
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
