/**
 * ThemeLoader — loads and applies the active theme from DB.
 * Mount once near the root of each standalone app.
 */
import { useTheme } from "@/hooks/useTheme";

const ThemeLoader = ({ children }: { children?: React.ReactNode }) => {
  useTheme();
  return <>{children}</>;
};

export default ThemeLoader;
