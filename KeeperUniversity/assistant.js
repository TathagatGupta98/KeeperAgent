const API_BASE = window.KEEPER_AGENT_API_BASE || 'http://localhost:3000/api';
const STORAGE_KEYS = {
  agentId: 'keeper_agent_id',
};

const state = {
  agentId: localStorage.getItem(STORAGE_KEYS.agentId) || '',
  messages: [],
  isSending: false,
};

const dom = {
  messageList: document.getElementById('messageList'),
  composerForm: document.getElementById('composerForm'),
  messageInput: document.getElementById('messageInput'),
  sendButton: document.getElementById('sendButton'),
  networkBanner: document.getElementById('networkBanner'),
};

const promptText = [
  'List all my workflows',
  'Execute a workflow',
  'Check my recent executions',
  'What chains are supported?',
];

function formatTimestamp(date = new Date()) {
  return new Intl.DateTimeFormat([], {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function toRichText(text) {
  const escaped = escapeHtml(text);
  return escaped.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\n/g, '<br />');
}

function showBanner(message) {
  dom.networkBanner.textContent = message;
  dom.networkBanner.hidden = false;
}

function hideBanner() {
  dom.networkBanner.hidden = true;
  dom.networkBanner.textContent = '';
}

function persistAgentId(agentId) {
  state.agentId = agentId;
  localStorage.setItem(STORAGE_KEYS.agentId, agentId);
}

function ensureEmptyState() {
  if (state.messages.length > 0) {
    return;
  }

  dom.messageList.innerHTML = '';
  const empty = document.createElement('div');
  empty.className = 'empty-state';
  empty.innerHTML = `
    <div class="empty-card">
      <h2>Talk to KeeperHub in plain English.</h2>
      <p>Ask KeeperAgent to list workflows, inspect execution history, or trigger onchain operations. The UI stays minimal so the conversation stays in focus.</p>
      <div class="prompt-grid" id="promptGrid"></div>
    </div>
  `;
  dom.messageList.appendChild(empty);

  const promptGrid = empty.querySelector('#promptGrid');
  promptText.forEach((label) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'prompt-chip';
    chip.textContent = label;
    chip.addEventListener('click', () => {
      dom.messageInput.value = label;
      resizeComposer();
      void sendMessage(label);
    });
    promptGrid.appendChild(chip);
  });
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    dom.messageList.scrollTo({ top: dom.messageList.scrollHeight, behavior: 'smooth' });
  });
}

function appendMessage({ role, text, timestamp = new Date() }) {
  const row = document.createElement('article');
  row.className = `message-row ${role}`;

  if (role === 'agent') {
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = 'K';
    row.appendChild(avatar);
  }

  const bubbleGroup = document.createElement('div');
  bubbleGroup.className = 'bubble-group';

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.innerHTML = toRichText(text);

  const time = document.createElement('div');
  time.className = 'timestamp';
  time.textContent = formatTimestamp(timestamp);

  bubbleGroup.appendChild(bubble);
  bubbleGroup.appendChild(time);
  row.appendChild(bubbleGroup);

  if (dom.messageList.firstElementChild?.classList.contains('empty-state')) {
    dom.messageList.innerHTML = '';
  }

  dom.messageList.appendChild(row);
  state.messages.push({ role, text, timestamp });
  scrollToBottom();
}

function renderTypingIndicator() {
  const row = document.createElement('article');
  row.className = 'message-row agent';
  row.dataset.typing = 'true';

  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.textContent = 'K';
  row.appendChild(avatar);

  const bubbleGroup = document.createElement('div');
  bubbleGroup.className = 'bubble-group';

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.innerHTML = '<span class="typing" aria-label="KeeperAgent is typing"><span></span><span></span><span></span></span>';

  bubbleGroup.appendChild(bubble);
  row.appendChild(bubbleGroup);
  dom.messageList.appendChild(row);
  scrollToBottom();

  return () => row.remove();
}

