# 🚀 WDP Live Chat  
A fast, real-time chat application built using **HTML**, **Js**, and **Socket.io**, paired with a clean and lightweight frontend.  
**Render** (backend) and **Vercel** (frontend).

---

## 📸 Preview
> <img width="500" height="480" alt="image" src="https://github.com/user-attachments/assets/a9bf0fcc-32e7-49c2-b0f6-703723ed13db" />
https://wdpchat.vercel.app/
---
## ✨ Key Features
- ⚡ **Real-time messaging** powered by Socket.io  
- 👥 **Online users counter** with live updates  
- 🔔 [**Notification Sound**](https://github.com/user-attachments/files/24163542/notifications.mp3) for incoming messages
* for incoming messages  
- 🧼 **Clean and responsive UI**  
- 🔗 Fully connected **Frontend ↔ Backend**    
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
  ├── assests/
  │      ├─ chat-bg.png
  │      └── notifications.mp3
  ├── index.html
  ├── dm.html
  └── about.html
```


---

## 🛠️ Tech Stack
- **Frontend:** HTML, CSS, JavaScript  
- **Backend:** Node.js  
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
🔗 **Full changelog:**  
https://github.com/webdevpraveen/wdp-chat/releases

---

## 🧑‍💻 Contributing
Contributions are welcome.  
Create an issue or submit a pull request to improve the project.

---

## ⭐ Support
If you find this helpful, consider giving the repo a ⭐.
