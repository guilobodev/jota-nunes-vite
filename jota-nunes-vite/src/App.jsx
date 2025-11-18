import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "../src/pages/login";
import Home from "./pages/home";
import ModeloPadrao from "./pages/modeloPadrao";
import NovaObra from "./pages/NovaObra";
import SelecionarAreas from "./pages/areas";
import ElementsMaterialsPage from "./pages/elementsMaterials";
import Materials from "./pages/materials";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/home" element={<Home />} />
        <Route path="/modeloPadrao" element={<ModeloPadrao />} />
        <Route path="/areas" element={<SelecionarAreas />} />
        <Route path="/criacao" element={<NovaObra />} />
        <Route path="/elementos" element={<ElementsMaterialsPage />} />
        <Route path="/materiais" element={<Materials />} />
      </Routes>
    </BrowserRouter>
  );
}
