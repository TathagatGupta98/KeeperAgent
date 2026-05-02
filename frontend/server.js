import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, createReadStream, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';
import {
  KeeperKit,
  createTriggerNode,
  createActionNode,
  createEdge,
} from '../SDK/dist/index.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = __dirname;
const publicDir = path.join(rootDir, 'public');
const characterPath = path.join(rootDir, 'characters', 'keeper-agent.json');
const envPath = path.join(rootDir, '.env');
const port = Number(process.env.SERVER_PORT || '3000');
const agentId = 'keeper-agent';

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  const content = readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) {
      continue;
    }

    const index = line.indexOf('=');
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(envPath);

const character = JSON.parse(await readFile(characterPath, 'utf8'));
const model = process.env.GOOGLE_MODEL || character.settings?.model || 'gemini-2.5-flash';
const geminiApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
const geminiClient = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;

// Initialize KeeperKit client for real API operations
let keeperkitClient = null;

function initializeKeeperKit() {
  const apiKey = process.env.KEEPERHUB_API_KEY || '';
  if (!apiKey.startsWith('kh_')) {
    console.warn('[KeeperKit] KEEPERHUB_API_KEY not configured or invalid');
    return null;
  }

  keeperkitClient = new KeeperKit({
    apiKey,
    baseUrl: process.env.KEEPERHUB_BASE_URL || 'https://app.keeperhub.com/api',
    timeout: Number(process.env.KEEPERHUB_TIMEOUT || 30000),
  });

  console.log('[KeeperKit] Client initialized with KeeperHub API key');
  return keeperkitClient;
}

initializeKeeperKit();

function jsonResponse(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-KeeperHub-API-Key, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  });
  res.end(body);
}

function textResponse(res, statusCode, text, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(statusCode, {
    'Content-Type': contentType,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-KeeperHub-API-Key, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  });
  res.end(text);
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
  }[ext] || 'application/octet-stream';

  res.writeHead(200, {
    'Content-Type': contentType,
    'Access-Control-Allow-Origin': '*',
  });
  createReadStream(filePath).pipe(res);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

