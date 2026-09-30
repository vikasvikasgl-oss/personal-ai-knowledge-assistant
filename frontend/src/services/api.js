import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT access token and optional Gemini API key to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const geminiKey = localStorage.getItem('gemini_api_key');
    if (geminiKey) {
      config.headers['X-Gemini-API-Key'] = geminiKey;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle unauthorized 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  signup: async (name, email, password) => {
    const response = await api.post('/auth/signup', { name, email, password });
    return response.data;
  },
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

export const documentsApi = {
  upload: async (file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onUploadProgress && progressEvent.total) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onUploadProgress(percentCompleted);
        }
      },
    });
    return response.data;
  },
  getAll: async (category = null) => {
    const params = {};
    if (category && category.toLowerCase() !== 'all') {
      params.category = category;
    }
    const response = await api.get('/documents', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/documents/${id}`);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/documents/${id}`);
    return response.data;
  },
  getEvaluationMetrics: async () => {
    const response = await api.get('/documents/metrics/evaluation');
    return response.data;
  },
};

export const searchApi = {
  search: async ({ query, category = null, topK = 10, threshold = 0.0 }) => {
    const params = { q: query, top_k: topK, threshold };
    if (category && category.toLowerCase() !== 'all') {
      params.category = category;
    }
    const response = await api.get('/search', { params });
    return response.data;
  },
  testSearch: async (query, topK = 5, threshold = 0.0) => {
    const response = await api.get('/search/test', {
      params: { q: query, top_k: topK, threshold },
    });
    return response.data;
  },
};

export const chatApi = {
  sendMessage: async ({ question, conversationId, similarityThreshold = 0.35, topK = 5 }) => {
    const response = await api.post('/chat', {
      question,
      conversation_id: conversationId || null,
      similarity_threshold: similarityThreshold,
      top_k: topK,
    });
    return response.data;
  },
  getConversations: async () => {
    const response = await api.get('/chat/conversations');
    return response.data;
  },
  getConversation: async (id) => {
    const response = await api.get(`/chat/conversations/${id}`);
    return response.data;
  },
  deleteConversation: async (id) => {
    const response = await api.delete(`/chat/conversations/${id}`);
    return response.data;
  },
};

export const memoriesApi = {
  getAll: async () => {
    const response = await api.get('/memories');
    return response.data;
  },
  create: async ({ content, category = 'General' }) => {
    const response = await api.post('/memories', { content, category });
    return response.data;
  },
  update: async (id, { content, category }) => {
    const response = await api.put(`/memories/${id}`, { content, category });
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/memories/${id}`);
    return response.data;
  },
};

export const knowledgeGraphApi = {
  getGraph: async () => {
    const response = await api.get('/knowledge-graph');
    return response.data;
  },
  getNodeDocuments: async (nodeId) => {
    const response = await api.get(`/knowledge-graph/node/${encodeURIComponent(nodeId)}/documents`);
    return response.data;
  },
  extractDocument: async (documentId) => {
    const response = await api.post(`/knowledge-graph/extract/${documentId}`);
    return response.data;
  },
  buildAll: async () => {
    const response = await api.post('/knowledge-graph/build-all');
    return response.data;
  },
  deleteTriple: async (id) => {
    const response = await api.delete(`/knowledge-graph/triples/${id}`);
    return response.data;
  },
};

export const dashboardApi = {
  getData: async () => {
    const response = await api.get('/dashboard');
    return response.data;
  },
};

export const recommendationsApi = {
  getAll: async () => {
    const response = await api.get('/recommendations');
    return response.data;
  },
};

export const evaluationApi = {
  getReport: async () => {
    const response = await api.get('/evaluation');
    return response.data;
  },
  runEvaluation: async () => {
    const response = await api.post('/evaluation/run');
    return response.data;
  },
};

export default api;

