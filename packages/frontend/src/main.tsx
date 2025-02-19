import { initializeApp } from "firebase/app";
import { createRoot } from 'react-dom/client';
import App from './App';

import { createTheme, MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import '@mantine/dropzone/styles.css';
import { Notifications } from '@mantine/notifications';
import '@mantine/notifications/styles.css';
import { StrictMode } from 'react';
import { ProvideAuth } from './components/Auth';
import './i18n.ts';
import "./index.css";

const firebaseConfig = JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG);
initializeApp(firebaseConfig);

const theme = createTheme({
  /** Put your mantine theme override here */
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme}>
      <Notifications autoClose={5000} />
      <ProvideAuth>
        <App />
      </ProvideAuth>
    </MantineProvider>
  </StrictMode>,
)
