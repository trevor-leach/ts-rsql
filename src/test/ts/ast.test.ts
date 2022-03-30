import {and, or, not, cmp, prj, sort} from "../../main/ts/ast"

describe("ast tests", () => {

	it.each([
		[cmp(`genres`, `=in=`, `sci-fi`, `action`),
			`genres=in=('sci-fi','action')`],
		[and(cmp(`name`, `==`, `Kill Bill`), cmp(`year`, `=gt=`, `2003`)),
			`(name=='Kill Bill' and year=gt='2003')`],
		[and(cmp(`a`, `<=`, `1`), cmp(`b`, `!=`, `2`), cmp(`c`, `>`, `3`)),
			`(a<='1' and b!='2' and c>'3')`],
		[or(cmp(`a`, `=gt=`, `1`), and(cmp(`b`, `==`, `2`), cmp(`c`, `!=`, `3`)), cmp(`d`, `=lt=`, `4`)),
			`(a=gt='1' or (b=='2' and c!='3') or d=lt='4')`],
		[not(cmp(`Trevor`, `=`, `Moxxi's`)),
			`not Trevor='Moxxi\\'s'`],
		[and(cmp(`Trev`, `==`, `cool`), not(cmp(`Trev`, `=in=`, `trouble`, `hot water`))),
			`(Trev=='cool' and not Trev=in=('trouble','hot water'))`],
		[prj(`name`), `name`],
		[prj(`name:login`), `name:login`],
		[prj(`address`,`city`), `address{city}`],
		[prj(`address`,`city`, `state`), `address{city,state}`],
		[prj(`user`,`name`,prj(`address`,`city`,`state`), `id:uuid`), `user{name,address{city,state},id:uuid}`],
		[sort(`last`), `+last`],
		[sort(`last`, true), `+last`],
		[sort(`last`, false), `-last`]

	])(`node.toString() should be %c"%s"`, (node, expected) => {

		expect(`${node}`).toBe(expected);
	});

	it.each([
		[cmp(`genres`, `=in=`, `sci-fi`, `action`),
			{selector:"genres",operator:"=in=",operands:["sci-fi","action"]}],
		[and(cmp(`name`, `==`, `Kill Bill`), cmp(`year`, `=gt=`, `2003`)),
			{operator:"and",operands:[
				{selector:"name",operator:"==",operands:["Kill Bill"]},
				{selector:"year",operator:"=gt=",operands:["2003"]}]
			 }],
		[and(cmp(`a`, `<=`, `1`), cmp(`b`, `!=`, `2`), cmp(`c`, `>`, `3`)),
			{operator:"and",operands:[
				{selector:"a",operator:"<=",operands:["1"]},
				{selector:"b",operator:"!=",operands:["2"]},
				{selector:"c",operator:">", operands:["3"]}]
			 }],
		[or(cmp(`a`, `=gt=`, `1`), and(cmp(`b`, `==`, `2`), cmp(`c`, `!=`, `3`)), cmp(`d`, `=lt=`, `4`)),
			{operator:"or",operands:[
				{selector:"a",operator:"=gt=",operands:["1"]},
				{operator:"and",operands:[
					{selector:"b",operator:"==",operands:["2"]},
					{selector:"c",operator:"!=",operands:["3"]}]
				},
				{selector:"d",operator:"=lt=",operands:["4"]}]
			 }],
		[not(cmp(`Trevor`, `=`, `bad`)),
			{operator:"not",operands:[{selector:"Trevor",operator:"=",operands:["bad"]}]}],
		[and(cmp(`Trev`, `==`, `cool`), not(cmp(`Trev`, `=in=`, `trouble`, `hot water`))),
			{operator:"and",operands:[
				{selector:"Trev",operator:"==",operands:["cool"]},
				{operator:"not",operands:[{selector:"Trev",operator:"=in=",operands:["trouble","hot water"]}]}]
			 }],
		[prj(`name`),
			{selector:"name"}],
		[prj(`name:login`),
			{selector:"login", alias: "name"}],
		[prj(`address`,`city`),
			{selector:"address",operands:[
				{selector:"city"}]}],
		[prj(`address`,`city`, `state`),
			{selector:"address",operands:[
				{selector:"city"},
				{selector:"state"}]}],
		[prj(`user`,`name`,prj(`address`,`city`, `state`), `id:uuid`),
			{selector:"user",operands:[
				{selector:"name"},
				{selector:"address",operands:[
					{selector:"city"},
					{selector:"state"}]},
				{selector:"uuid",alias:"id"}]}],
		[sort(`last`), {operator:`asc`,operands:[`last`]}],
		[sort(`last`, true), {operator:`asc`,operands:[`last`]}],
		[sort(`last`, false), {operator:`desc`,operands:[`last`]}]
	
	])(`node structure from "%s"`, (node, expected) => {

		expect(node).toEqual(expected);
	});

	it('not "operand" property should work', () => {

		const node = cmp('Trev', '!=', 'cool');
		
		expect(not(node).operand).toBe(node);
	});

    it('toJSON on Not nodes should work', () => {
        const operand = cmp('Trev', '!=', 'cool')
        const node = not(operand);

        expect(JSON.stringify(node)).toEqual(JSON.stringify({
            operator: 'not', operand
        }));
    });

	it('SortNode "operand" property should work', () => {

		const operand = `last`;
		const node = sort(operand, true);
		
		expect(node.operand).toBe(operand);
	});

    it('toJSON on Sort nodes should work', () => {
        const node = sort('name', false);

        expect(JSON.stringify(node)).toEqual(JSON.stringify({
            operator: 'desc', operand: 'name'
        }));
    });

	it('should have immutable operands', () => {

		const node = cmp('grades', '=in=', 'a', 'b', 'c');

		expect(() => { node.operands[1] = 'F'; }).toThrow(TypeError);
	});
});