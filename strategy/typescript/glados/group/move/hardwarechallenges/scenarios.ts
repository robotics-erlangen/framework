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

export let challenge1 = [
	// scenario 1
	{
		ball: { pos: [-200, -1800, 0] },
		bots: [
			{
				obj: { pos: [-2900, 0, -0.785398] },
				id: { number: 0, color: "YELLOW" },
			},
			{ obj: { pos: [-2000, -750, 0] }, id: { number: 1, color: "YELLOW" } },
			{ obj: { pos: [-2000, -550, 0] }, id: { number: 2, color: "YELLOW" } },
		],
	},

	// scenario 2
	{
		ball: { pos: [-1000, 0, 0] },
		bots: [
			{
				obj: { pos: [-2900, 175, 0.785398] },
				id: { number: 0, color: "YELLOW" },
			},
			{ obj: { pos: [-2000, -175, 0] }, id: { number: 1, color: "YELLOW" } },
			{ obj: { pos: [-1500, 0, 0] }, id: { number: 2, color: "YELLOW" } },
		],
	},

	// scenario 3
	{
		ball: { pos: [-200, 0, 0] },
		bots: [
			{ obj: { pos: [-2900, 0, 0] }, id: { number: 0, color: "YELLOW" } },
			{ obj: { pos: [-2000, 500, 0] }, id: { number: 1, color: "YELLOW" } },
			{ obj: { pos: [-2000, -500, 0] }, id: { number: 2, color: "YELLOW" } },
			{ obj: { pos: [-1000, 0, 0] }, id: { number: 3, color: "YELLOW" } },
		],
	},

	// scenario 4
	{
		ball: { pos: [-1400, 0, 0] },
		bots: [
			{ obj: { pos: [-2900, 0, 0] }, id: { number: 0, color: "YELLOW" } },
			{ obj: { pos: [-1950, 500, 0] }, id: { number: 1, color: "YELLOW" } },
			{ obj: { pos: [-1950, 0, 0] }, id: { number: 2, color: "YELLOW" } },
			{ obj: { pos: [-1950, -500, 0] }, id: { number: 3, color: "YELLOW" } },
		],
	},

	// scenario 5
	{
		ball: { pos: [-2850, 1750, 0] },
		bots: [
			{
				obj: { pos: [-2900, -200, -0.785398] },
				id: { number: 0, color: "YELLOW" },
			},
			{
				obj: { pos: [-2850, 1100, 1.5708] },
				id: { number: 1, color: "YELLOW" },
			},
			{ obj: { pos: [-2000, 500, 0] }, id: { number: 2, color: "YELLOW" } },
			{ obj: { pos: [-2000, 0, 0] }, id: { number: 3, color: "YELLOW" } },
			{ obj: { pos: [-1450, 1750, 3.14] }, id: { number: 4, color: "YELLOW" } },
		],
	},

	// scenario 6
	{
		ball: { pos: [-950, -1550, 0] },
		bots: [
			{ obj: { pos: [-2900, 0, 0] }, id: { number: 0, color: "YELLOW" } },
			{
				obj: { pos: [-2000, 950, 0.785398] },
				id: { number: 1, color: "YELLOW" },
			},
			{
				obj: { pos: [-2400, 1250, 0.785398] },
				id: { number: 2, color: "YELLOW" },
			},
			{
				obj: { pos: [-2000, 360, -0.785398] },
				id: { number: 3, color: "YELLOW" },
			},
			{ obj: { pos: [-1450, -1210, 0] }, id: { number: 4, color: "YELLOW" } },
		],
	},

	// scenario 7
	{
		ball: { pos: [-2800, -1800, 0] },
		bots: [
			{
				obj: { pos: [-2910, -300, -1.571] },
				id: { number: 0, color: "YELLOW" },
			},
			{
				obj: { pos: [-2600, 1200, 1.571] },
				id: { number: 1, color: "YELLOW" },
			},
			{ obj: { pos: [-1700, -350, 0] }, id: { number: 2, color: "YELLOW" } },
			{
				obj: { pos: [-2300, -1300, -2.356] },
				id: { number: 3, color: "YELLOW" },
			},
			{ obj: { pos: [-2000, 300, 0] }, id: { number: 4, color: "YELLOW" } },
		],
	},

	// scenario 8
	{
		ball: { pos: [-200, 1800, 0] },
		bots: [
			{ obj: { pos: [-2900, 100, 0] }, id: { number: 0, color: "YELLOW" } },
			{
				obj: { pos: [-2250, 1200, 0.785] },
				id: { number: 1, color: "YELLOW" },
			},
			{ obj: { pos: [-2050, 800, 0] }, id: { number: 2, color: "YELLOW" } },
			{ obj: { pos: [-2050, 400, 0] }, id: { number: 3, color: "YELLOW" } },
			{ obj: { pos: [-2050, -400, 0] }, id: { number: 4, color: "YELLOW" } },
			{ obj: { pos: [-2050, -800, 0] }, id: { number: 5, color: "YELLOW" } },
		],
	},

	// scenario 9
	{
		ball: { pos: [-2800, -1750, 0] },
		bots: [
			{
				obj: { pos: [-2910, -300, -1.571] },
				id: { number: 0, color: "YELLOW" },
			},
			{ obj: { pos: [-2050, 1050, 0] }, id: { number: 1, color: "YELLOW" } },
			{
				obj: { pos: [-800, 1000, -0.785] },
				id: { number: 2, color: "YELLOW" },
			},
			{ obj: { pos: [-1350, 350, 0] }, id: { number: 3, color: "YELLOW" } },
			{ obj: { pos: [-1550, -600, 0] }, id: { number: 4, color: "YELLOW" } },
			{
				obj: { pos: [-2200, -1200, 0.785] },
				id: { number: 5, color: "YELLOW" },
			},
		],
	},

	// scenario 10
	{
		ball: { pos: [-1300, 650, 0] },
		bots: [
			{ obj: { pos: [-2900, -150, 0] }, id: { number: 0, color: "YELLOW" } },
			{
				obj: { pos: [-2400, 1250, 0.785] },
				id: { number: 1, color: "YELLOW" },
			},
			{ obj: { pos: [-2000, 450, 0] }, id: { number: 2, color: "YELLOW" } },
			{ obj: { pos: [-1300, 0, 1.571] }, id: { number: 3, color: "YELLOW" } },
			{
				obj: { pos: [-1850, -300, -0.785] },
				id: { number: 4, color: "YELLOW" },
			},
			{ obj: { pos: [-2000, -900, 0] }, id: { number: 5, color: "YELLOW" } },
		],
	},
];

