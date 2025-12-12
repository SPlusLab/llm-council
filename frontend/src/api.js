/**
 * API client for the LLM Council backend.
 */

const API_BASE = 'http://localhost:8001';

export const api = {
  /**
   * List all conversations.
   */
  async listConversations() {
    const response = await fetch(`${API_BASE}/api/conversations`);
    if (!response.ok) {
      throw new Error('Failed to list conversations');
    }
    return response.json();
  },

  /**
   * Create a new conversation.
   */
  async createConversation() {
    const response = await fetch(`${API_BASE}/api/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    if (!response.ok) {
      throw new Error('Failed to create conversation');
    }
    return response.json();
  },

  /**
   * Get a specific conversation.
   */
  async getConversation(conversationId) {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}`
    );
    if (!response.ok) {
      throw new Error('Failed to get conversation');
    }
    return response.json();
  },

  /**
   * Send a message in a conversation.
   */
  async sendMessage(conversationId, payload) {
    const { content, attachments = [], case_settings } = payload;
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}/message`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content, attachments, case_settings }),
      }
    );
    if (!response.ok) {
      throw new Error('Failed to send message');
    }
    return response.json();
  },

  /**
   * Send a message and receive streaming updates.
   * @param {string} conversationId - The conversation ID
   * @param {string} content - The message content
   * @param {Array} attachments - Attachment metadata list
   * @param {function} onEvent - Callback function for each event: (eventType, data) => void
   * @returns {Promise<void>}
   */
  async sendMessageStream(conversationId, payload, onEvent) {
    const { content, attachments = [], case_settings } = payload;
    const controller = new AbortController();

    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}/message/stream`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content, attachments, case_settings }),
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    const streamPromise = (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n\n');
          buffer = events.pop() || '';

          for (const rawEvent of events) {
            const lines = rawEvent.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                try {
                  const event = JSON.parse(data);
                  onEvent(event.type, event);
                } catch (e) {
                  console.error('Failed to parse SSE event:', e);
                }
              }
            }
          }
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          onEvent('aborted', {});
        } else {
          throw err;
        }
      }
    })();

    return { controller, streamPromise };
  },

  /**
   * Upload a file and return metadata.
   */
  async uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/api/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload file');
    }

    return response.json();
  },

  /**
   * Update conversation (title, work_mode, etc).
   */
  async updateConversation(conversationId, updates) {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      }
    );
    if (!response.ok) {
      throw new Error('Failed to update conversation');
    }
    return response.json();
  },

  /**
   * Update conversation title (convenience method).
   */
  async updateConversationTitle(conversationId, title) {
    return this.updateConversation(conversationId, { title });
  },

  /**
   * Delete a conversation.
   */
  async deleteConversation(conversationId) {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}`,
      {
        method: 'DELETE',
      }
    );
    if (!response.ok) {
      throw new Error('Failed to delete conversation');
    }
    return response.json();
  },

  /**
   * Export a conversation as JSON.
   */
  async exportConversation(conversationId) {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}/export`
    );
    if (!response.ok) {
      throw new Error('Failed to export conversation');
    }
    return response.blob();
  },

  /**
   * Estimate council cost for a given char length payload.
   * Payload shape: {
   *   message_length_chars,
   *   attachment_length_chars,
   *   models?,
   *   chairman_model?,
   *   ...assumptionOverrides
   * }
   */
  async estimateCost(payload) {
    const response = await fetch(`${API_BASE}/api/estimate_cost`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error('Failed to estimate cost');
    }
    return response.json();
  },

  /**
   * Get all uploaded files from conversations.
   */
  async getLibraryFiles() {
    const response = await fetch(`${API_BASE}/api/library/files`);
    if (!response.ok) {
      throw new Error('Failed to fetch library files');
    }
    return response.json();
  },

  /**
   * Get all projects.
   */
  async getProjects() {
    const response = await fetch(`${API_BASE}/api/projects`);
    if (!response.ok) {
      throw new Error('Failed to fetch projects');
    }
    return response.json();
  },

  /**
   * Create a new project.
   */
  async createProject(name, color = '#10b981') {
    const response = await fetch(`${API_BASE}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color }),
    });
    if (!response.ok) {
      throw new Error('Failed to create project');
    }
    return response.json();
  },

  /**
   * Update a project.
   */
  async updateProject(projectId, updates) {
    const response = await fetch(`${API_BASE}/api/projects/${projectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      throw new Error('Failed to update project');
    }
    return response.json();
  },

  /**
   * Delete a project.
   */
  async deleteProject(projectId) {
    const response = await fetch(`${API_BASE}/api/projects/${projectId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete project');
    }
    return response.json();
  },

  /**
   * Assign a conversation to a project.
   */
  async assignConversationToProject(conversationId, projectId) {
    const response = await fetch(`${API_BASE}/api/conversations/${conversationId}/project`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId }),
    });
    if (!response.ok) {
      throw new Error('Failed to assign conversation to project');
    }
    return response.json();
  },
};

// Provide a default export for environments that import the client without destructuring.
export default api;