async function generateReply(userText) {
  const userLower = userText.toLowerCase();

  // Try to match and execute KeeperHub actions
  if (keeperkitClient) {
    try {
      // List workflows
      if (userLower.includes('list') && userLower.includes('workflow')) {
        const workflows = await keeperkitClient.workflows.list();
        if (workflows && workflows.length > 0) {
          const formatted = workflows
            .map((wf) => `• **${wf.name}** (${wf.enabled ? 'enabled' : 'disabled'}) - ${wf.description || 'No description'}`)
            .join('\n');
          return `Found ${workflows.length} workflow(s):\n\n${formatted}`;
        }
        return 'No workflows found. Create your first workflow in KeeperHub to get started!';
      }

      // Get/describe a specific workflow
      if ((userLower.includes('get') || userLower.includes('show') || userLower.includes('describe')) && userLower.includes('workflow')) {
        const workflows = await keeperkitClient.workflows.list();
        if (workflows && workflows.length > 0) {
          const wf = workflows[0];
          return `**${wf.name}**\n• Status: ${wf.enabled ? 'enabled' : 'disabled'}\n• Description: ${wf.description || 'N/A'}\n• Nodes: ${wf.nodes?.length || 0}\n• Edges: ${wf.edges?.length || 0}`;
        }
        return 'No workflows found.';
      }

      // List chains
      if (userLower.includes('chain') && (userLower.includes('list') || userLower.includes('support') || userLower.includes('available'))) {
        const chains = await keeperkitClient.chains.list();
        if (chains && chains.length > 0) {
          const formatted = chains
            .slice(0, 10)
            .map((chain) => `• **${chain.name}** (Chain ID: ${chain.chainId}, ${chain.testnet ? 'testnet' : 'mainnet'})`)
            .join('\n');
          return `KeeperHub supports ${chains.length} chain(s):\n\n${formatted}`;
        }
        return 'No chains available.';
      }

      // List integrations
      if (userLower.includes('integration') && (userLower.includes('list') || userLower.includes('show'))) {
        const integrations = await keeperkitClient.integrations.list();
        if (integrations && integrations.length > 0) {
          const formatted = integrations
            .slice(0, 5)
            .map((int) => `• **${int.name}** (${int.type})`)
            .join('\n');
          return `You have ${integrations.length} integration(s):\n\n${formatted}`;
        }
        return 'No integrations configured. Create an integration to manage external connections.';
      }

      // List executions
      if (userLower.includes('execution') && (userLower.includes('list') || userLower.includes('recent') || userLower.includes('show'))) {
        const workflows = await keeperkitClient.workflows.list();
        if (workflows && workflows.length > 0) {
          const executions = await keeperkitClient.listExecutions(workflows[0].id);
          if (executions && executions.length > 0) {
            const formatted = executions
              .slice(0, 5)
              .map((exec) => `• **${exec.id}** - Status: ${exec.status}\n  Started: ${new Date(exec.startedAt).toLocaleString()}`)
              .join('\n');
            return `Recent executions:\n\n${formatted}`;
          }
          return 'No executions yet for your workflows.';
        }
        return 'No workflows to show executions for.';
      }

      // Execute workflow (resolve the intended workflow, then poll status/logs)
      if ((userLower.includes('execute') || userLower.includes('run') || userLower.includes('trigger')) && userLower.includes('workflow')) {
        try {
          const resolved = await resolveWorkflowForExecution(userText);
          const wf = resolved.workflow;

          if (!wf) {
            const names = resolved.workflows
              .slice(0, 5)
              .map((workflow) => `• **${workflow.name}** (\`${workflow.id}\`)`)
              .join('\n');
            return `I found your KeeperHub workflows, but I could not determine which one to execute.\n\nAvailable workflows:\n\n${names}`;
          }

          console.log('[KeeperAgent] Resolved execution target:', {
            id: wf.id,
            name: wf.name,
            enabled: wf.enabled,
          });

          let workflowToExecute = wf;
          const wasDisabled = !wf.enabled;
          if (wasDisabled) {
            workflowToExecute = await keeperkitClient.enableWorkflow(wf.id);
          }

          const result = await keeperkitClient.workflows.execute(workflowToExecute.id);
          const initialStatus = result.status || 'pending';
          let reply = `${wasDisabled ? 'ℹ️ Workflow was disabled, so I enabled it before running it.\n\n' : ''}✅ Workflow **${workflowToExecute.name}** execution started.\n\n**Execution ID:** \`${result.executionId}\`\n- Current status: **${initialStatus}**`;

          if (initialStatus === 'pending' || initialStatus === 'running') {
            const completed = await waitForExecutionWithRetry(workflowToExecute.id, result.executionId, {
              timeoutMs: 120000,
              pollIntervalMs: 3000,
            });
            if (completed) {
              const finalStatus = await keeperkitClient.executions.getStatus(completed.id);
              const logs = await keeperkitClient.executions.getLogs(completed.id);
              reply = `${reply}\n\n${formatExecutionStatus(finalStatus, workflowToExecute.name)}\n\n**Final result:** **${completed.status}**\n\n**Node logs**\n${formatExecutionLogs(logs)}`;
            } else {
              reply = `${reply}\n\nKeeperHub accepted the run, but the execution status record is not available yet. Check the dashboard for live progress and final output.`;
            }
          } else {
            const logs = await keeperkitClient.executions.getLogs(result.executionId).catch(() => []);
            reply = `${reply}\n\n${formatExecutionStatus({ status: initialStatus }, workflowToExecute.name)}\n\n**Node logs**\n${formatExecutionLogs(logs)}`;
          }

          return reply;
        } catch (err) {
          console.error('[KeeperAgent] execute workflow error:', err?.code, err?.status, err?.message, err);
          return `Error executing workflow: ${err?.message || err?.code || 'Unknown error'}`;
        }
      }

      // Create workflow (match user intent like "create a workflow", "new workflow", "build workflow")
      if ((userLower.includes('create') || userLower.includes('new') || userLower.includes('build')) && userLower.includes('workflow')) {
        try {
          // Extract workflow name from user input or use default
          let workflowName = 'Automated Workflow';
          const nameMatch = userText.match(/(?:called|named|titled|for)\s+["']?([^"']+)["']?/i);
          if (nameMatch) {
            workflowName = nameMatch[1].trim();
          }

          // Create a minimal valid workflow with a trigger and action node
          const workflowInput = {
            name: workflowName,
            description: `Workflow created via chat on ${new Date().toLocaleString()}`,
            nodes: [
              createTriggerNode({
                id: 'trigger-1',
                label: 'Schedule Trigger',
                triggerType: 'schedule',
                config: {
                  interval: '*/5 * * * *',
                },
                position: { x: 120, y: 120 },
              }),
              createActionNode({
                id: 'action-1',
                label: 'Log Action',
                actionType: 'no-op',
                position: { x: 360, y: 120 },
              }),
            ],
            edges: [
              createEdge({
                source: 'trigger-1',
                target: 'action-1',
              }),
            ],
          };

          console.log('[KeeperAgent] Creating workflow with name:', workflowName);
          const createdWorkflow = await keeperkitClient.workflows.create(workflowInput);
          console.log('[KeeperAgent] Workflow created successfully:', createdWorkflow.id);
          return `✅ Workflow **${createdWorkflow.name}** created successfully!\n\n**Workflow ID:** \`${createdWorkflow.id}\`\n\nYour workflow is now active and ready. You can edit it on the [KeeperHub dashboard](https://app.keeperhub.com/workflows/${createdWorkflow.id}) to customize the trigger and actions.`;
        } catch (err) {
          console.error('[KeeperAgent] Workflow creation error:', err?.code, err?.status, err?.message);
          
          // If API doesn't support workflow creation, provide instructions
          if (err?.status === 405 || err?.code === 'METHOD_NOT_ALLOWED') {
            return `I don't have direct workflow creation via API at this moment. Please visit [KeeperHub Dashboard](https://app.keeperhub.com) to create workflows manually. I can help you manage and execute existing workflows!`;
          }
          
          return `Error creating workflow: ${err?.message || String(err)}`;
        }
      }
    } catch (err) {
      console.warn('[KeeperKit] Action error:', err?.message);
      // Fall through to Gemini for conversational responses
    }
  }

  // Fall back to Gemini for general conversation
  return await fallbackToGemini(userText);
}

