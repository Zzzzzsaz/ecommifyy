import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const downloadBlob = async (url, filename) => {
  const resp = await fetch(url);
  const blob = await resp.blob();
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
};

export const api = {
  login: (pin) => axios.post(`${API}/auth/login`, { pin }),

  getIncomes: (params) => axios.get(`${API}/incomes`, { params }),
  createIncome: (data) => axios.post(`${API}/incomes`, data),
  deleteIncome: (id) => axios.delete(`${API}/incomes/${id}`),
  getIncomeDetails: (params) => axios.get(`${API}/incomes/details`, { params }),

  getExpenses: (params) => axios.get(`${API}/expenses`, { params }),
  createExpense: (data) => axios.post(`${API}/expenses`, data),
  deleteExpense: (id) => axios.delete(`${API}/expenses/${id}`),
  getExpenseDetails: (params) => axios.get(`${API}/expenses/details`, { params }),

  getMonthlyStats: (params) => axios.get(`${API}/monthly-stats`, { params }),
  getCombinedStats: (params) => axios.get(`${API}/combined-monthly-stats`, { params }),
  getWeeklyStats: () => axios.get(`${API}/weekly-stats`),

  getTasks: () => axios.get(`${API}/tasks`),
  createTask: (data) => axios.post(`${API}/tasks`, data),
  updateTask: (id, data) => axios.put(`${API}/tasks/${id}`, data),
  deleteTask: (id) => axios.delete(`${API}/tasks/${id}`),

  getReminders: () => axios.get(`${API}/reminders`),
  createReminder: (data) => axios.post(`${API}/reminders`, data),
  updateReminder: (id, data) => axios.put(`${API}/reminders/${id}`, data),
  deleteReminder: (id) => axios.delete(`${API}/reminders/${id}`),

  getOrders: (params) => axios.get(`${API}/orders`, { params }),
  createOrder: (data) => axios.post(`${API}/orders`, data),
  updateOrderStatus: (id, status) => axios.put(`${API}/orders/${id}/status?status=${status}`),
  deleteOrder: (id) => axios.delete(`${API}/orders/${id}`),

  getReturns: (params) => axios.get(`${API}/returns`, { params }),
  createReturn: (data) => axios.post(`${API}/returns`, data),
  deleteReturn: (id) => axios.delete(`${API}/returns/${id}`),

  getFulfillment: (params) => axios.get(`${API}/fulfillment`, { params }),
  createFulfillment: (data) => axios.post(`${API}/fulfillment`, data),
  updateFulfillment: (id, data) => axios.put(`${API}/fulfillment/${id}`, data),
  bulkFulfillmentStatus: (params) => axios.post(`${API}/fulfillment/bulk-status`, null, { params }),
  deleteFulfillment: (id) => axios.delete(`${API}/fulfillment/${id}`),
  getFulfillmentReminder: () => axios.get(`${API}/fulfillment/reminder-check`),
  getFulfillmentNotes: (params) => axios.get(`${API}/fulfillment-notes`, { params }),
  createFulfillmentNote: (data) => axios.post(`${API}/fulfillment-notes`, data),
  deleteFulfillmentNote: (id) => axios.delete(`${API}/fulfillment-notes/${id}`),

  getShops: () => axios.get(`${API}/shops`),
  createShop: (data) => axios.post(`${API}/shops`, data),
  updateShop: (id, data) => axios.put(`${API}/shops/${id}`, data),
  deleteShop: (id) => axios.delete(`${API}/shops/${id}`),

  getAppSettings: () => axios.get(`${API}/app-settings`),
  updateAppSettings: (data) => axios.put(`${API}/app-settings`, data),

  getCompany: () => axios.get(`${API}/company-settings`),
  updateCompany: (data) => axios.put(`${API}/company-settings`, data),
  getCompanySettings: () => axios.get(`${API}/company-settings`),
  updateCompanySettings: (data) => axios.put(`${API}/company-settings`, data),

  getNotes: (params) => axios.get(`${API}/notes`, { params }),
  createNote: (data) => axios.post(`${API}/notes`, data),
  deleteNote: (id) => axios.delete(`${API}/notes/${id}`),

  downloadExcel: (y, m, sid) => downloadBlob(`${API}/export/excel?year=${y}&month=${m}${sid ? `&shop_id=${sid}` : ""}`, `ecommify_${y}_${m}.xlsx`),

  getSalesRecords: (params) => axios.get(`${API}/sales-records`, { params }),
  createSalesRecord: (data) => axios.post(`${API}/sales-records`, data),
  deleteSalesRecord: (id) => axios.delete(`${API}/sales-records/${id}`),
  generateSalesFromOrders: (params) => axios.post(`${API}/sales-records/generate-from-orders`, null, { params }),
  downloadSalesPdfDaily: (date, sid) => downloadBlob(`${API}/sales-records/pdf/daily?date=${date}${sid ? `&shop_id=${sid}` : ""}`, `ewidencja_${date}.pdf`),
  downloadSalesPdfMonthly: (y, m, sid) => downloadBlob(`${API}/sales-records/pdf/monthly?year=${y}&month=${m}${sid ? `&shop_id=${sid}` : ""}`, `ewidencja_${y}_${m}.pdf`),

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

  getProducts: (params) => axios.get(`${API}/products`, { params }),
  createProduct: (data) => axios.post(`${API}/products`, data),
  updateProduct: (id, data) => axios.put(`${API}/products/${id}`, data),
  deleteProduct: (id) => axios.delete(`${API}/products/${id}`),
};
