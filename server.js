'use strict';

require('reflect-metadata');

const { createNestServer } = require('./backend/dist/vercel');

let cached;

module.exports = async function handler(req, res) {
  if (!cached) {
    cached = await createNestServer();
  }
  return cached(req, res);
};
