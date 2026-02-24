/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
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
import AtasAlinhamentos from './pages/AtasAlinhamentos';
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
    "AtasAlinhamentos": AtasAlinhamentos,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};