# CLAUDE.md - General Preferences

## About Me
- Primary language: JavaScript / TypeScript
- Environment: Windows 11
- Editor: Windows-native tooling

## Coding Style
- Write well-documented code with clear comments explaining intent and logic
- Use descriptive variable and function names
- Include JSDoc/TSDoc comments on exported functions and public APIs
- Add inline comments where logic is non-obvious
- Prefer readability over cleverness

## Conventions
- Use TypeScript over plain JavaScript when possible
- Prefer `const` over `let`; avoid `var`
- Use async/await over raw promises
- Use named exports over default exports
- Prefer functional patterns (map, filter, reduce) over imperative loops where readable

## File & Path Handling
- Use Windows-style paths where applicable
- Be mindful of path separators (backslash on Windows)
- Use `path.join()` or `path.resolve()` for cross-platform compatibility in Node.js

## Communication Preferences
- Be direct and concise
- Explain trade-offs when presenting options
- When fixing bugs, explain the root cause before the fix
- When writing new code, briefly explain key design decisions

## Error Handling
- Include meaningful error messages
- Handle edge cases at system boundaries (user input, APIs, file I/O)
- Don't over-engineer internal error handling

## Testing
- Write tests for non-trivial logic
- Prefer integration tests over excessive unit test mocking
