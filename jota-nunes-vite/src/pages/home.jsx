import { useState, useEffect } from "react";
import api from "../services/axios";
import { useNavigate } from "react-router-dom";
import { getConstructions } from "../services/constructionService";
import EditarObraModal from "../components/EditarObra";

import NovoDocumentoModal from "../components/NovoDocumentoModal";
import {
  FilePlus,
  Menu,
  CheckCircle,
  XCircle,
  MessageSquare,
  X,
  LogOut,
  MoreVertical,
} from "lucide-react";

export default function Home() {
  const [open, setOpen] = useState(false);

  const [projetos, setProjetos] = useState([]);
  const [menuAberto, setMenuAberto] = useState(false);
  const [projetoSelecionado, setProjetoSelecionado] = useState(null);

  const [textoObs, setTextoObs] = useState("");

  const navigate = useNavigate();

  const role = localStorage.getItem("user_role");
  const isRevisor = role === "reviewer";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getConstructions();

        const savedStatus = JSON.parse(
          localStorage.getItem("status_map") || "{}"
        );

        const mapped = data.map((c) => ({
          ...c,
          status:
            c.is_active === null
              ? "pendente"
              : c.is_active
              ? "aprovado"
              : "reprovado",
        }));

        setProjetos(mapped);
      } catch (error) {
        console.error("Erro ao buscar construções:", error);
      }
    };
    fetchData();
  }, []);

  async function loadConstruction(id) {
    try {
      const res = await api.get(`/constructions/${id}/`);
      setObra(res.data); // Atualiza o objeto que vai para o modal
    } catch (err) {
      console.error("Erro ao carregar obra", err);
    }
  }

  // substitui o antigo handleAprovacao que salvava em localStorage
  const handleAprovacao = async (id, status) => {
    try {
      const isActive = status === "aprovado";
      // enviar booleanos — backend espera boolean para aprovation_status
      const payload = {
        is_active: isActive,
        aprovation_status: isActive, // boolean esperado pelo backend
      };

      const res = await api.patch(`/constructions/${id}/`, payload);
      const updated = res?.data ?? null;

      const statusText = isActive ? "aprovado" : "reprovado";

      setProjetos((prev) =>
        prev.map((proj) =>
          proj.id === id
            ? {
                ...proj,
                // manter dados retornados (is_active etc.) e atualizar texto de status usado pela UI
                ...updated,
                status: statusText,
              }
            : proj
        )
      );
    } catch (error) {
      console.error("Erro ao atualizar obra:", error);
      alert("Erro ao atualizar obra. Verifique o console.");
    }
  };

  // novo: excluir obra via API e remover do state
  const handleDeleteConstruction = async (id) => {
    if (
      !confirm("Confirma exclusão desta obra? Esta ação não pode ser desfeita.")
    )
      return;
    try {
      await api.delete(`/constructions/${id}/`);
      setProjetos((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      console.error("Erro ao excluir obra:", error);
      alert("Erro ao excluir obra. Verifique o console.");
    }
  };

  const handleAbrirObservacao = (projeto) => {
    setProjetoSelecionado(projeto);
    setTextoObs(
      (projeto.observations &&
        projeto.observations.map((o) => o.description).join("\n")) ||
        ""
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
    localStorage.removeItem("user_role");

    setTimeout(() => navigate("/"));
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
  <div className="md:hidden bg-red-700 text-white px-4 py-3 flex items-center gap-4 border-b-4 border-red-800">

    <button
      onClick={() => setOpen(true)}
      className="bg-white text-red-700 flex-1 py-2 rounded-lg font-semibold shadow flex items-center justify-center gap-2"
    >
      <FilePlus className="w-5 h-5" />
      Novo Documento
    </button>
    
    <button
      className="p-2 rounded-md hover:bg-red-600 transition ml-2"
      onClick={handleLogout}
    >
      <LogOut className="w-6 h-6" />
    </button>

  </div>
)}

      {/* Conteúdo */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
        {/* Topo */}
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

          </div>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <ResumoCard
            titulo="Projetos Pendentes"
            valor={pendentes.length}
            cor="red"
          />
          <ResumoCard
            titulo="Projetos Aprovados"
            valor={aprovados.length}
            cor="green"
          />
          <ResumoCard
            titulo="Projetos Reprovados"
            valor={reprovados.length}
            cor="gray"
          />
        </div>

        {/* Histórico */}
        <h2 className="text-2xl font-semibold text-gray-700 mb-6">
          Histórico de Projetos
        </h2>

        {/* Pendentes */}
        {pendentes.length === 0 ? (
          <p className="text-center text-gray-500 mb-10">
            Nenhum projeto pendente.
          </p>
        ) : (
          <ListaPendentes
            pendentes={pendentes}
            handleAprovacao={handleAprovacao}
            handleAbrirObservacao={handleAbrirObservacao}
            isRevisor={isRevisor}
          />
        )}

        {/* Aprovados */}
        {aprovados.length > 0 && (
          <SecaoProjetos
            titulo="Projetos Aprovados"
            cor="green"
            lista={aprovados}
            handleDelete={handleDeleteConstruction}
            setProjetos={setProjetos}
          />
        )}

        {/* Reprovados */}
        {reprovados.length > 0 && (
          <SecaoProjetos
            titulo="Projetos Reprovados"
            cor="red"
            lista={reprovados}
            handleDelete={handleDeleteConstruction}
            setProjetos={setProjetos}
          />
        )}
      </main>

      <NovoDocumentoModal isOpen={open} onClose={() => setOpen(false)} />


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

function ResumoCard({ titulo, valor, cor }) {
  const cores = {
    red: "text-red-600 border-red-600",
    green: "text-green-600 border-green-600",
    gray: "text-gray-700 border-gray-600",
  };

  return (
    <div
      className={`bg-white rounded-xl shadow-lg p-6 flex flex-col items-center border-t-4 ${cores[cor]} hover:shadow-2xl transition`}
    >
      <p className="text-gray-500">{titulo}</p>
      <p className={`text-3xl font-bold ${cores[cor]}`}>{valor}</p>
    </div>
  );
}

function ListaPendentes({
  pendentes,
  handleAprovacao,
  handleAbrirObservacao,
  isRevisor,
}) {
  return (
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
            {projeto.observations?.map((obs) => obs.description).join(", ") ||
              "Nenhuma"}
          </p>

          {projeto.description && (
            <p className="mt-3 text-gray-700 text-sm italic border-t pt-2">
              "{projeto.description}"
            </p>
          )}

          {isRevisor && (
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
          )}
        </div>
      ))}
    </div>
  );
}

