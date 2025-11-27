import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import api from "../services/axios";

export default function SelecionarElementos() {
  const navigate = useNavigate();

  const [allElements, setAllElements] = useState([]); 
  const [referentialsMeta, setReferentialsMeta] = useState([]); 
  const [areasByReferential, setAreasByReferential] = useState({});
  const [elementsByArea, setElementsByArea] = useState({});

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [elementTypes, setElementTypes] = useState([]);
  const [allMaterials, setAllMaterials] = useState([]);
  const [selectedTypeId, setSelectedTypeId] = useState(null);
  const [newTypeName, setNewTypeName] = useState("");
  const [selectedMaterialsForModal, setSelectedMaterialsForModal] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  function updateNovaObra(data) {
    const current = JSON.parse(localStorage.getItem("novaObra")) || {};
    const updated = { ...current, ...data };
    localStorage.setItem("novaObra", JSON.stringify(updated));
  }

  function referentialIdFrom(r) {
    if (!r) return null;
    if (typeof r === "number") return r;
    if (r.id) return r.id;
    return null;
  }

  function hasAnyElementSelected() {
    return Object.values(elementsByArea).some(
      (arr) => Array.isArray(arr) && arr.length > 0
    );
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {

        const obraEdit = JSON.parse(localStorage.getItem("obraEmEdicao"));

        const stored =
          obraEdit?.selecionar_elementos ||
          JSON.parse(localStorage.getItem("novaObra")) ||
          {};

        if (obraEdit) {
          updateNovaObra(obraEdit.selecionar_elementos);
        }

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

            refsMeta = payload
              .map((r) => ({
                id: r.id,
                name:
                  r?.referential_name?.name ??
                  r?.name ??
                  `Referential ${r.id}`,
              }))
              .filter((r) => referentialIds.includes(r.id));
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
        setAllElements(Array.isArray(elemPayload) ? elemPayload : []);

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
        const typesRes = await api.get("/elements/types/");
        const typesPayload = typesRes?.data?.data ?? typesRes?.data ?? [];
        setElementTypes(Array.isArray(typesPayload) ? typesPayload : []);
      } catch (err) {}

      try {
        const matsRes = await api.get("/materials/");
        const matsPayload = matsRes?.data?.data ?? matsRes?.data ?? [];
        setAllMaterials(Array.isArray(matsPayload) ? matsPayload : []);
      } catch (err) {}
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

  function toggleModalMaterial(materialId) {
    setSelectedMaterialsForModal((prev) =>
      prev.includes(materialId)
        ? prev.filter((x) => x !== materialId)
        : [...prev, materialId]
    );
  }

  async function createElement() {
    setModalError("");
    let typeId = selectedTypeId;

    if (!typeId && newTypeName && newTypeName.trim()) {
      const match = elementTypes.find(
        (t) => t.name?.toLowerCase() === newTypeName.trim().toLowerCase()
      );
      if (match) typeId = match.id;
    }

    if (!typeId && (!newTypeName || !newTypeName.trim())) {
      setModalError("Selecione um tipo ou informe um novo tipo.");
      return;
    }

    setModalLoading(true);

    try {
      if (!typeId && newTypeName.trim()) {
        const etRes = await api.post("/elements/types/", [
          { name: newTypeName.trim() },
        ]);

        const etPayload = etRes?.data?.data ?? etRes?.data ?? etRes;
        typeId =
          (Array.isArray(etPayload) ? etPayload[0]?.id : etPayload?.id) ??
          null;
      }

      const payload = [
        {
          element_type_id: typeId,
          material_ids: selectedMaterialsForModal,
        },
      ];

      await api.post("/elements/", payload);

      const elemRes = await api.get("/elements/");
      const elemPayload = elemRes?.data?.data ?? elemRes?.data ?? [];
      setAllElements(Array.isArray(elemPayload) ? elemPayload : []);

      setModalOpen(false);
      setSelectedTypeId(null);
      setNewTypeName("");
      setSelectedMaterialsForModal([]);

    } catch (err) {
      setModalError("Erro ao criar elemento.");
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
                  disabled={!hasAnyElementSelected()}
                  className="bg-red-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-xl font-semibold hover:bg-red-700"
                >
                  Próximo
                </button>
              </div>
            </div>
          </>
        )}
      </main>

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
