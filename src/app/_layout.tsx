import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_400Regular_Italic,
  PlayfairDisplay_500Medium,
  PlayfairDisplay_500Medium_Italic,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_600SemiBold_Italic,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_700Bold_Italic,
  PlayfairDisplay_800ExtraBold,
  PlayfairDisplay_800ExtraBold_Italic,
  PlayfairDisplay_900Black,
  PlayfairDisplay_900Black_Italic,
  useFonts,
} from "@expo-google-fonts/playfair-display";
import { Stack } from "expo-router";
import { UserProvider } from "./context/UserContext";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular_Italic,
    PlayfairDisplay_400Regular,
    PlayfairDisplay_500Medium_Italic,
    PlayfairDisplay_500Medium,
    PlayfairDisplay_600SemiBold_Italic,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold_Italic,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_800ExtraBold_Italic,
    PlayfairDisplay_800ExtraBold,
    PlayfairDisplay_900Black_Italic,
    PlayfairDisplay_900Black,
  });

  if (!fontsLoaded) {
    return null;
  }
  
  return (
    <UserProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </UserProvider>
  );

}