function SecaoProjetos({ titulo, cor, lista, handleDelete, setProjetos }) {
  const borda = {
    green: "border-green-200",
    red: "border-red-200",
  };

  const texto = {
    green: "text-green-700",
    red: "text-red-700",
  };

  const [menuAberto, setMenuAberto] = useState(null);
  const [showModeloModal, setShowModeloModal] = useState(false);
  const [nomeModelo, setNomeModelo] = useState("");
  const [projetoParaModelo, setProjetoParaModelo] = useState(null);
  const [carregandoModelo, setCarregandoModelo] = useState(false);
  const [mensagemConfirmacao, setMensagemConfirmacao] = useState("");
  const navigate = useNavigate();

  const [modalEditarOpen, setModalEditarOpen] = useState(false);
  const [obraEditando, setObraEditando] = useState(null);

  const atualizarObraNaLista = (obraAtualizada) => {
    setProjetos((prev) =>
      prev.map((p) => {
        if (p.id === obraAtualizada.id) {
          // Calcular o status baseado em is_active
          const status =
            obraAtualizada.is_active === null
              ? "pendente"
              : obraAtualizada.is_active
              ? "aprovado"
              : "reprovado";

          return {
            ...obraAtualizada,
            status: status,
          };
        }
        return p;
      })
    );
  };

  const abrirModalEditar = (projeto) => {
    setObraEditando(projeto);
    setModalEditarOpen(true);
  };

  const toggleMenu = (id) => {
    setMenuAberto((prev) => (prev === id ? null : id));
  };

  const fecharMenus = () => setMenuAberto(null);

  const tornarModeloPadrao = (projeto) => {
    fecharMenus();
    setProjetoParaModelo(projeto);
    setNomeModelo(projeto.project_name);
    setShowModeloModal(true);
  };
  const confirmarCriacaoModelo = async () => {
    if (!nomeModelo.trim()) {
      setMensagemConfirmacao("Digite um nome válido.");
      return;
    }

    setCarregandoModelo(true);

    try {
      const res = await api.post(`/standard-models/${projetoParaModelo.id}/`, {
        name: nomeModelo.trim(),
      });

      console.log("Modelo padrão criado:", res.data);

      setMensagemConfirmacao("Modelo padrão criado com sucesso!");

      navigate("/modeloPadrao", {
        state: {
          obraOriginal: projetoParaModelo,
        },
      });

      setTimeout(() => {
        setShowModeloModal(false);
        setMensagemConfirmacao("");
      }, 1000);
    } catch (error) {
      console.error("Erro ao criar modelo padrão:", error);
      setMensagemConfirmacao("Erro ao criar modelo.");
    } finally {
      setCarregandoModelo(false);
    }
  };
  const baixarDocumento = async (id, nomeProjeto) => {
    try {
      const response = await api.get(`/documents/${id}/`, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${nomeProjeto.replace(/ /g, "_")}.docx`;
      document.body.appendChild(a);
      a.click();

      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erro ao baixar documento:", error);
      alert("Erro ao baixar documento.");
    }
  };

  const excluirObra = async (projeto) => {
    fecharMenus();
    if (typeof handleDelete === "function") {
      await handleDelete(projeto.id);
    }
  };

  useEffect(() => {
    const handleClickFora = (e) => {
      if (!e.target.closest(".menu-3p-card")) {
        setMenuAberto(null);
      }
    };

    document.addEventListener("click", handleClickFora);
    return () => document.removeEventListener("click", handleClickFora);
  }, []);

  return (
    <>
      <h2 className={`text-2xl font-semibold ${texto[cor]} mb-4`}>{titulo}</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 mb-10">
        {lista.map((projeto) => (
          <div
            key={projeto.id}
            className={`relative bg-white rounded-xl shadow-md p-6 border ${borda[cor]} hover:shadow-lg transition`}
          >
            <div className="flex justify-between items-start">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800">
                {projeto.project_name}
              </h3>

              {(cor === "green" || cor === "red") && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMenu(projeto.id);
                  }}
                  className="menu-3p-card p-2 hover:bg-gray-200 rounded-lg transition"
                >
                  <MoreVertical className="w-5 h-5 text-gray-600" />
                </button>
              )}
            </div>

            {(cor === "green" || cor === "red") &&
              menuAberto === projeto.id && (
                <div className="menu-3p-card absolute right-4 top-12 w-44 bg-white shadow-xl rounded-xl border z-50">
                  {cor === "green" && (
                    <>
                      <button
                        className="w-full text-left px-4 py-3 hover:bg-gray-100 transition text-gray-700"
                        onClick={() => {
                          fecharMenus();
                          baixarDocumento(projeto.id, projeto.project_name);
                        }}
                      >
                        Baixar .docx
                      </button>
                      <button
                        className="w-full text-left px-4 py-3 hover:bg-gray-100 transition text-gray-700"
                        onClick={() => tornarModeloPadrao(projeto)}
                      >
                        Tornar modelo padrão
                      </button>
                    </>
                  )}

                  <button
                    className="w-full text-left px-4 py-3 hover:bg-red-100 transition text-red-600"
                    onClick={() => excluirObra(projeto)}
                  >
                    Excluir obra
                  </button>
                  <button
                    className="w-full text-left px-4 py-3 hover:bg-gray-100 transition text-gray-700"
                    onClick={() => {
                      fecharMenus();
                      abrirModalEditar(projeto);
                    }}
                  >
                    Editar obra
                  </button>
                </div>
              )}

            <p className="text-gray-600 mt-2 text-sm">
              Local: {projeto.location || "Não informado"}
            </p>

            <p className={`${texto[cor]} font-semibold mt-3 text-sm`}>
              {cor === "green" ? "✔ Projeto aprovado" : "✖ Projeto reprovado"}
            </p>

            {projeto.observations?.length > 0 && (
              <p className="mt-2 text-gray-700 italic text-sm border-t pt-2">
                “{projeto.observations.map((o) => o.description).join(", ")}”
              </p>
            )}
          </div>
        ))}
      </div>
      {showModeloModal && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white w-11/12 max-w-md rounded-2xl p-6 shadow-xl relative animate-fadeIn">
            {/* Botão Fechar */}
            <button
              onClick={() => {
                setShowModeloModal(false);
                setMensagemConfirmacao("");
              }}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Criar Modelo Padrão
            </h2>

            <p className="text-gray-600 mb-3">
              Digite o nome do modelo padrão:
            </p>

            <input
              type="text"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-600"
              value={nomeModelo}
              onChange={(e) => setNomeModelo(e.target.value)}
            />

            {mensagemConfirmacao && (
              <p className="text-center text-green-600 mt-2">
                {mensagemConfirmacao}
              </p>
            )}

            <button
              onClick={confirmarCriacaoModelo}
              disabled={carregandoModelo}
              className="w-full mt-5 bg-red-700 hover:bg-red-600 text-white py-2 rounded-xl transition disabled:opacity-60"
            >
              {carregandoModelo ? "Criando..." : "Criar Modelo"}
            </button>
          </div>
        </div>
      )}
      {modalEditarOpen && (
        <EditarObraModal
          isOpen={modalEditarOpen}
          onClose={() => setModalEditarOpen(false)}
          projeto={obraEditando}
          onUpdated={atualizarObraNaLista}
        />
      )}
    </>
  );
}