async function fallbackToGemini(userText) {
  const geminiKeyMessage =
    'The Gemini API key is missing, expired, or out of quota. Please create a new Gemini API key and set GOOGLE_GENERATIVE_AI_API_KEY in frontend/.env.';

  try {
    if (!geminiClient) {
      return fallbackReply(userText, geminiKeyMessage);
    }

    const response = await geminiClient.models.generateContent({
      model,
      contents: userText,
      config: {
        systemInstruction:
          character.system ||
          'You are KeeperAgent, an expert assistant for KeeperHub blockchain automation. Answer concisely and helpfully about KeeperHub workflows, executions, integrations, and onchain operations.',
        temperature: Number(process.env.GEMINI_TEMPERATURE || character.settings?.temperature || 0.3),
        maxOutputTokens: Number(process.env.GEMINI_MAX_TOKENS || character.settings?.maxTokens || 600),
      },
    });

    const text = extractGeminiText(response);
    if (text) {
      return text;
    }

    return fallbackReply(userText, 'KeeperAgent replied, but the response format was unexpected.');
  } catch (error) {
    console.error('[Gemini] Generation error:', error?.message || error);
    return fallbackReply(userText, geminiKeyMessage);
  }
}

function extractGeminiText(response) {
  if (typeof response?.text === 'string' && response.text.trim()) {
    return response.text.trim();
  }

  const parts = response?.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts)) {
    const text = parts.map((part) => part?.text || '').join('').trim();
    if (text) {
      return text;
    }
  }

  return '';
}

