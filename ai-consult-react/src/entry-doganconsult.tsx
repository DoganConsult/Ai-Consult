import { createRoot } from "react-dom/client";
import { BrowserRouter as Router } from "react-router-dom";
import DoganConsultApp from "./components/dogan-consult/DoganConsultApp";
import { ScrollToTop } from "./components/shared/ScrollToTop";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <Router>
    <ScrollToTop />
    <DoganConsultApp />
  </Router>
);
