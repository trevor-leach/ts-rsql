import {and, or, not, cmp, prj, ComparisonNode, ASTNode, ProjectionNode, sort, SortNode} from "../../main/ts/ast"
import {parseRsql, parseProjection ,SyntaxError, parseSort} from "../../main/ts"

const RESERVED = Object.freeze(['"', '\'', '(', ')', '{', '}', ';', ',', '=', '<', '>', '!', '~', ' ']);

const eq = (selector: string, ...operands: Array<string>): ComparisonNode => {
	return cmp(selector, "==", ...operands);
}

describe("parseRsql tests", () => {

	it('basic functionality should work', () => {

		const actual = parseRsql(`a==1`);

		expect(eq(`a`, `1`)).toEqual(actual);
	});

	it.each([
		`allons-y`, `l00k.dot.path`, `look/XML/path`, `n:look/n:xml`, `path.to::Ref`, `$doll_r.way`

	])(`The selector %s should be accepted`, (selector: string) => {

		const node: ASTNode = parseRsql(`${selector}==1`);

		if (! (node instanceof ComparisonNode)) {
			fail(`Unexpected return type from parseRsql: ${node.constructor.name}`)
		}
		expect(selector).toBe(node.selector);
	});

	it.each(RESERVED)(`Selector with reserved char %s should be rejected`, char => {

		expect(() => { parseRsql(`Ill${char}ness==1`) }).toThrow(SyntaxError);
	});

	it(`Empty should be rejected`, () => {

		expect(() => { parseRsql(`==1`) }).toThrow(SyntaxError);
	});

	it.each([
		[`«Allons-y»`], [`h@llo`], [`*star*`], [`čes*ký`], [`42`], [`0.15`], [`3:15`]

	])(`Good unquoted comparison operand "%s" should be accepted`, operand => {

		const node: ASTNode = parseRsql(`foo==${operand}`);

		
		if (! (node instanceof ComparisonNode)) {
			fail(`Unexpected return type from parseRsql: ${node.constructor.name}`)
		}
		expect(node.operands).toEqual([operand]);
	});

	it.each(RESERVED)(`Unqouted comparison operand with reserved char %s should be rejected`, char => {

		expect(() => { parseRsql(`Ill${char}ness==1`) }).toThrow(SyntaxError);
	});

	it.each([
		`"hi there!"`, `'Pěkný den!'`, `"Flynn's *"`, `"o)'O'(o"`, `"6*7=42"`

	])(`Quoted comparison operand with reserved char %s should be accepted`, operand => {

		const node: ASTNode = parseRsql(`foo==${operand}`);
		const unqoted_operand = operand.substr(1, operand.length -2);

		
		if (! (node instanceof ComparisonNode)) {
			fail(`Unexpected return type from parseRsql: ${node.constructor.name}`)
		}
		expect(node.operands).toEqual([unqoted_operand]);
	});

	it.each([
		[String.raw`'10\' 15"'`,       String.raw`10' 15"`],
		[String.raw`'10\' 15\"'`,      String.raw`10' 15"`],
		[String.raw`'w\ \'Flyn\n\''`,  String.raw`w 'Flynn'`],
		[String.raw`'\\\\(^_^)/'`,     String.raw`\\(^_^)/`]

	])(`Comparison operand %s should be interpreted as %s`, (operand, expected) => {

		const node: ASTNode = parseRsql(`foo==${operand}`);

		if (! (node instanceof ComparisonNode)) {
			fail(`Unexpected return type from parseRsql: ${node.constructor.name}`)
		}
		expect(node.operands).toEqual([expected]);
	});

	it.each([
		[String.raw`"10' 15\""`,       String.raw`10' 15"`],
		[String.raw`"10\' 15\""`,      String.raw`10' 15"`],
		[String.raw`"w\ \"Flyn\n\""`,  String.raw`w "Flynn"`],
		[String.raw`"\\\\(^_^)/"`,     String.raw`\\(^_^)/`]

	])(`Comparison operand %s should be interpreted as %s`, (operand, expected) => {

		const node: ASTNode = parseRsql(`foo==${operand}`);
		
		if (! (node instanceof ComparisonNode)) {
			fail(`Unexpected return type from parseRsql: ${node.constructor.name}`)
		}
		expect(node.operands).toEqual([expected]);
	});

	it.each([
		[`chunky`, `bacon`, `"f,t,w!"`],
		[`'hi!'`, `"how're you?"`],
		[`meh`],
		[`")o("`]

	])(`Comparison operands group starting with %s`, (...operands) => {

		const node: ASTNode = parseRsql(`foo==(${operands.join(`,`)})`);
		const expecteds: string[] = [...operands]
		for (let index = 0; index < expecteds.length; index++) { 
			let expected = expecteds[index];
			if(expected[0] == `'` || expected[0] == `"`) {
				expecteds[index] = expected.substr(1, expected.length-2);
			}
		}

		if (! (node instanceof ComparisonNode)) {
			fail(`Unexpected return type from parseRsql: ${node.constructor.name}`)
		}
		expect(node.operands).toEqual(expecteds);
	});

	it.each([
		` and `, " AnD ", " ; ", ";"

	])(`Parse "a==1%sb==2" correctly`, operator => {

		const expected = and(eq(`a`,`1`),eq(`b`,`2`));
		const actual = parseRsql(`a==1${operator}b==2`);

		expect(actual).toEqual(expected);
	});

	it.each([
		` or `, " Or ", " , ", ","

	])(`Parse "a==1%sb==2" correctly`, operator => {

		const expected = or(eq(`a`,`1`),eq(`b`,`2`));
		const actual = parseRsql(`a==1${operator}b==2`);

		expect(actual).toEqual(expected);
	});

	it.each([
		`not `, "NoT ", "! ", "!"

	])(`Parse "%sa==1" correctly`, operator => {

		const expected = not(eq(`a`,`1`));
		const actual = parseRsql(`${operator}a==1`);

		expect(actual).toEqual(expected);
	});

	it.each([
		[`s0==a0;s1==a1;s2==a2`, and(eq(`s0`, `a0`), eq(`s1`, `a1`), eq(`s2`, `a2`))],
		[`s0==a0,s1=out=(a10,a11),s2==a2`, or(eq(`s0`, `a0`), cmp(`s1`, `=out=`, `a10`, `a11`), eq(`s2`, `a2`))],
		[`s0==a0,s1==a1;s2==a2,s3==a3`, or(eq(`s0`, `a0`), and(eq(`s1`, `a1`), eq(`s2`, `a2`)), eq(`s3`, `a3`))],
		[`s0==a0;!s1==a1`, and(eq(`s0`, `a0`), not(eq(`s1`, `a1`)))],
		[`!s0==a0;s1==a1`, and(not(eq(`s0`, `a0`)), eq(`s1`, `a1`))],
		[`!s0==a0;s1==a1,s3==a3`, or(and(not(eq(`s0`, `a0`)), eq(`s1`, `a1`)), eq(`s3`, `a3`))]

	])(`Test operator presedence of "%s"`, (rsql, expected) => {

		const actual = parseRsql(rsql);

		expect(actual).toEqual(expected);
	});

	it.each([
		[`(s0==a0,s1==a1);s2==a2`, and(or(eq(`s0`, `a0`), eq(`s1`, `a1`)), eq(`s2`, `a2`))],
		[`(s0==a0,s1=out=(a10,a11));s2==a2,s3==a3`, or(and(or(eq(`s0`, `a0`), cmp(`s1`, `=out=`, `a10`, `a11`)), eq(`s2`, `a2`)), eq(`s3`, `a3`))],
		[`((s0==a0,s1==a1);s2==a2,s3==a3);s4==a4`, and(or(and(or(eq(`s0`, `a0`), eq(`s1`, `a1`)), eq(`s2`, `a2`)), eq(`s3`, `a3`)), eq(`s4`, `a4`))],
		[`(s0==a0)`, eq(`s0`, `a0`)],
		[`((s0==a0));s1==a1`, and(eq(`s0`, `a0`), eq(`s1`, `a1`))],
		[`!(s0==a0,s1==a1);s2==a2`, and(not(or(eq(`s0`, `a0`), eq(`s1`, `a1`))), eq(`s2`, `a2`))],
		[`(!s0==a0,s1==a1);s2==a2`, and(or(not(eq(`s0`, `a0`)), eq(`s1`, `a1`)), eq(`s2`, `a2`))]

	])(`Test prenthesis handling of "%s"`, (rsql, expected) => {

		const actual = parseRsql(rsql);

		expect(actual).toEqual(expected);
	});

	it.each([
		`(s0==a0;s1!=a1`, `s0==a0)`, `s0==a;(s1=in=(b,c),s2!=d`

	])(`Unclosed parenthesis in "%s" should be rejected`, rsql => {

		expect(() => { parseRsql(rsql) }).toThrow(SyntaxError);
	});
});

