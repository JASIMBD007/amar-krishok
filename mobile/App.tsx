import { AppProviders } from "./src/foundation/AppProviders";
import { FoundationScreen } from "./src/foundation/FoundationScreen";

export default function App() {
  return (
    <AppProviders>
      <FoundationScreen />
    </AppProviders>
  );
}
