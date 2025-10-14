const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema({
  taskId: { type: String, required: true },      // matches LLM ID
  title: { type: String, required: true },
  description: { type: String },
  duration: { type: Number },                    // in days
  startDate: { type: Date },
  endDate: { type: Date },
  dependencies: [{ type: String }]               // list of taskIds
}, { _id: false }); // prevent auto _id for subdocs

module.exports = TaskSchema; // we embed inside Plan