describe("parseProjection tests", () => {

	it(`basic functionality should work`, () => {
		const actual = parseProjection("name:login, address{street, city}")
		const expected = [prj("name:login"), prj("address", prj("street"), prj("city"))]
		expect(actual).toEqual(expected);
	})

	it.each([
		`allons-y`, `l00k.dot.path`, `look/XML/path`, `$doll_r.way`

	])(`name with unreserved characters should be accepted.`, name => {

		const nodes: Array<ProjectionNode> = parseProjection(`${name}`);

		expect(nodes).toEqual([prj(name)]);
	});

	it.each(RESERVED.filter(c => c != `,`))(`Name with reserved char %s should be rejected`, char => {

		expect(() => { parseProjection(`Ill${char}ness`) }).toThrow(SyntaxError);
	});

	it.each([
		`name:login`, `foo-bar:foobar`, `barbaz:bar-baz`, `zot/quix:zotquix`

	])(`Aliased name %s should be accepted`, name => {

		const nodes: Array<ProjectionNode> = parseProjection(`${name}`);

		expect(nodes).toEqual([prj(name)]);
		const node = nodes[0];
		const [alias, selector] = name.split(`:`, 2);
		expect(node.alias).toEqual(alias);
		expect(node.selector).toEqual(selector);
	});

	it.each(RESERVED.filter(c => c != `,`))(`Alias with reserved char %s should be rejected`, char => {

		expect(() => { parseProjection(`Ill${char}ness:health`) }).toThrow(SyntaxError);
	});

	it.each([
		[`name,address`, [prj(`name`), prj(`address`)]],
		[`name, address, ssn`, [prj(`name`), prj(`address`), prj(`ssn`)]],
		[`name,address{city, state}`, [prj(`name`), prj(`address`, `city`, `state`)]],
		[`name:login,addr:address{city, st:state}`, [prj(`name:login`), prj(`addr:address`, `city`, `st:state`)]]

	])(`List of property names "%s" should work`, (projection, expected) => {

		const nodes: Array<ProjectionNode> = parseProjection(`${projection}`);

		expect(nodes).toEqual(expected);
	});
});

