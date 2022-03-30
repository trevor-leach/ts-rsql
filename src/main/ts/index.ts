export * from'./ast'
export { SyntaxError } from './parser'

import { ASTNode, ProjectionNode, SortNode } from './ast'
import { parse as _parse } from './parser'

/**
 * Parses an rsql string and returns a tree of nodes representing the syntax.
 * The operator names are converted to lower case, and the special character
 * versions of the logical operators will be replaced with thier respective
 * english names. E.g. `!` &rarr; `not`, `;` &rarr; `and`, and `,` &rarr; `or`.
 * 
 * @param input rsql string. E.g. 
 *        `"model==mustang and (color==black or color==red) and not year < 2019"`
 * 
 * @throws SyntaxError on malformed input.
 */
export function parseRsql(input: string): ASTNode {
	return _parse(input, {startRule: "rsql"});
}

/**
 * Parses a string describing what properties to return from a query.
 *
 * @param input A string describing what properties to return from a query.
 *              E.g. `"name, address(city, state)"`
 * 
 * @throws { SyntaxError } on malformed input.
 */
export function parseProjection(input: string): Array<ProjectionNode> {
	return _parse(input, {startRule: "projection"});
}

/**
 * Parses a string describing how to sort the results of a query.
 *
 * @param input A string describing how to sort the results of a query.
 *              E.g. `"last, first, -age"`
 * 
 * @throws {@link SyntaxError} on malformed input.
 */
export function parseSort(input: string): Array<SortNode> {
	return _parse(input, {startRule: "sort"});
}