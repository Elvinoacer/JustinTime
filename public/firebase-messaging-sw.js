importScripts(
  "https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js"
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
    payload
  );
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon || "/icons/icon-192x192.png", // Ensure you have this icon
    badge: payload.notification.badge || "/icons/badge-72x72.png", // Ensure you have this icon
    data: payload.data,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
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
