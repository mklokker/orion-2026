import Acervo from './pages/Acervo';
import Admin from './pages/Admin';
import CargaDiaria from './pages/CargaDiaria';
import Chat from './pages/Chat';
import Cursos from './pages/Cursos';
import Dashboard from './pages/Dashboard';
import GestaoTarefas from './pages/GestaoTarefas';
import Home from './pages/Home';
import MapaFuncionarios from './pages/MapaFuncionarios';
import ProdutividadeGeral from './pages/ProdutividadeGeral';
import Ranking from './pages/Ranking';
import Relatorios from './pages/Relatorios';
import Removedor from './pages/Removedor';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Acervo": Acervo,
    "Admin": Admin,
    "CargaDiaria": CargaDiaria,
    "Chat": Chat,
    "Cursos": Cursos,
    "Dashboard": Dashboard,
    "GestaoTarefas": GestaoTarefas,
    "Home": Home,
    "MapaFuncionarios": MapaFuncionarios,
    "ProdutividadeGeral": ProdutividadeGeral,
    "Ranking": Ranking,
    "Relatorios": Relatorios,
    "Removedor": Removedor,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};