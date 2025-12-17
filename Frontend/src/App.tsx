import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { Home } from "./pages/Home";
import { MalayalamScanner } from "./pages/MalayalamScanner";
import { Translation } from "./pages/Translation";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/scanner" element={<MalayalamScanner />} />
            <Route path="/translation" element={<Translation />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}