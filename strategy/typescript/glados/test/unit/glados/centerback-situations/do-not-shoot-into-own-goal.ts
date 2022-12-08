/* eslint-disable @typescript-eslint/indent */
import * as pb from "base/protobuf";

export const partialAmun: any = {
getWorldState(): pb.world.State {
return {
	"time": 1576087922488691000,
	"ball": {
		"p_x": -0.110049933,
		"p_y": -4.69642162,
		"v_x": -1.52036405,
		"v_y": -0.145142183,
		"p_z": 0,
		"v_z": 0,
		"is_bouncing": false
	},
	"yellow": [
		{
			"id": 8,
			"p_x": -0.21309948,
			"p_y": -4.6217432,
			"phi": -0.751737595,
			"v_x": 0.955581188,
			"v_y": -0.0878298879,
			"omega": -7.36824083
		},
		{
			"id": 9,
			"p_x": 2.12684941,
			"p_y": -2.65028715,
			"phi": 1.70211792,
			"v_x": -0.483923525,
			"v_y": -2.17258143,
			"omega": -0.178748846
		},
		{
			"id": 10,
			"p_x": -0.23801218,
			"p_y": -5.84555,
			"phi": 1.38395441,
			"v_x": -1.27098584,
			"v_y": -0.0252020657,
			"omega": -2.6882515
		},
		{
			"id": 11,
			"p_x": 1.32095587,
			"p_y": -4.74533939,
			"phi": 1.68680274,
			"v_x": -0.479150027,
			"v_y": 0.535975814,
			"omega": -0.119144812
		},
		{
			"id": 12,
			"p_x": 0.730633318,
			"p_y": -4.46007347,
			"phi": 1.91848671,
			"v_x": -1.98143637,
			"v_y": 0.0967928097,
			"omega": 3.9484036
		},
		{
			"id": 13,
			"p_x": 0.20161204,
			"p_y": -4.67251062,
			"phi": 2.07324886,
			"v_x": -0.219404697,
			"v_y": 0.06681256,
			"omega": 0.634717464
		},
		{
			"id": 14,
			"p_x": 1.4663372,
			"p_y": -4.96682787,
			"phi": 1.31098509,
			"v_x": 0.210760564,
			"v_y": 0.508967936,
			"omega": 0.165309936
		},
		{
			"id": 15,
			"p_x": -1.23974669,
			"p_y": -1.74334669,
			"phi": 1.15568209,
			"v_x": 0.0372823477,
			"v_y": -1.84624135,
			"omega": 0.106900424
		}
	],
	"blue": [
		{
			"id": 0,
			"p_x": -0.129608452,
			"p_y": 5.85255527,
			"phi": -1.52761137,
			"v_x": 0.271664709,
			"v_y": 0.00454478944,
			"omega": 0.0667975321
		},
		{
			"id": 1,
			"p_x": 0.916442096,
			"p_y": -3.0329,
			"phi": -2.07426143,
			"v_x": -1.20367324,
			"v_y": 1.46878922,
			"omega": 0.990943968
		},
		{
			"id": 2,
			"p_x": 0.940712094,
			"p_y": -1.45886147,
			"phi": -1.10205376,
			"v_x": -1.18415093,
			"v_y": 1.42584646,
			"omega": 0.311206758
		},
		{
			"id": 3,
			"p_x": 0.67695421,
			"p_y": -2.53801179,
			"phi": -1.71880543,
			"v_x": -0.76653558,
			"v_y": 1.16559255,
			"omega": -1.15765488
		},
		{
			"id": 4,
			"p_x": 0.269993812,
			"p_y": -4.10663939,
			"phi": 2.64688,
			"v_x": -0.259567797,
			"v_y": -0.0649748743,
			"omega": 7.0698266
		},
		{
			"id": 5,
			"p_x": -2.33907413,
			"p_y": -3.86585045,
			"phi": -0.29661122,
			"v_x": -1.7903167,
			"v_y": 0.387006104,
			"omega": 0.131874755
		},
		{
			"id": 6,
			"p_x": 0.0254316479,
			"p_y": 4.63000059,
			"phi": -1.57349718,
			"v_x": 0.0814639,
			"v_y": -5.63726644e-06,
			"omega": -0.00791353732
		},
		{
			"id": 7,
			"p_x": 2.84639025,
			"p_y": -3.14555883,
			"phi": -2.60939026,
			"v_x": -0.141190529,
			"v_y": 0.822715819,
			"omega": 0.343168348
		}
	],
	"is_simulated": true,
	"has_vision_data": true
};
},

getGeometry(): pb.world.Geometry {
return {
	"line_width": 0.01,
	"field_width": 9,
	"field_height": 12,
	"boundary_width": 0.3,
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
return {
	"stage": pb.SSL_Referee.Stage.NORMAL_FIRST_HALF,
	"stage_time_left": 0,
	"state": pb.amun.GameState.State.Game,
	"yellow": {
		"name": "",
		"score": 0,
		"red_cards": 0,
		"yellow_cards": 0,
		"timeouts": 4,
		"timeout_time": 300000000,
		"goalie": 10
	},
	"blue": {
		"name": "",
		"score": 0,
		"red_cards": 0,
		"yellow_cards": 0,
		"timeouts": 4,
		"timeout_time": 300000000,
		"goalie": 0
	},
	"goals_flipped": false
};
},

getTeam(): pb.robot.Team {
return { robot: [{
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
	"pattern_rotation": -6.5
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
	"pattern_rotation": -6.5
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
	"pattern_rotation": -6.5
},
]};
},
};
