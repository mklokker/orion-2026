import { useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * Hook para mutações otimistas com react-query
 * @param {Object} options
 * @param {string[]} options.queryKey - A chave da query a ser atualizada
 * @param {Function} options.mutationFn - A função de mutação assíncrona
 * @param {Function} options.optimisticUpdate - Função que retorna os dados otimistas (recebe dados atuais e variáveis)
 * @param {Function} options.onSuccess - Callback de sucesso opcional
 * @param {Function} options.onError - Callback de erro opcional
 */
export function useOptimisticMutation({
  queryKey,
  mutationFn,
  optimisticUpdate,
  onSuccess,
  onError,
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onMutate: async (variables) => {
      // Cancelar queries em andamento para evitar overwrites
      await queryClient.cancelQueries({ queryKey });

      // Snapshot do valor anterior
      const previousData = queryClient.getQueryData(queryKey);

      // Atualizar otimisticamente
      if (optimisticUpdate && previousData) {
        queryClient.setQueryData(queryKey, (old) => 
          optimisticUpdate(old, variables)
        );
      }

      // Retornar contexto com dados anteriores
      return { previousData };
    },
    onError: (err, variables, context) => {
      // Reverter para dados anteriores em caso de erro
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      onError?.(err, variables, context);
    },
    onSuccess: (data, variables, context) => {
      onSuccess?.(data, variables, context);
    },
    onSettled: () => {
      // Invalidar para garantir sincronização com servidor
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

/**
 * Hook específico para atualização otimista de status de tarefas
 */
export function useTaskStatusMutation(updateFn) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateFn,
    onMutate: async ({ taskId, newStatus }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      
      const previousTasks = queryClient.getQueryData(['tasks']);
      
      queryClient.setQueryData(['tasks'], (old) => {
        if (!old) return old;
        return old.map(task => 
          task.id === taskId 
            ? { ...task, status: newStatus }
            : task
        );
      });

      return { previousTasks };
    },
    onError: (err, variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks'], context.previousTasks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

/**
 * Hook específico para envio otimista de mensagens de chat
 */
export function useChatMessageMutation(sendFn) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sendFn,
    onMutate: async ({ conversationId, message }) => {
      const queryKey = ['chatMessages', conversationId];
      await queryClient.cancelQueries({ queryKey });
      
      const previousMessages = queryClient.getQueryData(queryKey);
      
      // Adicionar mensagem temporária com ID único
      const tempMessage = {
        ...message,
        id: `temp-${Date.now()}`,
        status: 'sending',
        created_date: new Date().toISOString(),
      };

      queryClient.setQueryData(queryKey, (old) => {
        if (!old) return [tempMessage];
        return [...old, tempMessage];
      });

      return { previousMessages, tempId: tempMessage.id };
    },
    onError: (err, variables, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(
          ['chatMessages', variables.conversationId], 
          context.previousMessages
        );
      }
    },
    onSuccess: (data, variables, context) => {
      // Substituir mensagem temporária pela real
      queryClient.setQueryData(
        ['chatMessages', variables.conversationId],
        (old) => {
          if (!old) return [data];
          return old.map(msg => 
            msg.id === context?.tempId ? data : msg
          );
        }
      );
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['chatMessages', variables.conversationId] 
      });
    },
  });
}