import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { 
  Send, 
  Paperclip, 
  X, 
  Image as ImageIcon,
  FileText,
  Smile,
  AlertCircle
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/components/ui/use-toast";

// Lista expandida de emojis organizados por categoria
const EMOJI_CATEGORIES = {
  "Mais usados": ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥", "🎉", "👏", "💯", "✅", "👎"],
  "Rostos": ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙", "🥲", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🤧", "🥵", "🥶", "🥴", "😵", "🤯", "🤠", "🥳", "🥸", "😎", "🤓", "🧐", "😕", "😟", "🙁", "☹️", "😮", "😯", "😲", "😳", "🥺", "😦", "😧", "😨", "😰", "😥", "😢", "😭", "😱", "😖", "😣", "😞", "😓", "😩", "😫", "🥱", "😤", "😡", "😠", "🤬", "😈", "👿", "💀", "☠️", "💩", "🤡", "👹", "👺", "👻", "👽", "👾", "🤖"],
  "Gestos": ["👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✍️", "💪", "🦾", "🦿", "🦵", "🦶", "👂", "🦻", "👃", "🧠", "🫀", "🫁", "🦷", "🦴", "👀", "👁️", "👅", "👄"],
  "Pessoas": ["👶", "🧒", "👦", "👧", "🧑", "👱", "👨", "🧔", "👩", "🧓", "👴", "👵", "🙍", "🙎", "🙅", "🙆", "💁", "🙋", "🧏", "🙇", "🤦", "🤷", "👮", "🕵️", "💂", "🥷", "👷", "🤴", "👸", "👳", "👲", "🧕", "🤵", "👰", "🤰", "🤱", "👼", "🎅", "🤶", "🦸", "🦹", "🧙", "🧚", "🧛", "🧜", "🧝", "🧞", "🧟", "💆", "💇", "🚶", "🧍", "🧎", "🏃", "💃", "🕺", "🕴️", "👯", "🧖", "🧗", "🤸", "🏌️", "🏇", "⛷️", "🏂", "🏋️", "🤼", "🤽", "🤾", "🤺", "⛹️", "🏊", "🚣", "🧘", "🛀", "🛌"],
  "Amor": ["💋", "💌", "💘", "💝", "💖", "💗", "💓", "💞", "💕", "💟", "❣️", "💔", "❤️‍🔥", "❤️‍🩹", "❤️", "🧡", "💛", "💚", "💙", "💜", "🤎", "🖤", "🤍", "💯", "💢", "💥", "💫", "💦", "💨", "🕳️", "💣", "💬", "👁️‍🗨️", "🗨️", "🗯️", "💭", "💤"],
  "Animais": ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐻‍❄️", "🐨", "🐯", "🦁", "🐮", "🐷", "🐽", "🐸", "🐵", "🙈", "🙉", "🙊", "🐒", "🐔", "🐧", "🐦", "🐤", "🐣", "🐥", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🪱", "🐛", "🦋", "🐌", "🐞", "🐜", "🪰", "🪲", "🪳", "🦟", "🦗", "🕷️", "🕸️", "🦂", "🐢", "🐍", "🦎", "🦖", "🦕", "🐙", "🦑", "🦐", "🦞", "🦀", "🐡", "🐠", "🐟", "🐬", "🐳", "🐋", "🦈", "🐊", "🐅", "🐆", "🦓", "🦍", "🦧", "🦣", "🐘", "🦛", "🦏", "🐪", "🐫", "🦒", "🦘", "🦬", "🐃", "🐂", "🐄", "🐎", "🐖", "🐏", "🐑", "🦙", "🐐", "🦌", "🐕", "🐩", "🦮", "🐕‍🦺", "🐈", "🐈‍⬛", "🪶", "🐓", "🦃", "🦤", "🦚", "🦜", "🦢", "🦩", "🕊️", "🐇", "🦝", "🦨", "🦡", "🦫", "🦦", "🦥", "🐁", "🐀", "🐿️", "🦔"],
  "Comida": ["🍏", "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🍆", "🥑", "🥦", "🥬", "🥒", "🌶️", "🫑", "🌽", "🥕", "🫒", "🧄", "🧅", "🥔", "🍠", "🥐", "🥯", "🍞", "🥖", "🥨", "🧀", "🥚", "🍳", "🧈", "🥞", "🧇", "🥓", "🥩", "🍗", "🍖", "🦴", "🌭", "🍔", "🍟", "🍕", "🫓", "🥪", "🥙", "🧆", "🌮", "🌯", "🫔", "🥗", "🥘", "🫕", "🥫", "🍝", "🍜", "🍲", "🍛", "🍣", "🍱", "🥟", "🦪", "🍤", "🍙", "🍚", "🍘", "🍥", "🥠", "🥮", "🍢", "🍡", "🍧", "🍨", "🍦", "🥧", "🧁", "🍰", "🎂", "🍮", "🍭", "🍬", "🍫", "🍿", "🍩", "🍪", "🌰", "🥜", "🍯", "🥛", "🍼", "🫖", "☕", "🍵", "🧃", "🥤", "🧋", "🍶", "🍺", "🍻", "🥂", "🍷", "🥃", "🍸", "🍹", "🧉", "🍾", "🧊", "🥄", "🍴", "🍽️", "🥣", "🥡", "🥢", "🧂"],
  "Objetos": ["⌚", "📱", "📲", "💻", "⌨️", "🖥️", "🖨️", "🖱️", "🖲️", "🕹️", "🗜️", "💽", "💾", "💿", "📀", "📼", "📷", "📸", "📹", "🎥", "📽️", "🎞️", "📞", "☎️", "📟", "📠", "📺", "📻", "🎙️", "🎚️", "🎛️", "🧭", "⏱️", "⏲️", "⏰", "🕰️", "⌛", "⏳", "📡", "🔋", "🔌", "💡", "🔦", "🕯️", "🪔", "🧯", "🛢️", "💸", "💵", "💴", "💶", "💷", "🪙", "💰", "💳", "💎", "⚖️", "🪜", "🧰", "🪛", "🔧", "🔨", "⚒️", "🛠️", "⛏️", "🪚", "🔩", "⚙️", "🪤", "🧱", "⛓️", "🧲", "🔫", "💣", "🧨", "🪓", "🔪", "🗡️", "⚔️", "🛡️", "🚬", "⚰️", "🪦", "⚱️", "🏺", "🔮", "📿", "🧿", "💈", "⚗️", "🔭", "🔬", "🕳️", "🩹", "🩺", "💊", "💉", "🩸", "🧬", "🦠", "🧫", "🧪", "🌡️", "🧹", "🪠", "🧺", "🧻", "🚽", "🚰", "🚿", "🛁", "🛀", "🧼", "🪥", "🪒", "🧽", "🪣", "🧴", "🛎️", "🔑", "🗝️", "🚪", "🪑", "🛋️", "🛏️", "🛌", "🧸", "🪆", "🖼️", "🪞", "🪟", "🛍️", "🛒", "🎁", "🎈", "🎏", "🎀", "🪄", "🪅", "🎊", "🎉", "🎎", "🏮", "🎐", "🧧", "✉️", "📩", "📨", "📧", "💌", "📥", "📤", "📦", "🏷️", "🪧", "📪", "📫", "📬", "📭", "📮", "📯", "📜", "📃", "📄", "📑", "🧾", "📊", "📈", "📉", "🗒️", "🗓️", "📆", "📅", "🗑️", "📇", "🗃️", "🗳️", "🗄️", "📋", "📁", "📂", "🗂️", "🗞️", "📰", "📓", "📔", "📒", "📕", "📗", "📘", "📙", "📚", "📖", "🔖", "🧷", "🔗", "📎", "🖇️", "📐", "📏", "🧮", "📌", "📍", "✂️", "🖊️", "🖋️", "✒️", "🖌️", "🖍️", "📝", "✏️", "🔍", "🔎", "🔏", "🔐", "🔒", "🔓"],
  "Símbolos": ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "☮️", "✝️", "☪️", "🕉️", "☸️", "✡️", "🔯", "🕎", "☯️", "☦️", "🛐", "⛎", "♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓", "🆔", "⚛️", "🉑", "☢️", "☣️", "📴", "📳", "🈶", "🈚", "🈸", "🈺", "🈷️", "✴️", "🆚", "💮", "🉐", "㊙️", "㊗️", "🈴", "🈵", "🈹", "🈲", "🅰️", "🅱️", "🆎", "🆑", "🅾️", "🆘", "❌", "⭕", "🛑", "⛔", "📛", "🚫", "💯", "💢", "♨️", "🚷", "🚯", "🚳", "🚱", "🔞", "📵", "🚭", "❗", "❕", "❓", "❔", "‼️", "⁉️", "🔅", "🔆", "〽️", "⚠️", "🚸", "🔱", "⚜️", "🔰", "♻️", "✅", "🈯", "💹", "❇️", "✳️", "❎", "🌐", "💠", "Ⓜ️", "🌀", "💤", "🏧", "🚾", "♿", "🅿️", "🛗", "🈳", "🈂️", "🛂", "🛃", "🛄", "🛅", "🚹", "🚺", "🚼", "⚧️", "🚻", "🚮", "🎦", "📶", "🈁", "🔣", "ℹ️", "🔤", "🔡", "🔠", "🆖", "🆗", "🆙", "🆒", "🆕", "🆓", "0️⃣", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟", "🔢", "#️⃣", "*️⃣", "⏏️", "▶️", "⏸️", "⏯️", "⏹️", "⏺️", "⏭️", "⏮️", "⏩", "⏪", "⏫", "⏬", "◀️", "🔼", "🔽", "➡️", "⬅️", "⬆️", "⬇️", "↗️", "↘️", "↙️", "↖️", "↕️", "↔️", "↪️", "↩️", "⤴️", "⤵️", "🔀", "🔁", "🔂", "🔄", "🔃", "🎵", "🎶", "➕", "➖", "➗", "✖️", "🟰", "♾️", "💲", "💱", "™️", "©️", "®️", "〰️", "➰", "➿", "🔚", "🔙", "🔛", "🔝", "🔜", "✔️", "☑️", "🔘", "🔴", "🟠", "🟡", "🟢", "🔵", "🟣", "⚫", "⚪", "🟤", "🔺", "🔻", "🔸", "🔹", "🔶", "🔷", "🔳", "🔲", "▪️", "▫️", "◾", "◽", "◼️", "◻️", "🟥", "🟧", "🟨", "🟩", "🟦", "🟪", "⬛", "⬜", "🟫", "🔈", "🔇", "🔉", "🔊", "🔔", "🔕", "📣", "📢", "👁️‍🗨️", "💬", "💭", "🗯️", "♠️", "♣️", "♥️", "♦️", "🃏", "🎴", "🀄", "🕐", "🕑", "🕒", "🕓", "🕔", "🕕", "🕖", "🕗", "🕘", "🕙", "🕚", "🕛", "🕜", "🕝", "🕞", "🕟", "🕠", "🕡", "🕢", "🕣", "🕤", "🕥", "🕦", "🕧"]
};
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const MAX_FILE_SIZE_LABEL = "25MB";

