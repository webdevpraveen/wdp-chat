# 🚀 WDP Live Chat  
A fast, real-time chat application built using **Node.js**, **Express**, and **Socket.io**, paired with a clean and lightweight frontend.  
This repository contains both the backend server and the frontend client, ready for deployment on modern hosting platforms like **Render** (backend) and **Vercel** (frontend).

---

## 📸 Preview https://wdpchat.vercel.app
> <img width="500" height="480" alt="image" src="https://github.com/user-attachments/assets/a9bf0fcc-32e7-49c2-b0f6-703723ed13db" />


---

## ✨ Key Features
- ⚡ **Real-time messaging** powered by Socket.io  
- 👥 **Online users counter** with live updates  
- 🔔 **Notification sound** for incoming messages  
- 🧼 **Clean and responsive UI**  
- 🔗 Fully connected **Frontend ↔ Backend**  
- ☁️ Deployment-ready structure  
- 🧱 Simple file architecture — beginner friendly  

---

## 📂 Project Structure

```bash
wdp-chat/
│
├── backend/
│ ├── server.js
│ └── package.json
│
└── frontend/
└── index.html
```


---

## 🛠️ Tech Stack
- **Frontend:** HTML, CSS, JavaScript  
- **Backend:** Node.js, Express.js  
- **Real-time Engine:** Socket.io  
- **Hosting:** Vercel (frontend), Render (backend)

---

## 🧪 How to Run Locally

### 1️⃣ Clone the repository  
```bash
git clone https://github.com/webdevpraveen/wdp-chat.git
cd wdp-chat
cd backend
npm install
npm start
```
## 🌐 Deployment Instructions

### 🚀 Backend Deployment (Render)
Upload the `backend/` folder as a service.

Set:
- **Build command:** `npm install`
- **Start command:** `node server.js`

Render supports WebSockets automatically.

---

### 🎯 Frontend Deployment (Vercel)
- Select the `frontend/` folder during import.
- No build command required.
- Deploy as a static site.

---

## 🧭 Version History (Semantic Versioning)

| Version | Commit    | Description                                      |
|---------|-----------|--------------------------------------------------|
| **v1.0** | `a946698` | Frontend + Backend connected (initial stage)     |
| **v1.1** | `12472eb` | Backend linking improvements                     |
| **v2.0** | `bb385e2` | First major feature set added                    |
| **v2.1** | `912fa0e` | Notification sound added                         |
| **v2.2** | `e6fc87b` | Online user counter added                        |

🔗 **Full changelog:**  
https://github.com/webdevpraveen/wdp-chat/releases

---

## 🧑‍💻 Contributing
Contributions are welcome.  
Create an issue or submit a pull request to improve the project.

---

## 📄 License
This project is open-source and available under the **MIT License**.

---

## ⭐ Support
If you find this helpful, consider giving the repo a ⭐ on GitHub!
