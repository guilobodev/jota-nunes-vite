import { useState, useEffect } from "react";
import api from "../services/axios";

export default function ModalMaterial({ open, onClose, onCreated }) {
  const [description, setDescription] = useState("");

  const [brands, setBrands] = useState([]);
  const [types, setTypes] = useState([]);

  const [brandId, setBrandId] = useState("");
  const [typeId, setTypeId] = useState("");

  const [newBrand, setNewBrand] = useState("");
  const [newType, setNewType] = useState("");

  useEffect(() => {
    if (open) {
      loadBrands();
      loadTypes();
    }
  }, [open]);

  const loadBrands = async () => {
    const res = await api.get("/materials/brands/");
    setBrands(res.data.data || []);
  };

  const loadTypes = async () => {
    const res = await api.get("/materials/types_of_materials/");
    setTypes(res.data.data || []);
  };

  const handleCreateBrand = async () => {
    if (!newBrand.trim()) return;
    await api.post("/materials/brands/", [{ name: newBrand }]);
    setNewBrand("");
    await loadBrands();
  };

  const handleCreateType = async () => {
    if (!newType.trim()) return;
    await api.post("/materials/types_of_materials/", [{ name: newType }]);
    setNewType("");
    await loadTypes();
  };

  const saveMaterial = async () => {
    if (!description || !brandId || !typeId) {
      alert("Preencha todos os campos!");
      return;
    }

    const res = await api.post("/materials/", [
      {
        description,
        brand: Number(brandId),
        material_type: Number(typeId),
      },
    ]);

    onCreated(res.data);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-2xl shadow-lg w-[450px] flex flex-col gap-5">
        <h2 className="font-bold text-xl">Novo Material</h2>

        {/* DESCRIPTION */}
        <div className="flex flex-col gap-1">
          <label className="font-medium">Descrição</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="p-3 border rounded-xl"
            placeholder="Descrição do material"
          />
        </div>

        {/* BRAND */}
        <div className="flex flex-col gap-1">
          <label className="font-medium">Marca</label>
          <div className="flex gap-2">
            <select
              className="p-3 border rounded-xl flex-1"
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
            >
              <option value="">-- selecione --</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            <button
              onClick={handleCreateBrand}
              className="px-3 bg-green-600 text-white rounded-lg"
            >
              +
            </button>
          </div>

          <input
            value={newBrand}
            onChange={(e) => setNewBrand(e.target.value)}
            className="p-2 border rounded-xl text-sm"
            placeholder="Nova marca"
          />
        </div>

        {/* TYPE */}
        <div className="flex flex-col gap-1">
          <label className="font-medium">Tipo do Material</label>
          <div className="flex gap-2">
            <select
              className="p-3 border rounded-xl flex-1"
              value={typeId}
              onChange={(e) => setTypeId(e.target.value)}
            >
              <option value="">-- selecione --</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            <button
              onClick={handleCreateType}
              className="px-3 bg-green-600 text-white rounded-lg"
            >
              +
            </button>
          </div>

          <input
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            className="p-2 border rounded-xl text-sm"
            placeholder="Novo tipo de material"
          />
        </div>

        {/* BUTTONS */}
        <div className="flex justify-between mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 rounded-xl"
          >
            Cancelar
          </button>

          <button
            onClick={saveMaterial}
            className="px-4 py-2 bg-green-600 text-white rounded-xl"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
