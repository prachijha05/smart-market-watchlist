import api from "./client";

export const getWatchlist = () => api.get("/watchlist").then((r) => r.data);

export const addSymbol = (symbol, alertPriceHigh, alertPriceLow) =>
  api
    .post("/watchlist", { symbol, alertPriceHigh, alertPriceLow })
    .then((r) => r.data);

export const removeSymbol = (id) =>
  api.delete(`/watchlist/${id}`).then((r) => r.data);

export const updateAlerts = (id, alertPriceHigh, alertPriceLow) =>
  api
    .patch(`/watchlist/${id}`, { alertPriceHigh, alertPriceLow })
    .then((r) => r.data);

export const getChanges = () =>
  api.get("/watchlist/changes").then((r) => r.data);

export const markSeen = (symbol) =>
  api.post(`/watchlist/${symbol}/seen`).then((r) => r.data);

export const getHistory = (symbol) =>
  api.get(`/market/${symbol}/history`).then((r) => r.data);
