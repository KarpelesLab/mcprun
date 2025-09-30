# MCP HTTP Client

A self-contained Node.js client for accessing MCP (Model Context Protocol) servers over HTTP.

## Building

```bash
npm install
npm run build
```

This produces `dist/mcp-client.js`, a single self-contained file.

## Usage

Include the built file in your Node.js session:

```javascript
const { MCPClient, createClients } = require('./dist/mcp-client.js');

// Single server
const client = new MCPClient('http://localhost:3000/mcp');
await client.initialize({ name: 'my-client', version: '1.0.0' });

// List and call tools
const tools = await client.listTools();
const result = await client.callTool('tool-name', { arg1: 'value' });

// Multiple servers
const clients = createClients({
  server1: 'http://localhost:3000/mcp',
  server2: 'http://localhost:3001/mcp'
});

await clients.server1.initialize();
await clients.server2.initialize();
```

## API

### MCPClient

- `constructor(endpoint, options)` - Create a new client
- `initialize(clientInfo)` - Initialize the MCP session
- `listTools()` - List available tools
- `callTool(name, args)` - Call a tool
- `listResources()` - List available resources
- `readResource(uri)` - Read a resource
- `listPrompts()` - List available prompts
- `getPrompt(name, args)` - Get a prompt
- `request(method, params)` - Send a custom JSON-RPC request
- `notify(method, params)` - Send a notification
- `onMessage(handler)` - Register handler for server messages
- `close()` - Close the connection

### createClients(endpoints)

Creates multiple clients from an object mapping names to endpoints.
