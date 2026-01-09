## Description

<!-- Provide a clear and concise description of what this PR does -->

## Type of Change

<!-- Mark the relevant option with an 'x' -->

- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📝 Documentation update
- [ ] 🎨 Code style/formatting
- [ ] ♻️ Code refactoring (no functional changes)
- [ ] ⚡ Performance improvement
- [ ] ✅ Test updates
- [ ] 🔧 Build/CI changes
- [ ] 📦 Dependency updates

## Changes Made

<!-- Detailed list of changes -->

-
-
-

## Related Issues

<!-- Link to related issues. Use "Fixes #123" or "Closes #123" to auto-close issues -->

- Fixes #
- Related to #

## Testing

### How to Test

<!-- Describe how to test these changes -->

1.
2.
3.

### Test Results

<!-- Provide test results, screenshots, or benchmarks if applicable -->

- [ ] All existing tests pass
- [ ] New tests added (if applicable)
- [ ] Manual testing completed

## Performance Impact

<!-- If applicable, provide performance benchmarks -->

**Before:**

```
<!-- Benchmark results before changes -->
```

**After:**

```
<!-- Benchmark results after changes -->
```

**Impact:**

<!-- e.g., "20% faster", "Reduces memory by 15%", "No performance impact" -->

## Code Quality Checklist

<!-- Ensure all items are checked before requesting review -->

- [ ] Code follows the project's style guidelines (Prettier/ESLint)
- [ ] Self-reviewed my own code
- [ ] Commented hard-to-understand areas
- [ ] Made corresponding changes to documentation
- [ ] No new warnings generated
- [ ] Added tests that prove the fix is effective or the feature works
- [ ] New and existing unit tests pass locally
- [ ] Code is formatted with Prettier

## Database/Cache Changes (if applicable)

- [ ] PostgreSQL schema changes documented
- [ ] Redis cache invalidation handled properly
- [ ] Migration scripts provided (if needed)
- [ ] Backward compatibility considered

## Breaking Changes

<!-- If this PR introduces breaking changes, describe them and migration steps -->

**Breaking:**

- **Migration Guide:**

```javascript
// Before
...

// After
...
```

## Screenshots/Demos

<!-- If applicable, add screenshots or demo videos -->

## Additional Context

<!-- Add any other context about the PR here -->

## Checklist for Reviewers

<!-- For maintainers reviewing this PR -->

- [ ] Code quality is acceptable
- [ ] Tests are comprehensive
- [ ] Documentation is updated
- [ ] Performance impact is acceptable
- [ ] Security implications have been considered
- [ ] Breaking changes are properly documented
- [ ] Commit messages follow conventional commits

---

**Note:** This PR will trigger automated checks:

- ✅ Prettier/ESLint for JavaScript
- ✅ Security scans (CodeQL, Njsscan)
- ✅ Dependency audit
