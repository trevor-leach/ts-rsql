export type Operand = ASTNode<Operand> | string

/**
 * Generic syntax tree node.
 * 
 * @typeParam O For logical operations, [[`ASTNode`]], otherwise `string`.
 */
export class ASTNode<O extends Operand = Operand>
{
	public readonly operator: string
	public readonly operands?: Array<O>

	/**
	 * @param operator The name of the operator. E.g. `and` or `=between=`.
	 * @param operands The values on which this operator operates.
	 *        For logical operations these are other [[`ASTNode`]]s, and for
	 *        comparison operations, these are strings.
	 */
	constructor(operator: string, ...operands: Array<O>) {
		this.operator = operator;
		this.operands = operands.length ? [...operands] : undefined;
		Object.freeze(this.operands);
	}

	/**
	 * @returns an rsql string that this [[`ASTNode`]] represents.
	 */
	public toString(): string {
		return `(${this.operands?.join(` ${this.operator} `) || ''})`;
	}
}

/**
 * Special case of a logical [[`ASTNode`]] that only has one operand. The
 * convenience property [[`operand`]] simply returns `operands[0]`.
 */
export class NotNode
extends ASTNode<Operand>
{
	/**
	 * Create a [[`NotNode`]].  The operator is set as `not`.
	 * @param operand The value on which this operator operates.
	 */
	constructor(operand: ASTNode<Operand>) {
		super("not", operand);
	}

	/** @returns `operands[0]` for your convenience. */
	public get operand(): Operand {
		return this.operands?.[0] ?? undefined;
	}

	/**
	 * @returns an rsql string that this [[`ASTNode`]] represents.
	 */
	public toString(): string {
		return `not ${this.operand}`;
	}

    /**
     * Custom JSON.stringify() behavior.
     * See the [MDN description](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#tojson_behavior)
     * @param key Property name, array index, or empty string, depending on context.
     * @returns The value to actually be serialized.
     */
	public toJSON(key: string) {
		return {
			operator: this.operator,
			operand: this.operand
		}
	}
}

/**
 * An [[`ASTNode`]] representing a comparison operation. E.g. `a =in= (1,2,3)`
 */
export class ComparisonNode
extends ASTNode<string>
{
	public readonly selector: string

	/**
	 * Creates an [[`ASTNode`]] representing a comparison operation. E.g.
	 *     `a =in= (1,2,3)`
	 * @param selector In the example above, the selector is `"a"`
	 * @param operator In the example above, the operator is `"=in="`
	 * @param operands In the example above, the operands are the strings
	 *     `"1","2"`, and `"3"`
	 */
	constructor(selector: string, operator: string, ...operands: Array<string>) {
		super(operator, ...operands);
		this.selector = selector;
	}

	/**
	 * @returns an rsql string that this [[`ASTNode`]] represents.
	 *          E.g.  `age=between=('18','30')`
	 */
	public toString(): string {
		const quoteRegex = /'/g;
		const escaped = this.operands.map(s => s.replace(quoteRegex, String.raw`\'`));
		const operandsStr = escaped.length > 1 ?
			`('${escaped.join(`','`)}')`:
			`'${escaped[0]}'`;
		return `${this.selector}${this.operator}${operandsStr}`
	}
}

/**
 * An [[`ASTNode`]] representing a property to return from a query.
 */
export class ProjectionNode
extends ASTNode<ProjectionNode>
{
	public readonly selector: string
	public readonly alias?: string

	/**
	 * Creates an [[`ProjectionNode`]] representing properties to return from
     * queried object. The `operator` property will be undefined.
	 * 
	 * @param selector The name of the property. An alias for the selector is
	 *        specified with a colon separated prefix. E.g. "login:name"
	 *
	 * @param operands Empty for primitive types.  For objects, the
	 *        set of the object's properties to include.
	 */
	constructor(selector: string, ...operands: Array<ProjectionNode>) {
		super(undefined, ...operands);
		const aliasSel = selector.split(":", 2);
		this.alias    = aliasSel.length > 1 ? aliasSel[0] : undefined;
		this.selector = aliasSel[aliasSel.length - 1];
	}

	/**
	 * @returns an projection string that this [[`ASTNode`]] represents.
	 *          E.g. `"name:login,address(city,state)"`
	 */
	public toString(): string {
		let name = (this.alias == this.selector || null == this.alias) ?
			this.selector :
			`${this.alias}:${this.selector}`
		return this.operands?.length ?? 0 ? 
			`${name}{${this.operands.join(",")}}` :
			name;
	}
}

/**
 * An [[`ASTNode`]] representing a property on which to sort. The
 * convenience property [[`operand`]] simply returns `operands[0]`.
 */
export class SortNode
extends ASTNode<string>
{
	/**
	 * Create a [[`SortNode`]].  The operator is either `asc` or `desc`.
	 * @param operand The value on which this operator operates.
	 */
	constructor(operand: string, asc: boolean = true) {
		super(asc ? `asc` : `desc`, operand);
	}

	/** @returns `operands[0]` for your convenience. */
	public get operand(): string {
		return this.operands?.[0] ?? undefined;
	}

	/**
	 * @returns an rsql string that this [[`ASTNode`]] represents.
	 */
	public toString(): string {
		return `${this.operator == `asc` ? `+` : `-`}${this.operand}`;
	}

	/**
     * Custom JSON.stringify() behavior.
     * See the [MDN description](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#tojson_behavior)
     * @param key Property name, array index, or empty string, depending on context.
     * @returns The value to actually be serialized.
     */
     public toJSON(key: string) {
		return {
			operator: this.operator,
			operand: this.operand
		}
	}
}

/** @internal */
export function and(...operands: Array<ASTNode>): ASTNode<ASTNode> {
	return new ASTNode("and", ...operands)
 }

/** @internal */
export function or(...operands: Array<ASTNode>): ASTNode<ASTNode> {
	return new ASTNode("or", ...operands);
}

/** @internal */
export function not(operand: ASTNode): NotNode {
	return new NotNode(operand);
}

/** @internal */
export function cmp(selector: string, operator: string, ...operands: Array<string>): ComparisonNode {
	return new ComparisonNode(selector, operator, ...operands);
}

/** @internal */
export function prj(selector: string,  ...operands: Array<ProjectionNode|string>): ProjectionNode {
	return new ProjectionNode(selector, ...operands.map(
		value => typeof value == `string` ? prj(value) : value)
	);
}

/** @internal */
export function sort(operand: string, asc: boolean = true): SortNode {
	return new SortNode(operand, asc);
}