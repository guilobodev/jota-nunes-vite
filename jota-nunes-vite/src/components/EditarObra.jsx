import { X } from "lucide-react";
import { useState, useEffect } from "react";
import api from "../services/axios";

export default function EditarObraModal({
  isOpen,
  onClose,
  projeto,
  onUpdated,
}) {
  const [projetoData, setProjetoData] = useState(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (projeto) setProjetoData(JSON.parse(JSON.stringify(projeto)));
  }, [projeto]);

  if (!isOpen || !projetoData) return null;

  const handleChange = (path, value) => {
    const keys = path.split(".");
    setProjetoData((prev) => {
      const copy = { ...prev };
      let current = copy;
      for (let i = 0; i < keys.length - 1; i++) current = current[keys[i]];
      current[keys[keys.length - 1]] = value;
      return copy;
    });
  };

  const handleSave = async () => {
    setSalvando(true);
    try {
      const res = await api.put(`/constructions/${projeto.id}/`, projetoData);
      onUpdated(res.data);
      onClose();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar");
    } finally {
      setSalvando(false);
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

        {/* Campos principais */}
        <input
          value={projetoData.project_name}
          onChange={(e) => handleChange("project_name", e.target.value)}
          className="w-full border rounded p-1 mb-2"
          placeholder="Nome do Projeto"
        />
        <input
          value={projetoData.location}
          onChange={(e) => handleChange("location", e.target.value)}
          className="w-full border rounded p-1 mb-2"
          placeholder="Localização"
        />
        <textarea
          value={projetoData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          className="w-full border rounded p-1 mb-2"
          placeholder="Descrição"
          rows={2}
        />

        {/* Referentials */}
        {projetoData.referentials.map((ref, i) => (
          <div key={ref.id} className="border p-2 mb-3 rounded bg-gray-50">
            <input
              value={ref.referential_name.name}
              onChange={(e) =>
                handleChange(
                  `referentials.${i}.referential_name.name`,
                  e.target.value
                )
              }
              className="w-full border rounded p-1 mb-1"
              placeholder="Nome do Referencial"
            />

            {ref.areas.map((area, j) => (
              <div key={area.id} className="ml-3 mb-2 border-l pl-2">
                <input
                  value={area.area_name.name}
                  onChange={(e) =>
                    handleChange(
                      `referentials.${i}.areas.${j}.area_name.name`,
                      e.target.value
                    )
                  }
                  className="w-full border rounded p-1 mb-1"
                  placeholder="Nome da Área"
                />

                {area.elements.map((el, k) => (
                  <div key={el.id} className="ml-3 mb-1 border-l pl-2">
                    <input
                      value={el.element_type.name}
                      onChange={(e) =>
                        handleChange(
                          `referentials.${i}.areas.${j}.elements.${k}.element_type.name`,
                          e.target.value
                        )
                      }
                      className="w-full border rounded p-1 mb-1"
                      placeholder="Tipo de Elemento"
                    />

                    {el.materials.map((mat, l) => (
                      <input
                        key={mat.id}
                        value={mat.description}
                        onChange={(e) =>
                          handleChange(
                            `referentials.${i}.areas.${j}.elements.${k}.materials.${l}.description`,
                            e.target.value
                          )
                        }
                        className="w-full border rounded p-1 mb-1 ml-2"
                        placeholder="Material"
                      />
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}

        <button
          onClick={handleSave}
          disabled={salvando}
          className="w-full bg-red-700 hover:bg-red-800 text-white py-2 rounded mt-2 disabled:opacity-50"
        >
          {salvando ? "Salvando..." : "Salvar Alterações"}
        </button>
      </div>
    </div>
  );
}
