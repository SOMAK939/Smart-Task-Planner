# Smart-Task-Planner
# DEMO VIDEO : https://drive.google.com/file/d/1XYWe93LiGo258WAzZq6ajfEL4032RmT6/view?usp=sharing

---

## ⚙️ Setup Instructions

### Backend
1. Go into backend folder
   ```bash
   cd backend
2.Install dependencies

npm install

3.Create a .env file with required variables:

GEMINI_API_KEY=USE_YOUR_OWN_KEY

MONGO_URI=USE_YOUR_ATLAS_STRING 


4.Run server

npm run dev

5.Run frontend

Right click on the index.html page and click on "Open with Live Server"

###NOTE: The model used here might get overloaded. After clicking on 'Generate Plan' it might show the following error:
LLM error: GoogleGenerativeAIFetchError: [GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent: [503 Service Unavailable] The model is overloaded. Please try again later.

Click the button 'Generate Plan' again .It should work.
