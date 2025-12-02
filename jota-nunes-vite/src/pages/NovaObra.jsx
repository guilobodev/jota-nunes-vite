import Select from "react-select";
import api from "../services/axios";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import GenericModal from "../components/GenericModal";
import ModalMaterial from "../components/modalMaterial";

export default function NovaObra() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // STEP 1
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [projectLocation, setProjectLocation] = useState("");

  const [referentials, setReferentials] = useState([]);
  const [observations, setObservations] = useState([]);
  const [selectedReferentials, setSelectedReferentials] = useState([]);
  const [selectedObservations, setSelectedObservations] = useState([]);

  const [refData, setRefData] = useState({});
  const [materialsBrandsOptions, setMaterialsBrandsOptions] = useState([]);
  const [materialsTypesOptions, setMaterialsTypesOptions] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [newAreaName, setNewAreaName] = useState("");
  const [modalAreaOpen, setModalAreaOpen] = useState(false);
  const [modalElementOpen, setModalElementOpen] = useState(false);
  const [newElementTypeName, setNewElementTypeName] = useState("");
  const [newElementName, setNewElementName] = useState("");
  const [newMaterialBrand, setNewMaterialBrand] = useState("");
  const [newMaterialType, setNewMaterialType] = useState("");
  const [newMaterialDescription, setNewMaterialDescription] = useState("");
  const [selectedBrandForMaterial, setSelectedBrandForMaterial] =
    useState(null);
  const [selectedTypeForMaterial, setSelectedTypeForMaterial] = useState(null);
  const [modalMaterialOpen, setModalMaterialOpen] = useState(false);

  const [modalType, setModalType] = useState(null);

  // STEP 2
  const [areasOptions, setAreasOptions] = useState([]);
  const [elementsOptions, setElementsOptions] = useState([]);
  const [materialsOptions, setMaterialsOptions] = useState([]);

  // Loading
  const [loadingSave, setLoadingSave] = useState(false);

  // Modal para novo referencial
  const [newRefName, setNewRefName] = useState("");
  const [modalObservationOpen, setModalObservationOpen] = useState(false);
  const [newObservation, setNewObservation] = useState("");

  const [selectedAreasForModal, setSelectedAreasForModal] = useState([]);

  //area

  const [areas, setAreas] = useState([]);

  const openReferentialModal = () => setModalType("referential");
  const openAreaModal = () => setModalType("area");
  const closeModal = () => {
    setModalType(null);
    setModalError("");
    setNewRefName("");
    setNewAreaName("");
    setSelectedAreasForModal([]);
  };

  // ====================================================
  // FETCH INITIAL DATA
  // ====================================================
  async function loadAll() {
    try {
      const refs = await api.get("/referentials/name/");
      setReferentials(refs?.data?.data ?? []);

      const obs = await api.get("/observations/");
      setObservations(obs?.data?.data ?? []);

      const areas = await api.get("/areas/names/");
      setAreasOptions(
        (areas?.data?.data ?? []).map((a) => ({
          value: a.id,
          label: a.area_name?.name || a.name,
        }))
      );

      const elems = await api.get("/elements/types/");
      setElementsOptions(
        (elems?.data?.data ?? []).map((e) => ({
          value: e.id,
          label: e.element_type?.name || e.name,
        }))
      );

      const mats = await api.get("/materials/");
      setMaterialsOptions(
        (mats?.data?.data ?? []).map((m) => ({
          value: m.id,
          label: m.description,
        }))
      );
    } catch (err) {
      console.error("Erro ao buscar dados iniciais:", err);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  // Se vier um modelo padrão via navigation state, aplicar quando as opções estiverem carregadas
  const location = useLocation();
  const modeloPadrao = location.state?.modeloPadrao || null;

  // template pending state: holds incoming model until user chooses how to apply it
  const [pendingTemplate, setPendingTemplate] = useState(null);
  useEffect(() => {
    // store incoming template and wait for user confirmation to apply
    if (modeloPadrao) setPendingTemplate(modeloPadrao);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modeloPadrao]);

  function normalizeString(s) {
    return s
      .toString()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .trim();
  }

  function matchMaterialOptionByString(str) {
    if (!str) return null;
    const cleaned = normalizeString(str);
    // try exact match on label
    let found = materialsOptions.find(
      (m) =>
        normalizeString(m.label) === cleaned ||
        normalizeString(m.description || "") === cleaned
    );
    if (found) return found;
    // try includes
    found = materialsOptions.find(
      (m) =>
        normalizeString(m.label).includes(cleaned) ||
        normalizeString(m.description || "").includes(cleaned)
    );
    return found || null;
  }

  function applyTemplate(template, importElementsAndMaterials = false) {
    try {
      setProjectName(template.project_name || template.name || "");
      setProjectLocation(template.location || template.local || "");
      setDescription(template.description || template.summary || "");

      // observations
      const obsIds = (template.observations || [])
        .map((o) => o.id)
        .filter(Boolean);
      setSelectedObservations(obsIds);

      const newRefData = {};
      const selectedRefs = [];

      (template.referentials || []).forEach((ref) => {
        const refId = Number(
          ref.id || ref.referential_name?.id || ref.referential_name_id
        );
        selectedRefs.push(refId);

        const areas = (ref.areas || []).map((area) => {
          // Keep areas but decide whether to import elements/materials
          const base = {
            id: Number(area.id),
            label: area.area_name?.name || area.name || "",
            elements: [],
          };

          if (importElementsAndMaterials) {
            base.elements = (area.elements || []).map((el) => {
              const materialsMapped = (el.materials || [])
                .map((m) => {
                  if (typeof m === "string") {
                    const matched = matchMaterialOptionByString(m);
                    return matched
                      ? { value: Number(matched.value), label: matched.label }
                      : null;
                  }
                  const mid = m.id || m.value || null;
                  if (mid) {
                    const midNum = Number(mid);
                    const matched = materialsOptions.find(
                      (opt) =>
                        Number(opt.value) === midNum ||
                        Number(opt.id) === midNum
                    );
                    if (matched) return { value: midNum, label: matched.label };
                    return m.description
                      ? { value: midNum, label: m.description }
                      : null;
                  }
                  return null;
                })
                .filter(Boolean);

              return {
                id: Number(el.element_type?.id || el.id),
                label: el.element_type?.name || el.name || "",
                materials: materialsMapped,
              };
            });
          }

          return base;
        });

        newRefData[refId] = { areas };
      });

      setSelectedReferentials(selectedRefs);
      setRefData((prev) => ({ ...prev, ...newRefData }));
    } catch (err) {
      console.error("Erro ao aplicar modelo padrão:", err);
    }
  }

  // ====================================================
  // HANDLE SELECTION
  // ====================================================
  function toggleReferential(id) {
    setSelectedReferentials((prev) => {
      const updated = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      setRefData((prevData) => ({
        ...prevData,
        [id]: prevData[id] || { areas: [] },
      }));
      return updated;
    });
  }

  function toggleObservation(id) {
    setSelectedObservations((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function updateAreas(refId, selectedAreas) {
    setRefData((prev) => ({
      ...prev,
      [refId]: {
        ...prev[refId],
        areas: selectedAreas.map((a) => {
          const existing = prev[refId]?.areas?.find((x) => x.id === a.value);
          return (
            existing || {
              id: a.value,
              label: a.label,
              elements: [],
            }
          );
        }),
      },
    }));
  }

  function updateElements(refId, areaId, selectedElements) {
    setRefData((prev) => ({
      ...prev,
      [refId]: {
        ...prev[refId],
        areas: prev[refId].areas.map((a) => {
          if (a.id !== areaId) return a;
          const updatedElements = selectedElements.map((e) => {
            const existing = a.elements.find((el) => el.id === e.value);
            return existing || { id: e.value, label: e.label, materials: [] };
          });
          return { ...a, elements: updatedElements };
        }),
      },
    }));
  }

  function updateMaterials(refId, areaId, elementId, selectedMaterials) {
    setRefData((prev) => ({
      ...prev,
      [refId]: {
        ...prev[refId],
        areas: prev[refId].areas.map((a) => {
          if (a.id !== areaId) return a;
          return {
            ...a,
            elements: a.elements.map((el) =>
              el.id === elementId ? { ...el, materials: selectedMaterials } : el
            ),
          };
        }),
      },
    }));
  }
  const handleCreateMaterialsBrand = async () => {
    if (!newMaterialBrand.trim()) return;

    setModalLoading(true);
    setModalError("");

    try {
      const res = await api.post("/materials/brands/", [
        { name: newMaterialBrand.trim() },
      ]);

      const newBrand = res.data.data[0];

      // Atualiza lista de marcas se você estiver usando Select
      setMaterialsBrandsOptions((prev) => [
        ...prev,
        { value: newBrand.id, label: newBrand.name },
      ]);

      setModalMaterialBrandOpen(false);
      setNewMaterialBrand("");
    } catch (error) {
      console.error(error);
      setModalError("Não foi possível criar a marca");
    } finally {
      setModalLoading(false);
    }
  };
  const handleCreateMaterials = async () => {
    if (
      !newMaterialDescription.trim() ||
      !selectedBrandForMaterial ||
      !selectedTypeForMaterial
    )
      return;

    setModalLoading(true);
    setModalError("");

    try {
      const res = await api.post("/materials/", [
        {
          description: newMaterialDescription.trim(),
          brand: selectedBrandForMaterial.value,
          material_type: selectedTypeForMaterial.value,
        },
      ]);

      const newMaterial = res.data.data[0];

      setMaterialsOptions((prev) => [
        ...prev,
        {
          value: newMaterial.id,
          label: newMaterial.description,
        },
      ]);

      setModalMaterialOpen(false);
      setNewMaterialDescription("");
      setSelectedBrandForMaterial(null);
      setSelectedTypeForMaterial(null);
    } catch (error) {
      console.error(error);
      setModalError("Não foi possível criar o material");
    } finally {
      setModalLoading(false);
    }
  };
  const handleCreateMaterialsType = async () => {
    if (!newMaterialType.trim()) return;

    setModalLoading(true);
    setModalError("");

    try {
      const res = await api.post("/materials/types_of_materials/", [
        { name: newMaterialType.trim() },
      ]);

      const newType = res.data.data[0];

      // Atualiza lista de tipos se você estiver usando Select
      setMaterialsTypesOptions((prev) => [
        ...prev,
        { value: newType.id, label: newType.name },
      ]);

      setModalMaterialTypeOpen(false);
      setNewMaterialType("");
    } catch (error) {
      console.error(error);
      setModalError("Não foi possível criar o tipo de material");
    } finally {
      setModalLoading(false);
    }
  };
  const handleCreateElementType = async () => {
    if (!newElementName.trim()) return;

    setModalLoading(true);
    setModalError("");

    try {
      // 1️⃣ Criar o tipo de elemento
      const res = await api.post("/elements/types/", [
        { name: newElementName.trim() },
      ]);

      const newType = res.data.data[0];
      if (!newType?.id) throw new Error("Não foi possível obter o ID do tipo");

      // 2️⃣ Criar o elemento baseado nesse tipo
      const elementRes = await api.post("/elements/", [
        {
          element_type_id: newType.id,
          materials: [], // começa vazio
        },
      ]);

      const newElement = elementRes.data.data[0];

      // 3️⃣ Atualizar lista usada no Select
      setElementsOptions((prev) => [
        ...prev,
        {
          value: newElement.id,
          label: newType.name,
        },
      ]);

      // 4️⃣ Fechar modal e limpar
      setModalElementOpen(false);
      setNewElementName("");
    } catch (error) {
      console.error(error);
      setModalError("Não foi possível criar o elemento");
    } finally {
      setModalLoading(false);
    }
  };

  const handleCreateAreaName = async () => {
    if (!newAreaName.trim()) return;

    setModalLoading(true);
    setModalError("");

    try {
      const res = await api.post("/areas/names/", [
        { name: newAreaName.trim() },
      ]);

      const newAreaNameObj = res.data.data[0];

      const areaRes = await api.post("/areas/", [
        {
          area_name_id: newAreaNameObj.id,
          elements_ids: [],
        },
      ]);

      const newArea = areaRes.data.data[0];

      setAreasOptions((prev) => [
        ...prev,
        {
          value: newArea.id,
          label: newArea?.area_name.name || newArea.name,
        },
      ]);

      setModalAreaOpen(false);
      setNewAreaName("");
    } catch (error) {
      console.error(error);
      setModalError("Não foi possível criar a área");
    } finally {
      setModalLoading(false);
    }
  };

  const handleCreateReferentialName = async () => {
    if (!newRefName.trim()) return;

    setModalLoading(true);
    setModalError("");

    try {
      const res = await api.post("/referentials/name/", [
        { name: newRefName.trim() },
      ]);
      const newRef = res.data.data[0];
      if (!newRef?.id) throw new Error("Não foi possível obter ID");

      const refRes = await api.post("/referentials/", [
        {
          referential_name_id: newRef.id,
          areas_ids: selectedAreasForModal,
          comment: "",
        },
      ]);

      setReferentials((prev) => [...prev, refRes.data.data[0]]);
      setModalOpen(false);
      setNewRefName("");
      setSelectedAreasForModal([]);
    } catch (err) {
      console.error(err);
      setModalError("Não foi possível criar o referencial");
    } finally {
      setModalLoading(false);
    }
  };

  // ====================================================
  // FINAL SUBMIT
  // ====================================================
  async function handleSave() {
    setLoadingSave(true);
    try {
      if (!projectName || !projectLocation || !description) {
        alert("Preencha todos os dados da obra");
        return;
      }

      const referentialsCreated = [];

      for (const refId of selectedReferentials) {
        const ref = refData[refId];
        if (!ref) continue;

        const areasCreated = [];

        for (const area of ref.areas) {
          // Criar elementos
          const elementsPayload = area.elements.map((el) => ({
            element_type_id: el.id,
            material_ids: el.materials.map((m) => m.value),
          }));
          const elementsRes = await api.post("/elements/", elementsPayload);
          const elementsCreated = elementsRes.data.data.map((e) => e.id);

          // Criar área
          const areaRes = await api.post("/areas/", [
            {
              area_name_id: area.id,
              elements_ids: elementsCreated,
            },
          ]);

          areasCreated.push(areaRes.data.data[0].id);
        }

        const refRes = await api.post("/referentials/", [
          {
            referential_name_id: refId,
            areas_ids: areasCreated,
          },
        ]);

        referentialsCreated.push(refRes.data.data[0].id);
      }

      // Criar obra
      await api.post("/constructions/", {
        project_name: projectName,
        location: projectLocation,
        description,
        observations: selectedObservations,
        referentials: referentialsCreated,
        // is_active: null,
      });

      alert("Obra criada com sucesso!");
      // Reset
      setStep(1);
      setProjectName("");
      setProjectLocation("");
      setDescription("");
      setSelectedReferentials([]);
      setSelectedObservations([]);
      setRefData({});
      navigate("/home");
    } catch (err) {
      console.error(err.response?.data || err);
      alert("Erro ao criar obra");
    } finally {
      setLoadingSave(false);
    }
  }

  // ====================================================
  // NAVIGATION STEPS
  // ====================================================
  const StepIndicator = () => (
    <div className="flex justify-center gap-3 my-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={`w-3 h-3 rounded-full ${
            step === i ? "bg-red-600" : "bg-gray-300"
          }`}
        />
      ))}
    </div>
  );

  const canGoNext = () => {
    if (step === 1) {
      return (
        projectName.trim() !== "" &&
        projectLocation.trim() !== "" &&
        description.trim() !== "" &&
        selectedReferentials.length > 0
      );
    }
    if (step === 2) {
      for (const refId of selectedReferentials) {
        const data = refData[refId];
        if (!data || data.areas.length === 0) return false;
      }
      return true;
    }
    return true;
  };

  const handleNext = () => {
    if (!canGoNext()) return;
    if (step < 3) setStep(step + 1);
  };
  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  // ====================================================
  // UI
  // ====================================================
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="flex items-center gap-4 bg-red-700 text-white px-4 py-3 shadow-md">
        <button
          onClick={() => navigate("/home")}
          className="p-2 rounded-lg hover:bg-red-600 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-lg">Criar Obra</h1>
      </header>

      <div className="p-4 max-w-5xl mx-auto">
        <StepIndicator />

        {/* STEP 1 */}
        {step === 1 && (
          <div className="bg-white p-6 rounded-2xl shadow-md flex flex-col gap-6">
            {/* If we received a template, offer options to apply it */}
            {pendingTemplate && (
              <div className="p-4 border-l-4 border-yellow-400 bg-yellow-50 rounded mb-2">
                <p className="font-medium">
                  Modelo padrão detectado:{" "}
                  <span className="font-semibold">
                    {pendingTemplate.project_name || pendingTemplate.name}
                  </span>
                </p>
                <p className="text-sm text-gray-700">
                  Deseja aplicar o modelo? Você pode manter apenas os
                  referenciais/observações ou também importar os elementos e
                  materiais.
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => {
                      applyTemplate(pendingTemplate, false);
                      setPendingTemplate(null);
                    }}
                    className="px-3 py-1 bg-blue-600 text-white rounded"
                  >
                    Aplicar (manter só referenciais/observações)
                  </button>
                  <button
                    onClick={() => {
                      applyTemplate(pendingTemplate, true);
                      setPendingTemplate(null);
                    }}
                    className="px-3 py-1 bg-green-600 text-white rounded"
                  >
                    Aplicar incluindo elementos e materiais
                  </button>
                  <button
                    onClick={() => setPendingTemplate(null)}
                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded"
                  >
                    Ignorar modelo
                  </button>
                </div>
              </div>
            )}
            <h2 className="font-bold text-xl">Dados Gerais</h2>
            <input
              type="text"
              placeholder="Nome da obra"
              className="p-3 border rounded-xl"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
            <input
              type="text"
              placeholder="Localização"
              className="p-3 border rounded-xl"
              value={projectLocation}
              onChange={(e) => setProjectLocation(e.target.value)}
            />
            <textarea
              placeholder="Descrição"
              className="p-3 border rounded-xl min-h-32"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <h3 className="font-bold flex items-center justify-between">
              Referenciais
              <button
                onClick={() => setModalOpen(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                + Novo Referencial
              </button>
            </h3>

            <div className="grid grid-cols-2 gap-4">
              {referentials.map((r) => (
                <div
                  key={r.id}
                  onClick={() => toggleReferential(r.id)}
                  className={`p-4 rounded-xl border shadow cursor-pointer ${
                    selectedReferentials.includes(r.id)
                      ? "border-red-600 ring-2 ring-red-400"
                      : "border-gray-200"
                  }`}
                >
                  <p className="font-medium">
                    {r.name || r.referential_name?.name}
                  </p>
                </div>
              ))}
            </div>

            <h3 className="font-bold">Observações</h3>
            <div className="flex items-center justify-between">
              <p className="font-bold">Observações</p>
              <button
                onClick={() => setModalObservationOpen(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                + Nova Observação
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {observations.map((o) => (
                <div
                  key={o.id}
                  onClick={() => toggleObservation(o.id)}
                  className={`p-4 rounded-xl border shadow cursor-pointer ${
                    selectedObservations.includes(o.id)
                      ? "border-red-600 ring-2 ring-red-400"
                      : "border-gray-200"
                  }`}
                >
                  <p>{o.description}</p>
                </div>
              ))}
            </div>

            <button
              onClick={handleNext}
              disabled={!canGoNext()}
              className={`px-6 py-2 rounded-md text-white transition ${
                canGoNext()
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-gray-400 cursor-not-allowed"
              }`}
            >
              Próximo
            </button>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="bg-white p-6 rounded-2xl shadow-md flex flex-col gap-8">
            <h2 className="font-bold text-xl">Áreas / Elementos / Materiais</h2>

            {selectedReferentials.map((refId) => {
              const ref = referentials.find((r) => r.id === refId);
              return (
                <div
                  key={refId}
                  className="border rounded-xl p-5 shadow-md bg-white flex flex-col gap-4"
                >
                  <h3 className="font-semibold text-lg">
                    {ref?.name || ref.referential_name?.name}
                  </h3>

                  <div className="flex items-center justify-between">
                    <p className="font-medium mb-1">Áreas</p>

                    <button
                      onClick={() => setModalAreaOpen(true)}
                      className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                    >
                      + Nova Área
                    </button>
                  </div>
                  <Select
                    isMulti
                    options={areasOptions}
                    value={
                      refData[refId]?.areas.map((a) => ({
                        value: a.id,
                        label: a.label,
                      })) || []
                    }
                    onChange={(vals) => updateAreas(refId, vals)}
                  />

                  {refData[refId]?.areas?.map((area) => (
                    <div key={area.id} className="ml-4 mt-2">
                      <p className="font-medium">{area.label}</p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <Select
                            isMulti
                            options={elementsOptions}
                            value={area.elements.map((el) => ({
                              value: el.id,
                              label: el.label,
                            }))}
                            onChange={(vals) =>
                              updateElements(refId, area.id, vals)
                            }
                            placeholder="Selecione elementos"
                          />
                        </div>

                        <button
                          onClick={() => setModalElementOpen(true)}
                          className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                        >
                          + Novo
                        </button>
                      </div>

                      {area.elements.map((el) => (
                        <div key={el.id} className="ml-4 mt-2">
                          <p className="text-sm font-medium">{el.label}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <div className="flex-1">
                              <Select
                                isMulti
                                options={materialsOptions}
                                value={el.materials || []}
                                onChange={(vals) =>
                                  updateMaterials(refId, area.id, el.id, vals)
                                }
                                placeholder="Selecione materiais"
                              />
                            </div>

                            <button
                              onClick={() => setModalMaterialOpen(true)}
                              className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                            >
                              + Novo
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              );
            })}

            <div className="flex justify-between">
              {step > 1 && (
                <button
                  onClick={handlePrev}
                  className="px-6 py-2 rounded-md bg-gray-300 hover:bg-gray-400 transition"
                >
                  Voltar
                </button>
              )}
              <button
                onClick={handleNext}
                disabled={!canGoNext()}
                className={`px-6 py-2 rounded-md text-white transition ${
                  canGoNext()
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-gray-400 cursor-not-allowed"
                }`}
              >
                Próximo
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="bg-white p-6 rounded-2xl shadow-md flex flex-col gap-6">
            <h2 className="font-bold text-xl">Revisão Completa</h2>

            {/* Dados gerais */}
            <div className="space-y-2">
              <p>
                <b>Nome:</b> {projectName}
              </p>
              <p>
                <b>Localização:</b> {projectLocation}
              </p>
              <p>
                <b>Descrição:</b> {description}
              </p>
            </div>

            <div>
              <p className="font-bold mb-1">Observações:</p>
              <p>
                {selectedObservations
                  .map(
                    (id) => observations.find((o) => o.id === id)?.description
                  )
                  .join(", ")}
              </p>
            </div>

            {/* Referenciais + Áreas + Elementos + Materiais */}
            <div className="space-y-4">
              <h3 className="font-bold text-lg">Estrutura da Obra</h3>

              {selectedReferentials.map((refId) => {
                const ref = referentials.find((r) => r.id === refId);

                return (
                  <div
                    key={refId}
                    className="border border-gray-300 rounded-xl p-4 bg-gray-50"
                  >
                    <h4 className="font-semibold text-lg">
                      Referencial:{" "}
                      {ref?.name || ref?.referential_name?.name || "Sem nome"}
                    </h4>

                    {/* Áreas */}
                    {refData[refId]?.areas?.map((area) => (
                      <div key={area.id} className="mt-3 ml-3 border-l pl-3">
                        <p className="font-medium text-blue-700">
                          Área: {area.label}
                        </p>

                        {/* Elementos */}
                        {area.elements.map((el) => (
                          <div key={el.id} className="ml-4 mt-2 border-l pl-3">
                            <p className="font-medium text-green-700">
                              Elemento: {el.label}
                            </p>

                            {/* Materiais */}
                            {el.materials?.length > 0 ? (
                              <ul className="ml-4 list-disc text-sm mt-1">
                                {el.materials.map((mat, idx) => (
                                  <li key={idx}>{mat.label}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="ml-4 text-sm text-gray-500">
                                Nenhum material selecionado
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>

            {/* Botões */}
            <button
              onClick={handleSave}
              disabled={loadingSave}
              className="bg-red-600 text-white p-3 rounded-xl font-semibold"
            >
              {loadingSave ? "Salvando..." : "Criar Obra"}
            </button>

            {step > 1 && (
              <button
                onClick={handlePrev}
                className="px-6 py-2 rounded-md bg-gray-300 hover:bg-gray-400 transition"
              >
                Voltar
              </button>
            )}
          </div>
        )}
      </div>

      <GenericModal
        isOpen={modalOpen}
        title="Novo Referencial"
        inputValue={newRefName}
        onInputChange={setNewRefName}
        onConfirm={handleCreateReferentialName}
        isLoading={modalLoading}
        error={modalError}
        onClose={() => setModalOpen(false)}
        showAreasSelect={true}
        areasOptions={areasOptions}
        selectedAreas={selectedAreasForModal}
        onAreasChange={setSelectedAreasForModal}
      />

      <GenericModal
        isOpen={modalAreaOpen}
        title="Nova Área"
        inputValue={newAreaName}
        onInputChange={setNewAreaName}
        onConfirm={handleCreateAreaName}
        isLoading={modalLoading}
        error={modalError}
        onClose={() => setModalAreaOpen(false)}
        showAreasSelect={false}
      />
      <GenericModal
        isOpen={modalElementOpen}
        title="Novo Tipo de Elemento"
        inputValue={newElementName}
        onInputChange={setNewElementName}
        onConfirm={handleCreateElementType}
        isLoading={modalLoading}
        error={modalError}
        onClose={() => setModalElementOpen(false)}
        showAreasSelect={false}
      />
      <GenericModal
        isOpen={modalObservationOpen}
        title="Nova Observação"
        inputValue={newObservation}
        onInputChange={setNewObservation}
        onConfirm={async () => {
          if (!newObservation.trim()) return;
          try {
            setModalLoading(true);
            const res = await api.post("/observations/", [
              { description: newObservation.trim() },
            ]);
            const created = res.data.data[0];
            setObservations((prev) => [...prev, created]);
            setNewObservation("");
            setModalObservationOpen(false);
          } catch (err) {
            console.error("Erro ao criar observação:", err);
            setModalError("Não foi possível criar a observação");
          } finally {
            setModalLoading(false);
          }
        }}
        isLoading={modalLoading}
        error={modalError}
        onClose={() => setModalObservationOpen(false)}
        showAreasSelect={false}
      />
      <ModalMaterial
        open={modalMaterialOpen}
        onClose={() => setModalMaterialOpen(false)}
        onCreated={(newMat) => {
          // Aqui você atualiza o materialsOptions se quiser
          loadAll();
        }}
      />
    </div>
  );
}
