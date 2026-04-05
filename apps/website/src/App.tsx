import { Suspense } from "react";
import { Route, Switch } from "wouter";
import AppLayout from "./layouts/AppLayout";
import GatewayPage from "./pages/GatewayPage";
import ProviderPage from "./pages/ProviderPage";

function App() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <AppLayout>
        <Switch>
          <Route path="/" component={GatewayPage} />
          <Route path="/provider" component={ProviderPage} />
        </Switch>
      </AppLayout>
    </Suspense>
  );
}

export default App;
