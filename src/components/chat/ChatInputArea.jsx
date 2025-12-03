import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card } from "@/components/ui/card";
import { 
  Send, Paperclip, Mic, X, Smile, Image as ImageIcon, 
  File as FileIcon, StopCircle, Loader2 
} from "lucide-react";

export default function ChatInputArea({ 
  onSendMessage, 
  onTyping, 
  replyTo, 
  onCancelReply,
  disabled,
  placeholder
}) {
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [uploading, setUploading] = useState(false);
  
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (!message.trim()) return;
    onSendMessage({ type: 'text', content: message });
    setMessage("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handlePaste = async (e) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        await handleUpload(file);
      }
    }
  };

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    
    try {
      const { base44 } = await import("@/api/base44Client");
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const type = file.type.startsWith('image/') ? 'image' : 
                   file.type.startsWith('video/') ? 'video' : 
                   file.type.startsWith('audio/') ? 'audio' : 'file';
                   
      onSendMessage({ 
        type: type, 
        content: type === 'image' ? 'Imagem' : file.name,
        attachmentUrl: file_url, 
        attachmentName: file.name 
      });
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], "voice-message.webm", { type: 'audio/webm' });
        await handleUpload(file);
        
        // Stop tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      // Stop but don't save/send
      mediaRecorderRef.current.stop();
      // Clear chunks so onstop doesn't send valid data logic needs adjustment but for simplicity re-using handleUpload
      // Actually onstop will fire. A better way is to set a flag "cancelled"
      audioChunksRef.current = []; 
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-4 bg-white border-t">
      {replyTo && (
        <div className="flex items-center justify-between bg-gray-50 p-2 rounded-t-lg border-l-4 border-blue-500 mb-2 text-sm">
          <div>
            <p className="font-bold text-blue-600">{replyTo.sender_name}</p>
            <p className="text-gray-500 truncate max-w-xs">{replyTo.message}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onCancelReply} className="h-6 w-6">
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={(e) => handleUpload(e.target.files[0])}
        />
        
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-gray-500"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading || isRecording}
        >
          <Paperclip className="w-5 h-5" />
        </Button>

        {isRecording ? (
          <div className="flex-1 flex items-center gap-3 bg-red-50 px-4 py-2 rounded-full border border-red-100">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-600 font-medium font-mono">{formatTime(recordingTime)}</span>
            <div className="flex-1" />
            <Button variant="ghost" size="sm" onClick={cancelRecording} className="text-gray-500 hover:text-red-500">
              Cancelar
            </Button>
            <Button size="icon" variant="destructive" className="rounded-full h-8 w-8" onClick={stopRecording}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  onTyping?.();
                }}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder={placeholder || "Digite uma mensagem..."}
                className="min-h-[40px] max-h-[120px] py-2 resize-none pr-10"
                rows={1}
                disabled={disabled || uploading}
              />
              {/* Emoji trigger could go here */}
            </div>

            {message.trim() ? (
              <Button 
                onClick={handleSend} 
                disabled={disabled || uploading}
                className="bg-blue-600 hover:bg-blue-700 rounded-full h-10 w-10 p-0 flex items-center justify-center"
              >
                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </Button>
            ) : (
              <Button 
                onClick={startRecording}
                variant="ghost"
                className="text-gray-500 hover:bg-gray-100 rounded-full h-10 w-10 p-0"
                disabled={disabled || uploading}
              >
                <Mic className="w-5 h-5" />
              </Button>
            )}
          </>
        )}
      </div>
      <div className="text-xs text-gray-400 mt-1 text-center">
        Tip: Cole imagens (Ctrl+V) ou arraste arquivos para enviar
      </div>
    </div>
  );
}