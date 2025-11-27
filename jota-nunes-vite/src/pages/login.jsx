import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SwiperComponent from "../components/corousel";
import { login } from "../services/auth";
import api from "../services/axios";
import LoadingModal from "../components/loading";
import { Eye, EyeOff } from "lucide-react"; 

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      setShowModal(true);

      const data = await login(username, password);
      const { access, refresh } = data;

      localStorage.setItem("access_token", access);
      localStorage.setItem("refresh_token", refresh);

      api.defaults.headers.common["Authorization"] = `Bearer ${access}`;

      let role = "specifier";

      try {
        const perm = await api.get("/accounts/user-permitions/");
        role = perm.data.permissions;
      } catch (err) {
        console.warn("Usando role padrão 'specifier'.");
      }

      localStorage.setItem("user_role", role);

      navigate("/home");
    } catch (error) {
      console.error("Erro no login:", error);
      setError("Usuário ou senha inválidos");
    } finally {
      setShowModal(false);
    }
  };

  return (
    <>
      {showModal && <LoadingModal />}

      <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
        <div className="flex flex-col lg:flex-row w-full lg:w-[85%] h-auto lg:h-screen bg-white shadow-lg overflow-hidden rounded-2xl">
          {/* Área de Login */}
          <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-10 sm:py-12 border-b-4 lg:border-b-0 lg:border-r-4 border-gray-200">
            <div className="w-full max-w-md">
              <div className="flex justify-center mb-6">
                <img src="/imagens/logo.png" width={200} height={200} alt="Logo" />
              </div>

              <h1 className="text-2xl sm:text-3xl font-semibold text-center text-gray-800">
                Bem-vindo!
              </h1>

              <p className="text-center text-gray-500 mb-8 text-sm sm:text-base">
                Insira suas credenciais para continuar
              </p>

              <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
                <div>
                  <label className="block text-gray-700 mb-1 text-sm sm:text-base">
                    Usuário
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 text-black rounded-lg px-4 py-2 focus:border-red-500 outline-none focus:ring-1 focus:ring-red-500"
                    placeholder="Digite seu usuário"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-1 text-sm sm:text-base">
                    Senha
                  </label>
                  
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="w-full border border-gray-300 text-black rounded-lg px-4 py-2 pr-10 focus:border-red-500 outline-none focus:ring-1 focus:ring-red-500"
                      placeholder="Digite sua senha"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-red-600 text-center text-sm">{error}</p>
                )}

                <button
                  type="submit"
                  className="w-full bg-red-600 text-white py-2 sm:py-3 rounded-lg hover:bg-red-700 transition text-sm sm:text-base font-medium"
                >
                  Entrar →
                </button>
              </form>
            </div>
          </div>

          <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-red-700 to-red-900 items-center justify-center border-l-4 border-gray-200">
            <SwiperComponent />
          </div>
        </div>
      </div>
    </>
  );
}