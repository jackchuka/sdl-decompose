import { GraphQLNamedType } from "graphql";

export interface DecomposeOptions {
  includeBuiltinScalars?: boolean;
  excludeComments?: boolean;
  includeDeprecated?: boolean;
}

export interface DecomposeResult {
  sdl: string;
  collectedTypes: Set<string>;
  operationFound: boolean;
}

export type OperationType = "query" | "mutation" | "subscription";

export interface TypeCollector {
  collected: Set<GraphQLNamedType>;
  typeNames: Set<string>;
}
