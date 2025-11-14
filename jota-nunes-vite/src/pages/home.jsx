import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getConstructions } from "../services/constructionService";
import NovoDocumentoModal from "../components/NovoDocumentoModal";
import {
  FilePlus,
  User,
  Settings,
  Menu,
  CheckCircle,
  XCircle,
  MessageSquare,
  X,
  LogOut,
} from "lucide-react";

export default function Home() {
  const [open, setOpen] = useState(false);
  const [projetos, setProjetos] = useState([]);
  const [menuAberto, setMenuAberto] = useState(false);
  const [projetoSelecionado, setProjetoSelecionado] = useState(null);
  const [textoObs, setTextoObs] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getConstructions();
        const mapped = data.map((c) => ({
          ...c,
          status: c.is_active ? "pendente" : "reprovado",
        }));
        setProjetos(mapped);
      } catch (error) {
        console.error("Erro ao buscar construções:", error);
      }
    };
    fetchData();
  }, []);

  const handleAprovacao = (id, status) => {
    setProjetos((prev) =>
      prev.map((proj) => (proj.id === id ? { ...proj, status } : proj))
    );
  };

  const handleAbrirObservacao = (projeto) => {
    setProjetoSelecionado(projeto);
    setTextoObs(
      (projeto.observations && projeto.observations.join("\n")) || ""
    );
  };

  const handleSalvarObservacao = () => {
    if (!projetoSelecionado) return;
    setProjetos((prev) =>
      prev.map((proj) =>
        proj.id === projetoSelecionado.id
          ? { ...proj, observations: textoObs.split("\n").filter(Boolean) }
          : proj
      )
    );
    setProjetoSelecionado(null);
    setTextoObs("");
  };

  const pendentes = projetos.filter((p) => p.status === "pendente");
  const aprovados = projetos.filter((p) => p.status === "aprovado");
  const reprovados = projetos.filter((p) => p.status === "reprovado");

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");

    setTimeout(() => {
      navigate("/");
    }, 1200);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-100 relative">
      {/* Sidebar */}
      <aside className="hidden md:flex w-20 bg-red-700 text-white flex-col items-center py-6 space-y-8">
        <button
          onClick={handleLogout}
          className="hover:bg-red-600 p-3 rounded-xl transition"
        >
          <LogOut />
        </button>
      </aside>

      {/* Header mobile */}
      <header className="md:hidden bg-red-700 text-white flex items-center justify-between px-4 py-3 shadow-md">
        <h1 className="font-semibold text-lg">Dashboard</h1>
        <button
          onClick={() => setMenuAberto(!menuAberto)}
          className="p-2 rounded-lg hover:bg-red-600 transition"
        >
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {menuAberto && (
        <div className="md:hidden bg-red-600 text-white flex justify-around py-3">
          <button className="hover:bg-red-500 p-2 rounded-lg transition">
            <User />
          </button>
          <button className="hover:bg-red-500 p-2 rounded-lg transition">
            <Settings />
          </button>
        </div>
      )}

      {/* Conteúdo principal */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
        {/* Topo com título e botão */}
        <div className="hidden md:flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
          <div className="flex gap-4">
            <button
              onClick={() => setOpen(true)}
              className="bg-red-700 hover:bg-red-600 text-white font-semibold px-6 py-3 rounded-xl shadow-md flex items-center gap-2 transition"
            >
              <FilePlus className="w-5 h-5" />
              Novo Documento
            </button>
            <NovoDocumentoModal isOpen={open} onClose={() => setOpen(false)} />
          </div>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center justify-center border-t-4 border-red-600 transition hover:shadow-2xl">
            <p className="text-gray-500">Projetos Pendentes</p>
            <p className="text-3xl font-bold text-red-600">
              {pendentes.length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center justify-center border-t-4 border-green-600 transition hover:shadow-2xl">
            <p className="text-gray-500">Projetos Aprovados</p>
            <p className="text-3xl font-bold text-green-600">
              {aprovados.length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center justify-center border-t-4 border-gray-600 transition hover:shadow-2xl">
            <p className="text-gray-500">Projetos Reprovados</p>
            <p className="text-3xl font-bold text-gray-600">
              {reprovados.length}
            </p>
          </div>
        </div>

        {/* Pendentes */}
        <h2 className="text-2xl font-semibold text-gray-700 mb-6">
          Histórico de Projetos
        </h2>
        {pendentes.length === 0 ? (
          <p className="text-center text-gray-500 mb-10">
            Nenhum projeto pendente.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 mb-10">
            {pendentes.map((projeto) => (
              <div
                key={projeto.id}
                onClick={() => handleAbrirObservacao(projeto)}
                className="bg-white rounded-xl shadow-md hover:shadow-xl transition p-6 cursor-pointer border border-gray-100"
              >
                <h3 className="text-lg sm:text-xl font-semibold text-gray-800 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-red-600" />
                  {projeto.project_name}
                </h3>
                <p className="text-gray-600 mt-2 text-sm sm:text-base">
                  Obs:{" "}
                  {projeto.observations
                    ?.map((obs) => obs.description)
                    .join(", ") || "Nenhuma"}
                </p>
                {projeto.description && (
                  <p className="mt-3 text-gray-700 text-sm italic border-t pt-2">
                    “{projeto.description}”
                  </p>
                )}
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAprovacao(projeto.id, "aprovado");
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-semibold text-white bg-green-600 hover:bg-green-700 transition"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Aprovar
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAprovacao(projeto.id, "reprovado");
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-semibold text-white bg-gray-600 hover:bg-gray-700 transition"
                  >
                    <XCircle className="w-5 h-5" />
                    Reprovar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Aprovados */}
        {aprovados.length > 0 && (
          <>
            <h2 className="text-2xl font-semibold text-green-700 mb-4">
              Projetos Aprovados ✅
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 mb-10">
              {aprovados.map((projeto) => (
                <div
                  key={projeto.id}
                  onClick={() => handleAbrirObservacao(projeto)}
                  className="bg-white rounded-xl shadow-md border border-green-200 p-6 cursor-pointer hover:shadow-lg transition"
                >
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-800">
                    {projeto.project_name}
                  </h3>
                  <p className="text-gray-600 mt-2 text-sm">
                    Local: {projeto.location}
                  </p>
                  <p className="text-green-700 font-semibold mt-3 text-sm">
                    ✔ Projeto aprovado
                  </p>
                  {projeto.observations?.length > 0 && (
                    <p className="mt-2 text-gray-700 italic text-sm border-t pt-2">
                      “{projeto.observations.join(", ")}”
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Reprovados */}
        {reprovados.length > 0 && (
          <>
            <h2 className="text-2xl font-semibold text-red-700 mb-4">
              Projetos Reprovados ❌
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 mb-10">
              {reprovados.map((projeto) => (
                <div
                  key={projeto.id}
                  onClick={() => handleAbrirObservacao(projeto)}
                  className="bg-white rounded-xl shadow-md border border-red-200 p-6 cursor-pointer hover:shadow-lg transition"
                >
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-800">
                    {projeto.project_name}
                  </h3>
                  <p className="text-gray-600 mt-2 text-sm">
                    Local: {projeto.location}
                  </p>
                  <p className="text-red-700 font-semibold mt-3 text-sm">
                    ✖ Projeto reprovado
                  </p>
                  {projeto.observations?.length > 0 && (
                    <p className="mt-2 text-gray-700 italic text-sm border-t pt-2">
                      “{projeto.observations.join(", ")}”
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Modal Observação */}
      {projetoSelecionado && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-11/12 max-w-lg p-6 relative">
            <button
              onClick={() => setProjetoSelecionado(null)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">
              Observações — {projetoSelecionado.project_name}
            </h3>
            <textarea
              value={textoObs}
              onChange={(e) => setTextoObs(e.target.value)}
              placeholder="Digite aqui as observações sobre o projeto..."
              className="w-full h-40 border border-gray-300 rounded-lg p-3 text-gray-800 resize-none focus:ring-2 focus:ring-red-600 outline-none"
            />
            <button
              onClick={handleSalvarObservacao}
              className="mt-4 w-full bg-red-700 hover:bg-red-800 text-white font-semibold py-3 rounded-lg transition"
            >
              Salvar Observação
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