export let challenge3 = {
	ball: { pos: [-1500, -1500, 0.0] },
	bots: [
		{ obj: { pos: [-1500, 1500, 0] }, id: { number: 0, color: "YELLOW" } },
		{ obj: { pos: [-1500, 900, 0] }, id: { number: 1, color: "YELLOW" } },
		{ obj: { pos: [-1500, 400, 0] }, id: { number: 2, color: "YELLOW" } },
		{ obj: { pos: [-1500, -200, 0] }, id: { number: 3, color: "YELLOW" } },
		{ obj: { pos: [-1500, -1000, 0] }, id: { number: 4, color: "YELLOW" } },
		{ obj: { pos: [-1500, -1900, 1.57] }, id: { number: 0, color: "BLUE" } },
	],
};

export let challenge4 = {
	ball: { pos: [0, 0, 0.0] },
	bots: [
		{ obj: { pos: [0, -1500, 0] }, id: { number: 0, color: "BLUE" } },
		{ obj: { pos: [0, -1000, 0] }, id: { number: 1, color: "BLUE" } },
		{ obj: { pos: [0, -500, 0] }, id: { number: 2, color: "BLUE" } },
		{ obj: { pos: [0, 500, 0] }, id: { number: 3, color: "BLUE" } },
		{ obj: { pos: [0, 1000, 0] }, id: { number: 4, color: "BLUE" } },
		{ obj: { pos: [0, 1500, 0] }, id: { number: 5, color: "BLUE" } },
	],
};
