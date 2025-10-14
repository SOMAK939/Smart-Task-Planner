document.getElementById("searchForm").addEventListener("submit", async function(e) {
  e.preventDefault();

  const planId = document.getElementById("planId").value.trim();
  const resultDiv = document.getElementById("searchResult");

  try {
 const response = await fetch(`http://localhost:8080/api/plans/${planId}`, {
  method: "GET",
  headers: { "Content-Type": "application/json" }
});


    const data = await response.json();

    if (!response.ok) {
      resultDiv.innerHTML = `<p style="color:red;">Error: ${data.message || "Plan not found"}</p>`;
      return;
    }

    // Build result UI
    let output = `
      <h2>Plan Found</h2>
      <p><strong>Plan ID:</strong> ${data._id}</p>
      <p><strong>Goal:</strong> ${data.goal}</p>
      <p><strong>Duration:</strong> ${data.parsedDuration} days</p>
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

    resultDiv.innerHTML = output;

  } catch (error) {
    resultDiv.innerHTML = `<p style="color:red;">Error fetching plan: ${error.message}</p>`;
  }
});
