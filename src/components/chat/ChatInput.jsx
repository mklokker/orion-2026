import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Send, 
  Paperclip, 
  X, 
  Image as ImageIcon,
  FileText,
  Smile
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const EMOJI_LIST = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥", "🎉", "👏", "💯"];

export default function ChatInput({
  onSend,
  onTyping,
  replyingTo,
  onCancelReply,
  disabled
}) {
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const handleSend = async () => {
    if ((!message.trim() && files.length === 0) || uploading) return;

    setUploading(true);
    
    try {
      // Upload files first
      const uploadedFiles = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: file.file });
        uploadedFiles.push({
          url: file_url,
          name: file.file.name,
          type: file.file.type,
          size: file.file.size,
          isImage: file.file.type.startsWith("image/")
        });
      }

      // Send message(s)
      if (uploadedFiles.length > 0) {
        for (const f of uploadedFiles) {
          await onSend({
            content: f === uploadedFiles[uploadedFiles.length - 1] ? message.trim() : "",
            type: f.isImage ? "image" : "file",
            file_url: f.url,
            file_name: f.name,
            file_type: f.type,
            file_size: f.size
          });
        }
      } else {
        await onSend({ content: message.trim(), type: "text" });
      }

      setMessage("");
      setFiles([]);
      onCancelReply?.();
    } catch (error) {
      console.error("Erro ao enviar:", error);
    }
    
    setUploading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    const newFiles = selectedFiles.map(file => ({
      file,
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : null
    }));
    setFiles(prev => [...prev, ...newFiles]);
    e.target.value = "";
  };

  const removeFile = (index) => {
    setFiles(prev => {
      const updated = [...prev];
      if (updated[index].preview) URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleChange = (e) => {
    setMessage(e.target.value);
    onTyping?.();
  };

  const addEmoji = (emoji) => {
    setMessage(prev => prev + emoji);
    textareaRef.current?.focus();
  };

  // Handle paste (Ctrl+V) for files/images
  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const pastedFiles = [];
    for (const item of items) {
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) {
          pastedFiles.push({
            file,
            preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : null
          });
        }
      }
    }

    if (pastedFiles.length > 0) {
      e.preventDefault();
      setFiles(prev => [...prev, ...pastedFiles]);
    }
  };

  // Handle drag and drop
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer?.files || []);
    const newFiles = droppedFiles.map(file => ({
      file,
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : null
    }));

    if (newFiles.length > 0) {
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  return (
    <div 
      className={`border-t bg-white p-3 transition-colors ${isDragging ? "bg-blue-50 border-blue-300 border-2 border-dashed" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Reply preview */}
      {replyingTo && (
        <div className="flex items-center gap-2 mb-2 p-2 bg-gray-100 rounded-lg">
          <div className="w-1 h-10 bg-green-500 rounded-full" />
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold text-green-600">{replyingTo.sender_name}</span>
            <p className="text-sm text-gray-600 truncate">{replyingTo.content}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCancelReply}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* File previews */}
      {files.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {files.map((f, i) => (
            <div key={i} className="relative group">
              {f.preview ? (
                <img src={f.preview} alt="" className="w-16 h-16 object-cover rounded-lg" />
              ) : (
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-gray-400" />
                </div>
              )}
              <button
                onClick={() => removeFile(i)}
                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
              <span className="absolute bottom-0 left-0 right-0 text-[10px] text-center bg-black/50 text-white rounded-b-lg truncate px-1">
                {f.file.name}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2">
        {/* Emoji picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0" disabled={disabled}>
              <Smile className="w-5 h-5 text-gray-500" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" side="top">
            <div className="flex gap-1">
              {EMOJI_LIST.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => addEmoji(emoji)}
                  className="text-xl hover:bg-gray-100 rounded p-1"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Attachment */}
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
        >
          <Paperclip className="w-5 h-5 text-gray-500" />
        </Button>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          multiple
          onChange={handleFileSelect}
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
        />

        {/* Text input */}
        <Textarea
          ref={textareaRef}
          placeholder={isDragging ? "Solte o arquivo aqui..." : "Digite uma mensagem..."}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          disabled={disabled || uploading}
          className="min-h-[44px] max-h-32 resize-none flex-1"
          rows={1}
        />

        {/* Send button */}
        <Button
          onClick={handleSend}
          disabled={disabled || uploading || (!message.trim() && files.length === 0)}
          className="shrink-0 bg-green-500 hover:bg-green-600"
        >
          {uploading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </Button>
      </div>
    </div>
  );
}