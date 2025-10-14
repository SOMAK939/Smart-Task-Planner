const planRequestSchema = {
  type: "object",
  required: ["goal", "duration"],
  properties: {
    goal: { type: "string", minLength: 5 },
    duration: { type: "integer", minimum: 1, maximum: 365 },
    startDate: { type: "string", format: "date" }
  },
  additionalProperties: false
};

const planResponseSchema = {
  type: "object",
  required: ["id", "goal", "tasks", "metadata"],
  properties: {
    id: { type: "string" },
    goal: { type: "string" },
    tasks: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "title", "deadline", "status"],
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          deadline: { type: "string", format: "date" },
          status: { type: "string", enum: ["pending", "in-progress", "done"] }
        }
      },
      uniqueItems: true
    },
    dependencies: {
      type: "array",
      items: {
        type: "object",
        required: ["from", "to"],
        properties: {
          from: { type: "string" },
          to: { type: "string" }
        }
      }
    },
    schedule: {
      type: "array",
      items: {
        type: "object",
        required: ["taskId", "startDate", "endDate"],
        properties: {
          taskId: { type: "string" },
          startDate: { type: "string", format: "date" },
          endDate: { type: "string", format: "date" }
        }
      }
    },
    metadata: {
      type: "object",
      required: ["createdAt"],
      properties: {
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
        llmModel: { type: "string" },
        tokenUsage: { type: "integer" },
        costUSD: { type: "number" }
      }
    }
  }
};

module.exports = { planRequestSchema, planResponseSchema };
