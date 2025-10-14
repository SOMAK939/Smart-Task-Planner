const express = require("express");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const { planRequestSchema } = require("../utils/schemas");
const validateSchema = require("../middleware/validate");
const { generatePlan } = require("../services/llmService");     // Phase 3
const { processPlan, parseHumanDuration } = require("../services/timelineEngine");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const mongoose = require("mongoose");


const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(planRequestSchema);
const Plan = require("../models/Plan");



function normalizeDraft(draft, planStartDate, defaultTaskDays = 2) {
  const scheduleMap = {};
  if (draft.schedule) {
    for (const s of draft.schedule) {
      scheduleMap[s.taskId] = s;
    }
  }

  draft.tasks = (draft.tasks || []).map((t, i) => {
    const sched = scheduleMap[t.id] || {};
    const duration =
      t.durationDays ||
      (sched.startDate && sched.endDate
        ? Math.max(
            1,
            Math.ceil(
              (new Date(sched.endDate) - new Date(sched.startDate)) /
                (1000 * 60 * 60 * 24)
            ) + 1
          )
        : defaultTaskDays);

    return {
      id: t.id || `t${i + 1}`,
      title: t.title || `Task ${i + 1}`,
      status: t.status || "pending",
      durationDays: duration,
      startDate: t.startDate || sched.startDate || planStartDate,
      deadline: t.deadline || sched.endDate || planStartDate
    };
  });

  return draft;
}

// POST /plan

router.post(
  "/plan",
  validateSchema(planRequestSchema),
  async (req, res, next) => {
   

   

    const { goal, duration, startDate, userId } = req.body;
    

    try {
      // 1) Generate draft with Gemini
      let draft = await generatePlan(goal, duration, startDate);
      draft = normalizeDraft(draft, startDate);

      draft.goal ||= goal;
      draft.tasks ||= [];
      draft.dependencies ||= [];

      // ✅ Ensure root-level id
      if (!draft.id) {
        draft.id = uuidv4();
      }
      

      // 2) Process with timeline engine
      const result = processPlan(draft, {
        startDate,
        totalDurationDays: duration,
        defaultTaskDays: 2,
      });

      if (!result.ok) {
        return res.status(422).json({ error: result.error });
      }

      validateOutput(result.plan);

      const finalPlan = result.plan;

      // 3) Save to Mongo
      const planDoc = new Plan({
        id: finalPlan.id, // ✅ save custom UUID
        goal: finalPlan.goal,
        parsedDuration: duration,
        startDate: finalPlan.metadata.startDate,
        endDate: finalPlan.schedule.length
          ? finalPlan.schedule[finalPlan.schedule.length - 1].endDate
          : startDate,
        tasks: finalPlan.tasks.map((t) => ({
          taskId: t.id,
          title: t.title,
          description: t.description || "",
          duration: t.durationDays,
          startDate: t.startDate,
          endDate: t.deadline,
          dependencies: (finalPlan.dependencies || [])
            .filter((d) => d.to === t.id)
            .map((d) => d.from),
        })),
        edges: finalPlan.dependencies,
        metadata: {
          model: "gemini-2.5-flash",
          rawLLMOutput: draft,
        },
        userId: userId || null,
      });

      await planDoc.save();

      // ✅ Send single response
      return res.status(201).json(planDoc);
    } catch (err) {
      return next(err); // ✅ Forward errors
    }
  }
);

router.get("/plans", async (req, res) => {
  try {
    const { goal, status, from, to, page = 1, limit = 10 } = req.query;
    const query = {};

    if (goal) query.$text = { $search: goal };
    if (status) query.status = status;
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }

    const skip = (page - 1) * limit;
    const plans = await Plan.find(query).skip(skip).limit(Number(limit)).sort({ createdAt: -1 });
    const count = await Plan.countDocuments(query);

    res.json({ total: count, page: Number(page), limit: Number(limit), data: plans });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch plans" });
  }
});

// GET /plans/:id
const validateOutput = require("../middleware/outputValidate");


router.get("/plans/:id", async (req, res, next) => {
  try {
    let { id } = req.params;
    id = id.trim(); // remove accidental newline or spaces

    let plan;

    if (mongoose.Types.ObjectId.isValid(id)) {
      // Looks like a Mongo ObjectId
      plan = await Plan.findById(id);
    } else {
      // Treat as custom UUID
      plan = await Plan.findOne({ id });
    }

    if (!plan) {
      return res.status(404).json({ error: "Plan not found" });
    }

    return res.json(plan);
  } catch (err) {
    return next(err);
  }
});




    

module.exports = router;
