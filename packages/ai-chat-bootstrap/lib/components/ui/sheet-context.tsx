import * as React from "react";

const SheetPortalContainerContext = React.createContext<HTMLElement | null>(null);

export interface SheetPortalProviderProps {
  container: HTMLElement | null;
  children: React.ReactNode;
}

export function SheetPortalProvider({
  container,
  children,
}: SheetPortalProviderProps) {
  return (
    <SheetPortalContainerContext.Provider value={container}>
      {children}
    </SheetPortalContainerContext.Provider>
  );
}

export function useSheetPortalContainer() {
  return React.useContext(SheetPortalContainerContext);
}
