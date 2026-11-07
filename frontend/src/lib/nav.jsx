import { createContext, useContext } from "react";

// Navigation par onglets (comme ton App.jsx) : pas de react-router nécessaire.
export const NavContext = createContext({ go: () => {}, params: {} });
export const useNav = () => useContext(NavContext);

export function Go({ to, params, className, children }) {
  const { go } = useNav();
  return (
    <button type="button" className={className} onClick={() => go(to, params)}>
      {children}
    </button>
  );
}
