Render deployment instructions — Node WebSocket server

1) Create a Render account
   - https://render.com
   - sign in with GitHub for easiest setup

2) Create a new "Web Service"
   - Connect your GitHub repo `wangxiaoweigood/xian`
   - In the create form:
     - Environment: Docker
     - Branch: main (or master)
     - Root: (leave empty unless server.js is in a subfolder)
     - Instance Type: Free
   - Render will detect the Dockerfile and build the image.

3) Build & Run
   - The Dockerfile exposes port 3000; Render maps the PORT environment variable automatically.
   - After deploy completes, Render will provide a public URL like `https://mige-online.onrender.com`.
   - Use the wss (secure websocket) endpoint for clients: `wss://<your-service>.onrender.com`

4) Update client (optional)
   - On the web client, when clicking "在线", enter `wss://<your-service>.onrender.com` (replace with your Render URL).
   - If you host the client on GitHub Pages, use `wss://...` for secure connections.

5) Troubleshooting
   - Check Logs in Render dashboard if server fails to start.
   - Ensure `PORT` is not hardcoded (server reads process.env.PORT).
   - If you want auto-deploy from pushes, keep the GitHub connection enabled.


