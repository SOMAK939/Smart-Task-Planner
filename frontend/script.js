// --- Create Plan ---
document.getElementById("planForm").addEventListener("submit", async function(e) {
  e.preventDefault();

  const goal = document.getElementById("goal").value;
  const duration = parseInt(document.getElementById("duration").value, 10);
  const startDate = document.getElementById("startDate").value;

  try {
    const response = await fetch("http://localhost:8080/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal, duration, startDate })
    });

    const data = await response.json();

    if (!response.ok) {
      document.getElementById("output").innerHTML =
        `<p style="color:red;">Error: ${data.message || JSON.stringify(data)}</p>`;
      return;
    }

    let output = `
      <h2>Plan Generated</h2>
      <p><strong>Plan ID:</strong> ${data._id}</p>
      <p><strong>Goal:</strong> ${data.goal}</p>
      <h3>Tasks</h3>
    `;

    data.tasks.forEach((task, index) => {
      output += `
        <div class="task">
          <strong>Step ${index + 1}: ${task.title}</strong><br>
          Start: ${task.startDate.split("T")[0]} | End: ${task.endDate.split("T")[0]}
        </div>
      `;
    });

    document.getElementById("output").innerHTML = output;
  } catch (error) {
    document.getElementById("output").innerHTML =
      `<p style="color:red;">Error fetching plan: ${error.message}</p>`;
  }
});

// --- Search Plan by ID ---
document.getElementById("searchForm").addEventListener("submit", async function(e) {
  e.preventDefault();
  const planId = document.getElementById("planId").value.trim();
  const resultDiv = document.getElementById("searchResult");

  try {
    const response = await fetch(`http://localhost:8080/api/plans/${planId}`);
    const data = await response.json();

    if (!response.ok) {
      resultDiv.innerHTML = `<p style="color:red;">Error: ${data.error || data.message || "Plan not found"}</p>`;
      return;
    }

    let output = `
      <h3>Plan Found</h3>
      <p><strong>ID:</strong> ${data._id || data.id}</p>
      <p><strong>Goal:</strong> ${data.goal}</p>
      <h4>Tasks</h4>
    `;

    data.tasks.forEach((task, index) => {
      output += `
        <div class="task">
          <strong>Step ${index + 1}: ${task.title}</strong><br>
          Start: ${task.startDate.split("T")[0]} | End: ${task.endDate.split("T")[0]}
        </div>
      `;
    });

    resultDiv.innerHTML = output;
  } catch (error) {
    resultDiv.innerHTML = `<p style="color:red;">Error: ${error.message}</p>`;
  }
});

// --- View All Plans ---
// --- View All Plans with pagination ---
document.getElementById("loadPlansBtn").addEventListener("click", async function() {
  const allPlansDiv = document.getElementById("allPlans");
  allPlansDiv.innerHTML = "<p>Loading...</p>";

  try {
    // You can add filters here if you like, e.g. ?page=1&limit=5
    const response = await fetch("http://localhost:8080/api/plans?page=1&limit=10");
    const data = await response.json();

    if (!response.ok) {
      allPlansDiv.innerHTML = `<p style="color:red;">Error: ${data.error || "Unable to fetch plans"}</p>`;
      return;
    }

    if (!data.data || data.data.length === 0) {
      allPlansDiv.innerHTML = "<p>No plans found.</p>";
      return;
    }

    let output = `
      <p><strong>Total Plans:</strong> ${data.total} | 
      <strong>Page:</strong> ${data.page} | 
      <strong>Limit:</strong> ${data.limit}</p>
    `;

    data.data.forEach(plan => {
      output += `
        <div class="task">
          <p><strong>ID:</strong> ${plan._id}</p>
          <p><strong>Goal:</strong> ${plan.goal}</p>
          <p><strong>Status:</strong> ${plan.status || "N/A"}</p>
          <p><strong>Duration:</strong> ${plan.parsedDuration || "N/A"} days</p>
          <p><strong>Created At:</strong> ${new Date(plan.createdAt).toLocaleString()}</p>
          <hr>
        </div>
      `;
    });

    allPlansDiv.innerHTML = output;
  } catch (error) {
    allPlansDiv.innerHTML = `<p style="color:red;">Error: ${error.message}</p>`;
  }
});
