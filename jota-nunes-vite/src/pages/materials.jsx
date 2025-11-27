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
  
  // Estados do localStorage
  const [areasByReferential, setAreasByReferential] = useState({});
  const [elementsByArea, setElementsByArea] = useState({});
  const [materialsByElement, setMaterialsByElement] = useState({});

  // Modais
  const [brandModalOpen, setBrandModalOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [brandLoading, setBrandLoading] = useState(false);
  const [brandError, setBrandError] = useState("");

  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [typeLoading, setTypeLoading] = useState(false);
  const [typeError, setTypeError] = useState("");

  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [newMaterialDesc, setNewMaterialDesc] = useState("");
  const [newMaterialBrandId, setNewMaterialBrandId] = useState("");
  const [newMaterialTypeId, setNewMaterialTypeId] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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

  const extractMessage = (err) => {
    const resp = err?.response;
    if (!resp) return err?.message || "Erro desconhecido";
    const data = resp.data;
    if (!data) return `Erro ${resp.status || ""}`;
    if (typeof data === "string") return resp.status === 404 ? "Endpoint não encontrado." : `Erro ${resp.status}`;
    if (data?.detail) return data.detail;
    if (data?.message) return data.message;
    try {
      return Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join(" • ");
    } catch {
      return JSON.stringify(data);
    }
  };

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

      const obsSource = stored.observations_ids || stored.observations || [];
      const observationIds = obsSource.map((o) => 
        typeof o === "object" ? o.id : o
      );

      const payload = {
        project_name: stored.project_name || stored.projectName,
        location: stored.location,
        description: stored.description,
        aprovation_observations: stored.aprovation_observations,
        referentials: referentialIds, 
        observations: observationIds, 
      };

      console.log("Payload enviado (IDs Planos):", payload);

      if (stored.id) {
        await api.patch(`/constructions/${stored.id}/`, payload);
        alert("Obra atualizada com sucesso!");
      } else {
        await api.post("/constructions/", payload);
        alert("Obra criada com sucesso!");
      }

      localStorage.removeItem("novaObra");
      navigate("/home");

    } catch (error) {
      console.error("Erro ao salvar obra:", error);
      alert(`Erro ao salvar: ${extractMessage(error)}`);
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

        setAreasByReferential(stored.areas_by_referential || {});
        setElementsByArea(stored.elements_by_area || {});
        setMaterialsByElement(stored.materials_by_element || {});

        let refsMeta = [];
        if (referentialIds.length > 0) {
          try {
            const refsRes = await api.get("/referentials/");
            const payload = refsRes?.data?.data ?? refsRes?.data ?? [];
            if (Array.isArray(payload)) {
              refsMeta = payload
                .map((r) => ({
                  id: r.id,
                  name: r?.referential_name?.name ?? r?.name ?? `Referential ${r.id}`,
                }))
                .filter((r) => referentialIds.includes(r.id));
            }
          } catch (err) {
            refsMeta = referentialIds.map((id) => ({ id, name: `Referential ${id}` }));
          }
        }

        const metaIds = refsMeta.map((r) => r.id);
        for (const id of referentialIds) {
          if (!metaIds.includes(id)) refsMeta.push({ id, name: `Referential ${id}` });
        }
        refsMeta.sort((a, b) => a.id - b.id);
        setReferentialsMeta(refsMeta);

        const [matsRes, brandsRes, typesRes] = await Promise.all([
            api.get("/materials/"),
            api.get("/materials/brands/"),
            api.get("/materials/types_of_materials/")
        ]);

        setAllMaterials(Array.isArray(matsRes?.data?.data ?? matsRes?.data) ? (matsRes?.data?.data ?? matsRes?.data) : []);
        setAllBrands(Array.isArray(brandsRes?.data?.data ?? brandsRes?.data) ? (brandsRes?.data?.data ?? brandsRes?.data) : []);
        setMaterialTypes(Array.isArray(typesRes?.data?.data ?? typesRes?.data) ? (typesRes?.data?.data ?? typesRes?.data) : []);

      } catch (err) {
        console.error("Erro ao carregar dados:", err);
      } finally {
        setLoading(false);
      }
      
      try {
        const elementsRes = await api.get("/elements/");
        const elementsArr = Array.isArray(elementsRes?.data?.data ?? elementsRes?.data) ? (elementsRes?.data?.data ?? elementsRes?.data) : [];
        localStorage.setItem("allElementsCache", JSON.stringify(elementsArr));
      } catch (err) { console.warn(err); }
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
      
      const newState = { ...prev, [elemKey]: nextList };
      updateNovaObra({ materials_by_element: newState }); 
      return newState;
    });
  }

  function elementName(e) {
    if (!e) return "Elemento";
    return e.name || e.element_type?.name || e.element_type?.type_name || "Elemento";
  }

  function areaName(a) {
    return a?.area_name?.name ?? a?.name ?? `Área ${a?.id ?? ""}`;
  }

  function matchesSearch(text) {
    if (!search) return true;
    return text.toLowerCase().includes(search.toLowerCase());
  }

  async function createMaterial() {
    setModalError("");
    if (!newMaterialDesc.trim() || !newMaterialBrandId || !newMaterialTypeId) {
      setModalError("Preencha todos os campos.");
      return;
    }
    setModalLoading(true);

    try {
      await api.post("/materials/", [{
          description: newMaterialDesc.trim(),
          brand: parseInt(newMaterialBrandId),
          material_type: parseInt(newMaterialTypeId),
      }]);

      const matsRes = await api.get("/materials/");
      setAllMaterials(Array.isArray(matsRes?.data?.data ?? matsRes?.data) ? (matsRes?.data?.data ?? matsRes?.data) : []);

      setMaterialModalOpen(false);
      setNewMaterialDesc("");
      setNewMaterialBrandId("");
      setNewMaterialTypeId("");
    } catch (err) {
      console.error("Erro ao criar material:", err);
      setModalError(extractMessage(err));
    } finally {
      setModalLoading(false);
    }
  }

  const allElementsCache = JSON.parse(localStorage.getItem("allElementsCache")) || [];
  const allAreasFromStorage = JSON.parse(localStorage.getItem("allAreasCache")) || [];
  const isEditing = !!(JSON.parse(localStorage.getItem("novaObra")) || {}).id;

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
            <p className="text-sm text-gray-500">Escolha os materiais para cada elemento</p>
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
              <Plus className="w-5 h-5" /> Novo
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
                <section key={refId} className="bg-white p-6 rounded-2xl shadow-md flex flex-col gap-6">
                  <h3 className="font-semibold text-xl">{refName} — Áreas ({areaList.length})</h3>

                  {areaList.length === 0 ? (
                    <p className="text-gray-500">Nenhuma área selecionada.</p>
                  ) : (
                    areaList.map((areaId) => {
                      const areaData = allAreasFromStorage.find((a) => a.id === areaId);
                      const titleArea = areaName(areaData);
                      const areaKey = `${refId}-${areaId}`;
                      const selectedElems = elementsByArea[areaKey] || [];

                      if (selectedElems.length === 0) return null;

                      return (
                        <div key={areaKey} className="border border-gray-200 rounded-xl p-4 flex flex-col gap-6">
                          <div className="flex justify-between items-center">
                            <h4 className="font-semibold text-lg">{titleArea}</h4>
                            <p className="text-sm text-gray-500">{selectedElems.length} elemento(s)</p>
                          </div>

                          {selectedElems.map((elementId) => {
                            const elemData = allElementsCache.find((e) => e.id === elementId);
                            const elemName = elementName(elemData);
                            const elemKey = `${refId}-${areaId}-${elementId}`;
                            const selectedMats = materialsByElement[elemKey] || [];

                            return (
                              <div key={elemKey} className="border border-gray-300 rounded-lg p-4 flex flex-col gap-4 bg-gray-50">
                                <div className="flex justify-between items-center">
                                  <h5 className="font-semibold text-base">{elemName}</h5>
                                  <span className="text-xs text-gray-500">{selectedMats.length} material(is)</span>
                                </div>

                                <div className="grid md:grid-cols-2 gap-3">
                                  {allMaterials
                                    .filter((mat) => matchesSearch(mat?.description || mat?.name || ""))
                                    .map((mat) => {
                                      const isSel = selectedMats.includes(mat.id);
                                      return (
                                        <div
                                          key={`${elemKey}-${mat.id}`}
                                          onClick={() => toggleMaterial(refId, areaId, elementId, mat.id)}
                                          className={`cursor-pointer bg-white p-4 rounded-lg border shadow-sm transition flex flex-col gap-1 ${
                                            isSel ? "border-red-600 ring-2 ring-red-400" : "border-gray-200 hover:border-red-300"
                                          }`}
                                        >
                                          <p className="text-sm font-medium text-gray-900">{mat?.description || mat?.name}</p>
                                          <p className="text-xs text-gray-600">Marca: {mat?.brand_name || "N/A"}</p>
                                          <p className="text-xs text-gray-600">Tipo: {mat?.material_type_name || "N/A"}</p>
                                        </div>
                                      );
                                    })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })
                  )}
                </section>
              );
            })}

            <div className="flex justify-between items-center my-6">
              <button onClick={() => navigate("/elementos")} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-xl hover:bg-gray-300">
                Voltar
              </button>

              <div className="flex gap-3">
                <button
                  onClick={handleCreateConstruction}
                  disabled={!Object.values(materialsByElement).some((arr) => Array.isArray(arr) && arr.length > 0)}
                  className={`px-6 py-3 rounded-xl font-semibold transition shadow-lg ${
                    !Object.values(materialsByElement).some((arr) => Array.isArray(arr) && arr.length > 0)
                      ? "bg-gray-400 text-white cursor-not-allowed"
                      : "bg-red-600 text-white hover:bg-red-700"
                  }`}
                >
                  {isEditing ? "Salvar Alterações" : "Criar Obra"}
                </button>
              </div>
            </div>
          </>
        )}
      </main>
      
      {materialModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl w-full max-w-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Criar Material</h3>
              <button onClick={() => setMaterialModalOpen(false)} className="text-gray-500">Fechar</button>
            </div>
            <div className="flex flex-col gap-3">
               <label className="text-sm font-medium">Nome</label>
               <textarea 
                className="p-3 border rounded-xl" 
                value={newMaterialDesc} 
                onChange={e => setNewMaterialDesc(e.target.value)} 
                placeholder="Descrição do material"
               />

               <label className="text-sm font-medium">Marca</label>
               <div className="flex gap-2">
                 <select 
                    className="p-3 border rounded-xl flex-1"
                    value={newMaterialBrandId}
                    onChange={e => setNewMaterialBrandId(e.target.value)}
                 >
                    <option value="">Selecione uma marca</option>
                    {allBrands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                 </select>
                 <button onClick={() => setBrandModalOpen(true)} className="bg-blue-600 text-white px-3 rounded-xl"><Plus className="w-5 h-5"/></button>
               </div>

               <label className="text-sm font-medium">Tipo</label>
               <div className="flex gap-2">
                 <select 
                    className="p-3 border rounded-xl flex-1"
                    value={newMaterialTypeId}
                    onChange={e => setNewMaterialTypeId(e.target.value)}
                 >
                    <option value="">Selecione um tipo</option>
                    {materialTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                 </select>
                 <button onClick={() => setTypeModalOpen(true)} className="bg-blue-600 text-white px-3 rounded-xl"><Plus className="w-5 h-5"/></button>
               </div>

               {modalError && <div className="text-red-600 text-sm">{modalError}</div>}

               <div className="flex justify-end gap-3 mt-3">
                 <button onClick={() => setMaterialModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-xl">Cancelar</button>
                 <button onClick={createMaterial} className="px-4 py-2 bg-red-600 text-white rounded-xl">
                    {modalLoading ? "Criando..." : "Criar"}
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}

      {brandModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-lg">
             <h3 className="text-lg font-semibold mb-4">Nova Marca</h3>
             <input 
                type="text" 
                placeholder="Nome da marca"
                className="w-full p-3 border rounded-xl mb-3"
                value={newBrandName}
                onChange={e => setNewBrandName(e.target.value)}
             />
             {brandError && <p className="text-red-600 text-sm mb-2">{brandError}</p>}
             <div className="flex justify-end gap-3">
                <button onClick={() => setBrandModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-xl">Cancelar</button>
                <button 
                    onClick={async () => {
                        if(!newBrandName.trim()) return setBrandError("Informe um nome");
                        setBrandLoading(true);
                        try {
                            await api.post("/materials/brands/", [{name: newBrandName.trim()}]);
                            const res = await api.get("/materials/brands/");
                            setAllBrands(res?.data?.data ?? res?.data ?? []);
                            setBrandModalOpen(false);
                            setNewBrandName("");
                        } catch(err) { setBrandError(extractMessage(err)); }
                        finally { setBrandLoading(false); }
                    }} 
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl"
                >
                    {brandLoading ? "Criando..." : "Criar"}
                </button>
             </div>
          </div>
        </div>
      )}

      {typeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-lg">
             <h3 className="text-lg font-semibold mb-4">Novo Tipo de Material</h3>
             <input 
                type="text" 
                placeholder="Nome do tipo"
                className="w-full p-3 border rounded-xl mb-3"
                value={newTypeName}
                onChange={e => setNewTypeName(e.target.value)}
             />
             {typeError && <p className="text-red-600 text-sm mb-2">{typeError}</p>}
             <div className="flex justify-end gap-3">
                <button onClick={() => setTypeModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-xl">Cancelar</button>
                <button 
                    onClick={async () => {
                        if(!newTypeName.trim()) return setTypeError("Informe um nome");
                        setTypeLoading(true);
                        try {
                            await api.post("/materials/types_of_materials/", [{name: newTypeName.trim()}]);
                            const res = await api.get("/materials/types_of_materials/");
                            setMaterialTypes(res?.data?.data ?? res?.data ?? []);
                            setTypeModalOpen(false);
                            setNewTypeName("");
                        } catch(err) { setTypeError(extractMessage(err)); }
                        finally { setTypeLoading(false); }
                    }} 
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl"
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