function extractWorkflowQuery(userText) {
  const workflowIdMatch = userText.match(/\b(wf_[a-zA-Z0-9_-]+)\b/i);
  if (workflowIdMatch) {
    return { workflowId: workflowIdMatch[1], workflowName: '' };
  }

  const quotedNameMatch = userText.match(/(?:called|named|titled|workflow|workflows?)\s+['"]([^'"]+)['"]/i);
  if (quotedNameMatch) {
    return { workflowId: '', workflowName: quotedNameMatch[1].trim() };
  }

  const workflowTailMatch = userText.match(/\bworkflow(?:s)?\b\s+(.+)$/i);
  if (workflowTailMatch) {
    const candidate = workflowTailMatch[1].trim();
    if (candidate && !/^(?:all|list|show|recent|latest)\b/i.test(candidate)) {
      return {
        workflowId: candidate.includes(' ') ? '' : candidate,
        workflowName: candidate,
      };
    }
  }

  return { workflowId: '', workflowName: '' };
}

function normalizeWorkflowName(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function scoreWorkflowMatch(workflow, normalizedQuery) {
  const normalizedName = normalizeWorkflowName(workflow.name || '');
  if (!normalizedName) {
    return 0;
  }

  if (workflow.id?.toLowerCase() === normalizedQuery) {
    return 100;
  }

  if (normalizedName === normalizedQuery) {
    return 95;
  }

  let score = 0;
  if (normalizedName.includes(normalizedQuery) || normalizedQuery.includes(normalizedName)) {
    score += 50;
  }

  const queryTokens = new Set(normalizedQuery.split(/\s+/).filter(Boolean));
  for (const token of queryTokens) {
    if (token.length >= 3 && normalizedName.includes(token)) {
      score += 10;
    }
  }

  if (workflow.enabled) {
    score += 2;
  }

  return score;
}

async function resolveWorkflowForExecution(userText) {
  const { workflowId, workflowName } = extractWorkflowQuery(userText);
  const workflows = await keeperkitClient.workflows.list();

  if (!workflows || workflows.length === 0) {
    return { workflow: null, workflows: [] };
  }

  if (workflowId) {
    const byId = workflows.find((workflow) => workflow.id?.toLowerCase() === workflowId.toLowerCase());
    if (byId) {
      return { workflow: byId, workflows };
    }
  }

  const normalizedQuery = normalizeWorkflowName(workflowName || userText);
  const ranked = workflows
    .map((workflow) => ({ workflow, score: scoreWorkflowMatch(workflow, normalizedQuery) }))
    .sort((left, right) => right.score - left.score);

  const bestMatch = ranked[0];
  if (bestMatch && bestMatch.score > 0) {
    return { workflow: bestMatch.workflow, workflows };
  }

  return { workflow: null, workflows };
}

function formatExecutionStatus(status, workflowName) {
  const progress = status?.progress || {};
  const percentage = typeof progress.percentage === 'number' ? `${progress.percentage}%` : 'unknown';
  const currentNode = progress.currentNodeId ? `\n- Current node: \`${progress.currentNodeId}\`` : '';
  return `Execution status for **${workflowName}**:\n- State: **${status?.status || 'unknown'}**\n- Progress: ${percentage}${currentNode}`;
}

function formatExecutionLogs(logs) {
  if (!Array.isArray(logs) || logs.length === 0) {
    return 'No execution logs were returned.';
  }

  return logs.slice(0, 5).map((log, index) => {
    const name = log.nodeName || log.nodeId || `Node ${index + 1}`;
    const type = log.nodeType ? ` (${log.nodeType})` : '';
    const error = log.error ? ` - Error: ${String(log.error)}` : '';
    return `${index + 1}. **${name}**${type} — ${log.status}${error}`;
  }).join('\n');
}

function pause(durationMs) {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}

async function waitForExecutionWithRetry(workflowId, executionId, options) {
  const maxAttempts = 5;
  let lastError;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      if (attempt > 0) {
        await pause(1000);
      }
      return await keeperkitClient.waitForExecution(workflowId, executionId, options);
    } catch (err) {
      lastError = err;
      if (Number(err?.status) === 404 || err?.code === 'NOT_FOUND') {
        continue;
      }
      throw err;
    }
  }

  if (Number(lastError?.status) === 404 || lastError?.code === 'NOT_FOUND') {
    return null;
  }

  throw lastError;
}

