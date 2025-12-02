import { X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import api from "../services/axios";
import GenericModal from "./GenericModal";

export default function EditarObraModal({
  isOpen,
  onClose,
  projeto,
  onUpdated,
}) {
  const [projetoData, setProjetoData] = useState(null);
  const [salvando, setSalvando] = useState(false);

  // Listas de opções disponíveis no banco
  const [referentialsOptions, setReferentialsOptions] = useState([]);
  const [areasOptions, setAreasOptions] = useState([]);
  const [elementsOptions, setElementsOptions] = useState([]);
  const [materialsOptions, setMaterialsOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [observationsOptions, setObservationsOptions] = useState([]);
  const [modalObservationOpen, setModalObservationOpen] = useState(false);
  const [newObservation, setNewObservation] = useState("");
  const [modalObsLoading, setModalObsLoading] = useState(false);
  const [modalObsError, setModalObsError] = useState("");

  useEffect(() => {
    if (projeto) {
      console.log("Carregando projeto no modal:", projeto);

      // Clonar projeto e converter materiais strings em objetos temporários
      const projetoCopy = JSON.parse(JSON.stringify(projeto));

      // Processar cada referential -> area -> element -> materials
      projetoCopy.referentials?.forEach((ref) => {
        ref.areas?.forEach((area) => {
          area.elements?.forEach((elem) => {
            // Deixar materials como vieram; faremos um mapeamento posterior
            // para tentar transformar strings em objetos quando as opções
            // de materiais estiverem carregadas.
            if (!elem.materials) elem.materials = [];
          });
        });
      });

      setProjetoData(projetoCopy);
    }
  }, [projeto, isOpen]);

  // Quando as opções de materiais forem carregadas, tentar mapear
  // strings (caso o backend retorne StringRelatedField) para objetos
  useEffect(() => {
    // Only run mapping when modal is open, materialsOptions are ready,
    // and we haven't already mapped for this project.
    if (!isOpen || !projetoData) return;
    if (!materialsOptions || materialsOptions.length === 0) return;

    // run only once per projeto.id to avoid update loops
    const projetoId = projeto?.id || projetoData?.id || null;
    if (!projetoId) return;
    if (!mappedForProjectRef.current) mappedForProjectRef.current = {};
    if (mappedForProjectRef.current[projetoId]) return;

    // função auxiliar para tentar casar uma string com um material
    const matchMaterialByString = (s) => {
      if (!s || typeof s !== "string") return null;
      const cleaned = s.trim();

      // 1) match por description exato
      let found = materialsOptions.find(
        (m) => m.description === cleaned || m.name === cleaned
      );
      if (found) return found;

      // 2) match por pattern: "description - brand (type)" (como exibido no select)
      found = materialsOptions.find((m) => {
        const label = `${m.description} - ${m.brand?.name || ""} (${
          m.material_type?.name || ""
        })`.trim();
        return label === cleaned;
      });
      if (found) return found;

      // 3) fallback: case-insensitive includes on description
      found = materialsOptions.find(
        (m) =>
          m.description &&
          m.description.toLowerCase().includes(cleaned.toLowerCase())
      );
      return found || null;
    };

    const copy = JSON.parse(JSON.stringify(projetoData));
    copy.referentials?.forEach((ref) => {
      ref.areas?.forEach((area) => {
        area.elements?.forEach((elem) => {
          if (elem.materials && elem.materials.length > 0) {
            elem.materials = elem.materials.map((mat) => {
              if (typeof mat === "string") {
                const matched = matchMaterialByString(mat);
                if (matched) return matched;
                return mat; // keep string if no match
              }
              return mat;
            });
          }
        });
      });
    });

    setProjetoData(copy);
    mappedForProjectRef.current[projetoId] = true;
  }, [materialsOptions, isOpen, projeto?.id]);

  const mappedForProjectRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      loadOptions();
    }
  }, [isOpen]);

  const loadOptions = async () => {
    setLoading(true);
    try {
      const [refs, areas, elems, mats, obs] = await Promise.all([
        api.get("/referentials/name/"),
        api.get("/areas/names/"),
        api.get("/elements/types/"),
        api.get("/materials/"),
        api.get("/observations/"),
      ]);

      setReferentialsOptions(refs?.data?.data ?? []);
      setAreasOptions(areas?.data?.data ?? []);
      setElementsOptions(elems?.data?.data ?? []);
      setMaterialsOptions(mats?.data?.data ?? []);
      setObservationsOptions(obs?.data?.data ?? []);
    } catch (error) {
      console.error("Erro ao carregar opções:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !projetoData) return null;

  const toggleProjetoObservation = (id) => {
    setProjetoData((prev) => {
      const copy = { ...prev };
      copy.observations = copy.observations || [];
      const exists = copy.observations.find((o) => o.id === id);
      if (exists) {
        copy.observations = copy.observations.filter((o) => o.id !== id);
      } else {
        const found = observationsOptions.find((o) => o.id === id);
        if (found) copy.observations = [...copy.observations, found];
      }
      return copy;
    });
  };

  const handleSave = async () => {
    setSalvando(true);
    try {
      console.log("=== INICIANDO SALVAMENTO ===");
      console.log("Dados da obra:", projetoData);

      // Primeiro, atualizar cada elemento com seus materiais
      for (const ref of projetoData.referentials) {
        console.log(`\n--- Processando referential ID ${ref.id} ---`);

        for (const area of ref.areas) {
          console.log(`  Processando área ID ${area.id}:`, area);

          for (const elem of area.elements) {
            console.log(`    Atualizando elemento ID ${elem.id}:`, elem);
            const elemPayload = {
              element_type_id: elem.element_type.id,
              materials_ids: elem.materials.map((mat) => mat.id),
            };
            console.log(`    Payload do elemento:`, elemPayload);
            await api.patch(`/elements/${elem.id}/`, elemPayload);
          }
        }

        // Depois, atualizar o referential com seu nome e as áreas selecionadas
        const refPayload = {
          referential_name_id: ref.referential_name.id,
          areas_ids: ref.areas.map((area) => area.id),
          is_approved: ref.is_approved,
          comment: ref.comment || "",
        };
        console.log(`Payload do referential:`, refPayload);
        await api.patch(`/referentials/name/${ref.id}/`, refPayload);
      }

      // Atualizar os dados básicos da obra
      const payload = {
        project_name: projetoData.project_name,
        location: projetoData.location,
        description: projetoData.description,
        // send referential_name.id (the lookup id) instead of the referential instance id
        referentials: projetoData.referentials.map(
          (ref) =>
            ref?.referential_name?.id || ref?.referential_name_id || ref?.id
        ),
        observations: projetoData.observations?.map((obs) => obs.id) || [],
      };

      console.log("Payload da obra:", payload);
      await api.patch(`/constructions/${projeto.id}/`, payload);

      // Recarregar a obra completa após salvar
      console.log("Recarregando obra...");
      const res = await api.get(`/constructions/${projeto.id}/`);
      console.log("Obra recarregada:", res.data);
      onUpdated(res.data);
      alert("Obra atualizada com sucesso!");
      onClose();
    } catch (err) {
      console.error("=== ERRO NO SALVAMENTO ===");
      console.error("Erro completo:", err);
      console.error("Response:", err.response?.data);
      console.error("Status:", err.response?.status);
      alert("Erro ao salvar: " + (err.response?.data?.error || err.message));
    } finally {
      setSalvando(false);
    }
  };

  const handleChangeReferential = (refIndex, newRefId) => {
    const selectedRef = referentialsOptions.find(
      (r) => r.id === parseInt(newRefId)
    );
    if (selectedRef) {
      setProjetoData((prev) => {
        const copy = { ...prev };
        copy.referentials[refIndex] = {
          id: selectedRef.id,
          referential_name: selectedRef.referential_name || {
            id: selectedRef.id,
            name: selectedRef.name,
          },
          areas: copy.referentials[refIndex].areas || [],
          is_approved: copy.referentials[refIndex].is_approved || false,
          comment: copy.referentials[refIndex].comment || "",
        };
        return copy;
      });
    }
  };

  const handleChangeArea = (refIndex, areaIndex, newAreaId) => {
    const selectedArea = areasOptions.find((a) => a.id === parseInt(newAreaId));
    if (selectedArea) {
      setProjetoData((prev) => {
        const copy = { ...prev };
        copy.referentials[refIndex].areas[areaIndex] = {
          id: selectedArea.id,
          area_name: selectedArea.area_name || {
            id: selectedArea.id,
            name: selectedArea.name,
          },
          elements: copy.referentials[refIndex].areas[areaIndex].elements || [],
        };
        return copy;
      });
    }
  };

  const handleChangeElement = (refIndex, areaIndex, elemIndex, newElemId) => {
    const selectedElem = elementsOptions.find(
      (e) => e.id === parseInt(newElemId)
    );
    if (selectedElem) {
      setProjetoData((prev) => {
        const copy = { ...prev };
        copy.referentials[refIndex].areas[areaIndex].elements[elemIndex] = {
          id: selectedElem.id,
          element_type: selectedElem.element_type || {
            id: selectedElem.id,
            name: selectedElem.name,
          },
          materials:
            copy.referentials[refIndex].areas[areaIndex].elements[elemIndex]
              .materials || [],
        };
        return copy;
      });
    }
  };

  const handleChangeMaterial = (
    refIndex,
    areaIndex,
    elemIndex,
    matIndex,
    newMatId
  ) => {
    const selectedMat = materialsOptions.find(
      (m) => m.id === parseInt(newMatId)
    );
    if (selectedMat) {
      setProjetoData((prev) => {
        const copy = { ...prev };
        copy.referentials[refIndex].areas[areaIndex].elements[
          elemIndex
        ].materials[matIndex] = selectedMat;
        return copy;
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white w-11/12 max-w-2xl rounded-2xl p-4 shadow-xl relative max-h-[80vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-semibold mb-3">
          Editar Obra — {projetoData.project_name}
        </h2>

        {loading && (
          <p className="text-center text-gray-600 py-4">Carregando opções...</p>
        )}

        {/* Campos principais */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome do Projeto
          </label>
          <input
            value={projetoData.project_name}
            onChange={(e) =>
              setProjetoData({ ...projetoData, project_name: e.target.value })
            }
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-600 outline-none"
            placeholder="Nome do Projeto"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Localização
          </label>
          <input
            value={projetoData.location}
            onChange={(e) =>
              setProjetoData({ ...projetoData, location: e.target.value })
            }
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-600 outline-none"
            placeholder="Localização"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descrição
          </label>
          <textarea
            value={projetoData.description}
            onChange={(e) =>
              setProjetoData({ ...projetoData, description: e.target.value })
            }
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-600 outline-none"
            placeholder="Descrição"
            rows={2}
          />
        </div>

        {/* Observações: seleção e criação */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observações
            </label>
            <button
              onClick={() => setModalObservationOpen(true)}
              className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
            >
              + Nova Observação
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-2">
            {observationsOptions.map((o) => {
              const selected = projetoData.observations?.some(
                (x) => x.id === o.id
              );
              return (
                <div
                  key={o.id}
                  onClick={() => toggleProjetoObservation(o.id)}
                  className={`p-3 rounded-lg border cursor-pointer ${
                    selected
                      ? "border-red-600 ring-2 ring-red-300"
                      : "border-gray-200"
                  }`}
                >
                  <p className="text-sm">{o.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Referentials */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Referentials
          </h3>
          {projetoData.referentials.map((ref, i) => (
            <div
              key={ref.id}
              className="border border-gray-300 p-3 mb-3 rounded-lg bg-gray-50"
            >
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Referencial {i + 1}
              </label>
              <select
                value={ref.referential_name?.id || ref.id}
                onChange={(e) => handleChangeReferential(i, e.target.value)}
                className="w-full border rounded-lg px-3 py-2 mb-3 focus:ring-2 focus:ring-red-600 outline-none"
              >
                <option value="">-- Selecione um referencial --</option>
                {referentialsOptions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.referential_name?.name || r.name}
                  </option>
                ))}
              </select>

              {/* Áreas */}
              <div className="ml-4">
                <h4 className="text-md font-semibold text-gray-700 mb-2">
                  Áreas
                </h4>
                {ref.areas?.map((area, j) => (
                  <div
                    key={area.id}
                    className="border border-blue-200 p-2 mb-2 rounded bg-white"
                  >
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Área {j + 1}
                    </label>
                    <select
                      value={area.area_name?.id || area.id}
                      onChange={(e) => handleChangeArea(i, j, e.target.value)}
                      className="w-full border rounded-lg px-2 py-1 mb-2 text-sm focus:ring-2 focus:ring-red-600 outline-none"
                    >
                      <option value="">-- Selecione uma área --</option>
                      {areasOptions.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.area_name?.name || a.name}
                        </option>
                      ))}
                    </select>

                    {/* Elementos */}
                    <div className="ml-4">
                      <h5 className="text-sm font-semibold text-gray-700 mb-1">
                        Elementos
                      </h5>
                      {area.elements?.map((el, k) => (
                        <div
                          key={el.id}
                          className="border border-purple-200 p-2 mb-2 rounded bg-purple-50"
                        >
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Elemento {k + 1}
                          </label>
                          <select
                            value={el.element_type?.id || el.id}
                            onChange={(e) =>
                              handleChangeElement(i, j, k, e.target.value)
                            }
                            className="w-full border rounded px-2 py-1 mb-2 text-sm focus:ring-2 focus:ring-red-600 outline-none"
                          >
                            <option value="">
                              -- Selecione um elemento --
                            </option>
                            {elementsOptions.map((e) => (
                              <option key={e.id} value={e.id}>
                                {e.element_type?.name || e.name}
                              </option>
                            ))}
                          </select>

                          {/* Materiais */}
                          <div className="ml-4">
                            <h6 className="text-xs font-semibold text-gray-700 mb-1">
                              Materiais
                            </h6>

                            {/* Summary list like NovaObra Step 3: show labels when available */}
                            {el.materials && el.materials.length > 0 ? (
                              <ul className="ml-4 list-disc text-sm mt-1">
                                {el.materials.map((mat, idx) => (
                                  <li key={idx}>
                                    {typeof mat === "string"
                                      ? // backend sometimes returns strings (StringRelatedField)
                                        mat
                                      : // prefer explicit label if present (from Select option),
                                        // otherwise try description/brand combination
                                        mat.label ||
                                        mat.description ||
                                        `${mat.brand?.name || ""} ${
                                          mat.material_type?.name || ""
                                        }`}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="ml-4 text-sm text-gray-500">
                                Nenhum material selecionado
                              </p>
                            )}

                            {/* Apenas exibir a lista de materiais (não editável) */}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleSave}
          disabled={salvando}
          className="w-full bg-red-700 hover:bg-red-800 text-white py-2 rounded mt-2 disabled:opacity-50"
        >
          {salvando ? "Salvando..." : "Salvar Alterações"}
        </button>

        <GenericModal
          isOpen={modalObservationOpen}
          title="Nova Observação"
          inputValue={newObservation}
          onInputChange={setNewObservation}
          onConfirm={async () => {
            if (!newObservation.trim()) return;
            setModalObsLoading(true);
            setModalObsError("");
            try {
              const res = await api.post("/observations/", [
                { description: newObservation.trim() },
              ]);
              const created = res.data.data[0];
              setObservationsOptions((prev) => [...prev, created]);
              setProjetoData((prev) => ({
                ...prev,
                observations: [...(prev.observations || []), created],
              }));
              setNewObservation("");
              setModalObservationOpen(false);
            } catch (err) {
              console.error("Erro ao criar observação:", err);
              setModalObsError("Não foi possível criar a observação");
            } finally {
              setModalObsLoading(false);
            }
          }}
          isLoading={modalObsLoading}
          error={modalObsError}
          onClose={() => setModalObservationOpen(false)}
          showAreasSelect={false}
        />
      </div>
    </div>
  );
}
