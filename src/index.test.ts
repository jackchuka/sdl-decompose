import { decomposeGraphQL } from './index';

describe('decomposeGraphQL', () => {
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

  it('should decompose a query operation successfully', () => {
    const result = decomposeGraphQL(testSDL, 'getUser', 'query');

    expect(result.operationFound).toBe(true);
    expect(result.collectedTypes.has('User')).toBe(true);
    expect(result.collectedTypes.has('Post')).toBe(true);
    expect(result.sdl).toContain('type Query');
    expect(result.sdl).toContain('getUser(id: ID!): User');
    expect(result.sdl).toContain('type User');
    expect(result.sdl).toContain('type Post');
  });

  it('should return false for non-existent operation', () => {
    const result = decomposeGraphQL(testSDL, 'nonExistentOperation', 'query');

    expect(result.operationFound).toBe(false);
    expect(result.sdl).toBe('');
    expect(result.collectedTypes.size).toBe(0);
  });

  it('should handle mutation operations', () => {
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

    const result = decomposeGraphQL(mutationSDL, 'createUser', 'mutation');

    expect(result.operationFound).toBe(true);
    expect(result.collectedTypes.has('User')).toBe(true);
    expect(result.collectedTypes.has('UserInput')).toBe(true);
    expect(result.sdl).toContain('type Mutation');
    expect(result.sdl).toContain('createUser');
  });

  it('should handle invalid SDL gracefully', () => {
    expect(() => {
      decomposeGraphQL('invalid sdl', 'getUser', 'query');
    }).toThrow();
  });
});