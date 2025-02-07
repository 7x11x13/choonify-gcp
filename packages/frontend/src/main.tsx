import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter as Router } from "react-router-dom";
import App from './App'
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

import '@mantine/core/styles.css';
import '@mantine/dropzone/styles.css';
import '@mantine/notifications/styles.css';
import "./index.css";
import { ProvideAuth } from './components/Auth';
import { Notifications } from '@mantine/notifications';
import { createTheme, MantineProvider } from '@mantine/core';

const firebaseConfig = JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG);
initializeApp(firebaseConfig);

const theme = createTheme({
  /** Put your mantine theme override here */
});

createRoot(document.getElementById('root')!).render(
  <MantineProvider theme={theme}>
    <Notifications autoClose={5000} />
    <Router>
      <ProvideAuth>
        <App />
      </ProvideAuth>
    </Router>
  </MantineProvider>,
)
