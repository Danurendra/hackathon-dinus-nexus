'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { 
  Send, 
  Paperclip, 
  Mic, 
  X,
  FileText,
  MapPin,
  Smartphone
} from 'lucide-react';

interface ChatInputProps {
  onSubmit: (message: string, attachments?: File[], context?: { worker: 'it_helpdesk'; location?: string; deviceType?: string }) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSubmit, isLoading = false, placeholder = "Ketik pesan atau deskripsi insiden..." }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [location, setLocation] = useState('');
  const [deviceType, setDeviceType] = useState('');
  const [worker, setWorker] = useState<'it_helpdesk'>('it_helpdesk');
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() || attachments.length > 0) {
      onSubmit(message, attachments, {
        worker,
        location: location.trim() || undefined,
        deviceType: deviceType.trim() || undefined,
      });
      setMessage('');
      setAttachments([]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachments(prev => [...prev, ...newFiles]);
      // If text or log file, read and append its content to the message
      newFiles.forEach(file => {
        if (file.name.endsWith('.txt') || file.name.endsWith('.log') || file.name.endsWith('.csv')) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const text = event.target?.result as string;
            if (text) {
              setMessage(prev => prev ? `${prev}\n\n[Isi ${file.name}]:\n${text}` : `[Isi ${file.name}]:\n${text}`);
            }
          };
          reader.readAsText(file);
        }
      });
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleVoiceRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Perekaman suara via Web Speech API tidak didukung di browser ini.');
      return;
    }

    if (!isRecording) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'id-ID';
        recognition.interimResults = false;
        recognition.onstart = () => setIsRecording(true);
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            setMessage(prev => prev ? `${prev} ${transcript}` : transcript);
          }
        };
        recognition.onerror = () => setIsRecording(false);
        recognition.onend = () => setIsRecording(false);
        recognition.start();
      } catch (err) {
        setIsRecording(false);
      }
    } else {
      setIsRecording(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4 bg-white">
      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((file, index) => (
            <div key={index} className="flex items-center bg-gray-50 rounded-lg px-3 py-2 text-sm">
              <FileText className="w-4 h-4 mr-2 text-gray-500" />
              <span className="truncate max-w-[120px]">{file.name}</span>
              <button 
                type="button"
                onClick={() => removeAttachment(index)}
                className="ml-2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end space-x-2">
        {/* File attachment button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          disabled={isLoading}
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          multiple
          accept=".txt,.pdf,.doc,.docx,.xls,.xlsx,.csv"
        />

        {/* Voice recording button */}
        <button
          type="button"
          onClick={handleVoiceRecording}
          className={`p-2 rounded-lg transition-colors ${
            isRecording 
              ? 'text-red-500 bg-red-50' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
          disabled={isLoading}
        >
          <Mic className="w-5 h-5" />
        </button>

        {/* Message input */}
        <div className="flex-1 relative">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={placeholder}
            rows={1}
            className="resize-none py-3 pr-12 min-h-[44px] max-h-32"
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          
          {/* Send button */}
          <Button
            type="submit"
            size="sm"
            className="absolute right-2 bottom-2"
            disabled={!message.trim() && attachments.length === 0}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="mt-3">
        <label htmlFor="use-case" className="mb-1 block text-sm font-medium text-gray-700">
          Use case
        </label>
        <select
          id="use-case"
          value={worker}
          onChange={(event) => setWorker(event.target.value as 'it_helpdesk')}
          disabled={isLoading}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        >
          <option value="it_helpdesk">IT Helpdesk — incident triage</option>
        </select>
        <p className="mt-1 text-xs text-gray-500">Use case lain akan muncul setelah workflow backend tersedia.</p>
      </div>

      {/* Context fields for the selected use case */}
      <div className="mt-3 flex flex-wrap gap-2">
        <div className="flex-1 min-w-[200px]">
          <Input
            label="Lokasi (opsional)"
            placeholder="zone-A1 atau nama zona"
            className="text-sm"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <Input
            label="Jenis Perangkat (opsional)"
            placeholder="Wi-Fi, LAN, Server"
            className="text-sm"
            value={deviceType}
            onChange={(event) => setDeviceType(event.target.value)}
          />
        </div>
      </div>
    </form>
  );
}