describe("parseSort tests", () => {

	it(`basic functionality should work`, () => {
		const actual = parseSort("name");
		const expected = [sort("name")];
		expect(actual).toEqual(expected);
	})

	it.each([
		`allons-y`, `l00k.dot.path`, `look/XML/path`, `$doll_r.way`

	])(`name with unreserved characters should be accepted.`, name => {

		const nodes: Array<SortNode> = parseSort(`${name}`);

		expect(nodes).toEqual([sort(name)]);
	});

	it.each(RESERVED.filter(c => c != `,`))(`Name with reserved char %s should be rejected`, char => {

		expect(() => { parseSort(`Ill${char}ness`) }).toThrow(SyntaxError);
	});

	it.each([
		[`+name`, sort(`name`)],
		[`-name`, sort(`name`, false)]

	])(`sort order prefix in "%s" should work`, (input, expected) => {

		expect(parseSort(input)).toEqual([expected]);
	});

	it.each([
		[`first,last`, [sort(`first`), sort(`last`)]],
		[`-first, last`, [sort(`first`, false), sort(`last`)]],
		[`+first, +last ,-age`, [sort(`first`), sort(`last`), sort(`age`, false)]],

	])(`parsing the sort list "%s" should work`, (input, expected) => {

		expect(parseSort(input)).toEqual(expected);
	})
});
