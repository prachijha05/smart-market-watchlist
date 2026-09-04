// Central axios instance — every request automatically carries the
// deviceId header, so components never have to think about auth.
import axios from "axios";

const DEVICE_ID_KEY = "watchlist_device_id";

function getOrCreateDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

const api = axios.create({
  baseURL: "http://localhost:5000/api",
});

api.interceptors.request.use((config) => {
  config.headers["x-device-id"] = getOrCreateDeviceId();
  return config;
});

export default api;
