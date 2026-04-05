import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";

type ApiErrorPayload = {
  message?: string;
  error?: string;
  code?: string;
  [key: string]: unknown;
};

function extractApiErrorMessage(
  payload: unknown,
  fallback: string,
): { message: string; code?: string } {
  if (typeof payload === "string" && payload.trim().length > 0) {
    return { message: payload };
  }

  if (payload && typeof payload === "object") {
    const data = payload as ApiErrorPayload;
    const message =
      (typeof data.error === "string" && data.error) ||
      (typeof data.message === "string" && data.message) ||
      fallback;
    const code = typeof data.code === "string" ? data.code : undefined;
    return { message, code };
  }

  return { message: fallback };
}

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "/api",
  timeout: 30000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get token from localStorage or session storage
    const token =
      typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log requests in development
    if (process.env.NODE_ENV === "development") {
      console.log(
        `[API Request] ${config.method?.toUpperCase()} ${config.url}`,
        config.data,
      );
    }

    return config;
  },
  (error: AxiosError) => {
    console.error("[API Request Error]", error);
    return Promise.reject(error);
  },
);

// Response interceptor - handle errors consistently
apiClient.interceptors.response.use(
  (response) => {
    // Log responses in development
    if (process.env.NODE_ENV === "development") {
      console.log(`[API Response] ${response.config.url}`, response.data);
    }
    return response;
  },
  (error: AxiosError) => {
    // Handle common error scenarios
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const normalized = extractApiErrorMessage(
        error.response.data,
        error.message,
      );
      const message = normalized.message;

      switch (status) {
        case 401:
          // Unauthorized - next-auth will handle session invalidation.
          // Removed manual window.location.href to prevent jarring redirects
          // during onboarding or session generation lags.
          console.warn(
            "[API] 401 Unauthorized received. Session might be expired or lagging.",
          );
          break;
        case 403:
          console.error("[API] Forbidden:", message);
          break;
        case 404:
          console.error("[API] Not Found:", message);
          break;
        case 500:
          console.error("[API] Server Error:", message);
          break;
        default:
          console.error(`[API] Error ${status}:`, message);
      }

      return Promise.reject({
        status,
        message,
        code: normalized.code,
        data: error.response.data,
      });
    } else if (error.request) {
      // Request made but no response
      console.error("[API] No Response:", error.request);
      return Promise.reject({
        status: 0,
        message: "No response from server. Please check your connection.",
      });
    } else {
      // Something else happened
      console.error("[API] Error:", error.message);
      return Promise.reject({
        status: 0,
        message: error.message,
      });
    }
  },
);

export default apiClient;
