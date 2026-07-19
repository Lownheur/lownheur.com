export const MCP_OAUTH_SCOPES = ["openid", "email", "profile"] as const;

export const MCP_OAUTH_SECURITY_SCHEMES = [
  { type: "oauth2", scopes: [...MCP_OAUTH_SCOPES] }
] as const;
