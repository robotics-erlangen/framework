import { Vector } from "base/vector";
import { UnitTest } from "glados/test/unit/unittest";

export class BaseField extends UnitTest {
	private static World = {
		Geometry: {
			FieldHeightHalf: 4.5,
			FieldWidthHalf: 3,
			FreeKickDefenseDist: 0.2,
			DefenseStretch: 0.5,
			DefenseRadius: 1,
			GoalWidth: 1,
			GoalDepth: 0.18
		},
		RULEVERSION: "" // keep empty for now
	};
	private Field: any;
	private G: any;
	private static Referee = {
		isStopState: function() {
			return false;
		},
		isFriendlyFreeKickState: function() {
			return false;
		}
	};

	constructor() {
		super();
		this.addTest("distanceToDefenseArea_2018", this.testDistanceToDefenseArea_2018);
		this.addTest("distanceToDefenseArea_2017", this.testDistanceToDefenseArea_2017);
		this.addTest("intersectDefenseArea_2018", this.testIntersectDefenseArea_2018);

		this.G = BaseField.World.Geometry;
		this.G.DefenseStretchHalf = this.G.DefenseStretch / 2;
		this.G.DefenseHeight = this.G.DefenseRadius;
		this.G.DefenseWidth = this.G.DefenseHeight * 2;
		this.G.DefenseWidthHalf = this.G.DefenseWidth / 2;
	}

	public static getOverlays() {
		return {"base/world": this.World, "base/referee": this.Referee};
	}

	private initHelper(ruleversion: string) {
		BaseField.World.RULEVERSION = ruleversion;
		// tslint:disable-next-line
		this.Field = require("base/field", true, BaseField.getOverlays());
	}

	private testDistanceToDefenseArea_2018() {
		this.initHelper("2018");

		let pos = new Vector(0, 0);
		this.assert_equal(this.Field.distanceToDefenseArea(pos, 3, false), 0.5);
		this.assert_equal(this.Field.distanceToDefenseArea(pos, 3, true), 0.5);

		this.assert_false(this.Field.isInDefenseArea(pos, 0.18, false));
		this.assert_false(this.Field.isInDefenseArea(pos, 0.18, true));
		pos = new Vector(0.1, this.G.FieldHeightHalf);
		this.assert_true(this.Field.isInDefenseArea(pos, 0.18, false));
		this.assert_false(this.Field.isInDefenseArea(pos, 0.18, true));
		pos = new Vector(this.G.DefenseWidthHalf + 0.2, -this.G.FieldHeightHalf + 0.4);
		this.assert_true(this.Field.isInDefenseArea(pos, 0.3, true));
		this.assert_false(this.Field.isInDefenseArea(pos, 0.3, false));
		pos = new Vector(this.G.DefenseWidthHalf + 0.1, this.G.FieldHeightHalf - this.G.DefenseHeight - 0.1);
		this.assert_true(this.Field.isInDefenseArea(pos, 0.2, false));

		pos = new Vector(this.G.DefenseWidthHalf - 0.01, this.G.FieldHeightHalf - this.G.DefenseHeight / 2);
		this.assert_true(Math.abs(this.Field.distanceToDefenseArea(pos, -0.02, false) - 0.01) < 0.000001);
		this.assert_false(this.Field.isInDefenseArea(pos, -0.02, false));
		this.assert_true(this.Field.distanceToDefenseArea(pos, -0.005, false) <= 0);
		this.assert_true(this.Field.isInDefenseArea(pos, -0.005, false));
		pos = new Vector(0, this.G.FieldHeightHalf - this.G.DefenseHeight / 2);
		this.assert_true(this.Field.distanceToDefenseArea(pos, -this.G.DefenseHeight / 2 + 0.0001, false) <= 0);
		this.assert_true(this.Field.isInDefenseArea(pos, -this.G.DefenseHeight / 2 + 0.0001, false));
		this.assert_true(this.Field.distanceToDefenseArea(pos, -this.G.DefenseHeight / 2 - 0.0001, false) > 0);
		this.assert_false(this.Field.isInDefenseArea(pos, -this.G.DefenseHeight / 2 - 0.0001, false));
	}

	private testDistanceToDefenseArea_2017() {
		this.initHelper("2017");

		let pos = new Vector(0, 0);
		this.assert_equal(this.Field.distanceToDefenseArea(pos, 3, false), 0.5);
		this.assert_equal(this.Field.distanceToDefenseArea(pos, 3, true), 0.5);
		this.assert_false(this.Field.isInDefenseArea(pos, 0.18, false));
		this.assert_false(this.Field.isInDefenseArea(pos, 0.18, true));
		pos = new Vector(0.1, this.G.FieldHeightHalf);
		this.assert_true(this.Field.isInDefenseArea(pos, 0.18, false));
		this.assert_false(this.Field.isInDefenseArea(pos, 0.18, true));


		pos = new Vector(this.G.DefenseStretchHalf + this.G.DefenseRadius - 0.01, this.G.FieldHeightHalf);
		this.assert_true(Math.abs(this.Field.distanceToDefenseArea(pos, -0.02) - 0.01) < 0.000001);
		this.assert_false(this.Field.isInDefenseArea(pos, -0.02));
		this.assert_true(this.Field.distanceToDefenseArea(pos, -0.005) <= 0);
		this.assert_true(this.Field.isInDefenseArea(pos, -0.005));
		pos = new Vector(0, this.G.FieldHeightHalf);
		this.assert_true(this.Field.distanceToDefenseArea(pos, -this.G.DefenseRadius + 0.0001) <= 0);
		this.assert_true(this.Field.isInDefenseArea(pos, -this.G.DefenseRadius + 0.0001));
		this.assert_true(this.Field.distanceToDefenseArea(pos, -this.G.DefenseRadius - 0.0001) > 0);
		this.assert_false(this.Field.isInDefenseArea(pos, -this.G.DefenseRadius - 0.0001));
	}

	private testIntersectDefenseArea_2018() {
		this.initHelper("2018");

		let pos = new Vector(0, 0);
		let dir = new Vector(0, -1);
		let d = 0.2;
		let v = new Vector(0, -this.G.FieldHeightHalf + this.G.DefenseHeight + d);
		let intersection = this.Field.intersectRayDefenseArea(pos, dir, d, true)[0];
		this.assert_true(v.distanceToSq(intersection) === 0);
	}
}
export let testClass = BaseField;
