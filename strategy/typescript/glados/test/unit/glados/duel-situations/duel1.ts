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
		return 		{
			"time": 1523094250444532000,
			"ball": {
				"p_x": 2.54738522,
				"p_y": -4.71358871,
				"v_x": 0.250472754,
				"v_y": -0.744362712,
				"p_z": 0,
				"v_z": 0,
				"is_bouncing": false
			},
			"yellow": [
				{
					"id": 0,
					"p_x": 2.68832374,
					"p_y": -2.87522578,
					"phi": 1.60754097,
					"v_x": 0.191443652,
					"v_y": -2.56461549,
					"omega": -0.856085598
				},
				{
					"id": 1,
					"p_x": 0.504802287,
					"p_y": -5.86710262,
					"phi": 0.435232311,
					"v_x": -0.129145861,
					"v_y": 0.285315603,
					"omega": 0.987324357
				},
				{
					"id": 2,
					"p_x": 0.483302325,
					"p_y": -4.62825108,
					"phi": 0.53085345,
					"v_x": 0.150168374,
					"v_y": 0.0101823807,
					"omega": -0.00494150445
				},
				{
					"id": 5,
					"p_x": 1.39238799,
					"p_y": -4.67056465,
					"phi": -0.0991943553,
					"v_x": -0.0530552641,
					"v_y": -1.7364862,
					"omega": 1.17293072
				},
				{
					"id": 6,
					"p_x": 2.33898306,
					"p_y": -5.07472658,
					"phi": 2.52763152,
					"v_x": 2.16964197,
					"v_y": 0.0920860171,
					"omega": 4.89923859
				},
				{
					"id": 7,
					"p_x": 1.30251324,
					"p_y": -4.74770212,
					"phi": 0.107718378,
					"v_x": 0.295036674,
					"v_y": -0.860048652,
					"omega": -0.977104068
				},
				{
					"id": 10,
					"p_x": 1.10914421,
					"p_y": -4.51663351,
					"phi": 0.311261564,
					"v_x": 0.968410492,
					"v_y": -0.727947414,
					"omega": -1.16301203
				},
				{
					"id": 11,
					"p_x": -0.640043378,
					"p_y": -3.04582405,
					"phi": -0.493641675,
					"v_x": -0.778345227,
					"v_y": 0.419937313,
					"omega": 0.10902103
				}
			],
			"blue": [
				{
					"id": 2,
					"p_x": 0.610720515,
					"p_y": 4.70343781,
					"phi": -1.47262609,
					"v_x": 0.0253045056,
					"v_y": 0.00495030871,
					"omega": -0.00739242649
				},
				{
					"id": 3,
					"p_x": 0.0196235105,
					"p_y": 4.58229446,
					"phi": -1.21762741,
					"v_x": 0.0111943334,
					"v_y": -0.00745327258,
					"omega": -0.0155235427
				},
				{
					"id": 4,
					"p_x": 0.943112,
					"p_y": -3.40960526,
					"phi": -0.470300019,
					"v_x": -0.134277284,
					"v_y": -1.13497901,
					"omega": 3.4033618
				},
				{
					"id": 5,
					"p_x": 0.217740536,
					"p_y": 5.10835457,
					"phi": -1.35025823,
					"v_x": 0.0635199472,
					"v_y": -0.0592675731,
					"omega": 0.00557945902
				},
				{
					"id": 6,
					"p_x": -0.6263358,
					"p_y": 3.19411588,
					"phi": -0.820353806,
					"v_x": -2.79633474,
					"v_y": 1.00880706,
					"omega": 0.376077414
				},
				{
					"id": 8,
					"p_x": 2.79158664,
					"p_y": -4.65301037,
					"phi": -2.68528485,
					"v_x": 0.0402362049,
					"v_y": -1.28704989,
					"omega": 2.69870305
				},
				{
					"id": 9,
					"p_x": 2.47410297,
					"p_y": -3.55694509,
					"phi": -1.89854324,
					"v_x": 0.0615617931,
					"v_y": -1.5096215,
					"omega": 1.10237134
				}
			],
			"is_simulated": false,
			"has_vision_data": true
		};
	},

	getGeometry(): pb.world.Geometry {
		return 		{
			"line_width": 0.01,
			"field_width": 9,
			"field_height": 12,
			"boundary_width": 0.25,
			"goal_width": 1.2,
			"goal_depth": 0.18,
			"goal_wall_width": 0.02,
			"center_circle_radius": 0.5,
			"defense_radius": 1.2,
			"defense_stretch": 2.4,
			"free_kick_from_defense_dist": 0.2,
			"penalty_spot_from_field_line_dist": 1.2,
			"penalty_line_from_spot_dist": 0.4,
			"goal_height": 0.155,
			"defense_width": 2.4,
			"defense_height": 1.2,
			"type": pb.world.Geometry.GeometryType.TYPE_2018
		};
	},

	isBlue(): boolean { return false; },

	getGameState(): pb.amun.GameState {
		return 		{
			"stage": pb.SSL_Referee.Stage.NORMAL_FIRST_HALF,
			"stage_time_left": 414902000,
			"state": pb.amun.GameState.State.Game,
			"yellow": {
				"name": "ER-Force",
				"score": 0,
				"red_cards": 0,
				"yellow_cards": 0,
				"timeouts": 4,
				"timeout_time": 300000000,
				"goalie": 1
			},
			"blue": {
				"name": "MRL",
				"score": 0,
				"red_cards": 0,
				"yellow_cards": 0,
				"timeouts": 4,
				"timeout_time": 300000000,
				"goalie": 5
			}
		};
	},

	getTeam(): pb.robot.Team {
		return { robot: [{
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
				"a_speedup_f_max": 7,
				"a_speedup_s_max": 6,
				"a_speedup_phi_max": 60,
				"a_brake_f_max": 7,
				"a_brake_s_max": 6,
				"a_brake_phi_max": 60
			},
			"ir_param": 6,
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
				"a_speedup_f_max": 7,
				"a_speedup_s_max": 6,
				"a_speedup_phi_max": 60,
				"a_brake_f_max": 7,
				"a_brake_s_max": 6,
				"a_brake_phi_max": 60
			},
			"ir_param": 12,
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
				"a_speedup_f_max": 7,
				"a_speedup_s_max": 6,
				"a_speedup_phi_max": 60,
				"a_brake_f_max": 7,
				"a_brake_s_max": 6,
				"a_brake_phi_max": 60
			},
			"ir_param": 10,
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
				"a_speedup_f_max": 7,
				"a_speedup_s_max": 6,
				"a_speedup_phi_max": 60,
				"a_brake_f_max": 7,
				"a_brake_s_max": 6,
				"a_brake_phi_max": 60
			},
			"ir_param": 7,
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
				"a_speedup_f_max": 7,
				"a_speedup_s_max": 6,
				"a_speedup_phi_max": 60,
				"a_brake_f_max": 7,
				"a_brake_s_max": 6,
				"a_brake_phi_max": 60
			},
			"ir_param": 11,
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
				"a_speedup_f_max": 7,
				"a_speedup_s_max": 6,
				"a_speedup_phi_max": 60,
				"a_brake_f_max": 7,
				"a_brake_s_max": 6,
				"a_brake_phi_max": 60
			},
			"ir_param": 20,
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
				"a_speedup_f_max": 7,
				"a_speedup_s_max": 6,
				"a_speedup_phi_max": 60,
				"a_brake_f_max": 7,
				"a_brake_s_max": 6,
				"a_brake_phi_max": 60
			},
			"ir_param": 20,
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
				"a_speedup_f_max": 7,
				"a_speedup_s_max": 6,
				"a_speedup_phi_max": 60,
				"a_brake_f_max": 7,
				"a_brake_s_max": 6,
				"a_brake_phi_max": 60
			},
			"ir_param": 15,
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
				"a_speedup_f_max": 7,
				"a_speedup_s_max": 6,
				"a_speedup_phi_max": 60,
				"a_brake_f_max": 7,
				"a_brake_s_max": 6,
				"a_brake_phi_max": 60
			},
			"ir_param": 20,
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
				"a_speedup_f_max": 7,
				"a_speedup_s_max": 6,
				"a_speedup_phi_max": 60,
				"a_brake_f_max": 7,
				"a_brake_s_max": 6,
				"a_brake_phi_max": 60
			},
			"ir_param": 6,
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