function fallbackReply(userText, reason) {
  const normalized = userText.toLowerCase();

  if (normalized.includes('chain')) {
    return `${reason}\n\nGenerally, KeeperHub-style workflows are commonly used with EVM chains like Ethereum, Base, Arbitrum, Optimism, Polygon, and BNB Chain. If you want the exact KeeperHub-supported list for your account, I can check it once the KeeperHub actions are wired to your runtime.`;
  }

  if (normalized.includes('workflow')) {
    return `${reason}\n\nI can help list, inspect, execute, or manage workflows once the KeeperHub action runtime is connected.`;
  }

  if (normalized.includes('execution')) {
    return `${reason}\n\nI can help review execution status and logs once the KeeperHub action runtime is connected.`;
  }

  return `${reason}\n\nIf you want, I can also list your workflows or create a new one from a short description.`;
}

function createAgentList() {
  return [{ id: agentId, name: character.name || 'KeeperAgent', status: 'active', model }];
}

function normalizeRoute(url) {
  return url.endsWith('/') && url !== '/' ? url.slice(0, -1) : url;
}

const server = createServer(async (req, res) => {
  const method = req.method || 'GET';
  const url = normalizeRoute(new URL(req.url || '/', `http://${req.headers.host || `localhost:${port}`}`).pathname);

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, X-KeeperHub-API-Key, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    });
    res.end();
    return;
  }

  if (method === 'GET' && url === '/api/agents') {
    jsonResponse(res, 200, { success: true, data: { agents: createAgentList() } });
    return;
  }

  if (method === 'POST' && (url === `/api/agents/${agentId}/message` || url === `/api/agents/${agentId}/chat` || url === `/api/agents/${agentId}/messages`)) {
    try {
      const body = await readBody(req);

      const userText = String(body?.text || '').trim();
      if (!userText) {
        jsonResponse(res, 400, { success: false, error: 'Message text is required.' });
        return;
      }

      const reply = await generateReply(userText);
      jsonResponse(res, 200, {
        success: true,
        data: {
          messages: [
            {
              id: `msg_${Date.now()}`,
              name: 'KeeperAgent',
              text: reply,
              role: 'assistant',
            },
          ],
        },
      });
    } catch (error) {
      const status = Number(error?.status || 500);
      const message = status >= 500
        ? 'The AI provider is temporarily unavailable. Try again shortly.'
        : error?.message || 'Something went wrong while processing the message.';
      jsonResponse(res, status, { success: false, error: message });
    }
    return;
  }

  if (method === 'GET') {
    const relative = url === '/' ? '/index.html' : url;
    const filePath = path.join(publicDir, relative);
    if (filePath.startsWith(publicDir) && existsSync(filePath) && !filePath.endsWith(path.sep)) {
      sendFile(res, filePath);
      return;
    }
    if (url === '/') {
      sendFile(res, path.join(publicDir, 'index.html'));
      return;
    }
  }

  textResponse(res, 404, 'Not found');
});

server.listen(port, () => {
  console.log(`[KeeperAgent] Backend running at http://localhost:${port}`);
  console.log(`[KeeperAgent] API: http://localhost:${port}/api/agents`);
  console.log('[KeeperAgent] KeeperHub API key loaded from frontend/.env');
});