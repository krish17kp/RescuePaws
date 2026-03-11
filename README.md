
RescuePaws is a real-time emergency coordination platform for animal rescues. It connects reporters, responders, and administrators to quickly report incidents, assign rescuers, and coordinate help using live updates and location sharing.

The backend is built with Node.js and Express, providing REST APIs for authentication, case management, and responder coordination. PostgreSQL is used as the primary database to store users, rescue cases, and operational data.

Real-time communication between reporters and responders is handled using Socket.IO, allowing the system to push live updates such as case status changes, responder assignments, and location updates.

The frontend is developed using React with Vite, providing a responsive dashboard for different roles including victim/reporters, responders, and administrators. The UI communicates with backend services through Axios-based API calls and WebSocket connections for real-time events.

Location visualization is implemented using Leaflet and React-Leaflet, enabling responders to view incident locations and navigate to rescue sites.

The project follows a modular architecture separating routes, middleware, sockets, and database configuration in the backend while maintaining reusable components and context-based state management in the frontend.

Tech Stack

Frontend

React

Vite

React Router

Axios

React Leaflet

Backend

Node.js

Express.js

Socket.IO

Database

PostgreSQL

Other Tools

JWT Authentication

Multer (file uploads)

WebSockets for real-time communication
## Project Preview

![Preview 1](assets/preview%201%20edit.png)

![Preview 2](assets/preview%202%20edit.png)
