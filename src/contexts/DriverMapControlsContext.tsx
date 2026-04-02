import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type ThemeKey = "light" | "dark" | "satellite" | "terrain";

interface DriverMapControlsContextType {
  mapTheme: ThemeKey;
  setMapTheme: (t: ThemeKey) => void;
  mapExpanded: boolean;
  toggleMapExpanded: () => void;
}

const DriverMapControlsContext = createContext<DriverMapControlsContextType>({
  mapTheme: "light",
  setMapTheme: () => {},
  mapExpanded: false,
  toggleMapExpanded: () => {},
});

export const useDriverMapControls = () => useContext(DriverMapControlsContext);

export const DriverMapControlsProvider = ({ children }: { children: ReactNode }) => {
  const [mapTheme, setMapTheme] = useState<ThemeKey>("light");
  const [mapExpanded, setMapExpanded] = useState(false);
  const toggleMapExpanded = useCallback(() => setMapExpanded(p => !p), []);

  return (
    <DriverMapControlsContext.Provider value={{ mapTheme, setMapTheme, mapExpanded, toggleMapExpanded }}>
      {children}
    </DriverMapControlsContext.Provider>
  );
};
