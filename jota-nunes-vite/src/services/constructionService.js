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


export const downloadConstructionDocx = async (constructionId, filename) => {
  try {
    const response = await api.get(`/documents/${constructionId}/`, {
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    
    const link = document.createElement('a');
    link.href = url;

    link.setAttribute('download', filename ? `${filename}.docx` : `obra_${constructionId}.docx`);
    document.body.appendChild(link);
    link.click();
    
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error("Erro ao baixar o documento:", error);
    throw error; 
  }
};