const express = require("express");
const planRoutes = require("./routes/planRoutes");
const errorHandler = require("./middleware/errorHandler");
const cors = require("cors");

require("dotenv").config();


const app = express();

// ✅ Initialize middleware in correct order
app.use(cors({
  origin: "http://localhost:5500",   // your frontend
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));


app.use(express.json());


app.use("/api", planRoutes);

app.use(errorHandler);

module.exports = app;
