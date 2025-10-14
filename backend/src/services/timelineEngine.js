const {
  toISODate,
  addDays,
  parseHumanDuration,
  parsePossibleDateOrDayN,
} = require("../utils/time");

/**
 * processPlan(plan, opts)
 * plan: { goal, tasks[], dependencies[], schedule?, metadata? }
 * opts: { startDate?: ISO, totalDurationDays: number, defaultTaskDays?: number }
 */

function processPlan(plan, opts) {
  const {
    startDate = toISODate(new Date()),
    totalDurationDays,
    defaultTaskDays = 2,
  } = opts;

  if (!totalDurationDays || totalDurationDays <= 0) {
    return fail("INVALID_DURATION", "Total duration must be > 0 days.");
  }

  // Normalize tasks: ensure id uniqueness, infer duration/start/end
  const idSet = new Set();
  for (const t of plan.tasks || []) {
    if (!t.id || idSet.has(t.id))
      return fail("DUPLICATE_TASK_ID", `Task id duplicate or missing: ${t.id}`);
    idSet.add(t.id);
  }

  const tasks = (plan.tasks || []).map((t) =>
    normalizeTask(t, { defaultTaskDays })
  );
  const idToTask = Object.fromEntries(tasks.map((t) => [t.id, t]));

  // Build dependency graph, detect cycles
  const edges = (plan.dependencies || []).map((e) => ({
    from: e.from,
    to: e.to,
  }));
  const depResult = buildGraphAndTopo([...idSet], edges);
  if (!depResult.ok)
    return fail("CYCLE_DETECTED", depResult.message, {
      cycle: depResult.cycle,
    });

  const order = depResult.topo; // topological order of IDs

  // Scheduling (CPM-like)
  const start = new Date(startDate + "T00:00:00Z");

  // 1) Convert any Day N / deadline hints to absolute constraints
  for (const t of tasks) {
    // Interpret a string deadline like "Day 7"
    if (t.deadlineRaw) {
      if (t.deadlineRaw.kind === "dayN") {
        const d = addDays(start, t.deadlineRaw.day - 1);
        t.deadline = toISODate(d);
      } else if (t.deadlineRaw.kind === "date") {
        t.deadline = t.deadlineRaw.date;
      }
    }
  }

  // 2) Forward pass: ES/EF respecting dependencies
  const ES = {}; // earliest start (in day offsets)
  const EF = {}; // earliest finish (inclusive offset)
  for (const id of order) {
    ES[id] = 0;
    EF[id] = 0;
    const t = idToTask[id];
    const preds = incoming(edges, id).map((e) => e.from);
    const predEFs = preds.map(p => EF[p]).filter(v => typeof v === "number" && !isNaN(v));
    const maxPredEF = predEFs.length ? Math.max(...predEFs) : 0;

   

    // Earliest start is day after predecessor finish (contiguous). Using offsets starting at 0.
    ES[id] = maxPredEF;
    ES[id] = maxPredEF + 1;
  }

  // 3) If task has hard deadline date inside window, pull EF to meet it (without breaking deps)
  const startMs = start.getTime();
  for (const id of order) {
    const t = idToTask[id];

    if (t.deadline) {
      const dl = new Date(t.deadline + "T00:00:00Z").getTime();
      const dlOffset = Math.floor((dl - startMs) / (24 * 3600 * 1000)) + 1; // inclusive
       const dur = t.durationDays > 0 ? t.durationDays : defaultTaskDays;
      // Try to align EF with deadline if feasible (>= current EF, and >= predecessors)
      if (dlOffset >= EF[id]) {
        EF[id] = dlOffset;
        ES[id] = EF[id] - dur;
      }
    }
  }

  // 4) Backward pass for slack/critical path
  const projectEF = Math.max(...Object.values(EF));
  const LF = {}; // latest finish
  const LS = {}; // latest start
  for (const id of order.slice().reverse()) {
    const t = idToTask[id];
    const succs = outgoing(edges, id).map((e) => e.to);
    const dur = t.durationDays || defaultTaskDays;

    if (succs.length === 0) {
      LF[id] = projectEF;
    } else {
      LF[id] = Math.min(...succs.map((s) => LS[s]));
    }
    LS[id] = LF[id] - dur;
  }

  const slack = {};
  const criticalTaskIds = [];
  for (const id of order) {
    slack[id] = LS[id] - ES[id];
    if (slack[id] === 0) criticalTaskIds.push(id);
  }

  // 5) Clamp: push overflow tasks to end or flag infeasible
  let feasible = true;
  const overflow = [];
  for (const id of order) {
    if (EF[id] > totalDurationDays) {
      feasible = false;
      overflow.push(id);
      // Soft clamp: push within window by shifting ES/EF to end if possible
      const dur = idToTask[id].durationDays || defaultTaskDays;
      EF[id] = totalDurationDays;
      ES[id] = Math.max(0, EF[id] - dur);
    }
  }
  console.log("🟢 processPlan tasks:", tasks);
  console.log("🟢 ES:", ES);
  console.log("🟢 EF:", EF);

  // 6) Convert offsets -> absolute dates
  const schedule = order.map((id) => {
    const s = addDays(start, ES[id]); // ES offset 0 => start date
    const e = addDays(start, EF[id] - 1); // EF offset 1 => start date
    return {
      taskId: id,
      startDate: toISODate(s),
      endDate: toISODate(e),
    };
  });

  // 7) Final validation
  const val = validateSchedule({ tasks, edges, schedule });
  if (!val.ok)
    return fail("INVALID_SCHEDULE", val.message, { details: val.details });

  // 8) Build updated plan
  const enrichedTasks = tasks.map((t) => {
    const sch = schedule.find((s) => s.taskId === t.id);
    return {
      ...t.raw, // preserve original fields like title/status
      id: t.id,
      durationDays: t.durationDays || defaultTaskDays,
      startDate: sch.startDate,
      deadline: sch.endDate,
    };
  });

  const res = {
    ok: true,
    plan: {
      ...plan,
      tasks: enrichedTasks,
      schedule,
      metadata: {
        ...(plan.metadata || {}),
        startDate,
        totalDurationDays,
        feasible,
        overflow,
        criticalPath: criticalTaskIds,
        createdAt: plan?.metadata?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    },
  };
  return res;
}

/* ---------- helpers ---------- */

function normalizeTask(t, { defaultTaskDays }) {
  // Accepts: { id, title, deadline?, durationDays? }
  const deadlineRaw = parsePossibleDateOrDayN(t.deadline);
  const durationDays =
    parseHumanDuration(t.duration || t.durationDays) ||
    t.durationDays ||
    defaultTaskDays;

  return {
    id: t.id,
    raw: t,
    durationDays,
    deadlineRaw, // used later; may resolve to date
    deadline: t.deadline,
  };
}

function incoming(edges, node) {
  return edges.filter((e) => e.to === node);
}
function outgoing(edges, node) {
  return edges.filter((e) => e.from === node);
}

function buildGraphAndTopo(ids, edges) {
  const adj = new Map(ids.map((id) => [id, []]));
  const indeg = new Map(ids.map((id) => [id, 0]));

  for (const { from, to } of edges) {
    if (!adj.has(from) || !adj.has(to)) {
      return {
        ok: false,
        message: `Dependency references unknown task: ${from} -> ${to}`,
      };
    }
    adj.get(from).push(to);
    indeg.set(to, indeg.get(to) + 1);
  }

  // Kahn's algorithm for topo + cycle detect
  const q = ids.filter((id) => indeg.get(id) === 0);
  const topo = [];
  for (let i = 0; i < q.length; i++) {
    const u = q[i];
    topo.push(u);
    for (const v of adj.get(u)) {
      indeg.set(v, indeg.get(v) - 1);
      if (indeg.get(v) === 0) q.push(v);
    }
  }
  if (topo.length !== ids.length) {
    // find a cycle roughly by nodes with indegree > 0
    const cycle = ids.filter((id) => indeg.get(id) > 0);
    return { ok: false, message: "Cycle detected in dependencies.", cycle };
  }
  return { ok: true, topo };
}

function validateSchedule({ tasks, edges, schedule }) {
  const idToSch = Object.fromEntries(schedule.map((s) => [s.taskId, s]));
  const errors = [];

  for (const t of tasks) {
    const sch = idToSch[t.id];
    const sd = new Date(sch.startDate + "T00:00:00Z");
    const ed = new Date(sch.endDate + "T00:00:00Z");
    if (ed < sd) errors.push(`Negative duration for ${t.id}`);
  }
  for (const { from, to } of edges) {
    const a = idToSch[from];
    const b = idToSch[to];
    const aEnd = new Date(a.endDate + "T00:00:00Z");
    const bStart = new Date(b.startDate + "T00:00:00Z");
    if (aEnd.getTime() > bStart.getTime())
      errors.push(`Dependency inversion: ${from} ends after ${to} starts`);
  }

  return errors.length
    ? { ok: false, message: "Schedule invalid", details: errors }
    : { ok: true };
}

function fail(code, message, extra = {}) {
  return { ok: false, error: { code, message, ...extra } };
}

module.exports = { processPlan, parseHumanDuration };
