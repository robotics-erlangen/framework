import * as World from "base/world";
import { Agent, Task } from "glados/task/base";
import { Vector, Position, Speed, RelativePosition } from "base/vector";

import * as PathHelper from "glados/trajectory/pathhelper";
import { Direct } from "glados/trajectory/direct";
import { ToTarget } from "glados/trajectory/totarget";


enum State {
	GO_TO_PULL 			= "GO_TO_PULL", //START
	ENSURE_PULL_CONTACT = "ENSURE_PULL_CONTACT",
    PULL_BACK    = "PULL_BACK",
    FINISHED            = "FINISHED",
}

const PULL_DRIBBLER_SPEED = 0.8;
const MAX_PULL_SPEED = 0.15;
const MAX_PULL_ACCEL = 0.15;

const ENSURE_CONTACT_TIME = 0.5;
const ENSURE_CONTACT_MAX_TIME = 2;
const ENSURE_CONTACT_DRIBBLER_SPEED = 0.6;
const ENSURE_CONTACT_DIRECT_SPEED = 0.12;

const PULL_BACK_MAX_TIME = 2;

export class GetBallContact extends Task {
    private readonly OFFSET_SHOOT_LENGTH: number;
	private readonly OFFSET_EXTRA_LENGTH: number;
    
    private static _ready: boolean = false;
    private static _isInitialised = false;
	
	private _currentState: State = State.GO_TO_PULL;
	private _stateChanged: boolean = false;
    private _currentTargetPos: Position;
	
	private _stateChangeTime = World.Time;
    
    private _borderOffsetAverage: RelativePosition;
    
    private _offset: number = this._robot.shootRadius + World.Ball.radius;
    
    
    
	constructor(agent: Agent) {
		super(agent);
        this._currentState = State.GO_TO_PULL;
        GetBallContact._ready = false;
        
        this.OFFSET_SHOOT_LENGTH = this._robot.shootRadius + World.Ball.radius;
		this.OFFSET_EXTRA_LENGTH = this.OFFSET_SHOOT_LENGTH + 0.1;
        
        this._currentTargetPos = World.Ball.pos;
        this._borderOffsetAverage = this._robot.pos.copy().setLength(this.OFFSET_EXTRA_LENGTH);
        
        GetBallContact._isInitialised = true;
	}
	
	
	
	run() {
        
        PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, { ignorePass: true, ignoreBall: true });
        this._currentTargetPos = World.Ball.pos;
		
        let currentState = this._currentState;
		this._currentState = this._getNextState(currentState);
        
        if (this._currentState != currentState) {
            this._stateChangeTime = World.Time;
        }
		
        
		switch(currentState) {
			case State.GO_TO_PULL:
                if (this._robot.pos.distanceTo(World.Ball.pos) < this._offset + 0.3) {
                    this._robot.setDribblerSpeed(ENSURE_CONTACT_DRIBBLER_SPEED);
                    this._robot.trajectory.update(ToTarget, this._currentTargetPos, (1/2)*Math.PI, 0.2);
                } else {
                    this._robot.setDribblerSpeed(0);
                    this._robot.trajectory.update(ToTarget, this._currentTargetPos, (1/2)*Math.PI);
                }
                
                break;
			case State.ENSURE_PULL_CONTACT:
                /*this._robot.setDribblerSpeed(ENSURE_CONTACT_DRIBBLER_SPEED);
                //let speed = new Vector(0, 0); 
				//this._robot.trajectory.update(Direct, speed, undefined, 0.5);
                let pos = new Vector(0, 1);
                this._robot.trajectory.update(ToTarget, pos, (1/2)*Math.PI, 0.2);*/
                this._robot.setDribblerSpeed(ENSURE_CONTACT_DRIBBLER_SPEED);
				let speed = this._borderOffsetAverage.copy().setLength(ENSURE_CONTACT_DIRECT_SPEED);
				this._robot.trajectory.update(Direct, speed, speed.angle());
				break;
			case State.PULL_BACK:
                let pos = new Vector(0, 1);
                this._robot.setDribblerSpeed(PULL_DRIBBLER_SPEED);
                this._robot.trajectory.update(ToTarget, pos, (1/2)*Math.PI, 0.1);
				break;
            case State.FINISHED:
                GetBallContact._ready = true;
                break;
			default:
				break;
		}
	}
	
	private _getNextState(currentState: State): State {
		let nextState: State;
        
		switch (currentState) {
			case State.GO_TO_PULL:
                nextState = State.GO_TO_PULL;

                if (this._robot.pos.distanceTo(<Position> this._currentTargetPos) < this._offset) {
					nextState = State.ENSURE_PULL_CONTACT;
				}
				
				break;
			case State.ENSURE_PULL_CONTACT:
                nextState = State.ENSURE_PULL_CONTACT;

				if (World.Time - this._stateChangeTime > ENSURE_CONTACT_MAX_TIME) {
					nextState = State.PULL_BACK;
				}

				break;
			case State.PULL_BACK:
                nextState = State.PULL_BACK
				
				if (World.Time - this._stateChangeTime > PULL_BACK_MAX_TIME) {
					nextState = State.FINISHED;
				}

				break;
            case State.FINISHED:
                nextState = State.FINISHED;
                break;
			default:
                nextState = State.FINISHED;
				break;
		}
		
		return nextState;
	}
	
	public static _isDone():boolean {
        return GetBallContact._ready;
    }
    public static isInitialised():boolean {
        return GetBallContact._isInitialised;
    }
    public static resetInitialisation() {
		GetBallContact._isInitialised = false;
	}
}
