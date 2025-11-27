import api from "./axios";

// ✅ GET - lista todas as construções
export const getConstructions = async () => {
  const response = await api.get("/constructions/");
  return response.data;
};

// ✅ GET - busca por ID
export const getConstructionById = async (id) => {
  const response = await api.get(`/constructions/${id}/`);
  return response.data;
};

// ✅ POST - cria
export const createConstruction = async (data) => {
  const response = await api.post("/constructions/", data);
  return response.data;
};

// ✅ PUT - atualiza
export const updateConstruction = async (id, data) => {
  const response = await api.put(`/constructions/${id}/`, data);
  return response.data;
};

// ✅ DELETE - remove
export const deleteConstruction = async (id) => {
  const response = await api.delete(`/constructions/${id}/`);
  return response.data;
};

