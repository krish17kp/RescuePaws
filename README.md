RescuePaws

Real-time coordination platform for reporting injured or stranded animals and connecting them with nearby responders.

Technical Overview

RescuePaws is a full-stack web application designed to coordinate animal rescue operations in real time.

The system allows users to report rescue incidents, while responders receive alerts and coordinate the rescue through a shared dashboard.

The backend exposes REST APIs for authentication, case creation, and responder assignment, while WebSocket communication enables live updates between reporters and responders.

Location data is visualized on an interactive map so responders can quickly identify the rescue location and navigate to the scene.

Architecture
Client (React + Vite)
        │
        │  REST API (Axios)
        ▼
Backend (Node.js + Express)
        │
        │  WebSockets
        ▼
Socket.IO Server
        │
        ▼
PostgreSQL Database
Tech Stack

Frontend
-React
-Vite
-React Router
-Axios
-Leaflet / React-Leaflet

Backend
-Node.js
-Express.js
-Socket.IO

Database
-PostgreSQL

Key Features

-Emergency case reporting

-Role-based dashboards (Reporter / Responder / Admin)

-Real-time rescue coordination using WebSockets

-Live incident location visualization

Status tracking for rescue operations

Screenshots
Victim Interface

Responder Interface

Local Setup
# clone repository
git clone https://github.com/krish17kp/RescuePaws.git

# backend
cd backend
npm install
npm run dev

# frontend
cd ../frontend
npm install
npm run dev
