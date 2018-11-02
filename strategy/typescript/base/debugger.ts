import * as debug from "base/debug";
import { log } from "base/globals";
const connectDebugger = amun.connectDebugger;
const debuggerSend = amun.debuggerSend;

declare let ___globalpleasedontuseinregularcode: any;

// this debugger currently only supports dumping the stack on exceptions

interface ScriptInfo {
	scriptId: number;
	url: string;
	startLine: number;
	startColumn: number;
	endLine: number;
	endColumn: number;
}

type ScriptId = string;

interface CallFrameId {
	scriptId: ScriptId;
	lineNumber: number;
	columnNumber?: number;
}

interface Location {
	lineNumber: number;
	columnNumber: number;
}

type UnserializableValue = string;

type RemoteObjectId = string;

interface RemoteObject {
	type: string;
	subtype?: string;
	className?: string;
	value?: any;
	unserializableValue?: UnserializableValue;
	description?: string;
	objectId?: RemoteObjectId;
}

interface Scope {
	type: string;
	object: RemoteObject;
	name?: string;
	startLocation: Location;
	endLocation: Location;
}

interface CallFrame {
	callFrameId: CallFrameId;
	functionName: string;
	functionLocation?: Location;
	location: Location;
	url: string;
	scopeChain: Scope[];
	this: RemoteObject;
	returnValue?: RemoteObject;
}

interface DebuggerPaused {
	callFrames: CallFrame[];
	reason: string;
	data?: any;
}

interface RuntimeGetPropertiesRequest {
	objectId: RemoteObjectId;
	ownProperties?: boolean;
	accessorPropertiesOnly?: boolean;
	generatePreview?: boolean;
}

interface InternalPropertyDescriptor {
	name: string;
	value?: RemoteObject;
}

type ExecutionContextId = number;
type UniqueDebuggerId = string;

interface StackTraceId {
	id: string;
	debuggerId?: UniqueDebuggerId;
}

interface StackTrace {
	description?: string;
	callFrames: CallFrame[];
	parent?: StackTrace;
	parentId?: StackTraceId;
}

interface ExceptionDetails {
	exceptionId: number;
	text: string;
	lineNumber: number;
	columnNumber: number;
	scriptId?: ScriptId;
	url?: string;
	stackTrace?: StackTrace;
	exception?: RemoteObject;
	executionContextId?: ExecutionContextId;
}

interface PropertyDescriptor {
	name: string;
	value?: RemoteObject;
	writable?: boolean;
	get?: RemoteObject;
	set?: RemoteObject;
	configurable: boolean;
	enumerable: boolean;
	wasThrown?: boolean;
	isOwn?: boolean;
	symbol?: RemoteObject;
}

interface RuntimeGetPropertiesResponse {
	result: PropertyDescriptor[];
	internalProperties?: InternalPropertyDescriptor[];
	exceptionDetails?: ExceptionDetails;
}

interface DebuggerEvaluateOnCallFrame {
	callFrameId: CallFrameId;
	expression: string;
	objectGroup?: string;
	includeCommandLineAPI?: boolean;
	silent?: boolean;
	returnByValue?: boolean;
	generatePreview?: boolean;
	throwOnSideEffect?: boolean;
}


let messageCounter = 0;
function sendMessage(method: string, params?: any) {
	messageCounter++;
	let sendObject: any = {
		id: messageCounter,
		method: method
	};
	if (params) {
		sendObject.params = params;
	}
	const asString = JSON.stringify(sendObject);
	debuggerSend(asString);
}

// internal data structures
interface ResponseInfo {
	baseDebugString: string;
	callFrame: CallFrameId;
}

let getPropertiesResponseMap: Map<number, ResponseInfo> = new Map<number, ResponseInfo>();


