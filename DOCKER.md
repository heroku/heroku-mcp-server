# Docker Container Usage for Heroku MCP Server

This document explains how to use the Heroku MCP Server in a Docker container with Claude Desktop and Cursor.

## 🐳 Building the Docker Image

```bash
# Clone the repository
git clone https://github.com/heroku/heroku-mcp-server.git
cd heroku-mcp-server

# Build the Docker image
docker build -t heroku-mcp-server:latest .
```

## 🔧 Key Docker Fixes

This version includes essential fixes for Docker containerization:

1. **Heroku CLI Installation**: The container now properly installs the Heroku CLI, which is required for the MCP server to function
2. **Correct Entrypoint**: Uses the proper `bin/heroku-mcp-server.mjs` entry point instead of the generic `dist/index.js`
3. **File Permissions**: Ensures all executable files have proper permissions
4. **Proper File Copying**: Copies both the built `dist/` directory and the `bin/` directory to the container

## 🔑 Environment Configuration

Create a `.env` file with your Heroku API key:

```bash
# .env
HEROKU_API_KEY=your_heroku_api_key_here
```

## 🖥️ Claude Desktop Configuration

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "heroku": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "--env-file",
        "/path/to/your/.env",
        "heroku-mcp-server:latest"
      ]
    }
  }
}
```

## 🔧 Cursor Configuration

Add to your `.cursor/mcp.json`:

```json
{
  "heroku": {
    "command": "docker",
    "args": [
      "run",
      "--rm",
      "-i",
      "--env-file",
      "/path/to/your/.env",
      "heroku-mcp-server:latest"
    ]
  }
}
```

## ✅ Testing the Container

Test the container manually:

```bash
# Test basic MCP protocol handshake
echo '{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "test", "version": "1.0.0"}}}' | docker run --rm -i --env-file .env heroku-mcp-server:latest

# Expected response should include:
# {"result":{"protocolVersion":"2024-11-05","capabilities":{"tools":{}},"serverInfo":{"name":"Heroku MCP Server","version":"1.0.6"}},"jsonrpc":"2.0","id":1}
```

## 🚀 Available MCP Tools

The Heroku MCP Server provides comprehensive tools for:

- **App Management**: List, create, update, and delete Heroku applications
- **Dyno Operations**: Scale, restart, and manage application dynos
- **Add-on Management**: Install, configure, and manage Heroku add-ons
- **Database Operations**: Manage Heroku Postgres databases
- **Log Access**: Stream and retrieve application logs
- **Pipeline Management**: Manage deployment pipelines
- **Configuration**: Manage environment variables and app settings

## 🔍 Troubleshooting

**Container exits immediately:**
- Ensure your `HEROKU_API_KEY` is valid and has proper permissions
- Check that the `.env` file path in the configuration is correct

**Permission errors:**
- Verify the Docker daemon is running and accessible
- Ensure the `.env` file is readable by Docker

**Authentication failures:**
- Confirm your Heroku API key is active and has the necessary permissions
- Test the API key manually: `heroku auth:whoami --token=YOUR_TOKEN`

## 📝 Notes

- The container uses Node.js 20 Alpine for optimal size and security
- Heroku CLI is installed during image build for full functionality
- The server runs in stdio mode for MCP protocol compatibility
- All container operations are stateless and don't persist data 