const app = require("./src/app");
const connectDB = require("./src/config/db");
require("dotenv").config();


const PORT = process.env.PORT || 8080;
app.get('/', (req, res) => {
  res.send('API is running....');
});

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