export default function ChatInput({
  onSend,
  onTyping,
  replyingTo,
  onCancelReply,
  disabled
}) {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUploadFile, setCurrentUploadFile] = useState("");
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const validateFileSize = (file) => {
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "Arquivo muito grande",
        description: `O arquivo "${file.name}" excede o limite de ${MAX_FILE_SIZE_LABEL}. Tamanho: ${(file.size / 1024 / 1024).toFixed(1)}MB`,
        variant: "destructive"
      });
      return false;
    }
    return true;
  };

  const handleSend = async () => {
    if ((!message.trim() && files.length === 0) || uploading) return;

    setUploading(true);
    setUploadProgress(0);
    
    try {
      // Upload files first with progress tracking
      const uploadedFiles = [];
      const totalFiles = files.length;
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setCurrentUploadFile(file.file.name);
        
        // Simulate progress for each file (since we can't get real progress from the API)
        const baseProgress = (i / totalFiles) * 100;
        const fileProgress = 100 / totalFiles;
        
        // Start progress animation
        setUploadProgress(baseProgress + fileProgress * 0.1);
        
        const { file_url } = await base44.integrations.Core.UploadFile({ file: file.file });
        
        // Complete this file's progress
        setUploadProgress(baseProgress + fileProgress);
        
        uploadedFiles.push({
          url: file_url,
          name: file.file.name,
          type: file.file.type,
          size: file.file.size,
          isImage: file.file.type.startsWith("image/")
        });
      }

      setUploadProgress(100);

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
      toast({
        title: "Erro ao enviar arquivo",
        description: "Ocorreu um erro ao fazer upload. Tente novamente.",
        variant: "destructive"
      });
    }
    
    setUploading(false);
    setUploadProgress(0);
    setCurrentUploadFile("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    const validFiles = selectedFiles.filter(validateFileSize);
    const newFiles = validFiles.map(file => ({
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
        if (file && validateFileSize(file)) {
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
  const isSendingRef = useRef(false);

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
    const validFiles = droppedFiles.filter(validateFileSize);
    const newFiles = validFiles.map(file => ({
      file,
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : null
    }));

    if (newFiles.length > 0) {
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  return (
    <div 
      className={`border-t border-border bg-card p-2 md:p-3 transition-colors ${isDragging ? "bg-blue-50 border-blue-300 border-2 border-dashed" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Upload progress */}
      {uploading && files.length > 0 && (
        <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-700">
              Enviando arquivo...
            </span>
            <span className="text-xs text-blue-600">{Math.round(uploadProgress)}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
          {currentUploadFile && (
            <p className="text-xs text-blue-600 mt-1 truncate">{currentUploadFile}</p>
          )}
        </div>
      )}

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
      <div className="flex items-end gap-1 md:gap-2">
        {/* Emoji picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0 h-10 w-10" disabled={disabled}>
              <Smile className="w-5 h-5 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 md:w-80 p-0" side="top" align="start">
            <div className="max-h-72 overflow-y-auto">
              {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
                <div key={category} className="p-2">
                  <p className="text-xs font-semibold text-muted-foreground mb-1 sticky top-0 bg-popover">{category}</p>
                  <div className="flex flex-wrap gap-0.5">
                    {emojis.map((emoji, i) => (
                      <button
                        key={`${category}-${i}`}
                        onClick={() => addEmoji(emoji)}
                        className="text-xl hover:bg-accent rounded p-1 w-8 h-8 flex items-center justify-center"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Attachment */}
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 h-10 w-10"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
        >
          <Paperclip className="w-5 h-5 text-muted-foreground" />
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
          className="min-h-[44px] max-h-32 resize-none flex-1 text-base md:text-sm"
          rows={1}
        />

        {/* Send button */}
        <Button
          onClick={handleSend}
          disabled={disabled || uploading || (!message.trim() && files.length === 0)}
          className="shrink-0 bg-green-500 hover:bg-green-600 h-10 w-10"
          size="icon"
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