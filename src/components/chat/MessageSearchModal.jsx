import React, { useState, useRef, useEffect } from "react";
import { Search, X, ChevronUp, ChevronDown, Filter } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { formatChatListTime } from "@/components/utils/dateUtils";

const FILTER_OPTIONS = {
  all: "Todas as mensagens",
  files: "Apenas anexos",
  links: "Apenas links"
};

export default function MessageSearchModal({
  open,
  onClose,
  conversation,
  onNavigateToMessage
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filterType, setFilterType] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const debounceRef = useRef(null);
  const resultsRef = useRef(null);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length === 0) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setCurrentPage(1);
    setSelectedIndex(0);

    debounceRef.current = setTimeout(async () => {
      try {
        const response = await base44.functions.invoke("searchMessages", {
          conversation_id: conversation?.id,
          query: query.trim(),
          page: 1,
          limit: 20,
          filter_type: filterType
        });

        setResults(response.data?.results || []);
        setTotalResults(response.data?.total || 0);
        setHasMore(response.data?.has_more || false);
      } catch (error) {
        console.error("Erro ao buscar mensagens:", error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, filterType, conversation?.id]);

  // Auto-scroll para resultado selecionado
  useEffect(() => {
    if (resultsRef.current && selectedIndex >= 0) {
      const resultElement = resultsRef.current.children[selectedIndex];
      if (resultElement) {
        resultElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [selectedIndex]);

  const handleKeyDown = (e) => {
    if (results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleNavigate(results[selectedIndex]);
      }
    }
  };

  const handleNavigate = (message) => {
    onNavigateToMessage(message.id);
    onClose();
  };

  const handleLoadMore = async () => {
    try {
      setIsLoading(true);
      const response = await base44.functions.invoke("searchMessages", {
        conversation_id: conversation?.id,
        query: query.trim(),
        page: currentPage + 1,
        limit: 20,
        filter_type: filterType
      });

      setResults([...results, ...(response.data?.results || [])]);
      setCurrentPage(currentPage + 1);
      setHasMore(response.data?.has_more || false);
    } catch (error) {
      console.error("Erro ao carregar mais resultados:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr) => formatChatListTime(dateStr);

  const renderHighlightedContent = (message) => {
    if (!message.content) return null;

    const content = message.content;
    const indices = message.highlight_indices || [];

    if (indices.length === 0) {
      return <span className="line-clamp-2">{content}</span>;
    }

    const parts = [];
    let lastEnd = 0;

    indices.forEach((range, idx) => {
      if (range.start > lastEnd) {
        parts.push(
          <span key={`text-${idx}`} className="line-clamp-2">
            {content.substring(lastEnd, range.start)}
          </span>
        );
      }
      parts.push(
        <span key={`highlight-${idx}`} className="bg-yellow-300 font-semibold">
          {content.substring(range.start, range.end)}
        </span>
      );
      lastEnd = range.end;
    });

    if (lastEnd < content.length) {
      parts.push(
        <span key="text-end" className="line-clamp-2">
          {content.substring(lastEnd)}
        </span>
      );
    }

    return <>{parts}</>;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-2xl flex flex-col max-h-[80vh] p-0">
        <DialogHeader className="px-4 md:px-6 py-3 border-b border-border">
          <DialogTitle className="text-lg">Buscar mensagens</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Search input */}
          <div className="px-4 md:px-6 py-3 border-b border-border space-y-2 shrink-0">
            <div className="relative flex items-center gap-2">
              <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Digite para buscar..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-9 pr-9"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-3 p-1 hover:bg-accent rounded"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Filter className="w-3 h-3" />
                    {FILTER_OPTIONS[filterType]}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  {Object.entries(FILTER_OPTIONS).map(([key, label]) => (
                    <DropdownMenuItem
                      key={key}
                      onClick={() => {
                        setFilterType(key);
                        setCurrentPage(1);
                      }}
                      className={filterType === key ? "bg-accent" : ""}
                    >
                      {label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {totalResults > 0 && (
                <span className="text-xs text-muted-foreground">
                  {results.length} de {totalResults} resultados
                </span>
              )}
            </div>
          </div>

          {/* Results list */}
          <div className="flex-1 overflow-y-auto">
            {isLoading && query.trim().length > 0 && results.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                <p className="text-sm">Buscando...</p>
              </div>
            )}

            {query.trim().length > 0 && results.length === 0 && !isLoading && (
              <div className="p-8 text-center text-muted-foreground">
                <p className="text-sm">Nenhuma mensagem encontrada</p>
              </div>
            )}

            {query.trim().length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Digite para buscar mensagens</p>
              </div>
            )}

            {results.length > 0 && (
              <div ref={resultsRef} className="space-y-1">
                {results.map((message, idx) => (
                  <button
                    key={message.id}
                    onClick={() => handleNavigate(message)}
                    className={`w-full text-left p-3 md:p-4 hover:bg-accent transition-colors border-l-2 ${
                      selectedIndex === idx
                        ? "bg-accent border-l-primary"
                        : "border-l-transparent"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-muted-foreground mb-1">
                          {message.sender_name || message.sender_email}
                        </div>
                        <p className="text-sm text-foreground break-words">
                          {renderHighlightedContent(message)}
                        </p>
                        {message.type === "file" || message.type === "image" && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            📎 {message.file_name}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap ml-2">
                        {formatDate(message.created_date)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Load more button */}
          {results.length > 0 && hasMore && (
            <div className="px-4 md:px-6 py-2 border-t border-border text-center shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLoadMore}
                disabled={isLoading}
                className="text-xs"
              >
                {isLoading ? "Carregando..." : "Carregar mais resultados"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}