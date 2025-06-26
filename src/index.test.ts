import { decomposeGraphQL } from "./index";

describe("decomposeGraphQL", () => {
  const testSDL = `
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

  it("should decompose a query operation successfully", () => {
    const result = decomposeGraphQL(testSDL, "getUser", "query");

    expect(result.operationFound).toBe(true);
    expect(result.collectedTypes.has("User")).toBe(true);
    expect(result.collectedTypes.has("Post")).toBe(true);
    expect(result.sdl).toContain("type Query");
    expect(result.sdl).toContain("getUser(id: ID!): User");
    expect(result.sdl).toContain("type User");
    expect(result.sdl).toContain("type Post");
  });

  it("should return false for non-existent operation", () => {
    const result = decomposeGraphQL(testSDL, "nonExistentOperation", "query");

    expect(result.operationFound).toBe(false);
    expect(result.sdl).toBe("");
    expect(result.collectedTypes.size).toBe(0);
  });

  it("should handle mutation operations", () => {
    const mutationSDL = `
      type Query {
        getUser: User
      }
      
      type Mutation {
        createUser(input: UserInput!): User
      }

      type User {
        id: ID!
        name: String!
      }

      input UserInput {
        name: String!
      }
    `;

    const result = decomposeGraphQL(mutationSDL, "createUser", "mutation");

    expect(result.operationFound).toBe(true);
    expect(result.collectedTypes.has("User")).toBe(true);
    expect(result.collectedTypes.has("UserInput")).toBe(true);
    expect(result.sdl).toContain("type Mutation");
    expect(result.sdl).toContain("createUser");
  });

  it("should handle invalid SDL gracefully", () => {
    expect(() => {
      decomposeGraphQL("invalid sdl", "getUser", "query");
    }).toThrow();
  });

  describe("excludeComments option", () => {
    const testSDLWithComments = `
      # This is a comment about the Query type
      type Query {
        # Get a user by ID
        getUser(id: ID!): User # inline comment
        # Get a post by ID  
        getPost(id: ID!): Post
      }

      """
      User type represents a user in the system
      with multiple lines of description
      """
      type User {
        id: ID! # User identifier
        name: String! # User name
        # User's posts
        posts: [Post!]!
      }

      # Post type comment
      type Post {
        id: ID!
        title: String!
        author: User!
      }
    `;

    it("should preserve comments when excludeComments is false", () => {
      const result = decomposeGraphQL(testSDLWithComments, "getUser", "query", {
        excludeComments: false,
      });

      expect(result.operationFound).toBe(true);
      expect(result.sdl).toContain("User type represents a user");
    });

    it("should remove comments when excludeComments is true", () => {
      const result = decomposeGraphQL(testSDLWithComments, "getUser", "query", {
        excludeComments: true,
      });

      expect(result.operationFound).toBe(true);
      expect(result.sdl).not.toContain("#");
      expect(result.sdl).not.toContain("User type represents a user");
      expect(result.sdl).not.toContain('"""');
      expect(result.sdl).toContain("type Query");
      expect(result.sdl).toContain("getUser(id: ID!): User");
      expect(result.sdl).toContain("type User");
      expect(result.sdl).toContain("type Post");
    });

    it("should handle empty lines correctly when excludeming comments", () => {
      const result = decomposeGraphQL(testSDLWithComments, "getUser", "query", {
        excludeComments: true,
      });

      expect(result.sdl).not.toContain("\n\n\n");
      expect(result.sdl.trim()).toBeTruthy();
    });

    it("should work with includeBuiltinScalars and excludeComments together", () => {
      const result = decomposeGraphQL(testSDLWithComments, "getUser", "query", {
        includeBuiltinScalars: true,
        excludeComments: true,
      });

      expect(result.operationFound).toBe(true);
      expect(result.sdl).not.toContain("#");
      expect(result.collectedTypes.has("String")).toBe(true);
      expect(result.collectedTypes.has("ID")).toBe(true);
    });
  });

  describe("includeDeprecated option", () => {
    const testSDLWithDeprecated = `
      type Query {
        getUser(id: ID!): User
        getPost(id: ID!): Post
      }

      type User {
        id: ID!
        name: String!
        email: String! @deprecated(reason: "Use contactInfo instead")
        contactInfo: String!
        oldField: String @deprecated
        posts: [Post!]!
      }

      type Post {
        id: ID!
        title: String!
        content: String!
        author: User!
        legacyField: Int @deprecated(reason: "No longer supported")
      }
    `;

    it("should exclude deprecated fields by default", () => {
      const result = decomposeGraphQL(testSDLWithDeprecated, "getUser", "query");

      expect(result.operationFound).toBe(true);
      expect(result.sdl).not.toContain("@deprecated");
      expect(result.sdl).not.toContain("email:");
      expect(result.sdl).not.toContain("oldField:");
      expect(result.sdl).not.toContain("legacyField:");
      expect(result.sdl).toContain("contactInfo:");
      expect(result.sdl).toContain("name:");
      expect(result.sdl).toContain("title:");
    });

    it("should include deprecated fields when includeDeprecated is true", () => {
      const result = decomposeGraphQL(testSDLWithDeprecated, "getUser", "query", {
        includeDeprecated: true,
      });

      expect(result.operationFound).toBe(true);
      expect(result.sdl).toContain("@deprecated");
      expect(result.sdl).toContain("email:");
      expect(result.sdl).toContain("oldField:");
      expect(result.sdl).toContain("legacyField:");
      expect(result.sdl).toContain("@deprecated");
    });

    it("should work with other options together", () => {
      const result = decomposeGraphQL(testSDLWithDeprecated, "getUser", "query", {
        includeDeprecated: false,
        includeBuiltinScalars: true,
        excludeComments: true,
      });

      expect(result.operationFound).toBe(true);
      expect(result.sdl).not.toContain("@deprecated");
      expect(result.sdl).not.toContain("email:");
      expect(result.collectedTypes.has("String")).toBe(true);
      expect(result.collectedTypes.has("ID")).toBe(true);
    });

    it("should handle types with only deprecated fields", () => {
      const sdlWithOnlyDeprecated = `
        type Query {
          getDeprecatedType: DeprecatedType
        }

        type DeprecatedType {
          field1: String @deprecated
          field2: Int @deprecated(reason: "Old field")
        }
      `;

      const result = decomposeGraphQL(sdlWithOnlyDeprecated, "getDeprecatedType", "query");

      expect(result.operationFound).toBe(true);
      expect(result.sdl).toContain("type DeprecatedType");
      expect(result.sdl).not.toContain("field1:");
      expect(result.sdl).not.toContain("field2:");
    });
  });
});
