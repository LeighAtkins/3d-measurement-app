
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
};

const BASE_URL = 'http://localhost:8000';
let token;

export function setup() {
  const res = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: 'admin@acme.com',
    password: 'admin123',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  token = res.json().token;
}

export default function () {
  const res = http.get(`${BASE_URL}/api/orders`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  check(res, {
    'is status 200': (r) => r.status === 200,
  });
  sleep(1);
}
