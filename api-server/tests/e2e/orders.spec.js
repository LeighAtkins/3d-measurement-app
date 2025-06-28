
const { test, expect } = require('@playwright/test');

test.describe('Orders API', () => {
  let token;

  test.beforeAll(async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: {
        email: 'admin@acme.com',
        password: 'admin123',
      },
    });
    const data = await response.json();
    token = data.token;
  });

  test('should create a new order', async ({ request }) => {
    const response = await request.post('/api/orders', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      data: {
        title: 'Test Order',
        description: 'This is a test order',
        status: 'PENDING',
      },
    });
    const data = await response.json();
    expect(response.status()).toBe(201);
    expect(data.title).toBe('Test Order');
  });
});
