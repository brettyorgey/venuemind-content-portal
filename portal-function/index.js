// index.js — Function App entry point
// Explicitly requires all function registration files.
// Required for Azure Functions v4 Node.js runtime with EnableWorkerIndexing.
require('./anthropicProxy');
require('./events');
require('./allocations');