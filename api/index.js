'use strict';

let serverPromise;

module.exports = async function handler(req, res) {
  if (!serverPromise) {
    serverPromise = require('../backend/dist/vercel').createNestServer();
  }
  const server = await serverPromise;
  return server(req, res);
};
