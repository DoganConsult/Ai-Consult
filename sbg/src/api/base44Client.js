const API_BASE = '/api/sbg';

class ApiEntity {
  constructor(name) {
    this.name = name;
    this.endpoint = `${API_BASE}/entities/${name}`;
  }

  async list(sortBy, limit) {
    const params = new URLSearchParams();
    if (sortBy) params.set('sort', sortBy);
    if (limit) params.set('limit', limit);
    const qs = params.toString();
    const res = await fetch(`${this.endpoint}${qs ? '?' + qs : ''}`);
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
  }

  async filter(conditions, sortBy, limit) {
    const params = new URLSearchParams();
    if (sortBy) params.set('sort', sortBy);
    if (limit) params.set('limit', limit);
    if (conditions) params.set('filter', JSON.stringify(conditions));
    const res = await fetch(`${this.endpoint}?${params.toString()}`);
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
  }

  async get(id) {
    const res = await fetch(`${this.endpoint}/${id}`);
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
  }

  async create(data) {
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
  }

  async update(id, data) {
    const res = await fetch(`${this.endpoint}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
  }

  async delete(id) {
    const res = await fetch(`${this.endpoint}/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
  }
}

function authHeaders() {
  const token = localStorage.getItem('sbg_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const entityProxy = new Proxy({}, {
  get(_, name) {
    return new ApiEntity(name);
  }
});

const serviceEntityProxy = new Proxy({}, {
  get(_, name) {
    return new ApiEntity(name);
  }
});

const auth = {
  async isAuthenticated() {
    const token = localStorage.getItem('sbg_token');
    if (!token) return false;
    try {
      const res = await fetch(`${API_BASE}/auth/me`, { headers: authHeaders() });
      return res.ok;
    } catch {
      return false;
    }
  },
  async me() {
    const res = await fetch(`${API_BASE}/auth/me`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Not authenticated');
    return res.json();
  },
  async updateMe(data) {
    const res = await fetch(`${API_BASE}/auth/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
  },
  redirectToLogin() {
    window.location.href = '/login';
  },
};

const agents = {
  async createConversation(data) {
    const res = await fetch(`${API_BASE}/agents/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
  },
  async getConversation(id) {
    const res = await fetch(`${API_BASE}/agents/conversations/${id}`, { headers: authHeaders() });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
  },
  async addMessage(conversation, message) {
    const id = conversation.id || conversation;
    const res = await fetch(`${API_BASE}/agents/conversations/${id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(message),
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
  },
  subscribeToConversation(id, callback) {
    let active = true;
    const poll = async () => {
      while (active) {
        try {
          const res = await fetch(`${API_BASE}/agents/conversations/${id}`, { headers: authHeaders() });
          if (res.ok) {
            const data = await res.json();
            callback(data);
          }
        } catch {}
        await new Promise(r => setTimeout(r, 2000));
      }
    };
    poll();
    return () => { active = false; };
  },
};

const functions = {
  async invoke(name, data) {
    const res = await fetch(`${API_BASE}/functions/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
  },
};

const integrations = {
  Core: {
    async InvokeLLM(data) {
      const res = await fetch(`${API_BASE}/integrations/llm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      return res.json();
    },
    async SendEmail(data) {
      const res = await fetch(`${API_BASE}/integrations/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      return res.json();
    },
    async SendSMS() { return { success: true }; },
    async UploadFile({ file }) {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE}/integrations/upload`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      return res.json();
    },
    async GenerateImage() { return { image_url: '' }; },
    async ExtractDataFromUploadedFile() { return { data: {} }; },
  },
};

export const base44 = {
  entities: entityProxy,
  auth,
  agents,
  functions,
  integrations,
  asServiceRole: { entities: serviceEntityProxy },
};
