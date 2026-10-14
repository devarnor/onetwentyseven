import { Configuration, LogLevel } from "@azure/msal-browser";

export const entraTenantId =
  "679fb25e-f55e-4cd1-8a36-f9ada597e287";

export const webClientId =
  "fc1d0668-7ea1-4951-a146-65080f5a5d58";

export const apiClientId =
  "acc4be07-acd6-416b-9c98-5ed30179efdf";

export const apiScope =
  `api://${apiClientId}/access_as_user`;

export const apiBaseUrl =
  "https://onetwentyseven-api-1791842003.azurewebsites.net";

export const bridgewayTenantId =
  "740582ac-665d-44e5-b19c-dfb5fbc6035c";

export const msalConfig: Configuration = {
  auth: {
    clientId: webClientId,
    authority:
      `https://login.microsoftonline.com/${entraTenantId}`,
  },
  cache: {
    cacheLocation: "sessionStorage",
  },
  system: {
    loggerOptions: {
      loggerCallback: () => {},
      logLevel: LogLevel.Warning,
      piiLoggingEnabled: false,
    },
  },
};
