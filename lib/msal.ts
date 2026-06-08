import { PublicClientApplication, type Configuration } from "@azure/msal-browser";

const tenantId = import.meta.env.VITE_MS_TENANT_ID as string | undefined;
const clientId = import.meta.env.VITE_MS_CLIENT_ID as string | undefined;

const msalConfig: Configuration = {
  auth: {
    clientId: clientId ?? "missing-client-id",
    authority: `https://login.microsoftonline.com/${tenantId ?? "common"}`,
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: "localStorage",
  },
};

export const msalInstance = new PublicClientApplication(msalConfig);

export const calendarScopes = ["Calendars.Read"];
