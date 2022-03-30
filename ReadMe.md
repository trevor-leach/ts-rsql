# ts-rsql

From the [rsql-parser](https://github.com/jirutka/rsql-parser) Java project, which heavily influenced this one:

> RSQL is a query language for parametrized filtering of entries in RESTful APIs. It’s based on FIQL (Feed Item Query Language) – an URI-friendly syntax for expressing filters across the entries in an Atom Feed. FIQL is great for use in URI; there are no unsafe characters, so URL encoding is not required. On the other side, FIQL’s syntax is not very intuitive and URL encoding isn’t always that big deal, so RSQL also provides a friendlier syntax for logical operators and some of the comparison operators.

### Differences/enhancements from [rsql-parser](https://github.com/jirutka/rsql-parser):

* This is a JavaScript library, and includes TypeScript types.
* This includes support for the logical NOT prefix operator, written `not` or `!`
* This includes a parser for a projection expression, which can be used to shape the data returned from a query.  The projection expression does not come from any standard or RFC, but it basically GraphQL fields and aliases.
* This includes a parser for a sort expression, which can be used to order the data returned from a query.

&nbsp;

### RSQL Examples

Examples of RSQL expressions in both FIQL-like and alternative notation:

```text
name=="Kill Bill";!year=gt=2003
name=="Kill Bill" and not year<=2003
genres=in=(sci-fi,action);(director=='Christopher Nolan',actor==*Bale);year=ge=2000
genres=in=(sci-fi,action) and (director=='Christopher Nolan' or actor==*Bale) and year>=2000
director.lastName==Nolan;year=ge=2000;year=lt=2010
director.lastName==Nolan and year>=2000 and year<2010
genres=in=(sci-fi,action);genres=out=(romance,animated,horror),director==Que*Tarantino
genres=in=(sci-fi,action) and genres=out=(romance,animated,horror) or director==Que*Tarantino
```

Note that the operators can be the explicitly allowed values  
    `<`, `>`, `<=`, `>=`, `==`, and `!=`,  
as well as any letters bookended by equals characters: E.g.  
    `=between=`.  
Logical operators include `and` and `or`, which can also be written as `;` and `,` respecively, and the unary prefix operator `not`, a.k.a `!`.  

&nbsp;

### Projection Examples

Examples of projection expressions. Similar to a GraphQL query fields and aliases:

```text
first, last, friends { id }
name, address{city, state}
name:login
```

&nbsp;

### Sort Examples

Examples of sort expressions. Prefix characters `+` and `-` can indicate ascending (default) or descending order.

```text
last, first, -age
```
---

&nbsp;

## How to Use

The library provides three functions, for parsing an RSQL, projection, and sort strings.
Note that operators are always converted to lowercase, and operands are read a strings.

### RSQL

The following code parses an RSQL string into a Object representing the syntax:
```typescript
// Typescript
const ast: ASTNode = parseRsql("name==Trevor AND age =between=(18, 99)");

// JavaScript
const ast = parseRsql("name==Trevor and age =Between=(18, 99)");
```
The variable `ast` would then have a structure like:
```json
{
    "operator": "and",
    "operands": [
      {
        "selector": "name",
        "operator": "==",
        "operands": ["Trevor"]
      },
      {
        "selector": "age",
        "operator": "=between=",
        "operands": ["18", "99"]
      }
    ]
  }
```

&nbsp;

### Projection expressions

The following code parses a projection string into an array of Objects representing the specified properties:
```typescript
// Typescript
const nodes: Array<ProjectionNode> = parseProjection("name:login, address{city, state}");

// JavaScript
const nodes = parseProjection("name:login, address{city, state}");
```
The variable `nodes` would then have a structure like:
```json
[
    {
      "alias": "name",
      "selector": "login",
    },
    {
      "selector": "address",
      "operands": [
        {
          "selector": "city",
        },
        {
          "selector": "state",
        }
      ]
    }
  ]
```

&nbsp;

### Sort Expression

The following code parses a sort string into an aray of Objects representing the specified sort order:
```typescript
// Typescript
const nodes: Array<SortNode> = parseSort("first, last, -age");

// JavaScript
const nodes = parseSort("first, last, -age");
```
The variable `nodes` would then have a structure like:
```json
[
	{ "operator": "asc",  "operands": ["first"] },
	{ "operator": "asc",  "operands": ["last"] },
	{ "operator": "desc", "operands": ["age"] }
]
```