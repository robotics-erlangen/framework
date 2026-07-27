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
			"time": 1621082801451867306,
			"ball": {
				"p_x": -3.15635538,
				"p_y": 1.29651475,
				"v_x": -1.68126547,
				"v_y": 1.37559152,
				"p_z": 0,
				"v_z": 0,
				"is_bouncing": false
			},
			"yellow": [
				{
					"id": 5,
					"p_x": -1.36586738,
					"p_y": 3.71584654,
					"phi": -2.20866776,
					"v_x": 0.36308071,
					"v_y": 0.100123882,
					"omega": -0.798810959
				},
				{
					"id": 6,
					"p_x": -0.240481421,
					"p_y": -3.73431563,
					"phi": 2.61378717,
					"v_x": 0.294415563,
					"v_y": 0.796766698,
					"omega": -0.153191045
				},
				{
					"id": 7,
					"p_x": -1.0702126,
					"p_y": -3.72988367,
					"phi": 1.94320214,
					"v_x": -0.487069666,
					"v_y": 0.391457409,
					"omega": -0.0084823193
				},
				{
					"id": 8,
					"p_x": 1.44640601,
					"p_y": -4.0506258,
					"phi": 1.60888278,
					"v_x": -0.890673339,
					"v_y": 0.00112006767,
					"omega": 0.0539026037
				},
				{
					"id": 9,
					"p_x": 0.252198309,
					"p_y": -2.86612082,
					"phi": 2.24652696,
					"v_x": 0.144118622,
					"v_y": 0.549800336,
					"omega": 0.0869920254
				},
				{
					"id": 10,
					"p_x": 0.346988797,
					"p_y": -5.87103844,
					"phi": 2.01966333,
					"v_x": -0.330748945,
					"v_y": -0.00344743929,
					"omega": 0.121896394
				},
				{
					"id": 11,
					"p_x": -1.24577618,
					"p_y": -3.45277476,
					"phi": 2.6946547,
					"v_x": 1.4156574,
					"v_y": 1.47145104,
					"omega": 0.332987666
				},
				{
					"id": 12,
					"p_x": 2.96673107,
					"p_y": 2.37375522,
					"phi": -2.96740437,
					"v_x": -1.02852571,
					"v_y": 2.54475379,
					"omega": 0.0876336396
				},
				{
					"id": 13,
					"p_x": -3.91254807,
					"p_y": 1.97871959,
					"phi": -0.630380869,
					"v_x": -0.508828342,
					"v_y": 0.711805701,
					"omega": 0.416189522
				},
				{
					"id": 14,
					"p_x": 1.78683305,
					"p_y": 0.325559318,
					"phi": 2.82208562,
					"v_x": 0.530608416,
					"v_y": 1.45978773,
					"omega": 0.37043184
				},
				{
					"id": 15,
					"p_x": -0.819039345,
					"p_y": -4.04730082,
					"phi": 1.49914646,
					"v_x": -0.343580663,
					"v_y": 0.0224393029,
					"omega": 0.0766467154
				}
			],
			"blue": [
				{
					"id": 0,
					"p_x": -0.651577175,
					"p_y": 5.8730278,
					"phi": -2.05281639,
					"v_x": -0.376104206,
					"v_y": -0.00590849621,
					"omega": -0.400836587
				},
				{
					"id": 1,
					"p_x": -1.57064831,
					"p_y": 0.573614538,
					"phi": 2.72055912,
					"v_x": 1.44912672,
					"v_y": 2.28746176,
					"omega": 1.23684609
				},
				{
					"id": 2,
					"p_x": -1.39672971,
					"p_y": -2.97871971,
					"phi": 1.96265316,
					"v_x": 0.201629966,
					"v_y": 0.106944613,
					"omega": 0.269528538
				},
				{
					"id": 3,
					"p_x": -0.456345826,
					"p_y": 3.26915741,
					"phi": -2.99790096,
					"v_x": 1.49928737,
					"v_y": -0.0382885188,
					"omega": 0.294548392
				},
				{
					"id": 4,
					"p_x": 0.891935527,
					"p_y": -0.696796179,
					"phi": 2.68097925,
					"v_x": -0.300353885,
					"v_y": 1.84318018,
					"omega": 0.25466302
				},
				{
					"id": 5,
					"p_x": 3.63286328,
					"p_y": -0.918568432,
					"phi": -2.9663372,
					"v_x": -0.657833397,
					"v_y": 3.16806984,
					"omega": 0.181674913
				},
				{
					"id": 6,
					"p_x": -1.11637485,
					"p_y": 4.05168581,
					"phi": -2.20839119,
					"v_x": -0.952509403,
					"v_y": 0.00504424237,
					"omega": -0.47482273
				},
				{
					"id": 7,
					"p_x": 0.670659661,
					"p_y": 2.81321383,
					"phi": -2.09079456,
					"v_x": 0.080849655,
					"v_y": 2.73593497,
					"omega": 0.565669596
				},
				{
					"id": 8,
					"p_x": -3.23527384,
					"p_y": 1.29455733,
					"phi": -0.051152043,
					"v_x": -1.89389193e-05,
					"v_y": -0.00027635874,
					"omega": 0.591533542
				},
				{
					"id": 9,
					"p_x": 1.67508936,
					"p_y": 4.04457378,
					"phi": -1.56622267,
					"v_x": 0.639511049,
					"v_y": 0.0245810729,
					"omega": 0.175377175
				},
				{
					"id": 10,
					"p_x": -1.92956662,
					"p_y": 4.11985207,
					"phi": -1.89320457,
					"v_x": -0.218921378,
					"v_y": -0.0209063422,
					"omega": -1.58018923
				}
			],
			"is_simulated": true,
			"has_vision_data": true,
			"vision_transmission_delay": 30000000
		};
	},

	getGeometry(): pb.world.Geometry {
		return {
			"line_width": 0.01,
			"field_width": 9.02,
			"field_height": 12.04,
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

	isBlue(): boolean { return true; },

	getGameState(): pb.amun.GameState {
		return {
			"stage": pb.SSL_Referee.Stage.NORMAL_FIRST_HALF,
			"stage_time_left": 46531596,
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
				"foul_counter": 1,
				"ball_placement_failures": 0,
				"can_place_ball": true,
				"max_allowed_bots": 11,
				"bot_substitution_intent": false,
				"ball_placement_failures_reached": false
			},
			"designated_position": {
				"x": -2796.06836,
				"y": 4310
			},
			"goals_flipped": false,
			"is_real_game_running": false,
			"current_action_time_remaining": -61518466
		};
	},

	getTeam(): pb.robot.Team {
		return { robot: [{
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
			"id": 6,
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
		{
			"generation": 4,
			"year": 2020,
			"id": 9,
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
			"id": 10,
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
		] };
	},
};
