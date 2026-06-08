import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { MsalProvider } from "@azure/msal-react";
import { msalInstance } from "./lib/msal";

const basename = import.meta.env.BASE_URL;

async function bootstrap() {
  await msalInstance.initialize();
  await msalInstance.handleRedirectPromise();
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length > 0) {
    msalInstance.setActiveAccount(accounts[0]);
  }

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <MsalProvider instance={msalInstance}>
        <BrowserRouter basename={basename}>
          <App />
        </BrowserRouter>
      </MsalProvider>
    </React.StrictMode>,
  );
}

bootstrap();
