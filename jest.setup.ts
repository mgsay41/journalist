// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'

// Polyfill for TextEncoder/TextDecoder (required for Next.js cache in tests)
if (typeof globalThis.TextEncoder === 'undefined') {
  globalThis.TextEncoder = TextEncoder as typeof globalThis.TextEncoder
}
if (typeof globalThis.TextDecoder === 'undefined') {
  globalThis.TextDecoder = TextDecoder as typeof globalThis.TextDecoder
}

// Mock Next.js server module before any imports
jest.mock('next/server', () => {
  return {
    NextRequest: class MockNextRequest {
      constructor(url: string | Request, init?: RequestInit) {
        if (typeof url === 'string') {
          this.url = url
          this.method = init?.method || 'GET'
          this.headers = new Headers(init?.headers)
        } else {
          this.url = url.url
          this.method = url.method
          this.headers = url.headers
        }
      }
      url: string
      method: string
      headers: Headers
      json = async () => ({})
      text = async () => ''
      clone = () => this
      nextUrl: { search: string; pathname: string } = { search: '', pathname: '' }
    },
    NextResponse: {
      json: (body: unknown, init?: ResponseInit) => ({
        status: init?.status || 200,
        body,
        headers: new Headers(init?.headers),
      }),
      redirect: (url: string, init?: number | ResponseInit) => ({
        status: typeof init === 'number' ? init : 302,
        headers: new Headers({ location: url }),
      }),
    },
  }
})

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock Next.js image
jest.mock('next/image', () => ({
  __esModule: true,
  default: () => {
    return 'Next image mock'
  },
}))

// Mock Next.js cache
jest.mock('next/cache', () => ({
  unstable_cache: jest.fn((fn) => fn),
}))

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000'
