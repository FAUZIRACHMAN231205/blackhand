import '@testing-library/jest-dom'

// Mock environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key'

// Mock Supabase client
jest.mock('./app/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithOAuth: jest.fn(),
      signInWithOtp: jest.fn(),
      verifyOtp: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
      updateUser: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
  },
}))
