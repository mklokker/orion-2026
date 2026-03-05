import React from "react";

/**
 * MentionRenderer component
 * Renderiza menções (@Email ou @Nome) com highlight
 */
export default function MentionRenderer({ content, mentions = [], users = [] }) {
  if (!content || !mentions || mentions.length === 0) {
    return <span>{content}</span>;
  }

  // Criar mapa de email -> nome para renderização
  const mentionMap = {};
  mentions.forEach(email => {
    const user = users.find(u => u.email === email);
    if (user) {
      mentionMap[email] = user.display_name || user.full_name || email.split("@")[0];
    } else {
      mentionMap[email] = email.split("@")[0];
    }
  });

  // Padrão regex para capturar @Email ou @Nome
  // Procura por @word (onde word é caracteres alphanumerais, _, -, .)
  const mentionPattern = /@[\w.-]+/g;
  const parts = content.split(mentionPattern);
  const mentionMatches = content.match(mentionPattern) || [];

  const result = [];
  let mentionIndex = 0;

  parts.forEach((part, idx) => {
    if (part) {
      result.push(
        <span key={`text-${idx}`}>{part}</span>
      );
    }

    if (mentionIndex < mentionMatches.length) {
      const mention = mentionMatches[mentionIndex];
      const email = mention.substring(1); // Remove @
      const isMention = mentions.includes(email);

      if (isMention) {
        const displayName = mentionMap[email];
        result.push(
          <span
            key={`mention-${mentionIndex}`}
            className="bg-blue-200 text-blue-900 px-1 rounded font-semibold cursor-pointer hover:bg-blue-300 transition-colors"
            title={email}
          >
            @{displayName}
          </span>
        );
      } else {
        result.push(
          <span key={`mention-${mentionIndex}`}>{mention}</span>
        );
      }

      mentionIndex++;
    }
  });

  return <>{result}</>;
}