import Dashboard from './pages/Dashboard';
import GestaoTarefas from './pages/GestaoTarefas';
import CargaDiaria from './pages/CargaDiaria';
import Relatorios from './pages/Relatorios';
import Admin from './pages/Admin';
import ProdutividadeGeral from './pages/ProdutividadeGeral';
import Ranking from './pages/Ranking';
import Chat from './pages/Chat';
import Acervo from './pages/Acervo';
import Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "GestaoTarefas": GestaoTarefas,
    "CargaDiaria": CargaDiaria,
    "Relatorios": Relatorios,
    "Admin": Admin,
    "ProdutividadeGeral": ProdutividadeGeral,
    "Ranking": Ranking,
    "Chat": Chat,
    "Acervo": Acervo,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};