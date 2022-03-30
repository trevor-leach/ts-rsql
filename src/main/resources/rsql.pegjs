/*
 * RSQL parser
 */

 rsql = o:or EOF { return o; }
 
 or = head:and tail:((_","_ / _"or"i_) and)* {
	if(tail.length == 0) return head;
	let operands = [head];
	for (let i = 0; i < tail.length; i++) {
		operands.push(tail[i][1]);
	}
	return ast.or(...operands);
}

and = head:constraint tail:((_";"_ / _"and"i_) constraint)* {
	if(tail.length == 0) return head;
	let operands = [head];
	for (let i = 0; i < tail.length; i++) {
		operands.push(tail[i][1]);
	}
	return ast.and(...operands);
}

not = head:(_"!"_ / _"not"i_) tail:constraint {
	return ast.not(tail);
}

constraint = group / comparison / not
group = "(" _ o:or _ ")" { return o;}

comparison = s:selector _ c:comparisonop _ a:arguments { 
	return ast.cmp(s, c.toLowerCase(), ...a);
}

selector = unreservedstr

comparisonop  = $compfiql / $compalt
compfiql      = ( "=" alpha* / "!" ) "="
compalt       = ( ">" / "<" ) "="?

alpha = [a-z] / [A-Z]

arguments = "(" _ head:value _ tail:("," _ value _)* ")"  {
	let result = [head];
	for (let i = 0; i < tail.length; i++) {
		result.push(tail[i][2]);
	}
	return result;

} / v:value {
	return [v];
}

projection = p:projectionList EOF {
	return p;
}

projectionList = head:entry _ tail:("," _ entry)* {
	let operands = [head]
	for (let i = 0; i < tail.length; i++) {
		operands.push(tail[i][2]);
	}
	return operands;
}

entry = head:unreservedstr _ subvalue:("{" _ projectionList _"}") {
	return ast.prj(head, ...subvalue[2]);

} / u:unreservedstr {
	return ast.prj(u);
}

sort = s:sortList EOF {
	return s;
}

sortList = head:unreservedstr _ tail:("," _ unreservedstr _ )* {
	return [head, ...tail.map(t=>t[2])].map(name => {
		const firstChar = name.charAt(0);
		if (`+` == firstChar || `-` == firstChar) {
			name = name.substring(1);
		}
		return ast.sort(name, `-` != firstChar);
	});
}

value = unreservedstr / doublequoted / singlequoted

unreservedstr = $unreserved+
singlequoted = [\'] v:(escaped / [^'\\])* [\'] {return v.join("")}
doublequoted = [\"] v:(escaped / [^"\\])* [\"] {return v.join("")}

reserved = $["'(){};,=!~<>]
unreserved = $[^"'(){};,=!~<> ]
escaped = "\\" c:allchars { return c; }
allchars = $.
_ "whitespace" = [ \t\r\n]*
EOF = !.
