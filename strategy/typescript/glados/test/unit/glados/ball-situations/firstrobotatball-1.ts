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
			"time": 1624472214781606000,
			"ball": {
				"p_x": 1.00918555,
				"p_y": -0.509227574,
				"v_x": -2.14268661,
				"v_y": 0.948884904,
				"p_z": 0,
				"v_z": 0,
				"is_bouncing": false
			},
			"yellow": [
				{
					"id": 0,
					"p_x": -1.15808785,
					"p_y": -3.48431253,
					"phi": 1.73088443,
					"v_x": 9.24321e-20,
					"v_y": -1.7630298e-18,
					"omega": -0.0799040794
				},
				{
					"id": 2,
					"p_x": 0.245380655,
					"p_y": -4.35233545,
					"phi": 1.50143838,
					"v_x": -0.0289136358,
					"v_y": 0.0107545825,
					"omega": 0.0503068194
				},
				{
					"id": 3,
					"p_x": 0.792141438,
					"p_y": -3.32891607,
					"phi": 1.67111218,
					"v_x": -0.609734118,
					"v_y": -0.00433856668,
					"omega": 0.477873176
				},
				{
					"id": 4,
					"p_x": 0.317851514,
					"p_y": -3.33314061,
					"phi": 1.52890885,
					"v_x": 0.526768148,
					"v_y": 0.0188067053,
					"omega": 1.07726991
				},
				{
					"id": 5,
					"p_x": 1.24079978,
					"p_y": -1.08125329,
					"phi": 2.36130619,
					"v_x": -2.04232311,
					"v_y": 0.684325218,
					"omega": 1.09749985
				}
			],
			"blue": [
				{
					"id": 0,
					"p_x": 0.121775202,
					"p_y": 4.13746357,
					"phi": -1.34415615,
					"v_x": -0.137638763,
					"v_y": 0.00103924121,
					"omega": -0.407410383
				},
				{
					"id": 1,
					"p_x": 2.46632481,
					"p_y": -0.756654382,
					"phi": 2.98296142,
					"v_x": -0.711960733,
					"v_y": 1.31270325,
					"omega": 0.836131215
				},
				{
					"id": 2,
					"p_x": -2.1002574,
					"p_y": -2.36695337,
					"phi": 0.301270396,
					"v_x": 1.47261548,
					"v_y": -0.0807864442,
					"omega": 0.388764471
				},
				{
					"id": 3,
					"p_x": -0.521819949,
					"p_y": -0.918913186,
					"phi": 0.243188769,
					"v_x": 0.304560453,
					"v_y": 1.47329485,
					"omega": 0.0985160694
				},
				{
					"id": 4,
					"p_x": 0.528885126,
					"p_y": -0.288849205,
					"phi": -0.393851101,
					"v_x": -0.0744734406,
					"v_y": -0.159026369,
					"omega": 0.582483113
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
			"stage_time_left": 230495497,
			"state": pb.amun.GameState.State.Game,
			"yellow": {
				"name": "ER-Force",
				"score": 1,
				"red_cards": 0,
				"yellow_card_times": [
					67219588
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
					77234792
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
			"current_action_time_remaining": 1428481
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
