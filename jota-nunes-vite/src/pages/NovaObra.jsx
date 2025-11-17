import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import api from "../services/axios";

export default function NovaObra() {
  const navigate = useNavigate();
  const [referentials, setReferentials] = useState([]);
  const [observations, setObservations] = useState([]);
  const [elements, setElements] = useState([]);

  const [searchReferentials, setSearchReferentials] = useState("");
  const [searchElements, setSearchElements] = useState("");
  const [selectedReferentials, setSelectedReferentials] = useState([]);
  const [selectedElements, setSelectedElements] = useState([]);
  const [selectedObservations, setSelectedObservations] = useState([]);

  // ▸ states locais da obra
  const [projectName, setProjectName] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [aprovationObservations, setAprovationObservations] = useState("");

  // === Modal state & helpers ===
  const [modalOpen, setModalOpen] = useState(false);
  const [elementsModalOpen, setElementsModalOpen] = useState(false);
  const [observationsModalOpen, setObservationsModalOpen] = useState(false);
  const [availableAreas, setAvailableAreas] = useState([]);
  const [availableMaterials, setAvailableMaterials] = useState([]);
  const [newRefName, setNewRefName] = useState("");
  const [newElementTypeName, setnewElementTypeName] = useState("");
  const [newObservationDesc, setNewObservationDesc] = useState("");
  const [selectedAreasForModal, setSelectedAreasForModal] = useState([]);
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

  useEffect(() => {
    async function fetchElements() {
      try {
        const response = await api.get("/elements/");
        const elementsList = response.data.data;
        console.log(elementsList);
        setElements(elementsList);
      } catch (error) {
        console.log("Erro ao buscar os elementos: ", error);
      }
    }
    fetchElements();
  }, []);

  useEffect(() => {
    async function fetchReferentials() {
      try {
        const res = await api.get("/referentials/");
        console.log("✅ RES.DATA:", res.data);
        const list = res?.data?.data ?? [];
        console.log("✅ LIST:", list);
        setReferentials(list);
      } catch (err) {
        console.error("❌ Erro ao buscar referentials:", err);
      }
    }

    fetchReferentials();
  }, []);

  useEffect(() => {
    async function fetchObservations() {
      try {
        const res = await api.get("/observations/");
        console.log("✅ Observations RES.DATA:", res.data);
        const list = res?.data?.data ?? [];
        console.log("✅ Observations LIST:", list);
        setObservations(list);
      } catch (err) {
        console.error("❌ Erro ao buscar observations:", err);
      }
    }

    fetchObservations();
  }, []);

  // NEW: carregar áreas para o modal
  useEffect(() => {
    async function loadAux() {
      try {
        try {
          const areasRes = await api.get("/areas/");
          const areasPayload = areasRes?.data?.data ?? areasRes?.data ?? [];
          const areasArr = Array.isArray(areasPayload) ? areasPayload : [];
          setAvailableAreas(areasArr);
        } catch (e) {
          console.warn("Erro ao buscar áreas para modal:", e);
        }
        try {
          const materialsRes = await api.get("/materials/");
          const materialsPayload =
            materialsRes?.data?.data ?? materialsRes?.data ?? [];
          const materialsArr = Array.isArray(materialsPayload)
            ? materialsPayload
            : [];
          setAvailableMaterials(materialsArr);
        } catch (e) {
          console.warn("Erro ao buscar materiais para modal:", e);
        }
      } catch (err) {
        console.error("Erro loadAux:", err);
      }
    }

    loadAux();
  }, []);

  const filteredReferentials = referentials.filter(
    (r) =>
      r &&
      r.referential_name &&
      r.referential_name.name &&
      r.referential_name.name
        .toLowerCase()
        .includes(searchReferentials.toLowerCase())
  );

  // Filtrar elementos por busca e remover duplicatas baseado no element_type.id
  const filteredElements = elements
    .filter(
      (element) =>
        element &&
        element.element_type &&
        element.element_type.name &&
        element.element_type.name
          .toLowerCase()
          .includes(searchElements.toLocaleLowerCase())
    )
    .reduce((unique, element) => {
      const elementTypeId = element.element_type.id;
      // Verificar se já existe um elemento com este element_type.id
      const exists = unique.find((el) => el.element_type.id === elementTypeId);
      if (!exists) {
        unique.push(element);
      }
      return unique;
    }, []);

  function toggleElementSelect(id) {
    setSelectedElements((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleSelect(id) {
    setSelectedReferentials((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleObservationSelect(id) {
    setSelectedObservations((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleNext() {
    if (!projectName || !location || !description) {
      alert("Informe todos os dados gerais da obra.");
      setModalError("Informe todos os campos obrigatórios.");
      return;
    }

    if (selectedReferentials.length === 0) {
      alert("Selecione pelo menos um referencial.");
      setModalError("Selecione pelo menos um referencial.");
      return;
    }

    if (selectedElements.length === 0) {
      alert("Selecione pelo menos um elemento.");
      setModalError("Selecione pelo menos um elemento.");
      return;
    }

    updateNovaObra({
      project_name: projectName,
      location: location,
      description: description,
      aprovation_observations: aprovationObservations,
      referentials: selectedReferentials,
      elements: selectedElements,
      observations_ids: selectedObservations,
    });

    navigate("/areas");
  }

  // create element: criar ElementTypeName via /elements/types/ (espera um array) e depois criar /elements/
  async function createElement() {
    setModalError("");

    if (!newElementTypeName || !newElementTypeName.trim()) {
      setModalError("Informe o nome do elemento");
      return;
    }

    setModalLoading(true);

    const extractMessage = (err) => {
      const resp = err?.response;
      if (!resp) return err?.message || "Erro desconhecido";
      const data = resp.data;
      if (!data) return `Erro ${resp.status || ""}`;
      if (typeof data === "string") {
        return resp.status === 404
          ? "Endpoint não encontrado (404). Verifique a API."
          : `Erro ${resp.status}`;
      }
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
      // 1) criar ElementType (enviar como array, many=True)
      const etRes = await api.post("/elements/types/", [
        { name: newElementTypeName.trim() },
      ]);

      const etPayload = etRes?.data?.data ?? etRes?.data ?? etRes;
      let elementTypeId =
        (Array.isArray(etPayload) ? etPayload[0]?.id : etPayload?.id) ?? null;

      if (!elementTypeId && typeof etPayload === "object") {
        elementTypeId = etPayload?.id ?? etPayload?.pk ?? null;
      }
      if (!elementTypeId) {
        throw new Error(
          "Não foi possível obter element_type_id a partir da resposta."
        );
      }

      // 2) criar Element (enviar como array, many=True)
      const payload = [
        {
          element_type_id: elementTypeId,
          material_ids: Array.isArray(selectedMaterialsForModal)
            ? selectedMaterialsForModal
            : [],
        },
      ];

      await api.post("/elements/", payload);
      console.log("Elemento criado:", {
        elementTypeId,
        elementTypeName: newElementTypeName.trim(),
      });

      // 3) atualizar lista local
      try {
        const listRes = await api.get("/elements/");
        const list = listRes?.data?.data ?? listRes?.data ?? [];
        setElements(list);
      } catch (err) {
        console.warn("Erro ao recarregar elementos:", err);
      }

      // fechar modal e resetar
      setElementsModalOpen(false);
      setnewElementTypeName("");
      setSelectedMaterialsForModal([]);
      setModalError("");
    } catch (err) {
      console.error("Erro ao criar elemento:", err);
      setModalError(extractMessage(err));
    } finally {
      setModalLoading(false);
    }
  }

  // create referential: criar ReferentialName via /referentials/name/ (espera um objeto) e depois criar /referentials/
  async function createReferential() {
    setModalError("");

    if (!newRefName || !newRefName.trim()) {
      setModalError("Informe o nome do referencial.");
      return;
    }

    setModalLoading(true);

    const extractMessage = (err) => {
      const resp = err?.response;
      if (!resp) return err?.message || "Erro desconhecido";
      const data = resp.data;
      if (!data) return `Erro ${resp.status || ""}`;
      if (typeof data === "string") {
        return resp.status === 404
          ? "Endpoint não encontrado (404). Verifique a API."
          : `Erro ${resp.status}`;
      }
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
      // 1) criar ReferentialName (objeto, não lista)
      const rnRes = await api.post("/referentials/name/", {
        name: newRefName.trim(),
      });
      // resposta pode vir em rnRes.data.data ou rnRes.data
      const rnPayload = rnRes?.data?.data ?? rnRes?.data ?? rnRes;
      // rnPayload pode ser objeto ou array/primitive — extrair id de forma robusta
      let refNameId =
        (Array.isArray(rnPayload) ? rnPayload[0]?.id : rnPayload?.id) ?? null;
      if (!refNameId && typeof rnPayload === "object") {
        // tentar propriedades alternativas
        refNameId = rnPayload?.id ?? rnPayload?.pk ?? null;
      }
      if (!refNameId) {
        throw new Error(
          "Não foi possível obter referential_name_id a partir da resposta."
        );
      }

      // 2) criar Referential (objeto, não lista)
      const payload = {
        referential_name_id: refNameId,
        areas_ids: Array.isArray(selectedAreasForModal)
          ? selectedAreasForModal
          : [],
        comment: "",
      };

      const res = await api.post("/referentials/", payload);
      console.log("Referential criado:", res.data);

      // 3) atualizar lista local
      try {
        const listRes = await api.get("/referentials/");
        const list = listRes?.data?.data ?? listRes?.data ?? [];
        setReferentials(list);
      } catch (err) {
        console.warn("Erro ao recarregar referentials:", err);
      }

      // fechar modal e resetar
      setModalOpen(false);
      setNewRefName("");
      setSelectedAreasForModal([]);
      setModalError("");
    } catch (err) {
      console.error("Erro ao criar referential:", err);
      setModalError(extractMessage(err));
    } finally {
      setModalLoading(false);
    }
  }

  async function createObservation() {
    setModalError("");

    if (!newObservationDesc || !newObservationDesc.trim()) {
      setModalError("Informe a descrição da observação.");
      return;
    }

    setModalLoading(true);

    const extractMessage = (err) => {
      const resp = err?.response;
      if (!resp) return err?.message || "Erro desconhecido";

      const data = resp.data;

      if (!data) return `Erro ${resp.status || ""}`;

      if (typeof data === "string") {
        return resp.status === 404
          ? "Endpoint não encontrado (404). Verifique a API."
          : `Erro ${resp.status}`;
      }

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
      const res = await api.post("/observations/", {
        description: newObservationDesc.trim(),
      });

      console.log("Observation criada:", res.data);

      // recarregar lista local
      try {
        const listRes = await api.get("/observations/");
        const list = listRes?.data?.data ?? listRes?.data ?? [];
        setObservations(list);
      } catch (err) {
        console.warn("Erro ao recarregar observations:", err);
      }

      // fechar modal e resetar
      setObservationsModalOpen(false);
      setNewObservationDesc("");
      setModalError("");
    } catch (err) {
      console.error("Erro ao criar observation:", err);
      setModalError(extractMessage(err));
    } finally {
      setModalLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* HEADER */}
      <header className="flex items-center gap-4 bg-red-700 text-white px-4 py-3 shadow-md">
        <button
          onClick={() => navigate("/home")}
          className="p-2 rounded-lg hover:bg-red-600 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-lg">Criar Obra</h1>
      </header>

      <main className="max-w-5xl mx-auto p-6 flex flex-col gap-6">
        {/* DADOS GERAIS */}
        <section className="bg-white p-6 rounded-2xl shadow-md flex flex-col gap-4">
          <h2 className="font-bold text-xl">Dados Gerais</h2>

          <input
            type="text"
            placeholder="Nome da obra"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="w-full p-3 rounded-xl border border-gray-300 focus:border-red-600 focus:outline-none"
          />

          <input
            type="text"
            placeholder="Localização"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full p-3 rounded-xl border border-gray-300 focus:border-red-600 focus:outline-none"
          />

          <textarea
            placeholder="Descrição do empreendimento"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-3 rounded-xl border border-gray-300 focus:border-red-600 focus:outline-none min-h-32"
          />
        </section>

        {/* REFERENCIAIS */}
        <section className="bg-white p-6 rounded-2xl shadow-md flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-xl">Nome do referencial</h2>

            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-green-600 text-white px-5 py-3 rounded-2xl shadow-md hover:bg-green-700 transition"
            >
              <Plus className="w-5 h-5" />
              Novo
            </button>
          </div>

          <input
            type="text"
            placeholder="Buscar referencial..."
            value={searchReferentials}
            onChange={(e) => setSearchReferentials(e.target.value)}
            className="p-3 rounded-xl border border-gray-300 focus:border-red-600 focus:outline-none"
          />

          {filteredReferentials.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              {filteredReferentials.map((ref) => (
                <div
                  key={ref.id}
                  onClick={() => toggleSelect(ref.id)}
                  className={`cursor-pointer bg-white p-5 rounded-2xl border shadow transition flex flex-col gap-2 ${
                    selectedReferentials.includes(ref.id)
                      ? "border-red-600 ring-2 ring-red-400"
                      : "border-gray-200"
                  }`}
                >
                  <h3 className="text-lg font-semibold text-gray-900">
                    {ref?.referential_name?.name ?? "Sem nome"}
                  </h3>

                  <p className="text-sm text-gray-600">
                    Áreas: {ref?.areas?.length ?? 0}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 mt-4">Nenhum referencial encontrado.</p>
          )}
        </section>

        {/* Elements */}
        <section className="bg-white p-6 rounded-2xl shadow-md flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-xl">Nome do elemento</h2>

            <button
              onClick={() => setElementsModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-green-600 text-white px-5 py-3 rounded-2xl shadow-md hover:bg-green-700 transition"
            >
              <Plus className="w-5 h-5" />
              Novo
            </button>
          </div>

          <input
            type="text"
            placeholder="Buscar elemento..."
            value={searchElements}
            onChange={(e) => setSearchElements(e.target.value)}
            className="p-3 rounded-xl border border-gray-300 focus:border-red-600 focus:outline-none"
          />

          {filteredElements.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              {filteredElements.map((element) => (
                <div
                  key={element.element_type.id}
                  onClick={() => toggleElementSelect(element.element_type.id)}
                  className={`cursor-pointer bg-white p-5 rounded-2xl border shadow transition flex flex-col gap-2 ${
                    selectedElements.includes(element.element_type.id)
                      ? "border-red-600 ring-2 ring-red-400"
                      : "border-gray-200"
                  }`}
                >
                  <p className="text-lg font-semibold text-gray-900">
                    {element?.element_type.name ?? "Sem nome do elemento"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 mt-4">Nenhum elemento encontrado.</p>
          )}
        </section>

        {/* OBSERVATIONS */}
        <section className="bg-white p-6 rounded-2xl shadow-md flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-xl">Observações</h2>

            <button
              onClick={() => setObservationsModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-green-600 text-white px-5 py-3 rounded-2xl shadow-md hover:bg-green-700 transition"
            >
              <Plus className="w-5 h-5" />
              Nova
            </button>
          </div>

          {observations.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              {observations.map((obs) => (
                <div
                  key={obs.id}
                  onClick={() => toggleObservationSelect(obs.id)}
                  className={`cursor-pointer bg-white p-5 rounded-2xl border shadow transition flex flex-col gap-2 ${
                    selectedObservations.includes(obs.id)
                      ? "border-red-600 ring-2 ring-red-400"
                      : "border-gray-200"
                  }`}
                >
                  <p className="text-sm text-gray-700">
                    {obs?.description ?? "Sem descrição"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 mt-4">Nenhuma observação encontrada.</p>
          )}
        </section>

        <button
          onClick={handleNext}
          className="bg-red-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-red-700"
        >
          Próximo
        </button>

        {/* Modal: Criar Referencial */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl w-full max-w-2xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Criar Referencial</h3>
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
                <label className="text-sm font-medium">
                  Nome do referencial
                </label>
                <input
                  type="text"
                  placeholder="Digite o nome do novo referencial"
                  value={newRefName}
                  onChange={(e) => setNewRefName(e.target.value)}
                  className="p-3 border rounded-xl"
                />

                <label className="text-sm font-medium">
                  Associar áreas (opcional)
                </label>
                <div className="grid md:grid-cols-2 gap-2 max-h-40 overflow-auto p-2 border rounded">
                  {availableAreas.map((a) => {
                    const sel = selectedAreasForModal.includes(a.id);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() =>
                          setSelectedAreasForModal((prev) =>
                            prev.includes(a.id)
                              ? prev.filter((x) => x !== a.id)
                              : [...prev, a.id]
                          )
                        }
                        className={`text-left p-2 rounded ${
                          sel
                            ? "bg-red-100 border border-red-300"
                            : "hover:bg-gray-100"
                        }`}
                      >
                        <div className="text-sm font-medium">
                          {a?.area_name?.name ?? a?.name ?? `Área ${a.id}`}
                        </div>
                        <div className="text-xs text-gray-500">ID {a.id}</div>
                      </button>
                    );
                  })}
                </div>

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
                    onClick={createReferential}
                    disabled={modalLoading}
                    className="px-4 py-2 rounded-xl bg-red-600 text-white"
                  >
                    {modalLoading ? "Criando..." : "Criar Referencial"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Criar Elemento */}
        {elementsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl w-full max-w-2xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Criar Elemento</h3>
                <button
                  onClick={() => {
                    setElementsModalOpen(false);
                    setModalError("");
                  }}
                  className="text-gray-500"
                >
                  Fechar
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-sm font-medium">
                  Nome do tipo de elemento
                </label>
                <input
                  type="text"
                  placeholder="Digite o nome do novo tipo de elemento"
                  value={newElementTypeName}
                  onChange={(e) => setnewElementTypeName(e.target.value)}
                  className="p-3 border rounded-xl"
                />

                <label className="text-sm font-medium">
                  Associar materiais (opcional)
                </label>
                <div className="grid md:grid-cols-2 gap-2 max-h-40 overflow-auto p-2 border rounded">
                  {availableMaterials.map((material) => {
                    const sel = selectedMaterialsForModal.includes(material.id);
                    return (
                      <button
                        key={material.id}
                        type="button"
                        onClick={() =>
                          setSelectedMaterialsForModal((prev) =>
                            prev.includes(material.id)
                              ? prev.filter((x) => x !== material.id)
                              : [...prev, material.id]
                          )
                        }
                        className={`text-left p-2 rounded ${
                          sel
                            ? "bg-red-100 border border-red-300"
                            : "hover:bg-gray-100"
                        }`}
                      >
                        <div className="text-sm font-medium">
                          {material?.description ??
                            material?.name ??
                            `Material ${material.id}`}
                        </div>
                        {material?.brand_name && (
                          <div className="text-xs text-gray-500">
                            Marca: {material.brand_name}
                          </div>
                        )}
                        <div className="text-xs text-gray-500">
                          ID {material.id}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {modalError && (
                  <div className="text-sm text-red-600">{modalError}</div>
                )}

                <div className="flex justify-end gap-3 mt-3">
                  <button
                    onClick={() => {
                      setElementsModalOpen(false);
                      setnewElementTypeName("");
                      setSelectedMaterialsForModal([]);
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

        {/* Modal: Criar Observação */}
        {observationsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl w-full max-w-2xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Criar Observação</h3>
                <button
                  onClick={() => {
                    setObservationsModalOpen(false);
                    setModalError("");
                  }}
                  className="text-gray-500"
                >
                  Fechar
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-sm font-medium">
                  Descrição da observação
                </label>
                <textarea
                  placeholder="Digite a descrição da observação"
                  value={newObservationDesc}
                  onChange={(e) => setNewObservationDesc(e.target.value)}
                  className="p-3 border rounded-xl min-h-24"
                />

                {modalError && (
                  <div className="text-sm text-red-600">{modalError}</div>
                )}

                <div className="flex justify-end gap-3 mt-3">
                  <button
                    onClick={() => {
                      setObservationsModalOpen(false);
                      setModalError("");
                    }}
                    className="px-4 py-2 rounded-xl bg-gray-200"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={createObservation}
                    disabled={modalLoading}
                    className="px-4 py-2 rounded-xl bg-red-600 text-white"
                  >
                    {modalLoading ? "Criando..." : "Criar Observação"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
