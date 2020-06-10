const { override, addWebpackPlugin } = require("customize-cra");
const WorkerPlugin = require("worker-plugin");

module.exports = override(addWebpackPlugin(new WorkerPlugin()));
