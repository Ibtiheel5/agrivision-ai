import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { LangProvider } from "./LangContext";
import { initStore } from "./services/store";
import "@fontsource/poppins/latin-400.css";
import "@fontsource/poppins/latin-500.css";
import "@fontsource/poppins/latin-600.css";
import "@fontsource/poppins/latin-700.css";
import "./index.css";

function render() {
  createRoot(document.getElementById("root")).render(
    <StrictMode>
      <BrowserRouter>
        <LangProvider>
          <App />
        </LangProvider>
      </BrowserRouter>
    </StrictMode>,
  );
}

// Les analyses, les plantes et les conversations sont chargées avant le premier rendu :
// les écrans peuvent ensuite les lire de façon synchrone. initStore ne lève jamais.
initStore().finally(render);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}
