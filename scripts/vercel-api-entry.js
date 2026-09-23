'use strict';

require('reflect-metadata');

const fs = require('fs');
const path = require('path');

const localPack = path.join(__dirname, 'pack');
if (!process.env.PACK_DIR && fs.existsSync(localPack)) {
  process.env.PACK_DIR = localPack;
}

const { createNestServer } = require('../backend/dist/vercel');

let cached;

module.exports = async function handler(req, res) {
  if (!cached) {
    cached = await createNestServer();
  }
  return cached(req, res);
};
