const http = require('http');
const https = require('https');
const { URL } = require('url');

class MCPClient {
  constructor(endpoint, options = {}) {
    this.endpoint = endpoint;
    this.sessionId = null;
    this.protocolVersion = options.protocolVersion || '2025-03-26';
    this.sseConnection = null;
    this.requestId = 0;
    this.pendingRequests = new Map();
    this.messageHandlers = [];
  }

  /**
   * Send a JSON-RPC request to the MCP server
   */
  async request(method, params = {}) {
    const id = ++this.requestId;
    const message = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this._sendMessage(message).catch(reject);
    });
  }

  /**
   * Send a JSON-RPC notification (no response expected)
   */
  async notify(method, params = {}) {
    const message = {
      jsonrpc: '2.0',
      method,
      params
    };

    return this._sendMessage(message);
  }

  /**
   * Initialize the MCP session
   */
  async initialize(clientInfo = {}) {
    const response = await this.request('initialize', {
      protocolVersion: this.protocolVersion,
      capabilities: {},
      clientInfo: {
        name: clientInfo.name || 'mcp-http-client',
        version: clientInfo.version || '1.0.0'
      }
    });

    await this.notify('notifications/initialized');
    return response;
  }

  /**
   * List available tools from the MCP server
   */
  async listTools() {
    return this.request('tools/list');
  }

  /**
   * Call a tool on the MCP server
   */
  async callTool(name, args = {}) {
    return this.request('tools/call', {
      name,
      arguments: args
    });
  }

  /**
   * Get a proxy object for calling tools with method syntax
   * Usage: client.tools.toolName({ arg: 'value' })
   */
  get tools() {
    return new Proxy({}, {
      get: (target, toolName) => {
        return (args = {}) => this.callTool(toolName, args);
      }
    });
  }

  /**
   * List available resources from the MCP server
   */
  async listResources() {
    return this.request('resources/list');
  }

  /**
   * Read a resource from the MCP server
   */
  async readResource(uri) {
    return this.request('resources/read', { uri });
  }

  /**
   * List available prompts from the MCP server
   */
  async listPrompts() {
    return this.request('prompts/list');
  }

  /**
   * Get a prompt from the MCP server
   */
  async getPrompt(name, args = {}) {
    return this.request('prompts/get', {
      name,
      arguments: args
    });
  }

  /**
   * Register a handler for incoming messages from the server
   */
  onMessage(handler) {
    this.messageHandlers.push(handler);
  }

  /**
   * Close the MCP session
   */
  async close() {
    if (this.sseConnection) {
      this.sseConnection.destroy();
      this.sseConnection = null;
    }
    this.pendingRequests.clear();
  }

  /**
   * Internal method to send a message via HTTP POST
   */
  async _sendMessage(message) {
    const url = new URL(this.endpoint);
    const isHttps = url.protocol === 'https:';
    const httpModule = isHttps ? https : http;

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'MCP-Protocol-Version': this.protocolVersion
    };

    if (this.sessionId) {
      headers['Mcp-Session-Id'] = this.sessionId;
    }

    const postData = JSON.stringify(message);

    return new Promise((resolve, reject) => {
      const req = httpModule.request(url, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Length': Buffer.byteLength(postData)
        }
      }, (res) => {
        // Extract session ID if present
        const sessionId = res.headers['mcp-session-id'];
        if (sessionId) {
          this.sessionId = sessionId;
        }

        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode === 202) {
            // Notification accepted, no response expected
            resolve();
          } else if (res.statusCode === 200) {
            try {
              const response = JSON.parse(data);
              this._handleResponse(response);
              resolve();
            } catch (err) {
              reject(new Error(`Failed to parse response: ${err.message}`));
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }

  /**
   * Handle incoming JSON-RPC responses
   */
  _handleResponse(message) {
    if (message.id && this.pendingRequests.has(message.id)) {
      const { resolve, reject } = this.pendingRequests.get(message.id);
      this.pendingRequests.delete(message.id);

      if (message.error) {
        reject(new Error(`MCP Error ${message.error.code}: ${message.error.message}`));
      } else {
        resolve(message.result);
      }
    } else if (!message.id) {
      // Notification from server
      for (const handler of this.messageHandlers) {
        handler(message);
      }
    }
  }
}

/**
 * Create multiple MCP clients for different servers
 */
async function createClients(endpoints, clientInfo = {}) {
  const clients = {};

  for (const [name, endpoint] of Object.entries(endpoints)) {
    clients[name] = new MCPClient(endpoint);
  }

  // Initialize all clients in parallel
  await Promise.all(
    Object.values(clients).map(client => client.initialize(clientInfo))
  );

  return clients;
}

module.exports = { MCPClient, createClients };
module.exports.default = { MCPClient, createClients };
