import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import api from "../services/axios";

export default function Materials() {
  const navigate = useNavigate();

  const [allMaterials, setAllMaterials] = useState([]);
  const [allBrands, setAllBrands] = useState([]);
  const [materialTypes, setMaterialTypes] = useState([]);
  const [referentialsMeta, setReferentialsMeta] = useState([]);
  const [areasByReferential, setAreasByReferential] = useState({});
  const [elementsByArea, setElementsByArea] = useState({});
  const [materialsByElement, setMaterialsByElement] = useState({});
  const [brandModalOpen, setBrandModalOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [brandLoading, setBrandLoading] = useState(false);
  const [brandError, setBrandError] = useState("");

  // Modal de Tipo de Material
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [typeLoading, setTypeLoading] = useState(false);
  const [typeError, setTypeError] = useState("");

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [newMaterialDesc, setNewMaterialDesc] = useState("");
  const [newMaterialBrandId, setNewMaterialBrandId] = useState("");
  const [newMaterialTypeId, setNewMaterialTypeId] = useState("");
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

  async function handleCreateConstruction() {
    try {
      const stored = JSON.parse(localStorage.getItem("novaObra"));
      if (!stored) {
        alert("Nenhuma obra encontrada!");
        return;
      }

      const referentialIds = (stored.referentials || []).map((r) =>
        typeof r === "object" ? r.id : r
      );

      const payload = {
        project_name: stored.project_name,
        location: stored.location,
        description: stored.description,
        referentials: referentialIds,
      };

      await api.post("/constructions/", payload);

      alert("Obra criada com sucesso!");
      localStorage.removeItem("novaObra");

      navigate("/home");
    } catch (error) {
      console.error(error);
    }
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

        const savedMaterialsMap = stored.materials_by_element || {};
        setMaterialsByElement(savedMaterialsMap);

        let refsMeta = [];
        if (referentialIds.length > 0) {
          try {
            const refsRes = await api.get("/referentials/");
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

        // Carregar materiais, marcas e tipos
        try {
          const matsRes = await api.get("/materials/");
          const matsPayload = matsRes?.data?.data ?? matsRes?.data ?? [];
          const matsArr = Array.isArray(matsPayload) ? matsPayload : [];
          setAllMaterials(matsArr);
        } catch (err) {
          console.warn("Erro ao buscar materiais:", err);
        }

        try {
          const brandsRes = await api.get("/materials/brands/");
          const brandsPayload = brandsRes?.data?.data ?? brandsRes?.data ?? [];
          const brandsArr = Array.isArray(brandsPayload) ? brandsPayload : [];
          setAllBrands(brandsArr);
        } catch (err) {
          console.warn("Erro ao buscar marcas:", err);
        }

        try {
          const typesRes = await api.get("/materials/types_of_materials/");
          const typesPayload = typesRes?.data?.data ?? typesRes?.data ?? [];
          const typesArr = Array.isArray(typesPayload) ? typesPayload : [];
          setMaterialTypes(typesArr);
        } catch (err) {
          console.warn("Erro ao buscar tipos de materiais:", err);
        }
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
      } finally {
        setLoading(false);
      }
      try {
        const elementsRes = await api.get("/elements/");
        const elementsPayload =
          elementsRes?.data?.data ?? elementsRes?.data ?? [];
        const elementsArr = Array.isArray(elementsPayload)
          ? elementsPayload
          : [];

        localStorage.setItem("allElementsCache", JSON.stringify(elementsArr));
      } catch (err) {
        console.warn("Erro ao buscar elementos:", err);
      }
    }

    load();
  }, []);

  function toggleMaterial(refId, areaId, elementId, materialId) {
    const elemKey = `${refId}-${areaId}-${elementId}`;
    setMaterialsByElement((prev) => {
      const current = prev[elemKey] || [];
      const nextList = current.includes(materialId)
        ? current.filter((x) => x !== materialId)
        : [...current, materialId];
      return { ...prev, [elemKey]: nextList };
    });
  }

  function handleNext() {
    updateNovaObra({ materials_by_element: materialsByElement });
    navigate("/home");
  }
  function elementName(e) {
    if (!e) return "Elemento";

    // tentar várias possibilidades
    return (
      e.name || e.element_type?.name || e.element_type?.type_name || "Elemento"
    );
  }

  function areaName(a) {
    return a?.area_name?.name ?? a?.name ?? `Área ${a?.id ?? ""}`;
  }

  function matchesSearch(text) {
    if (!search) return true;
    return text.toLowerCase().includes(search.toLowerCase());
  }

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

  async function createMaterial() {
    setModalError("");

    if (!newMaterialDesc || !newMaterialDesc.trim()) {
      setModalError("Informe a descrição do material.");
      return;
    }

    if (!newMaterialBrandId) {
      setModalError("Selecione uma marca.");
      return;
    }

    if (!newMaterialTypeId) {
      setModalError("Selecione um tipo de material.");
      return;
    }

    setModalLoading(true);

    try {
      await api.post("/materials/", [
        {
          description: newMaterialDesc.trim(),
          brand: parseInt(newMaterialBrandId),
          material_type: parseInt(newMaterialTypeId),
        },
      ]);

      try {
        const matsRes = await api.get("/materials/");
        const matsPayload = matsRes?.data?.data ?? matsRes?.data ?? [];
        const matsArr = Array.isArray(matsPayload) ? matsPayload : [];
        setAllMaterials(matsArr);
      } catch (err) {
        console.warn("Erro ao recarregar materiais:", err);
      }

      setMaterialModalOpen(false);
      setNewMaterialDesc("");
      setNewMaterialBrandId("");
      setNewMaterialTypeId("");
      setModalError("");
    } catch (err) {
      console.error("Erro ao criar material:", err);
      setModalError(extractMessage(err));
    } finally {
      setModalLoading(false);
    }
  }

  const allElementsCache =
    JSON.parse(localStorage.getItem("allElementsCache")) || [];
  const allAreasFromStorage =
    JSON.parse(localStorage.getItem("allAreasCache")) || [];

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="flex items-center gap-4 bg-red-700 text-white px-4 py-3 shadow-md">
        <button
          onClick={() => navigate("/elementos")}
          className="p-2 rounded-lg hover:bg-red-600 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-lg">Selecionar Materiais</h1>
      </header>

      <main className="max-w-6xl mx-auto p-6 flex flex-col gap-6">
        <section className="bg-white p-6 rounded-2xl shadow-md flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-xl">Materiais disponíveis</h2>
            <p className="text-sm text-gray-500">
              Escolha os materiais para cada elemento
            </p>
          </div>

          <div className="flex gap-3 items-center">
            <input
              type="text"
              placeholder="Buscar material..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 p-3 rounded-xl border border-gray-300 focus:border-red-600 focus:outline-none"
            />
            <button
              onClick={() => setMaterialModalOpen(true)}
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
              const areaList = areasByReferential[refId] ?? [];

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
                          className="border border-gray-200 rounded-xl p-4 flex flex-col gap-6"
                        >
                          <div className="flex justify-between items-center">
                            <h4 className="font-semibold text-lg">
                              {titleArea}
                            </h4>
                            <p className="text-sm text-gray-500">
                              {selectedElems.length} elemento(s)
                            </p>
                          </div>

                          {selectedElems.length === 0 ? (
                            <p className="text-gray-500">
                              Nenhum elemento selecionado nesta área.
                            </p>
                          ) : (
                            selectedElems.map((elementId) => {
                              const elemData = allElementsCache.find(
                                (e) => e.id === elementId
                              );
                              const elemName = elementName(elemData);

                              const elemKey = `${refId}-${areaId}-${elementId}`;
                              const selectedMats =
                                materialsByElement[elemKey] || [];

                              console.log("Elemento:", elemData);
                              console.log(
                                "allElementsCache:",
                                allElementsCache
                              );
                              console.log("elementId:", elementId);
                              console.log(
                                "Encontrado:",
                                allElementsCache.find((e) => e.id == elementId)
                              );

                              return (
                                <div
                                  key={elemKey}
                                  className="border border-gray-300 rounded-lg p-4 flex flex-col gap-4 bg-gray-50"
                                >
                                  <div className="flex justify-between items-center">
                                    <h5 className="font-semibold text-base">
                                      {elemName}
                                    </h5>
                                    <span className="text-xs text-gray-500">
                                      {selectedMats.length} material(is)
                                    </span>
                                  </div>

                                  <div className="grid md:grid-cols-2 gap-3">
                                    {allMaterials
                                      .filter((mat) => {
                                        const matName =
                                          mat?.description ||
                                          mat?.name ||
                                          `Material ${mat.id}`;
                                        return matchesSearch(matName);
                                      })
                                      .map((mat) => {
                                        const isSel = selectedMats.includes(
                                          mat.id
                                        );
                                        return (
                                          <div
                                            key={`${elemKey}-${mat.id}`}
                                            onClick={() =>
                                              toggleMaterial(
                                                refId,
                                                areaId,
                                                elementId,
                                                mat.id
                                              )
                                            }
                                            className={`cursor-pointer bg-white p-4 rounded-lg border shadow-sm transition flex flex-col gap-1 ${
                                              isSel
                                                ? "border-red-600 ring-2 ring-red-400"
                                                : "border-gray-200"
                                            }`}
                                          >
                                            <p className="text-sm font-medium text-gray-900">
                                              {mat?.description ||
                                                mat?.name ||
                                                `Material ${mat.id}`}
                                            </p>
                                            <p className="text-xs text-gray-600">
                                              Marca: {mat?.brand_name || "N/A"}
                                            </p>
                                            <p className="text-xs text-gray-600">
                                              Tipo:{" "}
                                              {mat?.material_type_name || "N/A"}
                                            </p>
                                          </div>
                                        );
                                      })}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      );
                    })
                  )}
                </section>
              );
            })}

            <div className="flex justify-between items-center my-6">
              <button
                onClick={() => navigate("/elementos")}
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded-xl hover:bg-gray-300"
              >
                Voltar
              </button>

              <div className="flex gap-3">
                {/* ✅ Botão para criar obra */}
                <button
                  onClick={handleCreateConstruction}
                  disabled={
                    !Object.values(materialsByElement).every(
                      (arr) => Array.isArray(arr) && arr.length > 0
                    )
                  }
                  className={`px-6 py-3 rounded-xl font-semibold ${
                    !Object.values(materialsByElement).every(
                      (arr) => Array.isArray(arr) && arr.length > 0
                    )
                      ? "bg-gray-400 text-white cursor-not-allowed"
                      : "bg-red-600 text-white hover:bg-red-700"
                  }`}
                >
                  Criar Obra
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Modal: Criar Material */}
      {materialModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl w-full max-w-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Criar Material</h3>
              <button
                onClick={() => {
                  setMaterialModalOpen(false);
                  setModalError("");
                }}
                className="text-gray-500"
              >
                Fechar
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium">Nome</label>
              <textarea
                placeholder="Digite a descrição do material"
                value={newMaterialDesc}
                onChange={(e) => setNewMaterialDesc(e.target.value)}
                className="p-3 border rounded-xl min-h-20"
              />

              <label className="text-sm font-medium">Marca</label>
              <div className="flex gap-2">
                <select
                  value={newMaterialBrandId}
                  onChange={(e) => setNewMaterialBrandId(e.target.value)}
                  className="p-3 border rounded-xl flex-1"
                >
                  <option value="">Selecione uma marca</option>
                  {allBrands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => setBrandModalOpen(true)}
                  className="bg-blue-600 text-white px-3 rounded-xl flex items-center justify-center"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              <label className="text-sm font-medium">Tipo de Material</label>
              <div className="flex gap-2">
                <select
                  value={newMaterialTypeId}
                  onChange={(e) => setNewMaterialTypeId(e.target.value)}
                  className="p-3 border rounded-xl flex-1"
                >
                  <option value="">Selecione um tipo</option>
                  {materialTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => setTypeModalOpen(true)}
                  className="bg-blue-600 text-white px-3 rounded-xl flex items-center justify-center"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {modalError && (
                <div className="text-sm text-red-600">{modalError}</div>
              )}

              <div className="flex justify-end gap-3 mt-3">
                <button
                  onClick={() => {
                    setMaterialModalOpen(false);
                    setModalError("");
                  }}
                  className="px-4 py-2 rounded-xl bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={createMaterial}
                  disabled={modalLoading}
                  className="px-4 py-2 rounded-xl bg-red-600 text-white"
                >
                  {modalLoading ? "Criando..." : "Criar Material"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {brandModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Criar Nova Marca</h3>

            <input
              type="text"
              placeholder="Nome da marca"
              value={newBrandName}
              onChange={(e) => setNewBrandName(e.target.value)}
              className="w-full p-3 border rounded-xl mb-3"
            />

            {brandError && (
              <p className="text-sm text-red-600 mb-2">{brandError}</p>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setBrandModalOpen(false);
                  setBrandError("");
                }}
                className="px-4 py-2 rounded-xl bg-gray-200"
              >
                Cancelar
              </button>

              <button
                onClick={async () => {
                  if (!newBrandName.trim()) {
                    setBrandError("Informe um nome.");
                    return;
                  }

                  setBrandLoading(true);

                  try {
                    await api.post("/materials/brands/", [
                      { name: newBrandName.trim() },
                    ]);

                    const res = await api.get("/materials/brands/");
                    const arr = res?.data?.data ?? res?.data ?? [];
                    setAllBrands(arr);

                    setBrandModalOpen(false);
                    setNewBrandName("");
                  } catch (err) {
                    setBrandError(extractMessage(err));
                  } finally {
                    setBrandLoading(false);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white"
              >
                {brandLoading ? "Criando..." : "Criar"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal para criar Tipo */}
      {typeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-4">
              Criar Novo Tipo de Material
            </h3>

            <input
              type="text"
              placeholder="Nome do tipo de material"
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              className="w-full p-3 border rounded-xl mb-3"
            />

            {typeError && (
              <p className="text-sm text-red-600 mb-2">{typeError}</p>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setTypeModalOpen(false);
                  setTypeError("");
                }}
                className="px-4 py-2 rounded-xl bg-gray-200"
              >
                Cancelar
              </button>

              <button
                onClick={async () => {
                  if (!newTypeName.trim()) {
                    setTypeError("Informe um nome.");
                    return;
                  }

                  setTypeLoading(true);

                  try {
                    await api.post("/materials/types_of_materials/", [
                      {
                        name: newTypeName.trim(),
                      },
                    ]);

                    const res = await api.get("/materials/types_of_materials/");
                    const arr = res?.data?.data ?? res?.data ?? [];
                    setMaterialTypes(arr);

                    setTypeModalOpen(false);
                    setNewTypeName("");
                  } catch (err) {
                    setTypeError(extractMessage(err));
                  } finally {
                    setTypeLoading(false);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white"
              >
                {typeLoading ? "Criando..." : "Criar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
