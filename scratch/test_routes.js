const express = require('express');
try {
  console.log('Testing auth routes...');
  require('./routes/auth');
  console.log('Testing ticket routes...');
  require('./routes/tickets');
  console.log('Testing user routes...');
  require('./routes/users');
  console.log('All routes loaded successfully!');
} catch (e) {
  console.error('FAILED TO LOAD ROUTES:');
  console.error(e);
  process.exit(1);
}
