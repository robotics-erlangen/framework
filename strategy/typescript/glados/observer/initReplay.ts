import * as Entrypoints from "base/entrypoints";
import {log} from "base/globals";

function init () {
	log("No function for debug chosen!");
}

Entrypoints.add("ObserverReplay", init);