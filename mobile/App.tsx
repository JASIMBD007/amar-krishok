import { AppProviders } from "./src/foundation/AppProviders";
import { AppNavigator } from "./src/navigation/AppNavigator";

export default function App() {
  return (
    <AppProviders>
      <AppNavigator />
    </AppProviders>
  );
}
