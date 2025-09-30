#!/bin/sh
echo >&2 "Run the following to include MCPClient in any nodejs:"

cat <<EOF
// Create a mock module system for eval
const moduleWrapper = { exports: {} };
(function(module, exports, require) {
eval(
EOF
cat dist/mcp-client.js | jq -Rsa .
cat <<EOF
);
})(moduleWrapper, moduleWrapper.exports, require);

const { MCPClient, createClients } = moduleWrapper.exports;
EOF
