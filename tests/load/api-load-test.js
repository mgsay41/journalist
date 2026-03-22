/**
 * K6 Load Test Script
 *
 * Phase 2 Backend Audit - Load Testing for Critical API Endpoints
 *
 * Tests:
 * - Public articles list endpoint
 * - Article detail endpoint
 * - Categories list
 * - Tags list
 * - Authentication endpoints (login)
 */

import { check, group } from 'k6';
import http from 'k6/http';

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp up to 10 users
    { duration: '1m', target: 50 },    // Ramp up to 50 users
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '1m', target: 100 },   // Stay at 100 users
    { duration: '30s', target: 0 },    // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.01'],     // Error rate must be less than 1%
  },
};

// Setup - generate test data
export function setup() {
  // Login to get session token (if needed for protected endpoints)
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: __ENV.TEST_EMAIL || 'test@example.com',
    password: __ENV.TEST_PASSWORD || 'password123',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  let sessionToken = null;
  if (loginRes.status === 200) {
    const cookies = loginRes.cookies;
    sessionToken = cookies.better_auth_session?.[0]?.value;
  }

  return {
    sessionToken,
    // Pre-fetch some article slugs for testing
    articleSlugs: getArticleSlugs(),
  };
}

// Helper: Get article slugs for testing
function getArticleSlugs() {
  const res = http.get(`${BASE_URL}/api/public/articles?limit=10`);
  if (res.status === 200) {
    const articles = JSON.parse(res.body).articles || [];
    return articles.map(a => a.slug).filter(Boolean);
  }
  return ['test-article'];
}

// Main test
export default function(data) {
  const headers = {
    'Accept': 'application/json',
  };

  // Add session if available
  if (data.sessionToken) {
    headers['Cookie'] = `better_auth_session=${data.sessionToken}`;
  }

  group('Public API Endpoints', () => {
    // Test articles list
    let articlesRes = http.get(`${BASE_URL}/api/public/articles?limit=20`, { headers });
    check(articlesRes, {
      'articles list status is 200': (r) => r.status === 200,
      'articles list has data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.articles);
        } catch {
          return false;
        }
      },
      'articles list response time < 500ms': (r) => r.timings.duration < 500,
    });

    // Test article detail
    const slug = data.articleSlugs[Math.floor(Math.random() * data.articleSlugs.length)];
    let articleRes = http.get(`${BASE_URL}/api/public/articles/${slug}`, { headers });
    check(articleRes, {
      'article detail status is 200': (r) => r.status === 200 || r.status === 404, // 404 is acceptable if slug doesn't exist
      'article detail response time < 500ms': (r) => r.timings.duration < 500,
    });

    // Test categories list
    let categoriesRes = http.get(`${BASE_URL}/api/public/categories`, { headers });
    check(categoriesRes, {
      'categories list status is 200': (r) => r.status === 200,
      'categories list response time < 300ms': (r) => r.timings.duration < 300,
    });

    // Test tags list
    let tagsRes = http.get(`${BASE_URL}/api/public/tags`, { headers });
    check(tagsRes, {
      'tags list status is 200': (r) => r.status === 200,
      'tags list response time < 300ms': (r) => r.timings.duration < 300,
    });
  });

  // Randomly test authentication (10% of iterations)
  if (Math.random() < 0.1 && !data.sessionToken) {
    group('Authentication', () => {
      // Test login endpoint
      const loginPayload = JSON.stringify({
        email: `test${Date.now()}@example.com`,
        password: 'password123',
      });

      let loginRes = http.post(`${BASE_URL}/api/auth/login`, loginPayload, {
        headers: { 'Content-Type': 'application/json' },
      });

      check(loginRes, {
        'login responded': (r) => r.status === 200 || r.status === 401,
        'login response time < 1000ms': (r) => r.timings.duration < 1000,
      });
    });
  }
}

// Teardown
export function teardown(data) {
  // Clean up test data if needed
}
