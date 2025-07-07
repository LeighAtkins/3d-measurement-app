const fetch = require('node-fetch');

(async () => {
  try {
    // First we need to get a valid JWT token
    console.log('Logging in...');
    const loginResponse = await fetch('http://localhost:8001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@acme.com', password: 'admin123' })
    });
    
    if (!loginResponse.ok) {
      throw new Error('Login failed: ' + loginResponse.status);
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('Login successful');
    
    // Now trigger a new 3D generation for the failed order
    const orderId = '75196556-278e-4bec-a336-896b59ca03b0';
    console.log('Starting 3D generation for order:', orderId);
    const response = await fetch('http://localhost:8001/api/furniture/generate-3d', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ orderId, attempts: 1, seed: 12345 })
    });
    
    const data = await response.json();
    console.log('Generation response:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('SUCCESS: 3D generation started successfully!');
      console.log('The temporary file fix appears to be working.');
    } else {
      console.log('FAILED: Generation did not start:', data.error);
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  }
})();