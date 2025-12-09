import React, { useState, useEffect, useRef } from "react";
import { Desk } from "@/entities/Desk";
import { User } from "@/entities/User";
import { Department } from "@/entities/Department";
import { Sector } from "@/entities/Sector";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Users, 
  Grid3x3, 
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Building2,
  Settings,
  RotateCw
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import CreateDeskModal from "@/components/mapa/CreateDeskModal";
import EditDeskModal from "@/components/mapa/EditDeskModal";
import SectorManager from "@/components/mapa/SectorManager";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const getInitials = (name) => {
  if (!name) return "U";
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const getUserDisplayName = (user) => {
  return user?.display_name || user?.full_name || user?.email || "Usuário";
};

export default function MapaFuncionarios() {
  const { toast } = useToast();
  const mapRef = useRef(null);
  
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [desks, setDesks] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [selectedSector, setSelectedSector] = useState("all");
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDesk, setSelectedDesk] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deskToDelete, setDeskToDelete] = useState(null);
  const [showSectorManager, setShowSectorManager] = useState(false);
  
  const [draggingDesk, setDraggingDesk] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedDeskId, setHighlightedDeskId] = useState(null);

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await User.me();
      setCurrentUser(userData);

      const [usersData, departmentsData, desksData, sectorsData] = await Promise.all([
        User.list(),
        Department.list(),
        Desk.list(),
        Sector.list()
      ]);

      setUsers(usersData);
      setDepartments(departmentsData);
      setDesks(desksData);
      setSectors(sectorsData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do mapa.",
        variant: "destructive"
      });
    }
  };

  const handleCreateDesk = async (deskData) => {
    try {
      await Desk.create(deskData);
      toast({
        title: "Sucesso!",
        description: "Mesa criada com sucesso.",
      });
      loadData();
      setShowCreateModal(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao criar mesa.",
        variant: "destructive"
      });
    }
  };

  const handleUpdateDesk = async (deskId, deskData) => {
    try {
      await Desk.update(deskId, deskData);
      toast({
        title: "Sucesso!",
        description: "Mesa atualizada com sucesso.",
      });
      loadData();
      setShowEditModal(false);
      setSelectedDesk(null);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar mesa.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteDesk = async () => {
    if (!deskToDelete) return;
    
    try {
      await Desk.delete(deskToDelete.id);
      toast({
        title: "Sucesso!",
        description: "Mesa excluída com sucesso.",
      });
      loadData();
      setShowDeleteDialog(false);
      setDeskToDelete(null);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao excluir mesa.",
        variant: "destructive"
      });
    }
  };

  const handleCreateSector = async (sectorData) => {
    try {
      await Sector.create(sectorData);
      toast({
        title: "Sucesso!",
        description: "Setor criado com sucesso.",
      });
      loadData();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao criar setor.",
        variant: "destructive"
      });
    }
  };

  const handleUpdateSector = async (sectorId, sectorData) => {
    try {
      await Sector.update(sectorId, sectorData);
      toast({
        title: "Sucesso!",
        description: "Setor atualizado com sucesso.",
      });
      loadData();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar setor.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteSector = async (sectorId) => {
    try {
      await Sector.delete(sectorId);
      toast({
        title: "Sucesso!",
        description: "Setor excluído com sucesso.",
      });
      loadData();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao excluir setor.",
        variant: "destructive"
      });
    }
  };

  const handleMouseDown = (e, desk) => {
    if (!isAdmin) return;
    
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setDraggingDesk(desk);
    setDragOffset({
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top) / zoom
    });
  };

  const handleMouseMove = (e) => {
    if (draggingDesk && mapRef.current) {
      const rect = mapRef.current.getBoundingClientRect();
      const newX = (e.clientX - rect.left) / zoom - dragOffset.x;
      const newY = (e.clientY - rect.top) / zoom - dragOffset.y;
      
      setDesks(prev => prev.map(d => 
        d.id === draggingDesk.id 
          ? { ...d, position_x: Math.max(0, newX), position_y: Math.max(0, newY) }
          : d
      ));
    }
  };

  const handleMouseUp = async () => {
    if (draggingDesk) {
      const updatedDesk = desks.find(d => d.id === draggingDesk.id);
      if (updatedDesk) {
        try {
          await Desk.update(draggingDesk.id, {
            position_x: updatedDesk.position_x,
            position_y: updatedDesk.position_y
          });
        } catch (error) {
          console.error("Erro ao salvar posição:", error);
        }
      }
      setDraggingDesk(null);
    }
  };

  const handleMapMouseDown = (e) => {
    if (e.target === mapRef.current || e.target.classList.contains('map-background')) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMapMouseMove = (e) => {
    if (isPanning) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }
  };

  const handleMapMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    const newZoom = Math.min(2, Math.max(0.5, zoom + delta));
    setZoom(newZoom);
  };

  const renderDeskPositions = (desk) => {
    const getUserAtPosition = (posIndex) => {
      const position = desk.positions?.find(p => p.position_index === posIndex);
      return position ? users.find(u => u.email === position.user_email) : null;
    };

    if (desk.desk_type === 'single') {
      const user = getUserAtPosition(0);
      return (
        <div className="flex items-center justify-center w-full h-full">
          {user ? (
            <div className="flex flex-col items-center gap-1">
              <Avatar className="w-12 h-12 border-2 border-white shadow">
                <AvatarImage src={user.profile_picture} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                  {getInitials(getUserDisplayName(user))}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium text-white truncate max-w-[80px]">
                {getUserDisplayName(user)}
              </span>
            </div>
          ) : (
            <div className="text-white/60 text-xs">Vazio</div>
          )}
        </div>
      );
    }

    if (desk.desk_type === 'double') {
      return (
        <div className="flex gap-4 items-center justify-center w-full h-full p-2">
          {[0, 1].map(idx => {
            const user = getUserAtPosition(idx);
            return (
              <div key={idx} className="flex flex-col items-center gap-1">
                {user ? (
                  <>
                    <Avatar className="w-10 h-10 border-2 border-white shadow">
                      <AvatarImage src={user.profile_picture} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs">
                        {getInitials(getUserDisplayName(user))}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[10px] font-medium text-white truncate max-w-[60px]">
                      {getUserDisplayName(user).split(' ')[0]}
                    </span>
                  </>
                ) : (
                  <div className="w-10 h-10 border-2 border-white/30 border-dashed rounded-full flex items-center justify-center">
                    <Users className="w-4 h-4 text-white/40" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    if (desk.desk_type === 'facing_4') {
      return (
        <div className="flex flex-col gap-2 items-center justify-center w-full h-full p-2">
          <div className="flex gap-4">
            {[0, 1].map(idx => {
              const user = getUserAtPosition(idx);
              return (
                <div key={idx} className="flex flex-col items-center gap-1">
                  {user ? (
                    <>
                      <Avatar className="w-9 h-9 border-2 border-white shadow">
                        <AvatarImage src={user.profile_picture} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs">
                          {getInitials(getUserDisplayName(user))}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-[9px] font-medium text-white truncate max-w-[50px]">
                        {getUserDisplayName(user).split(' ')[0]}
                      </span>
                    </>
                  ) : (
                    <div className="w-9 h-9 border-2 border-white/30 border-dashed rounded-full" />
                  )}
                </div>
              );
            })}
          </div>
          <div className="h-px w-20 bg-white/40" />
          <div className="flex gap-4">
            {[2, 3].map(idx => {
              const user = getUserAtPosition(idx);
              return (
                <div key={idx} className="flex flex-col items-center gap-1">
                  {user ? (
                    <>
                      <Avatar className="w-9 h-9 border-2 border-white shadow">
                        <AvatarImage src={user.profile_picture} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs">
                          {getInitials(getUserDisplayName(user))}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-[9px] font-medium text-white truncate max-w-[50px]">
                        {getUserDisplayName(user).split(' ')[0]}
                      </span>
                    </>
                  ) : (
                    <div className="w-9 h-9 border-2 border-white/30 border-dashed rounded-full" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (desk.desk_type === 'facing_6') {
      return (
        <div className="flex flex-col gap-2 items-center justify-center w-full h-full p-2">
          <div className="flex gap-3">
            {[0, 1, 2].map(idx => {
              const user = getUserAtPosition(idx);
              return (
                <div key={idx} className="flex flex-col items-center gap-1">
                  {user ? (
                    <>
                      <Avatar className="w-8 h-8 border-2 border-white shadow">
                        <AvatarImage src={user.profile_picture} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-[10px]">
                          {getInitials(getUserDisplayName(user))}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-[8px] font-medium text-white truncate max-w-[40px]">
                        {getUserDisplayName(user).split(' ')[0]}
                      </span>
                    </>
                  ) : (
                    <div className="w-8 h-8 border-2 border-white/30 border-dashed rounded-full" />
                  )}
                </div>
              );
            })}
          </div>
          <div className="h-px w-28 bg-white/40" />
          <div className="flex gap-3">
            {[3, 4, 5].map(idx => {
              const user = getUserAtPosition(idx);
              return (
                <div key={idx} className="flex flex-col items-center gap-1">
                  {user ? (
                    <>
                      <Avatar className="w-8 h-8 border-2 border-white shadow">
                        <AvatarImage src={user.profile_picture} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-[10px]">
                          {getInitials(getUserDisplayName(user))}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-[8px] font-medium text-white truncate max-w-[40px]">
                        {getUserDisplayName(user).split(' ')[0]}
                      </span>
                    </>
                  ) : (
                    <div className="w-8 h-8 border-2 border-white/30 border-dashed rounded-full" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return null;
  };

  const filteredDesks = selectedSector === "all" 
    ? desks 
    : desks.filter(desk => desk.sector_id === selectedSector);

  const currentSector = sectors.find(s => s.id === selectedSector);

  // Search functionality
  const searchResults = React.useMemo(() => {
    if (!searchQuery.trim()) return filteredDesks;
    
    const query = searchQuery.toLowerCase();
    return filteredDesks.filter(desk => {
      // Search by desk name
      if (desk.name.toLowerCase().includes(query)) return true;
      
      // Search by employee name/email
      const hasMatchingEmployee = desk.positions?.some(pos => {
        if (!pos.user_email) return false;
        const user = users.find(u => u.email === pos.user_email);
        if (!user) return false;
        const displayName = getUserDisplayName(user).toLowerCase();
        return displayName.includes(query) || user.email.toLowerCase().includes(query);
      });
      
      return hasMatchingEmployee;
    });
  }, [filteredDesks, searchQuery, users]);

  const focusOnDesk = (desk) => {
    setHighlightedDeskId(desk.id);
    
    // Calculate center position for the desk
    const mapWidth = 2000;
    const mapHeight = 2000;
    const centerX = -desk.position_x + (window.innerWidth / 2 / zoom);
    const centerY = -desk.position_y + (window.innerHeight / 2 / zoom);
    
    setPanOffset({ x: centerX * zoom, y: centerY * zoom });
    
    // Clear highlight after 3 seconds
    setTimeout(() => setHighlightedDeskId(null), 3000);
  };

  // Group desks by sector for visual boundaries
  const sectorBoundaries = React.useMemo(() => {
    const boundaries = {};
    
    filteredDesks.forEach(desk => {
      if (!desk.sector_id) return;
      
      if (!boundaries[desk.sector_id]) {
        boundaries[desk.sector_id] = {
          minX: desk.position_x,
          maxX: desk.position_x + 200,
          minY: desk.position_y,
          maxY: desk.position_y + 200,
          sector: sectors.find(s => s.id === desk.sector_id)
        };
      } else {
        const b = boundaries[desk.sector_id];
        b.minX = Math.min(b.minX, desk.position_x);
        b.maxX = Math.max(b.maxX, desk.position_x + 200);
        b.minY = Math.min(b.minY, desk.position_y);
        b.maxY = Math.max(b.maxY, desk.position_y + 200);
      }
    });
    
    // Add padding
    Object.values(boundaries).forEach(b => {
      b.minX -= 30;
      b.minY -= 30;
      b.maxX += 30;
      b.maxY += 30;
    });
    
    return boundaries;
  }, [filteredDesks, sectors]);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="bg-white border-b p-3 md:p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 truncate">Mapa de Funcionários</h1>
              <p className="text-xs md:text-sm text-gray-500">Organize e visualize as mesas</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            <div className="relative flex-1 sm:max-w-xs">
              <Input
                placeholder="Buscar mesa ou funcionário..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs md:text-sm h-9 md:h-10"
              />
              <Users className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              {searchQuery && (
                <Badge variant="secondary" className="absolute right-2 top-1/2 -translate-y-1/2 text-xs">
                  {searchResults.length}
                </Badge>
              )}
            </div>
            
            {sectors.length > 0 && (
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-gray-400 hidden sm:block" />
                <select
                  value={selectedSector}
                  onChange={(e) => {
                    setSelectedSector(e.target.value);
                    setSearchQuery("");
                  }}
                  className="w-full sm:w-auto px-2 md:px-3 py-1.5 border rounded-lg text-xs md:text-sm font-medium bg-white hover:bg-gray-50 transition-colors"
                  style={{
                    borderColor: currentSector?.color || '#D1D5DB',
                    color: currentSector?.color || '#374151'
                  }}
                >
                  <option value="all">Todos os Setores</option>
                  {sectors.map(sector => (
                    <option key={sector.id} value={sector.id}>
                      {sector.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            

          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative bg-gradient-to-br from-gray-100 to-gray-200">
        {/* Botões de ação fixos */}
        {isAdmin && (
          <div className="fixed top-16 md:top-20 right-2 md:right-4 z-50 flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowSectorManager(true)}
              className="gap-1.5 bg-white/95 backdrop-blur-sm shadow-lg text-xs md:text-sm h-9 md:h-10 px-3 md:px-4"
              size="sm"
            >
              <Settings className="w-3 h-3 md:w-4 md:h-4" />
              <span>Setores</span>
            </Button>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg text-xs md:text-sm h-9 md:h-10 px-3 md:px-4"
              size="sm"
            >
              <Plus className="w-3 h-3 md:w-4 md:h-4" />
              Nova Mesa
            </Button>
          </div>
        )}

        {/* Controles de zoom fixos */}
        <div className="fixed top-32 md:top-36 right-2 md:right-4 z-50 flex flex-col gap-1.5 md:gap-2 bg-white/95 backdrop-blur-sm p-1.5 md:p-2 rounded-lg shadow-lg border">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setZoom(z => Math.min(2, z + 0.1))}
            title="Aumentar Zoom"
            className="h-8 w-8 md:h-10 md:w-10 hover:bg-blue-50 hover:text-blue-600"
          >
            <ZoomIn className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setZoom(1)}
            title="Resetar Zoom"
            className="h-8 w-8 md:h-10 md:w-10 hover:bg-blue-50 hover:text-blue-600"
          >
            <RotateCcw className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
            title="Diminuir Zoom"
            className="h-8 w-8 md:h-10 md:w-10 hover:bg-blue-50 hover:text-blue-600"
          >
            <ZoomOut className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </Button>
          <div className="border-t my-1" />
          <div className="text-center text-xs text-gray-500 font-medium px-1">
            {Math.round(zoom * 100)}%
          </div>
        </div>

        <div
          ref={mapRef}
          className="w-full h-full map-background relative cursor-move"
          onMouseMove={(e) => {
            handleMouseMove(e);
            handleMapMouseMove(e);
          }}
          onMouseUp={() => {
            handleMouseUp();
            handleMapMouseUp();
          }}
          onMouseLeave={() => {
            handleMouseUp();
            handleMapMouseUp();
          }}
          onMouseDown={handleMapMouseDown}
          onWheel={handleWheel}
          style={{
            transform: `scale(${zoom}) translate(${panOffset.x / zoom}px, ${panOffset.y / zoom}px)`,
            transformOrigin: '0 0',
            transition: draggingDesk || isPanning ? 'none' : 'transform 0.1s ease-out',
            backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
            backgroundSize: '30px 30px',
            minWidth: '2000px',
            minHeight: '2000px'
          }}
        >
          {/* Sector boundaries */}
          {selectedSector === "all" && Object.entries(sectorBoundaries).map(([sectorId, boundary]) => (
            <div
              key={`boundary-${sectorId}`}
              className="absolute border-2 border-dashed rounded-2xl pointer-events-none"
              style={{
                left: boundary.minX,
                top: boundary.minY,
                width: boundary.maxX - boundary.minX,
                height: boundary.maxY - boundary.minY,
                borderColor: boundary.sector?.color || '#94a3b8',
                backgroundColor: `${boundary.sector?.color || '#94a3b8'}10`
              }}
            >
              <div 
                className="absolute -top-6 left-2 px-2 py-1 rounded text-xs font-semibold"
                style={{
                  backgroundColor: boundary.sector?.color || '#94a3b8',
                  color: 'white'
                }}
              >
                {boundary.sector?.name || 'Setor'}
              </div>
            </div>
          ))}

          {searchResults.map(desk => {
            const dept = departments.find(d => d.id === desk.department_id);
            
            return (
              <div
                key={desk.id}
                className="absolute group"
                style={{
                  left: desk.position_x,
                  top: desk.position_y,
                  cursor: isAdmin ? 'move' : 'pointer',
                  transform: `rotate(${desk.rotation || 0}deg)`,
                  transformOrigin: 'center center'
                }}
                onMouseDown={(e) => handleMouseDown(e, desk)}
              >
                <Card 
                  className={`shadow-lg border-2 transition-all duration-200 hover:shadow-2xl hover:scale-105 hover:-translate-y-1 hover:border-yellow-300 ${
                    highlightedDeskId === desk.id 
                      ? 'border-yellow-400 animate-pulse ring-4 ring-yellow-300' 
                      : 'border-white'
                  }`}
                  style={{
                    backgroundColor: desk.color || '#3B82F6',
                    ...((() => {
                      const sizeMap = {
                        small_square: { width: '100px', height: '100px' },
                        medium_square: { width: '140px', height: '140px' },
                        large_square: { width: '180px', height: '180px' },
                        small_rectangle: { width: '160px', height: '100px' },
                        medium_rectangle: { width: '200px', height: '120px' },
                        large_rectangle: { width: '240px', height: '140px' },
                        small_round: { width: '100px', height: '100px', borderRadius: '50%' },
                        medium_round: { width: '140px', height: '140px', borderRadius: '50%' },
                        large_round: { width: '180px', height: '180px', borderRadius: '50%' }
                      };
                      return sizeMap[desk.desk_size] || sizeMap.medium_square;
                    })())
                  }}
                >
                  <div className="p-3 h-full flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-white truncate">{desk.name}</h3>
                        {dept && (
                          <Badge variant="secondary" className="text-[10px] mt-1 bg-white/20 text-white border-0">
                            {dept.name}
                          </Badge>
                        )}
                      </div>
                      
                      {isAdmin && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 bg-white/20 hover:bg-white/30 text-white"
                            onClick={async (e) => {
                              e.stopPropagation();
                              const newRotation = ((desk.rotation || 0) + 90) % 360;
                              await Desk.update(desk.id, { rotation: newRotation });
                              loadData();
                            }}
                            title="Girar 90°"
                          >
                            <RotateCw className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 bg-white/20 hover:bg-white/30 text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDesk(desk);
                              setShowEditModal(true);
                            }}
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 bg-white/20 hover:bg-red-500 text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeskToDelete(desk);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      {renderDeskPositions(desk)}
                    </div>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>

        {/* Minimap */}
        <div className="fixed bottom-4 right-2 md:right-4 z-50 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border p-2">
          <div className="text-xs font-semibold text-gray-500 mb-1 px-1">Visão Geral</div>
          <div 
            className="relative bg-gradient-to-br from-gray-100 to-gray-200 rounded"
            style={{
              width: '150px',
              height: '150px',
              backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
              backgroundSize: '10px 10px'
            }}
          >
            {/* Sector boundaries in minimap */}
            {selectedSector === "all" && Object.entries(sectorBoundaries).map(([sectorId, boundary]) => (
              <div
                key={`mini-boundary-${sectorId}`}
                className="absolute border rounded opacity-50"
                style={{
                  left: `${(boundary.minX / 2000) * 100}%`,
                  top: `${(boundary.minY / 2000) * 100}%`,
                  width: `${((boundary.maxX - boundary.minX) / 2000) * 100}%`,
                  height: `${((boundary.maxY - boundary.minY) / 2000) * 100}%`,
                  borderColor: boundary.sector?.color || '#94a3b8',
                  backgroundColor: `${boundary.sector?.color || '#94a3b8'}20`
                }}
              />
            ))}
            
            {/* Desks in minimap */}
            {searchResults.map(desk => (
              <div
                key={`mini-${desk.id}`}
                className="absolute rounded-sm cursor-pointer hover:ring-2 hover:ring-yellow-400 transition-all"
                style={{
                  left: `${(desk.position_x / 2000) * 100}%`,
                  top: `${(desk.position_y / 2000) * 100}%`,
                  width: '4px',
                  height: '4px',
                  backgroundColor: highlightedDeskId === desk.id ? '#facc15' : (desk.color || '#3B82F6')
                }}
                onClick={() => focusOnDesk(desk)}
                title={desk.name}
              />
            ))}
            
            {/* Viewport indicator */}
            <div
              className="absolute border-2 border-blue-600 bg-blue-600/20 pointer-events-none"
              style={{
                left: `${(-panOffset.x / zoom / 2000) * 100}%`,
                top: `${(-panOffset.y / zoom / 2000) * 100}%`,
                width: `${(window.innerWidth / zoom / 2000) * 100}%`,
                height: `${(window.innerHeight / zoom / 2000) * 100}%`
              }}
            />
          </div>
        </div>
      </div>

      {/* Search Results Panel */}
      {searchQuery && searchResults.length > 0 && (
        <div className="fixed top-52 md:top-56 left-2 md:left-4 z-50 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border p-3 max-w-xs max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700">
              Resultados ({searchResults.length})
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setSearchQuery("")}
            >
              ×
            </Button>
          </div>
          <div className="space-y-1">
            {searchResults.map(desk => {
              const employees = desk.positions
                ?.map(p => users.find(u => u.email === p.user_email))
                .filter(Boolean);
              
              return (
                <button
                  key={desk.id}
                  onClick={() => focusOnDesk(desk)}
                  className="w-full text-left p-2 rounded hover:bg-blue-50 transition-colors"
                >
                  <div className="font-medium text-sm text-gray-900">{desk.name}</div>
                  {employees && employees.length > 0 && (
                    <div className="text-xs text-gray-500 truncate">
                      {employees.map(e => getUserDisplayName(e)).join(', ')}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {searchResults.length === 0 && searchQuery && (
        <div className="fixed top-52 md:top-56 left-2 md:left-4 z-50 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border p-4 max-w-xs">
          <p className="text-sm text-gray-500 text-center">
            Nenhum resultado para "{searchQuery}"
          </p>
        </div>
      )}

      {filteredDesks.length === 0 && desks.length > 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-gray-400">
            <Building2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Nenhuma mesa neste setor</p>
            <p className="text-sm">Selecione outro setor ou adicione mesas aqui</p>
          </div>
        </div>
      )}

      {desks.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-gray-400 pointer-events-auto">
            <Grid3x3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Nenhuma mesa criada</p>
            {isAdmin && (
              <p className="text-sm">Clique em "Nova Mesa" para começar</p>
            )}
          </div>
        </div>
      )}

      <CreateDeskModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        users={users}
        departments={departments}
        sectors={sectors}
        onCreate={handleCreateDesk}
      />

      <SectorManager
        open={showSectorManager}
        onClose={() => setShowSectorManager(false)}
        sectors={sectors}
        onCreateSector={handleCreateSector}
        onUpdateSector={handleUpdateSector}
        onDeleteSector={handleDeleteSector}
      />

      {selectedDesk && (
        <EditDeskModal
          open={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedDesk(null);
          }}
          desk={selectedDesk}
          users={users}
          departments={departments}
          sectors={sectors}
          onUpdate={handleUpdateDesk}
        />
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Mesa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a mesa "{deskToDelete?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDesk}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}