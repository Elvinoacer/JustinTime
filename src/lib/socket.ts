import { io, Socket } from "socket.io-client";

// Create a mock socket object for SSR or when socket server is not available
const createMockSocket = (): Socket =>
  ({
    connect: () => ({}) as any,
    disconnect: () => {},
    emit: () => ({}) as any,
    on: () => ({}) as any,
    off: () => ({}) as any,
    connected: false,
    id: "",
  }) as unknown as Socket;

// Check if we have a valid socket endpoint configured
// A valid endpoint should be a real URL, not localhost in production
const getSocketEndpoint = (): string | null => {
  // Check if browser environment
  if (typeof window === "undefined") return null;
  
  const configuredEndpoint = process.env.NEXT_PUBLIC_SOCKET_ENDPOINT;
  const isProduction = window.location.hostname !== "localhost";
  
  // In production, use the Render socket server
  if (isProduction) {
    // Use configured endpoint if it's not localhost, otherwise use Render
    if (configuredEndpoint && !configuredEndpoint.includes("localhost")) {
      return configuredEndpoint;
    }
    // Fallback to Render socket server
    return "https://jit-socket.onrender.com";
  }
  
  // In development, use configured endpoint or localhost
  return configuredEndpoint || "http://localhost:4000";
};

// Create a singleton socket instance
// We use autoConnect: false so we can control when to connect (e.g. after auth)
// Only initialize on the client side to avoid SSR issues
const socketEndpoint = typeof window !== "undefined" ? getSocketEndpoint() : null;

export const socket: Socket =
  typeof window !== "undefined" && socketEndpoint
    ? io(socketEndpoint, {
        autoConnect: false,
        transports: ["websocket", "polling"], // Try websocket first, fallback to polling
        reconnection: true, // Enable automatic reconnection
        reconnectionAttempts: 5, // Limit reconnection attempts
        reconnectionDelay: 1000, // Start with 1 second
        reconnectionDelayMax: 5000, // Max 5 seconds between attempts
        timeout: 10000, // 10 second connection timeout
      })
    : createMockSocket();

// Export a flag to check if socket is enabled
export const isSocketEnabled = !!socketEndpoint;

