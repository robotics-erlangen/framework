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

import * as Entrypoints from "base/entrypoints";

import { Move } from "glados/group/move/base";
import { DribbleChallenge } from "glados/group/move/hardwarechallenges/dribblechallenge";
import { createEntrypoint } from "glados/test/move/index";

let challenges: (typeof Move)[] = [
	DribbleChallenge
];

for (let challenge of challenges) {
	let name = challenge.NAME === "" ? challenge.name : challenge.NAME;
	Entrypoints.add(`HardwareChallenge/${name}`, createEntrypoint(challenge));
}
