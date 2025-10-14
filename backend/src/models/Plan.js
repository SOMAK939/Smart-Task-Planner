const mongoose = require("mongoose");
const TaskSchema = require("./Task");

const PlanSchema = new mongoose.Schema({
  goal: { type: String, required: true, text: true },
  parsedDuration: { type: Number, required: true }, // in days
  startDate: { type: Date, required: true },
  endDate: { type: Date },

  // Embedded tasks
  tasks: [TaskSchema],

  // Edges/dependencies (redundant but useful for queries)
  edges: [{
    from: { type: String, required: true },
    to: { type: String, required: true }
  }],

  // Metadata for auditing
  metadata: {
    model: { type: String },     // e.g. gemini-1.5-pro
    cost: { type: Number },      // estimated tokens cost
    latency: { type: Number },   // ms
    rawLLMOutput: { type: Object } // store raw JSON
  },

  status: { type: String, enum: ["active", "archived"], default: "active" },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
});

// Indexes for search
PlanSchema.index({ createdAt: -1 });
PlanSchema.index({ userId: 1 });
PlanSchema.index({ goal: "text" });

const Plan = mongoose.model("Plan", PlanSchema);
module.exports = Plan;
