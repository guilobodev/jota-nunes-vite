import Select from "react-select";
import api from "../services/axios";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";


// Primeiro precisamos construir  Element = [{"element_type_id": num, "material_ids": [nums...]}], 

/* 
Estrutura de criação antes de obra:
1- Element = [{"element_type_id": num, "material_ids": [nums...]}], 
2- Area = [{"area_name_id": num, "elements_ids": [Element1.id, ...]}],
3- Referential = [{"referential_name_id": num, "areas_ids": [Area1.id, ...]}],
*/

export default function NovaObra() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [newRefName, setNewRefName] = useState("");
  const [selectedAreasForModal, setSelectedAreasForModal] = useState([]);
  const [modalError, setModalError] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  // =================== STEP 1 ======================
  const [projectName, setProjectName] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");

  // Nome mais correto seria referentialsNames
  const [referentials, setReferentials] = useState([]);

  const [observations, setObservations] = useState([]);
  const [selectedReferentials, setSelectedReferentials] = useState([]);
  const [selectedObservations, setSelectedObservations] = useState([]);

  const [completeReferentialsData, setCompleteReferentialsData] = useState([]);

  // =================== STEP 2 ======================
  // This shoud be areaName
  const [areasOptions, setAreasOptions] = useState([]);
  const [elementsOptions, setElementsOptions] = useState([]);
  const [materialsOptions, setMaterialsOptions] = useState([]);

  const [refData, setRefData] = useState({}); // estrutura: { refId: { areas: [{id,label,elements:[...],materials:[...]}] } }

  // =================== STEP 3 ======================
  const [loadingSave, setLoadingSave] = useState(false);

  // ====================================================
  // FETCH INITIAL DATA
  // ====================================================
  // This useEffect loads all necessary primary data correctly.
  useEffect(() => {
    async function loadAll() {
      try {
        // This get is ok.
        const refs = await api.get("/referentials/name/");
        setReferentials(refs?.data?.data ?? []);

        // this get is ok.
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
        console.log("Erro fetch:", err);
      }
    }
    loadAll();
  }, []);

  // ====================================================
  // TOGGLE SELEÇÃO DE REFERENCIAL
  // ====================================================
  const handleCreateReferentialName = async () => {
    if (!newRefName.trim()) return;

    setModalLoading(true);
    setModalError("");

    try {
      const responseNewReferentialName = await api.post("/referentials/name/", [
        { name: newRefName.trim() },
      ]);
      console.log(
        "Referencial criado com sucesso:",
        responseNewReferentialName
      );
    } catch (err) {
      console.error("Erro ao criar referencial:", err);
      setModalError("Não foi possível criar o referencial.");
    } finally {
      setModalLoading(false);
      setModalOpen(false);
      setNewRefName("");
      const listRes = await api.get("/referentials/name/");
      const list = listRes?.data?.data ?? listRes?.data ?? [];
      setReferentials(list);
    }

    //   // 1️⃣ Criar o referencial
    //   const rnRes = await api.post("/referentials/", [
    //     { name: newRefName.trim() }, // ✅ array com 1 objeto
    //   ]);

    //   const rnPayload = rnRes?.data?.data ?? rnRes?.data ?? rnRes;
    //   let refNameId =
    //     rnPayload?.id ??
    //     rnPayload?.pk ??
    //     (Array.isArray(rnPayload) ? rnPayload[0]?.id : null);

    //   if (!refNameId)
    //     throw new Error("Não foi possível obter referential_name_id.");

    //   // 2️⃣ Associar áreas ao referencial — aqui **não precisa `name`**
    //   const payload = {
    //     referential_name_id: refNameId,
    //     areas_ids: Array.isArray(selectedAreasForModal)
    //       ? selectedAreasForModal
    //       : [],
    //     comment: "",
    //   };

    //   // ⚠️ Enviar objeto direto, não array
    //   await api.post("/referentials/name/", payload);

    //   console.log("Referencial criado com sucesso!");

    //   // 3️⃣ Atualizar lista de referenciais
    //   const listRes = await api.get("/referentials/name/");
    //   const list = listRes?.data?.data ?? listRes?.data ?? [];
    //   setReferentials(list);

    //   // 4️⃣ Fechar modal e resetar campos
    //   setModalOpen(false);
    //   setNewRefName("");
    //   setSelectedAreasForModal([]);
    // } catch (err) {
    //   console.error("Erro ao criar referencial:", err);
    //   setModalError("Não foi possível criar o referencial.");
    // } finally {
    //   setModalLoading(false);
    // }
  };

  // Review the meaning od this function, it seems incorrect.
  // function toggleReferential(id) {
  //   let updated;
  //   if (selectedReferentials.includes(id)) {
  //     updated = selectedReferentials.filter((x) => x !== id);
  //   } else {
  //     updated = [...selectedReferentials, id];
  //   }

  //   setSelectedReferentials(updated);

  //   const newRefData = {};
  //   updated.forEach((refId) => {
  //     newRefData[refId] = refData[refId] || { areas: [] };
  //   });
  //   setRefData(newRefData);
  //   console.log("selectedReferentials:", selectedReferentials);
  // }

  function toggleObservation(id) {
    setSelectedObservations((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleReferential(id) {
    setSelectedReferentials((prev) => {
      const updated = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];

      console.log("selectedReferentials:", updated); // Now shows correct value
      return updated;
    });

    // Preserve existing refData - don't rebuild from scratch
    setRefData((prev) => ({
      ...prev,
      [id]: prev[id] || { areas: [] }, // Only initialize if doesn't exist
    }));
  }

  // ====================================================
  // STEP 2 — ATUALIZAR ÁREAS, ELEMENTOS, MATERIAIS
  // ====================================================
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
              materials: [],
            }
          );
        }),
      },
    }));
  }

  // ====================================================
  // FINAL SUBMIT
  // ====================================================
  // Erro está nessa função, está enviando um referencial não selecionado, em elementos sempre envia peitoril sem estar selecionado além de excluir os selecionados.
  async function handleSave() {
    setLoadingSave(true);
    try {
      if (selectedReferentials.length === 0) {
        alert("Nenhum referencial válido selecionado.");
        setLoadingSave(false);
        return;
      }

      // Antes precisa criar o Referencial partindo do id do Referencial name e suas áreas/elements/materials
      await api.post("/constructions/", {
        project_name: projectName,
        location,
        description,
        observations: selectedObservations,
        referentials: selectedReferentials, // <-- só IDs
      });

      alert("Obra criada com sucesso!");
      setStep(1);
      setProjectName("");
      setLocation("");
      setDescription("");
      setSelectedReferentials([]);
      setSelectedObservations([]);
      setRefData({});
    } catch (err) {
      console.log(err.response?.data || err);
      alert("Erro ao criar obra.");
    }
    setLoadingSave(false);
  }
  function updateElements(refId, areaId, selectedElements) {
    setRefData((prev) => ({
      ...prev,
      [refId]: {
        ...prev[refId],
        areas: prev[refId].areas.map((a) => {
          if (a.id !== areaId) return a;
          // adiciona elementos novos com materiais vazios
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

  // ====================================================
  // COMPONENTES DE UI
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
        location.trim() !== "" &&
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

      <div className="p-4 max-w-5xl mx-auto">
        <StepIndicator />

        {/* STEP 1 */}
        {step === 1 && (
          <div className="bg-white p-6 rounded-2xl shadow-md flex flex-col gap-6">
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
              value={location}
              onChange={(e) => setLocation(e.target.value)}
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
                  <p className="font-medium">{r.name}</p>
                </div>
              ))}
            </div>

            <h3 className="font-bold">Observações</h3>
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
                  <h3 className="font-semibold text-lg">{ref?.name}</h3>

                  <p className="font-medium mb-1">Áreas</p>
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

                      {area.elements.map((el) => (
                        <div key={el.id} className="ml-4 mt-2">
                          <p className="text-sm font-medium">{el.label}</p>
                          <Select
                            isMulti
                            options={materialsOptions}
                            value={el.materials || []}
                            onChange={(vals) =>
                              updateMaterials(refId, area.id, el.id, vals)
                            }
                            placeholder="Selecione materiais"
                            className="mt-1"
                          />
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
            <h2 className="font-bold text-xl">Revisão</h2>
            <p>
              <b>Nome:</b> {projectName}
            </p>
            <p>
              <b>Localização:</b> {location}
            </p>
            <p>
              <b>Descrição:</b> {description}
            </p>

            <p>
              <b>Referenciais:</b>{" "}
              {selectedReferentials
                .map((id) => referentials.find((r) => r.id === id)?.name)
                .join(", ")}
            </p>

            <p>
              <b>Observações:</b>{" "}
              {selectedObservations
                .map((id) => observations.find((o) => o.id === id)?.description)
                .join(", ")}
            </p>

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
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-96 flex flex-col gap-4">
            <h3 className="font-bold text-lg">Novo Referencial</h3>
            <input
              type="text"
              placeholder="Nome do referencial"
              className="p-2 border rounded-md"
              value={newRefName}
              onChange={(e) => setNewRefName(e.target.value)}
            />

            {/* Select de áreas */}
            <Select
              isMulti
              options={areasOptions}
              value={selectedAreasForModal.map((id) => {
                const area = areasOptions.find((a) => a.value === id);
                return area ? { value: area.value, label: area.label } : null;
              })}
              onChange={(vals) =>
                setSelectedAreasForModal(vals.map((v) => v.value))
              }
              placeholder="Selecione áreas (opcional)"
            />

            {modalError && <p className="text-red-500">{modalError}</p>}

            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateReferentialName}
                disabled={modalLoading}
                className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
              >
                {modalLoading ? "Criando..." : "Criar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
