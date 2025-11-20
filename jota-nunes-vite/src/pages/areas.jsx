import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import api from "../services/axios";

export default function SelecionarAreas() {
  const navigate = useNavigate();

  const [allAreas, setAllAreas] = useState([]); // todas as áreas do backend
  const [referentialsMeta, setReferentialsMeta] = useState([]); // [{id, name}]
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // objeto: { "<refId>": [areaId, ...] }
  const [areasByReferential, setAreasByReferential] = useState({});

  // === Modal state para criar nova área (SIMPLIFICADO) ===
  const [modalOpen, setModalOpen] = useState(false);
  const [newAreaName, setNewAreaName] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  function updateNovaObra(data) {
    const current = JSON.parse(localStorage.getItem("novaObra")) || {};
    const updated = { ...current, ...data };
    localStorage.setItem("novaObra", JSON.stringify(updated));
  }

  // helper: extrai id de um referential object ou retorna o number
  function referentialIdFrom(ref) {
    if (!ref) return null;
    if (typeof ref === "number") return ref;
    if (ref.id) return ref.id;
    return null;
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const stored = JSON.parse(localStorage.getItem("novaObra")) || {};
        const storedReferentials = stored.referentials || [];

        // normaliza referentials: pode ser array de ids ou array de objects
        const referentialIds = storedReferentials
          .map((r) => referentialIdFrom(r))
          .filter(Boolean);

        // fetch todas as areas
        const areasRes = await api.get("/areas/");
        const areasPayload = areasRes?.data?.data ?? areasRes?.data ?? [];
        const areasArr = Array.isArray(areasPayload) ? areasPayload : [];

        // fetch referentials somente para obter nomes
        let refsMeta = [];
        if (referentialIds.length > 0) {
          try {
            const refsRes = await api.get("/referentials/");
            const refsPayload = refsRes?.data?.data ?? refsRes?.data ?? [];

            if (Array.isArray(refsPayload)) {
              refsMeta = refsPayload
                .map((r) => ({
                  id: r.id,
                  name:
                    r?.referential_name?.name ??
                    r?.name ??
                    `Referential ${r.id}`,
                }))
                .filter(Boolean)
                .filter((r) => referentialIds.includes(r.id));
            }
          } catch (err) {
            console.warn("⚠ Erro ao consultar /referentials, fallback");
            refsMeta = referentialIds.map((id) => ({
              id,
              name: `Referential ${id}`,
            }));
          }
        }

        // garantir que todos os referentialIds estejam no meta
        const metaIds = refsMeta.map((r) => r.id);
        for (const id of referentialIds) {
          if (!metaIds.includes(id))
            refsMeta.push({ id, name: `Referential ${id}` });
        }

        // inicializar areasByReferential
        const saved = JSON.parse(localStorage.getItem("novaObra")) || {};
        const savedAreasByRef = saved.areas_by_referential || {};

        const initialMap = {};
        for (const refId of referentialIds) {
          initialMap[refId] = Array.isArray(savedAreasByRef[refId])
            ? savedAreasByRef[refId]
            : [];
        }

        setAllAreas(areasArr);
        setReferentialsMeta(refsMeta);
        setAreasByReferential(initialMap);
        localStorage.setItem("allAreasCache", JSON.stringify(areasArr));
      } catch (err) {
        console.error(" Erro ao carregar áreas/referenciais:", err);
        setAllAreas([]);
        setReferentialsMeta([]);
        setAreasByReferential({});
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  // toggle de seleção de área dentro de um referential
  function toggleAreaForReferential(refId, areaId) {
    setAreasByReferential((prev) => {
      const cur = prev[refId] || [];
      const nextForRef = cur.includes(areaId)
        ? cur.filter((x) => x !== areaId)
        : [...cur, areaId];
      const next = { ...prev, [refId]: nextForRef };
      return next;
    });
  }

  function handleNext() {
    // salvar mapping no localStorage.novaObra e avançar
    updateNovaObra({ areas_by_referential: areasByReferential });
    navigate("/elementos");
  }

  function areaTitle(a) {
    return a?.area_name?.name ?? a?.name ?? `Área ${a?.id ?? ""}`;
  }

  function matchesSearch(text) {
    if (!search) return true;
    return text.toLowerCase().includes(search.toLowerCase());
  }

  // CRIAR NOVA ÁREA (Simplificado: Apenas nome)
  async function createArea() {
    setModalError("");
    if (!newAreaName || !newAreaName.trim()) {
      setModalError("Informe o nome da área.");
      return;
    }
    setModalLoading(true);

    try {
      // 1) Criar AreaName (apenas o nome)
      const anRes = await api.post("/areas/names/", [
        { name: newAreaName.trim() },
      ]);
      
      const anPayload = anRes?.data?.data ?? anRes?.data ?? anRes;
      
      // Tenta extrair o ID de várias formas possíveis dependendo da resposta da API
      let areaNameId = null;
      
      if (Array.isArray(anPayload)) {
          areaNameId = anPayload[0]?.id;
      } else if (typeof anPayload === 'object') {
          areaNameId = anPayload?.id ?? anPayload?.pk;
      }

      if (!areaNameId) {
        throw new Error(
          "Não foi possível obter o ID do nome da área criado. Verifique a resposta da API."
        );
      }

      // 2) Criar a Área (vinculando o AreaName, sem elementos)
      const payload = [
        {
          area_name_id: areaNameId,
          elements_ids: [], // Lista vazia, pois removemos a seleção de elementos
        },
      ];

      await api.post("/areas/", payload);
      console.log("Área criada com sucesso");

      // 3) Recarregar lista de áreas
      try {
        const areasRes = await api.get("/areas/");
        const areasPayload = areasRes?.data?.data ?? areasRes?.data ?? [];
        const areasArr = Array.isArray(areasPayload) ? areasPayload : [];
        setAllAreas(areasArr);
        localStorage.setItem("allAreasCache", JSON.stringify(areasArr));
      } catch (err) {
        console.warn("Erro ao recarregar áreas:", err);
      }

      // Fechar modal e resetar
      setModalOpen(false);
      setNewAreaName("");
      setModalError("");
    } catch (err) {
      console.error("Erro ao criar área:", err);
      // Tratamento de erro simplificado para exibição
      const msg = err.response?.data?.detail || err.message || "Erro ao criar área.";
      setModalError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setModalLoading(false);
    }
  }

  // UI Render
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="flex items-center gap-4 bg-red-700 text-white px-4 py-3 shadow-md">
        <button
          onClick={() => navigate("/criacao")}
          className="p-2 rounded-lg hover:bg-red-600 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-lg">Selecionar Áreas</h1>
      </header>

      <main className="max-w-6xl mx-auto p-6 flex flex-col gap-6">
        <section className="bg-white p-6 rounded-2xl shadow-md flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-xl">Áreas disponíveis</h2>
            <p className="text-sm text-gray-500">
              Escolha áreas para cada referential selecionado
            </p>
          </div>

          <div className="flex gap-3 items-center">
            <input
              type="text"
              placeholder="Buscar área..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 p-3 rounded-xl border border-gray-300 focus:border-red-600 focus:outline-none"
            />
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-green-600 text-white px-5 py-3 rounded-2xl shadow-md hover:bg-green-700 transition"
            >
              <Plus className="w-5 h-5" />
              Novo
            </button>
          </div>
        </section>

        {loading ? (
          <div className="text-center text-gray-700">Carregando...</div>
        ) : (
          <>
            {referentialsMeta.map((ref) => {
              const refId = ref.id;
              const title = ref.name ?? `Referential ${refId}`;
              const selectedForRef = areasByReferential[refId] || [];

              return (
                <section
                  key={refId}
                  className="bg-white p-6 rounded-2xl shadow-md flex flex-col gap-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">{title}</h3>
                  </div>

                  {allAreas.length === 0 ? (
                    <p className="text-gray-500">Nenhuma área disponível.</p>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-4 mt-2">
                      {allAreas
                        .filter((a) => matchesSearch(areaTitle(a)))
                        .map((a) => {
                          const isSel = selectedForRef.includes(a.id);
                          // Contagem de elementos (opcional, apenas para visualização)
                          const elementsCount = Array.isArray(a.elements)
                            ? a.elements.length
                            : a.elements_count ?? 0;

                          return (
                            <div
                              key={`${refId}-${a.id}`}
                              onClick={() =>
                                toggleAreaForReferential(refId, a.id)
                              }
                              className={`cursor-pointer bg-white p-5 rounded-2xl border shadow transition flex flex-col gap-2 ${
                                isSel
                                  ? "border-red-600 ring-2 ring-red-400"
                                  : "border-gray-200"
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <h4 className="text-lg font-semibold text-gray-900">
                                  {areaTitle(a)}
                                </h4>
                                <span className="text-xs text-gray-500">
                                  ID {a.id}
                                </span>
                              </div>

                              {a.description && (
                                <p className="text-xs text-gray-500 italic">
                                  {a.description}
                                </p>
                              )}
                              
                            </div>
                          );
                        })}
                    </div>
                  )}
                </section>
              );
            })}

            <div className="flex justify-between items-center gap-4">
              <button
                onClick={() => navigate("/criacao")}
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded-xl hover:bg-gray-300"
              >
                Voltar
              </button>

              <button
                onClick={handleNext}
                disabled={Object.values(areasByReferential).every(
                  (arr) => !arr || arr.length === 0
                )}
                className="bg-red-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-xl font-semibold hover:bg-red-700"
              >
                Próximo
              </button>
            </div>
          </>
        )}
      </main>

      {/* Modal: Criar Área (SIMPLIFICADO) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Criar Nova Área</h3>
              <button
                onClick={() => {
                  setModalOpen(false);
                  setModalError("");
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                Fechar
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium text-gray-700">Nome da área</label>
              <input
                type="text"
                placeholder="Ex: Cozinha, Banheiro..."
                value={newAreaName}
                onChange={(e) => setNewAreaName(e.target.value)}
                className="p-3 border rounded-xl focus:border-red-600 focus:outline-none w-full"
                autoFocus
              />

              {modalError && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
                  {modalError}
                </div>
              )}

              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => {
                    setModalOpen(false);
                    setModalError("");
                  }}
                  className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={createArea}
                  disabled={modalLoading}
                  className="px-6 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400 transition flex items-center gap-2"
                >
                  {modalLoading ? "Criando..." : "Criar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}