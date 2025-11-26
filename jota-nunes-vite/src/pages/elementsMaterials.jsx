// src/pages/SelecionarElementos.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import api from "../services/axios";

export default function SelecionarElementos() {
  const navigate = useNavigate();

  const [allElements, setAllElements] = useState([]); // todos os elementos do backend
  const [referentialsMeta, setReferentialsMeta] = useState([]); // [{id,name}]
  const [areasByReferential, setAreasByReferential] = useState({}); // do localStorage
  const [elementsByArea, setElementsByArea] = useState({}); // {"refId-areaId": [elementId, ...]}

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // === Modal state para criar novo elemento ===
  const [modalOpen, setModalOpen] = useState(false);
  const [elementTypes, setElementTypes] = useState([]);
  const [allMaterials, setAllMaterials] = useState([]);
  const [selectedTypeId, setSelectedTypeId] = useState(null);
  const [newTypeName, setNewTypeName] = useState("");
  const [selectedMaterialsForModal, setSelectedMaterialsForModal] = useState(
    []
  );
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  function updateNovaObra(data) {
    const current = JSON.parse(localStorage.getItem("novaObra")) || {};
    const updated = { ...current, ...data };
    localStorage.setItem("novaObra", JSON.stringify(updated));
  }

  const todasAreasPreenchidas = Object.values(elementsByArea).every(
    (arr) => Array.isArray(arr) && arr.length > 0
  );

  function referentialIdFrom(r) {
    if (!r) return null;
    if (typeof r === "number") return r;
    if (r.id) return r.id;
    return null;
  }

  //
  //

  function hasAnyElementSelected() {
    return Object.values(elementsByArea).some(
      (arr) => Array.isArray(arr) && arr.length > 0
    );
  }
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const stored = JSON.parse(localStorage.getItem("novaObra")) || {};

        const refRaw = stored.referentials || [];
        const referentialIds = refRaw
          .map((r) => referentialIdFrom(r))
          .filter(Boolean);

        const savedAreasMap = stored.areas_by_referential || {};
        setAreasByReferential(savedAreasMap);

        const savedElementsMap = stored.elements_by_area || {};
        setElementsByArea(savedElementsMap);

        let refsMeta = [];
        if (referentialIds.length > 0) {
          try {
            const refsRes = await api.get("/referentials/name");
            const payload = refsRes?.data?.data ?? refsRes?.data ?? [];
            if (Array.isArray(payload)) {
              refsMeta = payload
                .map((r) => ({
                  id: r.id,
                  name:
                    r?.referential_name?.name ??
                    r?.name ??
                    `Referential ${r.id}`,
                }))
                .filter((r) => referentialIds.includes(r.id));
            }
          } catch (err) {
            refsMeta = referentialIds.map((id) => ({
              id,
              name: `Referential ${id}`,
            }));
          }
        }

        const metaIds = refsMeta.map((r) => r.id);
        for (const id of referentialIds) {
          if (!metaIds.includes(id))
            refsMeta.push({ id, name: `Referential ${id}` });
        }
        refsMeta.sort((a, b) => a.id - b.id);
        setReferentialsMeta(refsMeta);

        const elemRes = await api.get("/elements/");

        const elemPayload = elemRes?.data?.data ?? elemRes?.data ?? [];
        const elemsArr = Array.isArray(elemPayload) ? elemPayload : [];
        setAllElements(elemsArr);
      } catch (err) {
        console.error("Erro ao carregar elementos:", err);
        setAllElements([]);
        setReferentialsMeta([]);
        setAreasByReferential({});
        setElementsByArea({});
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  // carregar tipos de elementos e materiais para o modal
  useEffect(() => {
    async function loadAux() {
      try {
        // fetch element types
        const typesRes = await api.get("/elements/types/");
        const typesPayload = typesRes?.data?.data ?? typesRes?.data ?? [];
        const typesArr = Array.isArray(typesPayload) ? typesPayload : [];
        setElementTypes(typesArr);
      } catch (err) {
        console.warn("Erro ao buscar tipos de elementos:", err);
      }
      try {
        // fetch materials
        const matsRes = await api.get("/materials/");
        const matsPayload = matsRes?.data?.data ?? matsRes?.data ?? [];
        const matsArr = Array.isArray(matsPayload) ? matsPayload : [];
        setAllMaterials(matsArr);
      } catch (err) {
        console.warn("Erro ao buscar materiais:", err);
      }
    }
    loadAux();
  }, []);

  function toggleElement(refId, areaId, elementId) {
    const areaKey = `${refId}-${areaId}`;
    setElementsByArea((prev) => {
      const current = prev[areaKey] || [];
      const nextList = current.includes(elementId)
        ? current.filter((x) => x !== elementId)
        : [...current, elementId];
      return { ...prev, [areaKey]: nextList };
    });
  }

  function handleNext() {
    if (!hasAnyElementSelected()) {
      alert("Selecione ao menos um elemento para continuar.");
      return;
    }

    updateNovaObra({ elements_by_area: elementsByArea });
    navigate("/materiais");
  }
  function elementName(e) {
    return e?.element_type?.name || "Elemento";
  }
  function areaName(a) {
    return a?.area_name?.name ?? a?.name ?? `Área ${a?.id ?? ""}`;
  }

  function matchesSearch(text) {
    if (!search) return true;
    return text.toLowerCase().includes(search.toLowerCase());
  }

  // toggle material para modal
  function toggleModalMaterial(materialId) {
    setSelectedMaterialsForModal((prev) =>
      prev.includes(materialId)
        ? prev.filter((x) => x !== materialId)
        : [...prev, materialId]
    );
  }

  // criar novo elemento
  async function createElement() {
    setModalError("");
    let typeId = selectedTypeId;

    // se não selecionou tipo, tenta usar nome digitado para buscar correspondência ou criar novo
    if (!typeId && newTypeName && newTypeName.trim()) {
      const match = elementTypes.find(
        (t) => t.name?.toLowerCase() === newTypeName.trim().toLowerCase()
      );
      if (match) {
        typeId = match.id;
      } else {
        // será criado novo tipo
      }
    }

    // validar que temos typeId ou vamos criar um novo tipo
    if (!typeId && (!newTypeName || !newTypeName.trim())) {
      setModalError("Selecione um tipo de elemento ou informe um novo tipo.");
      return;
    }

    setModalLoading(true);

    const extractMessage = (err) => {
      const resp = err?.response;
      if (!resp) return err?.message || "Erro desconhecido";
      const data = resp.data;
      if (!data) return `Erro ${resp.status || ""}`;
      if (typeof data === "string")
        return resp.status === 404
          ? "Endpoint não encontrado (404)."
          : `Erro ${resp.status}`;
      if (data?.detail) return data.detail;
      if (data?.message) return data.message;
      try {
        return Object.entries(data)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
          .join(" • ");
      } catch {
        return JSON.stringify(data);
      }
    };

    try {
      // 1) criar ElementType se necessário (enviar como array, many=True)
      if (!typeId && newTypeName && newTypeName.trim()) {
        const etRes = await api.post("/elements/types/", [
          { name: newTypeName.trim() },
        ]);
        const etPayload = etRes?.data?.data ?? etRes?.data ?? etRes;
        typeId =
          (Array.isArray(etPayload) ? etPayload[0]?.id : etPayload?.id) ?? null;
        if (!typeId && typeof etPayload === "object") {
          typeId = etPayload?.id ?? etPayload?.pk ?? null;
        }
        if (!typeId)
          throw new Error(
            "Não foi possível obter element_type_id a partir da resposta."
          );
      }

      // 2) criar Element (enviar como array, many=True)
      const payload = [
        {
          element_type_id: typeId,
          material_ids: Array.isArray(selectedMaterialsForModal)
            ? selectedMaterialsForModal
            : [],
        },
      ];

      await api.post("/elements/", payload);
      console.log("Elemento criado com sucesso");

      // 3) recarregar elementos
      try {
        const elemRes = await api.get("/elements/");
        const elemPayload = elemRes?.data?.data ?? elemRes?.data ?? [];
        const elemsArr = Array.isArray(elemPayload) ? elemPayload : [];
        setAllElements(elemsArr);
      } catch (err) {
        console.warn("Erro ao recarregar elementos:", err);
      }

      // fechar modal e resetar
      setModalOpen(false);
      setSelectedTypeId(null);
      setNewTypeName("");
      setSelectedMaterialsForModal([]);
      setModalError("");
    } catch (err) {
      console.error("Erro ao criar elemento:", err);
      setModalError(extractMessage(err));
    } finally {
      setModalLoading(false);
    }
  }

  const stored = JSON.parse(localStorage.getItem("novaObra")) || {};
  const areasMap = stored.areas_by_referential || {};
  const allAreasFromStorage =
    JSON.parse(localStorage.getItem("allAreasCache")) || [];

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="flex items-center gap-4 bg-red-700 text-white px-4 py-3 shadow-md">
        <button
          onClick={() => navigate("/areas")}
          className="p-2 rounded-lg hover:bg-red-600 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-lg">Selecionar Elementos</h1>
      </header>

      <main className="max-w-6xl mx-auto p-6 flex flex-col gap-6">
        <section className="bg-white p-6 rounded-2xl shadow-md flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-xl">Elementos disponíveis</h2>
            <p className="text-sm text-gray-500">
              Escolha os elementos (por Área / Referencial)
            </p>
          </div>

          <div className="flex gap-3 items-center">
            <input
              type="text"
              placeholder="Buscar elemento..."
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
              const refName = ref.name ?? `Referential ${refId}`;
              const areaList = areasMap[refId] ?? [];

              return (
                <section
                  key={refId}
                  className="bg-white p-6 rounded-2xl shadow-md flex flex-col gap-6"
                >
                  <h3 className="font-semibold text-xl">
                    {refName} — Áreas ({areaList.length})
                  </h3>

                  {areaList.length === 0 ? (
                    <p className="text-gray-500">Nenhuma área selecionada.</p>
                  ) : (
                    areaList.map((areaId) => {
                      const areaData = allAreasFromStorage.find(
                        (a) => a.id === areaId
                      );
                      const titleArea = areaName(areaData);
                      const areaKey = `${refId}-${areaId}`;
                      const selectedElems = elementsByArea[areaKey] || [];

                      return (
                        <div
                          key={areaKey}
                          className="border border-gray-200 rounded-xl p-4 flex flex-col gap-4"
                        >
                          <div className="flex justify-between items-center">
                            <h4 className="font-semibold text-lg">
                              {titleArea}
                            </h4>
                            <p className="text-sm text-gray-500">
                              {selectedElems.length} selecionado(s)
                            </p>
                          </div>

                          <div className="grid md:grid-cols-2 gap-4">
                            {allElements
                              .filter((el) => {
                                // Buscar pelo nome do elemento OU pelo element_type
                                const name =
                                  el?.element_type?.name ??
                                  el?.name ??
                                  `EL ${el.id}`;
                                return matchesSearch(name);
                              })
                              .map((el) => {
                                const isSel = selectedElems.includes(el.id);
                                return (
                                  <div
                                    key={`${areaKey}-${el.id}`}
                                    onClick={() =>
                                      toggleElement(refId, areaId, el.id)
                                    }
                                    className={`cursor-pointer bg-white p-5 rounded-2xl border shadow transition flex flex-col gap-2 ${
                                      isSel
                                        ? "border-red-600 ring-2 ring-red-400"
                                        : "border-gray-200"
                                    }`}
                                  >
                                    <div className="flex justify-between items-start">
                                      <h5 className="text-lg font-semibold text-gray-900">
                                        {elementName(el)}
                                      </h5>
                                      <span className="text-xs text-gray-500">
                                        ID {el.id}
                                      </span>
                                    </div>

                                    {el.description && (
                                      <p className="text-xs text-gray-500 italic">
                                        {el.description}
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </section>
              );
            })}

            <div className="flex justify-between items-center my-6">
              <button
                onClick={() => navigate("/areas")}
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded-xl hover:bg-gray-300"
              >
                Voltar
              </button>
              <div className="flex justify-end mt-6">
                <button
                  onClick={handleNext}
                  disabled={Object.values(elementsByArea).some(
                    (arr) => !arr || arr.length === 0
                  )}
                  className="bg-red-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-xl font-semibold hover:bg-red-700"
                >
                  Próximo
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Modal: Criar Elemento */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl w-full max-w-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Criar Elemento</h3>
              <button
                onClick={() => {
                  setModalOpen(false);
                  setModalError("");
                }}
                className="text-gray-500"
              >
                Fechar
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium">Criar novo tipo</label>
              <input
                type="text"
                placeholder="Nome do novo tipo de elemento"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                className="p-3 border rounded-xl"
              />

              {modalError && (
                <div className="text-sm text-red-600">{modalError}</div>
              )}

              <div className="flex justify-end gap-3 mt-3">
                <button
                  onClick={() => {
                    setModalOpen(false);
                    setModalError("");
                  }}
                  className="px-4 py-2 rounded-xl bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={createElement}
                  disabled={modalLoading}
                  className="px-4 py-2 rounded-xl bg-red-600 text-white"
                >
                  {modalLoading ? "Criando..." : "Criar Elemento"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
