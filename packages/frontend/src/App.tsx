
import { AppShell } from "@mantine/core";
import Routes from "./Routes.tsx";

import { Header } from "./components/Header.tsx";
import { Suspense } from "react";
import Loading from "./components/Loading.tsx";

function App() {
    return (
        <AppShell mah="100vh" h="100vh">
            <Header></Header>
            <Suspense fallback={<Loading />}>
                <AppShell.Main m="md" h="100%">
                    <Routes />
                </AppShell.Main>
            </Suspense>
        </AppShell>
    );
}

export default App;