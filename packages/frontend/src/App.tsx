
import { AppShell } from "@mantine/core";
import Routes from "./Routes.tsx";

import { Header } from "./components/Header.tsx";

function App() {
    return (
        <AppShell mah="100vh" h="100vh">
            <Header></Header>
            <AppShell.Main m="md">
                <Routes />
            </AppShell.Main>
        </AppShell>
    );
}

export default App;