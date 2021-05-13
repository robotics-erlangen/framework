import * as Entrypoints from "base/entrypoints";

import { Move } from "glados/group/move/base";
import { DribbleChallenge } from "glados/group/move/hardwarechallenges/dribblechallenge";
import { createEntrypoint } from "glados/test/move/index";

let challenges: (typeof Move)[] = [
	DribbleChallenge
];

for (let challenge of challenges) {
	let name = challenge.NAME === "" ? challenge.name : challenge.NAME;
	Entrypoints.add("HardwareChallenge/"  + name, createEntrypoint(challenge));
}
