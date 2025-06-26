# SDL Decompose

[![npm version](https://badge.fury.io/js/%40jackchuka%2Fsdl-decompose.svg)](https://badge.fury.io/js/%40jackchuka%2Fsdl-decompose)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A powerful tool to decompose GraphQL SDL (Schema Definition Language) by operation name, producing a minimal SDL containing only the types and fields needed for a specific operation.

## Features

- 🎯 **Precise decomposition**: Extract only the types needed for a specific GraphQL operation
- 📁 **File or stdin input**: Read SDL from files or pipe it through stdin
- 🔄 **All operation types**: Support for queries, mutations, and subscriptions
- 📝 **TypeScript support**: Full TypeScript definitions included
- 🛠️ **CLI and programmatic API**: Use from command line or integrate into your code
- ⚡ **Fast and lightweight**: Minimal dependencies, built on top of `graphql-js`

## Installation

```bash
# Global installation
npm install -g @jackchuka/sdl-decompose

# Or use with npx (no installation required)
npx @jackchuka/sdl-decompose --help
```

## CLI Usage

### Basic Usage

```bash
# From file
npx @jackchuka/sdl-decompose --sdl schema.graphql --operation getUser

# From stdin
cat schema.graphql | npx @jackchuka/sdl-decompose --operation getUser

# With mutation
npx @jackchuka/sdl-decompose --sdl schema.graphql --operation createUser --type mutation

# Save to file
npx @jackchuka/sdl-decompose --sdl schema.graphql --operation getUser --output partial.graphql
```

### Options

```
Usage: sdl-decompose [options]

Options:
  -V, --version           output the version number
  -s, --sdl <file>        Path to SDL file (optional, reads from stdin if not provided)
  -o, --operation <name>  Operation name to decompose (required)
  -t, --type <type>       Operation type: query, mutation, subscription (default: "query")
  --output <file>         Output file path (optional, prints to stdout if not provided)
  --include-builtins      Include builtin scalar types in output (default: false)
  --exclude-comments         Remove comments and descriptions from output SDL (default: false)
  -h, --help              display help for command
```

### Examples

#### Example 1: Basic Query Decomposition

Given this schema:
```graphql
type Query {
  getUser(id: ID!): User
  getPost(id: ID!): Post
}

type User {
  id: ID!
  name: String!
  email: String!
  posts: [Post!]!
}

type Post {
  id: ID!
  title: String!
  content: String!
  author: User!
}
```

Running:
```bash
npx @jackchuka/sdl-decompose --sdl schema.graphql --operation getUser
```

Outputs:
```graphql
type Query {
  getUser(id: ID!): User
}

type User {
  id: ID!
  name: String!
  email: String!
  posts: [Post!]!
}

type Post {
  id: ID!
  title: String!
  content: String!
  author: User!
}
```

#### Example 2: Mutation with Output File

```bash
npx @jackchuka/sdl-decompose --sdl schema.graphql --operation createUser --type mutation --output create-user.graphql
```

#### Example 3: Remove Comments from Output

```bash
# Clean output without comments or descriptions
npx @jackchuka/sdl-decompose --sdl schema.graphql --operation getUser --exclude-comments
```

#### Example 4: Using with Pipes

```bash
# Download schema and decompose in one command
curl -s https://api.example.com/graphql/schema | npx @jackchuka/sdl-decompose --operation getUser

# Process multiple operations
for op in getUser getPost; do
  npx @jackchuka/sdl-decompose --sdl schema.graphql --operation $op --output "${op}.graphql"
done
```

## Programmatic API

### Installation

```bash
npm install @jackchuka/sdl-decompose
```

### Usage

```typescript
import { decomposeGraphQL } from '@jackchuka/sdl-decompose';

const fullSDL = `
  type Query {
    getUser(id: ID!): User
    getPost(id: ID!): Post
  }

  type User {
    id: ID!
    name: String!
    posts: [Post!]!
  }

  type Post {
    id: ID!
    title: String!
    author: User!
  }
`;

const result = decomposeGraphQL(fullSDL, 'getUser', 'query', {
  includeBuiltinScalars: false,
  excludeComments: true
});

console.log(result.sdl);
console.log('Collected types:', Array.from(result.collectedTypes));
console.log('Operation found:', result.operationFound);
```

### API Reference

#### `decomposeGraphQL(fullSDL, operationName, operationType?, options?)`

**Parameters:**
- `fullSDL` (string): The complete GraphQL SDL
- `operationName` (string): Name of the operation to decompose
- `operationType` (string, optional): Type of operation - `'query'`, `'mutation'`, or `'subscription'`. Defaults to `'query'`
- `options` (object, optional): Configuration options

**Options:**
- `includeBuiltinScalars` (boolean): Include built-in scalar types (String, Int, Float, Boolean, ID) in the output. Defaults to `false`
- `excludeComments` (boolean): Remove comments and descriptions from the output SDL. Defaults to `false`

**Returns:**
```typescript
interface DecomposeResult {
  sdl: string;                    // The decomposed SDL
  collectedTypes: Set<string>;    // Set of type names that were collected
  operationFound: boolean;        // Whether the operation was found
}
```

### TypeScript Types

```typescript
interface DecomposeOptions {
  includeBuiltinScalars?: boolean;
  excludeComments?: boolean;
}

interface DecomposeResult {
  sdl: string;
  collectedTypes: Set<string>;
  operationFound: boolean;
}

type OperationType = 'query' | 'mutation' | 'subscription';
```

## Use Cases

- **Schema Federation**: Extract specific operations for federated services
- **Code Generation**: Generate types for specific operations only
- **Testing**: Create minimal schemas for testing specific functionality
- **Documentation**: Generate focused schema documentation
- **Bundle Size Optimization**: Include only necessary schema parts in client bundles
- **API Development**: Develop and test individual operations in isolation

## How It Works

SDL Decompose analyzes your GraphQL schema and:

1. **Finds the target operation** in the appropriate root type (Query, Mutation, or Subscription)
2. **Traverses the type graph** starting from the operation's return type and arguments
3. **Collects all referenced types** including nested types, input types, and union/interface implementations
4. **Reconstructs minimal SDL** containing only the necessary types and the target operation

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT © [jackchuka](https://github.com/jackchuka)

## Related Projects

- [GraphQL Tools](https://www.graphql-tools.com/) - Comprehensive GraphQL utilities
- [GraphQL Code Generator](https://www.graphql-code-generator.com/) - Generate code from GraphQL schemas
