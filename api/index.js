'use strict';

const path = require('path');
const fs = require('fs');

let serverPromise;

function loadNest() {
  const candidates = [
    path.join(__dirname, '..', 'backend', 'dist', 'vercel.js'),
    path.join(process.cwd(), 'backend', 'dist', 'vercel.js'),
    path.join(__dirname, 'backend', 'dist', 'vercel.js'),
  ];
  const tried = [];
  for (const file of candidates) {
    tried.push(file);
    if (fs.existsSync(file)) {
      return require(file);
    }
  }
  throw new Error(`Nest server bundle not found. Tried: ${tried.join(' | ')}`);
}

module.exports = async function handler(req, res) {
  if (!serverPromise) {
    serverPromise = loadNest().createNestServer();
  }
  const server = await serverPromise;
  return server(req, res);
};
