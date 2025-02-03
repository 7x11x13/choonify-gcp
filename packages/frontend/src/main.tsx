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

let firebaseConfig = {}
if (import.meta.env.PROD) {
  // TODO
} else {
  firebaseConfig = {
    apiKey: "AIzaSyAgPQwmtTFVItJdhCTV1DR-rQrfFXGF3cA",
    authDomain: "choonify-dev.firebaseapp.com",
    projectId: "choonify-dev",
    storageBucket: "choonify-dev.firebasestorage.app",
    messagingSenderId: "795250601392",
    appId: "1:795250601392:web:27e2bd8e81b82d0a30fa75"
  };
}

const app = initializeApp(firebaseConfig);
getAuth(app);

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
