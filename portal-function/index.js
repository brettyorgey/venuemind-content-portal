const { app } = require("@azure/functions");

// Register all function handlers
require("./events");
require("./allocations");
require("./content");
require("./anthropicProxy");
