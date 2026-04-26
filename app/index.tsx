import { Redirect } from "expo-router";
import useAuthStore from "../store/useAuthStore";

export default function Index() {
  const token = useAuthStore(state => state.token);

  if (!token) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)" />;
}
