# Contributing to CloudStore

Thank you for your interest in contributing to CloudStore!

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the community

## How to Contribute

### Reporting Bugs

1. Check existing issues to avoid duplicates
2. Use the bug report template
3. Include reproduction steps
4. Provide system information

### Suggesting Features

1. Check the roadmap and existing feature requests
2. Use the feature request template
3. Explain the use case and benefits
4. Consider implementation complexity

### Pull Requests

#### Before Submitting

- Discuss major changes in an issue first
- Ensure tests pass: `npm test`
- Follow code style guidelines
- Update documentation

#### PR Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Add tests for new functionality
5. Commit with clear messages: `git commit -m 'feat: add amazing feature'`
6. Push to your fork: `git push origin feature/amazing-feature`
7. Open a Pull Request

#### Commit Message Format

Follow conventional commits:

```
feat: add new feature
fix: resolve bug
docs: update documentation
test: add missing tests
refactor: improve code structure
chore: update dependencies
```

## Development Setup

```bash
# Install dependencies
npm install

# Set up pre-commit hooks
npm run prepare

# Run development server
npm run dev

# Run tests
npm test

# Run linter
npm run lint
```

## Code Style

- Use TypeScript for new code
- Follow ESLint configuration
- Use Prettier for formatting
- Write self-documenting code
- Add comments for complex logic

## Testing Guidelines

- Write unit tests for business logic
- Write integration tests for APIs
- Aim for 80%+ code coverage
- Use meaningful test descriptions

```javascript
describe('ProductService', () => {
  it('should create product with valid data', async () => {
    // Test implementation
  });
  
  it('should throw error for invalid price', async () => {
    // Test implementation
  });
});
```

## Documentation

- Update README.md for user-facing changes
- Add JSDoc comments to public APIs
- Update API documentation for endpoint changes
- Include examples for new features

## Review Process

1. Maintainers review within 2-3 business days
2. Address feedback and update PR
3. At least one approval required
4. CI must pass before merge
5. Squash commits on merge

## Getting Help

- Join our Discord: `discord.gg/cloudstore`
- Ask in GitHub Discussions
- Check the FAQ in documentation
- Email: support@cloudstore.example.com

## Recognition

Contributors are recognized in:
- CONTRIBUTORS.md file
- Release notes
- Annual contributor spotlight

Thank you for contributing! 🎉
