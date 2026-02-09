import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const api = {
  login: (pin) => axios.post(`${API}/auth/login`, { pin }),

  getIncomes: (params) => axios.get(`${API}/incomes`, { params }),
  createIncome: (data) => axios.post(`${API}/incomes`, data),
  deleteIncome: (id) => axios.delete(`${API}/incomes/${id}`),

  getExpenses: (params) => axios.get(`${API}/expenses`, { params }),
  createExpense: (data) => axios.post(`${API}/expenses`, data),
  deleteExpense: (id) => axios.delete(`${API}/expenses/${id}`),

  getMonthlyStats: (params) => axios.get(`${API}/monthly-stats`, { params }),

  getTasks: () => axios.get(`${API}/tasks`),
  createTask: (data) => axios.post(`${API}/tasks`, data),
  updateTask: (id, data) => axios.put(`${API}/tasks/${id}`, data),
  deleteTask: (id) => axios.delete(`${API}/tasks/${id}`),

  getShopifyConfigs: () => axios.get(`${API}/shopify-configs`),
  saveShopifyConfig: (data) => axios.post(`${API}/shopify-configs`, data),
  deleteShopifyConfig: (shopId) => axios.delete(`${API}/shopify-configs/${shopId}`),

  getTikTokConfigs: () => axios.get(`${API}/tiktok-configs`),
  createTikTokConfig: (data) => axios.post(`${API}/tiktok-configs`, data),
  updateTikTokConfig: (id, data) => axios.put(`${API}/tiktok-configs/${id}`, data),
  deleteTikTokConfig: (id) => axios.delete(`${API}/tiktok-configs/${id}`),

  syncShopify: (shopId, year, month) => axios.post(`${API}/sync/shopify/${shopId}?year=${year}&month=${month}`),
  syncTikTok: (configId, year, month) => axios.post(`${API}/sync/tiktok/${configId}?year=${year}&month=${month}`),
  syncAll: (year, month) => axios.post(`${API}/sync/all?year=${year}&month=${month}`),

  sendChat: (data) => axios.post(`${API}/chat`, data),
  getChatHistory: (params) => axios.get(`${API}/chat-history`, { params }),
  clearChatHistory: (shopId) => axios.delete(`${API}/chat-history?shop_id=${shopId}`),
};
