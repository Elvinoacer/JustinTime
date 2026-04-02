importScripts(
  "https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js",
);

// Initialize the Firebase app in the service worker by passing in the messagingSenderId.
firebase.initializeApp({
  apiKey: "AIzaSyCDHlQoseyaiNH2SileoFJHVxZGv79I8dI",
  authDomain: "justintime-92b96.firebaseapp.com",
  projectId: "justintime-92b96",
  storageBucket: "justintime-92b96.firebasestorage.app",
  messagingSenderId: "462633751558",
  appId: "1:462633751558:web:edded7909180ed715b9f87",
});

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload,
  );
  // Customize notification here
  const notificationTitle = payload.notification?.title || "New notification";
  const notificationOptions = {
    body: payload.notification?.body || "You have a new update.",
    icon: payload.notification?.icon || "/icons/icon-192x192.png", // Ensure you have this icon
    badge: payload.notification?.badge || "/icons/badge-72x72.png", // Ensure you have this icon
    data: payload.data,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener("notificationclick", function (event) {
  const fallbackUrl = "/";
  const targetPath = event.notification?.data?.url || fallbackUrl;
  const targetUrl = new URL(targetPath, self.location.origin).href;

  event.notification.close();

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (windowClients) {
        for (let i = 0; i < windowClients.length; i += 1) {
          const client = windowClients[i];
          if (client.url === targetUrl && "focus" in client) {
            return client.focus();
          }
        }

        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }

        return undefined;
      }),
  );
});

/////

// // Import the functions you need from the SDKs you need
// import { initializeApp } from "firebase/app";
// // TODO: Add SDKs for Firebase products that you want to use
// // https://firebase.google.com/docs/web/setup#available-libraries

// // Your web app's Firebase configuration
// const firebaseConfig = {
//   apiKey: "AIzaSyCDHlQoseyaiNH2SileoFJHVxZGv79I8dI",
//   authDomain: "justintime-92b96.firebaseapp.com",
//   projectId: "justintime-92b96",
//   storageBucket: "justintime-92b96.firebasestorage.app",
//   messagingSenderId: "462633751558",
//   appId: "1:462633751558:web:edded7909180ed715b9f87"
// };

// // Initialize Firebase
// const app = initializeApp(firebaseConfig);
