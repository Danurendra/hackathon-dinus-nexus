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
  onSubmit: (message: string, attachments?: File[], metadata?: { location?: string; deviceType?: string }) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSubmit, isLoading = false, placeholder = "Ketik pesan atau deskripsi insiden..." }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [location, setLocation] = useState('');
  const [deviceType, setDeviceType] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() || attachments.length > 0) {
      onSubmit(message, attachments, { location: location.trim(), deviceType: deviceType.trim() });
      setMessage('');
      setAttachments([]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachments(prev => [...prev, ...newFiles]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleVoiceRecording = () => {
    setIsRecording(!isRecording);
    // In a real app, this would integrate with Web Speech API
    if (!isRecording) {
      console.log('Starting voice recording...');
    } else {
      console.log('Stopping voice recording...');
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

      {/* Additional input fields for IT Helpdesk */}
      <div className="mt-3 flex flex-wrap gap-2">
        <div className="flex-1 min-w-[200px]">
          <Input
            label="Lokasi (opsional)"
            placeholder="Gedung A, Lantai 2"
            className="text-sm"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <Input
            label="Jenis Perangkat (opsional)"
            placeholder="Wi-Fi, LAN, Server"
            className="text-sm"
            value={deviceType}
            onChange={(e) => setDeviceType(e.target.value)}
          />
        </div>
      </div>
    </form>
  );
}