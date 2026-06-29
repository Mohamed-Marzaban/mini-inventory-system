import axios from "axios";

// One configured axios instance the whole app shares
export const api = axios.create({
  baseURL: "http://localhost:3000",
});

// Before every request, attach the saved token (if we have one)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If any response is 401 (unauthorized), the token is bad/expired —
// clear it and send the user back to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.includes("/auth/login");

    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);