function extractAgentText(payload) {
  if (!payload) {
    return '';
  }

  if (typeof payload === 'string') {
    return payload;
  }

  if (Array.isArray(payload)) {
    return payload
      .map((entry) => entry?.text || entry?.content?.text || entry?.message?.text || '')
      .filter(Boolean)
      .join('\n')
      .trim();
  }

  if (Array.isArray(payload.messages)) {
    return extractAgentText(payload.messages);
  }

  if (typeof payload.text === 'string') {
    return payload.text;
  }

  if (typeof payload.message?.text === 'string') {
    return payload.message.text;
  }

  if (typeof payload.data?.text === 'string') {
    return payload.data.text;
  }

  if (Array.isArray(payload.data?.messages)) {
    return extractAgentText(payload.data.messages);
  }

  if (typeof payload.data?.message?.text === 'string') {
    return payload.data.message.text;
  }

  if (typeof payload.response?.text === 'string') {
    return payload.response.text;
  }

  return '';
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const text = await response.text();
  let payload = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    const message = typeof payload === 'string'
      ? payload
      : payload?.message || payload?.error || `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

async function resolveAgentId() {
  if (state.agentId) {
    return state.agentId;
  }

  const payload = await fetchJson(`${API_BASE}/agents`);
  const agents = payload?.data?.agents || payload?.agents || [];
  if (!agents.length) {
    throw new Error('No agents are running on the ElizaOS server.');
  }

  const agent = agents[0];
  persistAgentId(agent.id);
  return agent.id;
}

async function postMessage(agentId, text) {
  const body = {
    text,
    userId: 'user',
    roomId: 'keeperchat',
  };

  const endpoints = [
    `${API_BASE}/agents/${agentId}/message`,
    `${API_BASE}/agents/${agentId}/chat`,
    `${API_BASE}/agents/${agentId}/messages`,
  ];

  let lastError;
  for (const endpoint of endpoints) {
    try {
      const payload = await fetchJson(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const reply = extractAgentText(payload);
      if (reply) {
        return reply;
      }

      if (Array.isArray(payload)) {
        return payload.map((entry) => entry?.text || entry?.content?.text || '').filter(Boolean).join('\n').trim();
      }

      return 'The agent responded, but no text payload was returned.';
    } catch (error) {
      lastError = error;
      if (error?.status && error.status !== 404) {
        throw error;
      }
    }
  }

  throw lastError || new Error('Unable to send message.');
}

function setBusy(isBusy) {
  state.isSending = isBusy;
  dom.sendButton.disabled = isBusy;
  dom.messageInput.disabled = isBusy;
}

function resizeComposer() {
  const textarea = dom.messageInput;
  textarea.style.height = 'auto';
  const maxHeight = 160;
  textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
}

async function sendMessage(messageText) {
  const text = messageText.trim();
  if (!text || state.isSending) {
    return;
  }

  if (!navigator.onLine) {
    showBanner('Cannot reach KeeperAgent server. Make sure it is running.');
    return;
  }

  hideBanner();
  appendMessage({ role: 'user', text });
  dom.messageInput.value = '';
  resizeComposer();

  setBusy(true);
  const stopTyping = renderTypingIndicator();

  try {
    const agentId = await resolveAgentId();
    const reply = await postMessage(agentId, text);
    stopTyping();
    appendMessage({ role: 'agent', text: reply || 'KeeperAgent completed the request.' });
  } catch (error) {
    stopTyping();
    const status = error?.status;
    if (status === 429) {
      appendMessage({ role: 'agent', text: 'Rate limited - please wait a moment.' });
    } else if (status >= 500 && status < 600) {
      appendMessage({ role: 'agent', text: 'The AI provider is temporarily unavailable. Try again shortly.' });
    } else if (status === 401 || status === 403) {
      appendMessage({ role: 'agent', text: 'I could not connect to KeeperHub. Please check your API key in the settings panel.' });
    } else if (String(error?.message || '').includes('fetch')) {
      showBanner('Cannot reach KeeperAgent server. Make sure it is running.');
    } else {
      appendMessage({ role: 'agent', text: error?.message || 'Something went wrong while talking to KeeperAgent.' });
    }
  } finally {
    setBusy(false);
  }
}

function wireEvents() {
  dom.messageInput.addEventListener('input', resizeComposer);
  dom.messageInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(dom.messageInput.value);
    }
  });

  dom.composerForm.addEventListener('submit', (event) => {
    event.preventDefault();
    void sendMessage(dom.messageInput.value);
  });
}

async function initialize() {
  wireEvents();
  ensureEmptyState();
  resizeComposer();

  try {
    await resolveAgentId();
  } catch {
    showBanner('Cannot reach KeeperAgent server. Make sure it is running.');
  }
}

initialize().catch((error) => {
  console.error(error);
  showBanner('Cannot reach KeeperAgent server. Make sure it is running.');
});