const express = require('express');
const Gun = require('gun');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '50mb' }));

// Health check endpoint for Render.com
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve index.html for SPA routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize Express Server
const server = app.listen(port, () => {
  console.log(`================================================`);
  console.log(`🚀 InstaP2P High-Scale Node running on port ${port}`);
  console.log(`🔗 Local URL: http://localhost:${port}`);
  console.log(`⚡ 0% Disk Storage Load Mode Active for Render.com`);
  console.log(`================================================`);
});

// Initialize GunDB P2P Peer Relay in RAM (file: false guarantees 0% disk load on Render)
Gun({ web: server, file: false });
