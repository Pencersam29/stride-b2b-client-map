import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import TempoHost from "./.tempo/tempo-host";
import { msalInstance } from "../lib/msal";

await msalInstance.initialize();
await msalInstance.handleRedirectPromise();
const _accounts = msalInstance.getAllAccounts();
if (_accounts.length > 0) msalInstance.setActiveAccount(_accounts[0]);

const isTempoHostRoute = window.location.pathname.startsWith("/tempo-host");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isTempoHostRoute ? <TempoHost /> : <App />}
  </StrictMode>,
);
