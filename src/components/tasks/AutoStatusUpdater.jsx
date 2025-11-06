import { useEffect } from "react";
import { Task } from "@/entities/Task";
import { Department } from "@/entities/Department";

export default function AutoStatusUpdater() {
  useEffect(() => {
    const checkAndUpdateTaskStatuses = async () => {
      try {
        // Get all tasks that are "Em Execução"
        const tasksInProgress = await Task.filter({ status: "Em Execução" });
        const departments = await Department.list();
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (const task of tasksInProgress) {
          const department = departments.find(d => d.id === task.department_id);
          
          if (department && department.days_before_overdue > 0) {
            const endDate = new Date(task.end_date);
            endDate.setHours(0, 0, 0, 0);
            
            const daysUntilDue = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
            
            // Se faltam menos ou igual dias configurados, marcar como atrasada
            if (daysUntilDue <= department.days_before_overdue) {
              await Task.update(task.id, { status: "Atrasada" });
            }
          }
        }
      } catch (error) {
        console.error("Erro ao atualizar status das tarefas:", error);
      }
    };

    // Executar imediatamente ao montar
    checkAndUpdateTaskStatuses();

    // Executar a cada 5 minutos
    const interval = setInterval(checkAndUpdateTaskStatuses, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return null;
}