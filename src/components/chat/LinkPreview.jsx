import React, { useState, useEffect } from "react";
import { ExternalLink, Globe } from "lucide-react";

// Extrai domínio de uma URL
const getDomain = (url) => {
  try {
    const domain = new URL(url).hostname.replace("www.", "");
    return domain;
  } catch {
    return url;
  }
};

// Tenta obter favicon do site
const getFaviconUrl = (url) => {
  try {
    const domain = new URL(url).origin;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return null;
  }
};

export default function LinkPreview({ url, isOwn }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Simples preview baseado na URL
    const domain = getDomain(url);
    const favicon = getFaviconUrl(url);
    
    // Define um preview básico
    setPreview({
      url,
      domain,
      favicon,
      title: domain,
      description: url
    });
    setLoading(false);
  }, [url]);

  if (loading) {
    return (
      <div className={`mt-2 p-3 rounded-lg border animate-pulse ${isOwn ? "bg-green-600/20 border-green-400/30" : "bg-gray-100 border-gray-200"}`}>
        <div className="h-4 bg-gray-300 rounded w-3/4 mb-2" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
      </div>
    );
  }

  if (error || !preview) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`block mt-2 p-3 rounded-lg border transition-all hover:shadow-md ${
        isOwn 
          ? "bg-green-600/20 border-green-400/30 hover:bg-green-600/30" 
          : "bg-gray-50 border-gray-200 hover:bg-gray-100"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Favicon ou ícone */}
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isOwn ? "bg-green-500/30" : "bg-gray-200"
        }`}>
          {preview.favicon ? (
            <img 
              src={preview.favicon} 
              alt="" 
              className="w-5 h-5"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
          ) : null}
          <Globe className={`w-5 h-5 ${preview.favicon ? 'hidden' : ''} ${isOwn ? "text-green-200" : "text-gray-500"}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-medium ${isOwn ? "text-green-200" : "text-gray-500"}`}>
              {preview.domain}
            </span>
            <ExternalLink className={`w-3 h-3 ${isOwn ? "text-green-200" : "text-gray-400"}`} />
          </div>
          <p className={`text-sm font-medium truncate ${isOwn ? "text-white" : "text-gray-900"}`}>
            {preview.title}
          </p>
          <p className={`text-xs truncate mt-0.5 ${isOwn ? "text-green-100/80" : "text-gray-500"}`}>
            {preview.description}
          </p>
        </div>
      </div>
    </a>
  );
}