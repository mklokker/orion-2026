import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

export default function TypingIndicator({ typingUsers, users }) {
  if (!typingUsers || typingUsers.length === 0) return null;

  const typingUsersList = typingUsers.map(email => {
    const user = users?.find(u => u.email === email);
    return {
      email,
      name: user?.display_name || user?.full_name || email.split("@")[0],
      avatar: user?.profile_picture
    };
  });

  const displayText = typingUsersList.length === 1
    ? `${typingUsersList[0].name} está digitando`
    : typingUsersList.length === 2
      ? `${typingUsersList[0].name} e ${typingUsersList[1].name} estão digitando`
      : `${typingUsersList[0].name} e mais ${typingUsersList.length - 1} estão digitando`;

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg mx-4 mb-2 animate-in slide-in-from-bottom-2 duration-300">
      {/* Avatars */}
      <div className="flex -space-x-2">
        {typingUsersList.slice(0, 3).map((user, idx) => (
          <Avatar key={user.email} className="w-8 h-8 border-2 border-white shadow-sm">
            <AvatarImage src={user.avatar} />
            <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>

      {/* Typing animation */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">{displayText}</span>
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}