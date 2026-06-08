import type { TempoPage, TempoStoryboard, TempoRouteStoryboard } from 'tempo-sdk';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { MsalProvider } from '@azure/msal-react';
import { msalInstance } from '../../../../lib/msal';
import App from '../../../../App';
import Home2 from '../../../../components/home';

const page: TempoPage = {
  name: "CRM Map",
};

export default page;

export const FullApp: TempoStoryboard = {
  render: () => (
    <MsalProvider instance={msalInstance}>
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    </MsalProvider>
  ),
  name: "Full CRM Map App",
  layout: { x: 0, y: 0, width: 1440, height: 900 },
};

export const Home: TempoStoryboard = {
  render: () => (
    <MsalProvider instance={msalInstance}>
      <BrowserRouter>
        <Home2 />
      </BrowserRouter>
    </MsalProvider>
  ),
  name: "Home (Map View)",
  layout: { x: 1490, y: 0, width: 1440, height: 900 },
};
