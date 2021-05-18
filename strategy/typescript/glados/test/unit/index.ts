import { fullAmun, log } from "base/amun";
import * as Entrypoints from "base/entrypoints";
import { getOriginalPath } from "base/path";
import { pcall } from "base/trycatch";

import "glados/test/unit/tests";
import { UnitTest } from "glados/test/unit/unittest";

const safeAmunFunctions : {[name: string]: boolean} = {
	"getWorldState": true, "getGeometry": true, "getTeam": true, "isBlue": true,
	"getGameState": true, "getUserInput": true, "getStrategyPath": true,
	"getSelectedOptions": true, "getPerformanceMode": true, "isReplay": true,
	"isDebug": true, "isPerformanceMode": true, "strategyPath": true, "getCurrentTime": true, "tryCatch": true,
	"luaRandom": true, "luaRandomSetSeed": true
};

let safeAmun: {[name: string]: any} = {};

function noOp() {}
safeAmun = {};
for (let name in fullAmun) {
	if (safeAmunFunctions[name]) {
		safeAmun[name] = (fullAmun as any)[name];
	} else {
		safeAmun[name] = noOp;
	}
}

let safePathCopy = Object.freeze({...getOriginalPath()});

declare let path: any;

let fakeAmunModule = {
	log: fullAmun.log,
	_hideFunctions: noOp
};

const testPrefix = "glados/test/unit/";
const tests: {[name: string]: string} = {
	"BaseBall": testPrefix + "base/ball",
	"BaseCache": testPrefix + "base/cache",
	"BaseCoordinates": testPrefix + "base/coordinates",
	"BaseDebug": testPrefix + "base/debug",
	"BaseEntrypoints": testPrefix + "base/entrypoints",
	"BaseField": testPrefix + "base/field",
	"BaseGeom": testPrefix + "base/geom",
	"BaseMathUtil": testPrefix + "base/mathutil",
	"BaseListUtil": testPrefix + "base/listutil",
	"BaseProcessor": testPrefix + "base/processor",
	"BaseTryCatch": testPrefix + "base/trycatch",
	"BaseVector": testPrefix + "base/vector",
	"GladosMessaging": testPrefix + "glados/messaging",
	"GladosMoveshelper": testPrefix + "glados/moveshelper",
	"GladosPools": testPrefix + "glados/pools",
	"GladosUnitTest": testPrefix + "glados/unittest",
	"GladosPhysics": testPrefix + "glados/physics",
	"GladosRoles": testPrefix + "glados/roles",
	"GladosZone": testPrefix + "glados/zone",
	"GladosBehavior": testPrefix + "glados/behavior",
	"GladosObserverBall": testPrefix + "glados/ball",
};

function runTests(moduleNames: string[]) {
	if (!amun.isDebug) {
		throw new Error("Debugging not enabled!");
	}

	let failedCounter = 0;
	for (let module of moduleNames) {
		const amunBefore = amun;
		const pathBefore = path;
		amun = <any> safeAmun;
		path = safePathCopy;
		amun.luaRandomSetSeed(4711);
		if (pcall(() => {
			let test: typeof UnitTest = require(module, true, {"base/amun": fakeAmunModule}).testClass;
			let overlays = test.getOverlays();
			if (Object.keys(overlays).length > 0) {
				// if overlays are used, the environment has to be loaded again
				test = require(module, true, {"base/amun": fakeAmunModule, ...overlays}).testClass;
			}
			let testInstance = new test();
			failedCounter += testInstance.runTests(log, module, fakeAmunModule, safePathCopy, safeAmun);

			})) {
			failedCounter++;
		}

		amun = amunBefore;
		path = pathBefore;
	}
	if (failedCounter > 0) {
		log(`<font color=\"red\">${failedCounter} failing testcases!</font>`);
	} else {
		log("<font color=\"green\">All testcases successfull :)</font>");
	}

	// throw at the end so that the tests are not repeated infinitely
	// throw a string instead of an error to avoid a (useless) stacktrace.
	// tslint:disable-next-line:no-string-throw
	throw `os.exit(${failedCounter})`;

}

Entrypoints.add("Unit Tests/ all", function() {
	runTests(Object.values(tests));
	return false;
});

for (let [name, test] of Object.entries(tests)) {
	Entrypoints.add("Unit Tests/" + name, function() {
		runTests([test]);
		return false;
	});
}
