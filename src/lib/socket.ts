import { io, Socket } from "socket.io-client";

// Create a mock socket object for SSR
const createMockSocket = (): Socket =>
  ({
    connect: () => ({}) as any,
    disconnect: () => {},
    emit: () => ({}) as any,
    on: () => ({}) as any,
    off: () => ({}) as any,
    id: "",
  }) as unknown as Socket;

// Create a singleton socket instance
// We use autoConnect: false so we can control when to connect (e.g. after auth)
// Only initialize on the client side to avoid SSR issues
export const socket: Socket =
  typeof window !== "undefined"
    ? io(process.env.NEXT_PUBLIC_SOCKET_ENDPOINT || "http://localhost:4000", {
        autoConnect: false,
        transports: ["websocket"],
      })
    : createMockSocket();
