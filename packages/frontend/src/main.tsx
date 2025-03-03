import { initializeApp } from "firebase/app";
import { createRoot } from "react-dom/client";
import App from "./App";

import { createTheme, MantineProvider } from "@mantine/core";
import "@mantine/core/styles/global.css";

import "@mantine/core/styles/ScrollArea.css";
import "@mantine/core/styles/UnstyledButton.css";
import "@mantine/core/styles/VisuallyHidden.css";
import "@mantine/core/styles/Paper.css";
import "@mantine/core/styles/Popover.css";
import "@mantine/core/styles/CloseButton.css";
import "@mantine/core/styles/Group.css";
import "@mantine/core/styles/Loader.css";
import "@mantine/core/styles/Overlay.css";
import "@mantine/core/styles/ModalBase.css";
import "@mantine/core/styles/Input.css";
import "@mantine/core/styles/InlineInput.css";
import "@mantine/core/styles/Flex.css";
import "@mantine/core/styles/FloatingIndicator.css";

import "@mantine/core/styles/Text.css";

import "@mantine/core/styles/Anchor.css";
import "@mantine/core/styles/AppShell.css";
import "@mantine/core/styles/Avatar.css";
import "@mantine/core/styles/Burger.css";
import "@mantine/core/styles/Button.css";
import "@mantine/core/styles/Card.css";
import "@mantine/core/styles/Center.css";
import "@mantine/core/styles/Container.css";
import "@mantine/core/styles/Fieldset.css";
import "@mantine/core/styles/Grid.css";
import "@mantine/core/styles/List.css";
import "@mantine/core/styles/NavLink.css";
import "@mantine/core/styles/Notification.css";
import "@mantine/core/styles/Progress.css";
import "@mantine/core/styles/RingProgress.css";
import "@mantine/core/styles/Skeleton.css";
import "@mantine/core/styles/Stack.css";
import "@mantine/core/styles/Switch.css";
import "@mantine/core/styles/Title.css";
import "@mantine/core/styles/TypographyStylesProvider.css";
import "@mantine/dropzone/styles.css";
import "@mantine/notifications/styles.css";
import { Notifications } from "@mantine/notifications";
import { StrictMode } from "react";
import { ProvideAuth } from "./components/Auth";
import "./i18n.ts";
import "./index.css";

const firebaseConfig: Record<string, string> = JSON.parse(
  import.meta.env.VITE_FIREBASE_CONFIG,
);
initializeApp(firebaseConfig);

const theme = createTheme({
  /** Put your mantine theme override here */
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MantineProvider theme={theme}>
      <Notifications autoClose={5000} />
      <ProvideAuth>
        <App />
      </ProvideAuth>
    </MantineProvider>
  </StrictMode>,
);
