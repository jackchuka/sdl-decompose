import {
  buildSchema,
  GraphQLSchema,
  GraphQLNamedType,
  GraphQLField,
  isObjectType,
  isInputObjectType,
  isInterfaceType,
  isUnionType,
  getNamedType,
  printType,
  GraphQLArgument,
  GraphQLObjectType,
} from "graphql";

import {
  DecomposeOptions,
  DecomposeResult,
  OperationType,
  TypeCollector,
} from "./types";

const BUILTIN_SCALARS = new Set(["String", "Int", "Float", "Boolean", "ID"]);

export function decomposeGraphQL(
  fullSDL: string,
  operationName: string,
  operationType: OperationType = "query",
  options: DecomposeOptions = {}
): DecomposeResult {
  try {
    const schema = buildSchema(fullSDL);
    const collector: TypeCollector = {
      collected: new Set(),
      typeNames: new Set(),
    };

    const rootType = getRootType(schema, operationType);
    if (!rootType) {
      return {
        sdl: "",
        collectedTypes: new Set(),
        operationFound: false,
      };
    }

    const field = rootType.getFields()[operationName];
    if (!field) {
      return {
        sdl: "",
        collectedTypes: new Set(),
        operationFound: false,
      };
    }

    collectTypesFromField(field, collector, options);

    const partialSDL = reconstructSDL(
      schema,
      collector,
      operationType,
      operationName,
      options
    );

    return {
      sdl: partialSDL,
      collectedTypes: collector.typeNames,
      operationFound: true,
    };
  } catch (error) {
    throw new Error(
      `Failed to decompose GraphQL: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

function getRootType(schema: GraphQLSchema, operationType: OperationType) {
  switch (operationType) {
    case "query":
      return schema.getQueryType();
    case "mutation":
      return schema.getMutationType();
    case "subscription":
      return schema.getSubscriptionType();
    default:
      return null;
  }
}

function collectTypesFromField(
  field: GraphQLField<any, any>,
  collector: TypeCollector,
  options: DecomposeOptions
) {
  const fieldType = getNamedType(field.type);
  collectTypes(fieldType, collector, options);

  if (field.args) {
    for (const arg of field.args) {
      const argType = getNamedType(arg.type);
      collectTypes(argType, collector, options);
    }
  }
}

function collectTypes(
  type: GraphQLNamedType | null | undefined,
  collector: TypeCollector,
  options: DecomposeOptions
) {
  if (!type || collector.collected.has(type)) return;

  if (!options.includeBuiltinScalars && BUILTIN_SCALARS.has(type.name)) {
    return;
  }

  collector.collected.add(type);
  collector.typeNames.add(type.name);

  if (isObjectType(type) || isInputObjectType(type)) {
    const fields = type.getFields();
    for (const fieldObj of Object.values(fields)) {
      const fieldType = getNamedType(fieldObj.type as GraphQLObjectType);
      collectTypes(fieldType, collector, options);
      if ("args" in fieldObj && fieldObj.args) {
        for (const arg of fieldObj.args) {
          const argType = getNamedType(arg.type as GraphQLObjectType);
          collectTypes(argType, collector, options);
        }
      }
    }
  } else if (isInterfaceType(type)) {
    const fields = type.getFields();
    for (const fieldObj of Object.values(fields)) {
      const fieldType = getNamedType(fieldObj.type);
      collectTypes(fieldType, collector, options);
      if (fieldObj.args) {
        for (const arg of fieldObj.args) {
          const argType = getNamedType(arg.type);
          collectTypes(argType, collector, options);
        }
      }
    }
  } else if (isUnionType(type)) {
    for (const unionType of type.getTypes()) {
      collectTypes(unionType, collector, options);
    }
  }
}

function reconstructSDL(
  schema: GraphQLSchema,
  collector: TypeCollector,
  operationType: OperationType,
  operationName: string,
  options: DecomposeOptions
): string {
  const typeDefs: string[] = [];

  const rootType = getRootType(schema, operationType);
  if (rootType) {
    const field = rootType.getFields()[operationName];
    if (field) {
      const rootTypeName =
        operationType === "query"
          ? "Query"
          : operationType === "mutation"
          ? "Mutation"
          : "Subscription";

      typeDefs.push(`type ${rootTypeName} {
  ${operationName}${printFieldSignature(field)}
}`);
    }
  }

  for (const type of collector.collected) {
    if (
      type.name === "Query" ||
      type.name === "Mutation" ||
      type.name === "Subscription"
    ) {
      continue;
    }
    typeDefs.push(printType(type));
  }

  const sdl = typeDefs.join("\n\n");
  return options.excludeComments ? excludeCommentsFromSDL(sdl) : sdl;
}

function printFieldSignature(field: GraphQLField<any, any>): string {
  const args =
    field.args && field.args.length > 0
      ? `(${field.args
          .map((arg: GraphQLArgument) => `${arg.name}: ${arg.type}`)
          .join(", ")})`
      : "";
  return `${args}: ${field.type}`;
}

function excludeCommentsFromSDL(sdl: string): string {
  return sdl
    .split("\n")
    .map((line) => {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith("#")) {
        return "";
      }
      const hashIndex = line.indexOf("#");
      if (hashIndex !== -1) {
        const beforeHash = line.substring(0, hashIndex).trimEnd();
        if (beforeHash) {
          return beforeHash;
        }
        return "";
      }
      return line;
    })
    .filter((line) => line !== "")
    .join("\n")
    .replace(/"""[\s\S]*?"""/g, "")
    .replace(/^\s*$/gm, "")
    .replace(/\n{2,}/g, "\n\n")
    .trim();
}

export * from "./types";
export default decomposeGraphQL;
