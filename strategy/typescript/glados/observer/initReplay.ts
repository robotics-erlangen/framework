import { log } from "base/amun";
import * as Entrypoints from "base/entrypoints";

function init() {
	log("No function for debug chosen!");
	return true;
}

Entrypoints.add("ObserverReplay", init);
