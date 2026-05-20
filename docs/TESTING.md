# Testing Guide for BLACKHAND Project

## Overview

This project uses Jest and React Testing Library for unit and integration testing. This guide will help you understand the testing setup and how to write tests for your components.

## Installation

All testing dependencies are already configured in `package.json`. To install them:

```bash
npm install
```

## Running Tests

### Run all tests

```bash
npm test
```

### Run tests in watch mode (re-runs on file changes)

```bash
npm run test:watch
```

### Generate coverage report

```bash
npm run test:coverage
```

## Project Structure

```
__tests__/
├── ErrorBoundary.test.tsx    # Tests for error boundary
├── StatsCard.test.tsx        # Tests for stats card component
├── LoadingStates.test.tsx    # Tests for loading components
└── useAuth.test.tsx          # Tests for auth hook
```

## Test Files Overview

### 1. ErrorBoundary.test.tsx

Tests the error boundary component:

- Renders children when no error occurs
- Displays error UI when error is thrown
- Shows error details in expandable section
- Has recovery buttons (Try Again, Home)

**Run specific test:**

```bash
npm test -- ErrorBoundary.test
```

### 2. StatsCard.test.tsx

Tests the StatsCard component:

- Renders title and value
- Displays optional description
- Renders icons correctly
- Applies custom classes
- Handles both string and numeric values

**Run specific test:**

```bash
npm test -- StatsCard.test
```

### 3. LoadingStates.test.tsx

Tests all loading state components:

- LoadingSpinner: Renders spinner animation
- SkeletonCard: Renders single skeleton card
- SkeletonGrid: Renders multiple skeleton cards
- DashboardSkeleton: Renders full dashboard skeleton

**Run specific test:**

```bash
npm test -- LoadingStates.test
```

### 4. useAuth.test.tsx

Tests the useAuth custom hook:

- Initializes with loading state
- Fetches session on mount
- Sets user when session exists
- Calls signOut on logout
- Unsubscribes from auth changes

**Run specific test:**

```bash
npm test -- useAuth.test
```

## Writing New Tests

### Basic Test Structure

```typescript
import { render, screen } from '@testing-library/react'
import MyComponent from '@/app/component/MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })
})
```

### Common Testing Patterns

#### Testing Component Props

```typescript
it('applies custom className', () => {
  const { container } = render(
    <MyComponent className="custom-class" />
  )
  expect(container.firstChild).toHaveClass('custom-class')
})
```

#### Testing User Interactions

```typescript
import { render, screen, fireEvent } from '@testing-library/react'

it('handles click events', () => {
  const handleClick = jest.fn()
  render(<button onClick={handleClick}>Click Me</button>)

  fireEvent.click(screen.getByText('Click Me'))
  expect(handleClick).toHaveBeenCalled()
})
```

#### Testing Hooks

```typescript
import { renderHook, act } from "@testing-library/react";

it("updates value on action", () => {
  const { result } = renderHook(() => useMyHook());

  act(() => {
    result.current.setValue("new value");
  });

  expect(result.current.value).toBe("new value");
});
```

#### Testing Async Operations

```typescript
import { waitFor } from '@testing-library/react'

it('fetches data on mount', async () => {
  render(<MyComponent />)

  await waitFor(() => {
    expect(screen.getByText('Data Loaded')).toBeInTheDocument()
  })
})
```

## Jest Configuration

### jest.config.js

Main Jest configuration file. Key settings:

- `testEnvironment`: Set to 'jest-environment-jsdom' for browser-like environment
- `setupFilesAfterEnv`: Loads jest.setup.js before running tests
- `moduleNameMapper`: Maps module paths (e.g., @/ to root)

### jest.setup.js

Setup file that runs before all tests:

- Imports Testing Library matchers
- Mocks environment variables
- Mocks external modules (like Supabase)

## Mocking

### Mocking Supabase Client

```typescript
jest.mock("@/app/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));
```

### Mocking Next.js Router

```typescript
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));
```

## Coverage Reports

After running `npm run test:coverage`, a coverage report will be generated in the `coverage/` directory.

Open `coverage/lcov-report/index.html` in your browser to view detailed coverage:

- **Statements**: How many statements have been executed
- **Branches**: How many code branches have been executed
- **Functions**: How many functions have been called
- **Lines**: How many lines have been executed

## Best Practices

1. **Test Behavior, Not Implementation**
   - Focus on what the component does, not how it works
   - Write tests from a user's perspective

2. **Use Descriptive Test Names**

   ```typescript
   // Good
   it("displays error message when email is invalid", () => {});

   // Bad
   it("validates email", () => {});
   ```

3. **Test One Thing Per Test**

   ```typescript
   // Good
   it("renders title", () => {});
   it("renders description", () => {});

   // Bad
   it("renders component", () => {});
   ```

4. **Use Arrange-Act-Assert Pattern**

   ```typescript
   it("updates user name", () => {
     // Arrange
     const { result } = renderHook(() => useUser());

     // Act
     act(() => {
       result.current.setName("John");
     });

     // Assert
     expect(result.current.name).toBe("John");
   });
   ```

5. **Clean Up After Tests**
   ```typescript
   describe("MyComponent", () => {
     afterEach(() => {
       jest.clearAllMocks();
     });
   });
   ```

## Debugging Tests

### Run Single Test File

```bash
npm test -- --testPathPattern=ErrorBoundary
```

### Run Tests Matching Pattern

```bash
npm test -- --testNamePattern="renders correctly"
```

### Debug in Browser

```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

Then open `chrome://inspect` in Chrome.

## CI/CD Integration

### Running Tests Before Build

Add to your CI pipeline:

```bash
npm test -- --coverage --watchAll=false
npm run build
```

### Example GitHub Actions

```yaml
- name: Run Tests
  run: npm test -- --coverage --watchAll=false

- name: Upload Coverage
  uses: codecov/codecov-action@v3
```

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## Troubleshooting

### Tests Won't Run

- Clear Jest cache: `npm test -- --clearCache`
- Check that all dependencies are installed: `npm install`

### Timeout Errors

- Increase timeout: `jest.setTimeout(10000)`
- Check for unresolved promises

### Module Not Found Errors

- Verify paths in `jest.config.js` moduleNameMapper
- Check that files exist at specified paths

### Mock Not Working

- Ensure mock is defined before imports
- Check that jest.mock() is at top level

## Support

For more testing help:

- Check existing test files for examples
- Refer to Testing Library documentation
- Review Jest configuration files