let toSend: string[];
let scriptInfos: ScriptInfo[] = [];
function handleNotification(notification: string) {
	let notificationObject = JSON.parse(notification);
	if (!notificationObject.method) {
		log("Invalid notification from debugger: " + notification);
		return;
	}
	switch (notificationObject.method) {
	case "Debugger.scriptParsed":
		scriptInfos.push(notificationObject.params);
		break;
	case "Debugger.paused":
		getPropertiesResponseMap.clear();
		___globalpleasedontuseinregularcode.debugSet = debug.set;
		___globalpleasedontuseinregularcode.debugExtraParams = debug.getInitialExtraParams();

		let pausedInfo: DebuggerPaused = notificationObject.params;
		debug.pushtop("Stack trace");
		debug.set("Globals", undefined);
		let level = 0;
		let globalDumped = false;
		for (let callFrame of pausedInfo.callFrames) {
			const fileSplit = callFrame.url.split("/");
			let shortFile = fileSplit[fileSplit.length - 1];
			shortFile = shortFile.replace(".js", "");
			let functionName = `${level}: ${shortFile}::`;
			if (callFrame.functionName.length === 0) {
				functionName += "<anonymous>";
			} else {
				functionName += callFrame.functionName;
			}
			if (callFrame.this.objectId) {
				const evaluate: DebuggerEvaluateOnCallFrame = {
					callFrameId: callFrame.callFrameId,
					expression: `amun.debugSet("${functionName}/this", this);`,
					throwOnSideEffect: false
				};
				sendMessage("Debugger.evaluateOnCallFrame", evaluate);
			}
			for (let scope of callFrame.scopeChain) {
				let typeName = `${functionName}/${scope.type}/`;
				if (scope.type === "global") {
					if (globalDumped) {
						continue;
					}
					typeName = "Globals/";
				}
				if (scope.object.objectId) {
					getPropertiesResponseMap[messageCounter + 1] = {
						baseDebugString: typeName,
						callFrame: callFrame.callFrameId
					};
					let getProperties: RuntimeGetPropertiesRequest = {
						objectId: scope.object.objectId,
						generatePreview: true,
						ownProperties: true
					};
					sendMessage("Runtime.getProperties", getProperties);
					getProperties.ownProperties = false;
					getProperties.accessorPropertiesOnly = true;
					getPropertiesResponseMap[messageCounter + 1] = {
						baseDebugString: typeName,
						callFrame: callFrame.callFrameId
					};
					sendMessage("Runtime.getProperties", getProperties);
				}
			}
			level++;
		}
		sendMessage("Debugger.resume");
		break;
	}
}

function handleResponse(response: string) {
	const reponseObject: any = JSON.parse(response);
	if (!reponseObject) {
		log("Invalid response from debugger: " + response);
		return;
	}
	if (getPropertiesResponseMap.has(reponseObject.id)) {
		const propertyResponse: RuntimeGetPropertiesResponse = reponseObject.result;
		let responseInfo = getPropertiesResponseMap[reponseObject.id]!;
		for (let property of propertyResponse.result) {
			if (property.name === "___globalpleasedontuseinregularcode") {
				continue;
			}
			let evaluate: DebuggerEvaluateOnCallFrame = {
				callFrameId: responseInfo.callFrame,
				expression: `___globalpleasedontuseinregularcode.debugSet("${responseInfo.baseDebugString}/${property.name}",
					${property.name}, ___globalpleasedontuseinregularcode.debugExtraParams[0], ___globalpleasedontuseinregularcode.debugExtraParams[1]);`,
				throwOnSideEffect: false
			};
			sendMessage("Debugger.evaluateOnCallFrame", evaluate);
		}
	}
}

function messageLoop() {
	sendMessage("Debugger.resume");
}

export function runDebugger() {
	if (connectDebugger(handleResponse, handleNotification, messageLoop)) {
		sendMessage("Console.enable");
		sendMessage("Debugger.enable");
		sendMessage("Runtime.enable");
		sendMessage("Debugger.setAsyncCallStackDepth", {maxDepth: 4});
		sendMessage("Debugger.setPauseOnExceptions", {state: "all"});
	}
}
runDebugger();
