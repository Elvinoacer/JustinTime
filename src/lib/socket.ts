import { io } from 'socket.io-client';

// Create a singleton socket instance
// We use autoConnect: false so we can control when to connect (e.g. after auth)
export const socket = io('http://localhost:4000', {
  autoConnect: false,
  transports: ['websocket'],
});

