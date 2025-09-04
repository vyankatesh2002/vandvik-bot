

import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Chat } from '@google/genai';
import { GoogleGenAI, Type } from '@google/genai';
import { ChatMessage, MessageAuthor, Conversation } from './types';
import { VANDVIK_SYSTEM_PROMPT, INITIAL_SUGGESTION_CHIPS } from './constants';
import { VandvikVisual } from './components/VandvikVisual';
import { Message } from './components/Message';
import { SuggestionChip } from './components/SuggestionChip';
import { SendIcon } from './components/icons/SendIcon';
import { MicrophoneIcon } from './components/icons/MicrophoneIcon';
import { VolumeUpIcon } from './components/icons/VolumeUpIcon';
import { VolumeOffIcon } from './components/icons/VolumeOffIcon';
import { FounderStoryModal } from './components/FounderStoryModal';
import { SettingsModal } from './components/SettingsModal';
import { Sidebar } from './components/Sidebar';

// Web Speech API interface for TypeScript
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((this: SpeechRecognition, ev: any) => any) | null;
  onerror: ((this: SpeechRecognition, ev: any) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
}

interface SpeechRecognitionStatic {
  new (): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionStatic;
    webkitSpeechRecognition: SpeechRecognitionStatic;
  }
}

// =========================================================================
// SECURITY WARNING: API Key Exposure
// ... (rest of the warning remains the same)
// =========================================================================
const API_KEY = process.env.API_KEY;

const App: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isSpeechEnabled, setIsSpeechEnabled] = useState<boolean>(true);
  const [speechSupported, setSpeechSupported] = useState<boolean>(false);
  const [synthesisSupported, setSynthesisSupported] = useState<boolean>(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [speechRate, setSpeechRate] = useState<number>(1);
  const [suggestionChips, setSuggestionChips] = useState<string[]>(INITIAL_SUGGESTION_CHIPS);
  const [isCameraEnabled, setIsCameraEnabled] = useState<boolean>(false); // Placeholder for camera functionality
  const [userMood, setUserMood] = useState<string>('neutral');
  const [isFounderModalOpen, setIsFounderModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const chatRef = useRef<Chat | null>(null);
  const genAiRef = useRef<GoogleGenAI | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const prevIsLoadingRef = useRef<boolean>(false);

  const activeConversation = useMemo(() => {
    return conversations.find(c => c.id === activeConversationId);
  }, [conversations, activeConversationId]);
  
  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [activeConversation?.messages, isLoading]);

  // Track previous loading state to trigger speech correctly
  useEffect(() => {
    prevIsLoadingRef.current = isLoading;
  });

  // Setup APIs on initial load
  useEffect(() => {
    const initializeApis = () => {
      try {
        if (!API_KEY) {
          setError("API key is missing. Please set it in your environment variables.");
          return;
        }
        const ai = new GoogleGenAI({apiKey: API_KEY});
        genAiRef.current = ai;

        // Speech Recognition (Input)
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
          setSpeechSupported(true);
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-US';
          recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
              .map(result => result[0])
              .map(result => result.transcript)
              .join('');
            setInput(transcript);
          };
          recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            setError(`Speech recognition error: ${event.error}`);
            if (isRecording) setIsRecording(false);
          };
          recognition.onend = () => setIsRecording(false);
          recognitionRef.current = recognition;
        } else {
          console.warn("Speech Recognition not supported.");
        }

        // Speech Synthesis (Output)
        if ('speechSynthesis' in window) {
          setSynthesisSupported(true);
          const populateVoiceList = () => {
            const voices = window.speechSynthesis.getVoices();
            if (voices.length === 0) return;
            setAvailableVoices(voices);

            const savedSettingsRaw = localStorage.getItem('vandvik-voice-settings');
            let savedVoiceURI: string | null = null;
            if (savedSettingsRaw) {
              const savedSettings = JSON.parse(savedSettingsRaw);
              savedVoiceURI = savedSettings.voiceURI;
              setSpeechRate(savedSettings.rate || 1);
            }

            const voice = voices.find(v => v.voiceURI === savedVoiceURI);
            if(voice) {
              setSelectedVoice(voice);
              return;
            }

            const preferredVoiceNames = ["Google US English", "Samantha", "Microsoft Zira Desktop - English (United States)"];
            let selected = voices.find(voice => preferredVoiceNames.includes(voice.name)) ||
                           voices.find(voice => voice.lang.startsWith('en-US') && voice.name.toLowerCase().includes('female')) ||
                           voices.find(voice => voice.lang.startsWith('en-US')) ||
                           voices[0];
            setSelectedVoice(selected);
          };
          populateVoiceList();
          if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = populateVoiceList;
          }
        } else {
          console.warn("Speech Synthesis not supported.");
        }
      } catch (e) {
        console.error(e);
        setError("Failed to initialize APIs. Please check your configuration.");
      }
    };
    initializeApis();
  }, []);

  // Load conversations from localStorage on initial load
  useEffect(() => {
    const savedConversationsRaw = localStorage.getItem('vandvik-conversations');
    if (savedConversationsRaw) {
      const savedConversations: Conversation[] = JSON.parse(savedConversationsRaw);
      if (savedConversations.length > 0) {
        setConversations(savedConversations);
        setActiveConversationId(savedConversations[0].id); // Select the most recent chat
        return;
      }
    }
    // If no saved conversations, start a new one
    handleNewChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Re-initialize chatRef when active conversation changes
  useEffect(() => {
    if (!activeConversation || !genAiRef.current) return;
  
    const history = activeConversation.messages
      .filter(msg => msg.text) // Filter out empty placeholder messages
      .map(msg => ({
        role: msg.author === MessageAuthor.USER ? 'user' : 'model',
        parts: [{ text: msg.text }],
      }));
  
    // Remove the initial Vandvik greeting from history for the API
    if (history.length > 0 && history[0].role === 'model') {
      history.shift();
    }
  
    const newChat = genAiRef.current.chats.create({
      model: 'gemini-2.5-flash',
      config: { systemInstruction: VANDVIK_SYSTEM_PROMPT },
      history: history,
    });
    chatRef.current = newChat;
  
  }, [activeConversation]);


  // Save conversations to localStorage whenever they change
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem('vandvik-conversations', JSON.stringify(conversations));
    }
  }, [conversations]);

  // Speak Vandvik's latest message
  useEffect(() => {
    if (prevIsLoadingRef.current && !isLoading && isSpeechEnabled && synthesisSupported && activeConversation) {
      const lastMessage = activeConversation.messages[activeConversation.messages.length - 1];
      if (lastMessage?.author === MessageAuthor.VANDVIK && lastMessage.text) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(lastMessage.text);
        if (selectedVoice) utterance.voice = selectedVoice;
        utterance.rate = speechRate;
        window.speechSynthesis.speak(utterance);
      }
    }
  }, [isLoading, activeConversation, isSpeechEnabled, synthesisSupported, selectedVoice, speechRate]);

  const updateConversation = (convoId: string, updateFn: (conversation: Conversation) => Conversation) => {
    setConversations(prev => prev.map(c => c.id === convoId ? updateFn(c) : c));
  };
  
  const handleNewChat = () => {
    cancelSpeech();
    const newConversation: Conversation = {
      id: `convo-${Date.now()}`,
      title: 'New Chat',
      messages: [{
        author: MessageAuthor.VANDVIK,
        text: "Hello! I'm Vandvik, your personal holographic companion. How can I help you today? 😊"
      }]
    };
    setConversations(prev => [newConversation, ...prev]);
    setActiveConversationId(newConversation.id);
    setInput('');
    setError(null);
    setSuggestionChips(INITIAL_SUGGESTION_CHIPS);
  };
  
  const handleDeleteChat = (convoId: string) => {
    setConversations(prev => prev.filter(c => c.id !== convoId));
    if (activeConversationId === convoId) {
        const remainingConversations = conversations.filter(c => c.id !== convoId);
        if (remainingConversations.length > 0) {
            setActiveConversationId(remainingConversations[0].id);
        } else {
            handleNewChat();
        }
    }
  };


  const cancelSpeech = () => {
    if (synthesisSupported) window.speechSynthesis.cancel();
  };

  const getDynamicSuggestions = async (lastMessage: string) => {
    if (!genAiRef.current) return;
    try {
      const prompt = `Based on this statement: "${lastMessage}", generate 3 short, relevant, and engaging follow-up suggestions for a user to continue the conversation. Include an emoji in each suggestion.`;
      const result = await genAiRef.current.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              suggestions: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ['suggestions']
          }
        }
      });
      const responseJson = JSON.parse(result.text);
      if (responseJson.suggestions && responseJson.suggestions.length > 0) {
        setSuggestionChips(responseJson.suggestions);
      }
    } catch (e) {
      console.error("Failed to get dynamic suggestions:", e);
      setSuggestionChips(INITIAL_SUGGESTION_CHIPS);
    }
  };

  const generateTitle = async (convoId: string, firstMessage: string) => {
    if (!genAiRef.current) return;
    try {
      const prompt = `Generate a very short, concise title (3-5 words) for a conversation that starts with this message: "${firstMessage}"`;
      const result = await genAiRef.current.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      const title = result.text.trim().replace(/"/g, ''); // Clean up quotes
      if (title) {
        updateConversation(convoId, convo => ({ ...convo, title }));
      }
    } catch(e) {
      console.error("Failed to generate title:", e);
      // Fallback already handled in sendMessage
    }
  };

  const sendMessage = async (prompt: string) => {
    if (!prompt.trim() || isLoading || !activeConversationId) return;
    cancelSpeech();
    if (isRecording) recognitionRef.current?.stop();

    setIsLoading(true);
    setError(null);
    setSuggestionChips([]);

    const userMessage: ChatMessage = { author: MessageAuthor.USER, text: prompt };
    
    // Create a placeholder for Vandvik's response
    updateConversation(activeConversationId, convo => ({
      ...convo,
      messages: [...convo.messages, userMessage, { author: MessageAuthor.VANDVIK, text: "" }]
    }));
    
    // Set title for new chats
    const isNewChat = activeConversation?.messages.length === 1; // 1 because greeting is pre-filled
    if (isNewChat) {
      // Set a temporary title first
      updateConversation(activeConversationId, convo => ({ ...convo, title: prompt.substring(0, 40) }));
      // Then generate a better one in the background
      generateTitle(activeConversationId, prompt);
    }

    setInput('');

    if (!chatRef.current) {
      setError("Chat is not initialized.");
      setIsLoading(false);
      return;
    }

    try {
      const moodContext = isCameraEnabled ? `[System Note: The user's current detected mood is ${userMood}.] ` : '';
      const stream = await chatRef.current.sendMessageStream({ message: moodContext + prompt });
      
      let finalResponse = "";
      for await (const chunk of stream) {
        const chunkText = chunk.text;
        finalResponse += chunkText;
        updateConversation(activeConversationId, convo => {
            const newMessages = [...convo.messages];
            newMessages[newMessages.length - 1].text = finalResponse;
            return { ...convo, messages: newMessages };
        });
      }
      await getDynamicSuggestions(finalResponse);
    } catch (e) {
      console.error(e);
      setError("An error occurred while communicating with the AI. Please try again.");
      // Remove the user's message and the failed AI response
      updateConversation(activeConversationId, convo => ({
        ...convo,
        messages: convo.messages.slice(0, -2)
      }));
      setInput(prompt);
      setSuggestionChips(INITIAL_SUGGESTION_CHIPS);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    cancelSpeech();
    setInput(e.target.value);
    if(error) setError(null);
  }

  const handleSend = (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    sendMessage(input);
  };
  
  const handleMicClick = () => {
    if (!recognitionRef.current) return;
    cancelSpeech();
    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      setInput('');
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };
  
  const handleVoiceChange = (voiceURI: string) => {
    const voice = availableVoices.find(v => v.voiceURI === voiceURI);
    if (voice) {
      setSelectedVoice(voice);
      localStorage.setItem('vandvik-voice-settings', JSON.stringify({ voiceURI: voice.voiceURI, rate: speechRate }));
    }
  };

  const handleRateChange = (rate: number) => {
    setSpeechRate(rate);
    localStorage.setItem('vandvik-voice-settings', JSON.stringify({ voiceURI: selectedVoice?.voiceURI, rate: rate }));
  };

  return (
    <>
      <div className="relative h-screen bg-black text-white font-sans antialiased">
        <Sidebar
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(prev => !prev)}
          conversations={conversations}
          activeConversationId={activeConversationId}
          onNewChat={handleNewChat}
          onSelectChat={setActiveConversationId}
          onDeleteChat={handleDeleteChat}
          onOpenFounderModal={() => setIsFounderModalOpen(true)}
          onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        />
        
        <main className={`flex flex-col h-full overflow-hidden transition-all duration-300 ease-in-out ${isSidebarOpen ? 'ml-80' : 'ml-20'}`}>
            {/* SCROLLING CHAT AREA */}
            <div ref={chatContainerRef} className="flex-1 w-full overflow-y-auto scroll-smooth">
              <div className="w-full max-w-4xl mx-auto px-4 pt-4">
                {!activeConversation || activeConversation.messages.length <= 1 ? (
                  <div className="flex flex-col items-center justify-center text-center pt-20">
                    <VandvikVisual isThinking={false} />
                    <h1 className="text-4xl font-bold mt-6 text-white">What's on the agenda today?</h1>
                  </div>
                ) : (
                  <div className="space-y-4 pb-4">
                    {activeConversation.messages.map((msg, index) => (
                      <Message 
                        key={index} 
                        message={msg}
                        isStreaming={isLoading && index === activeConversation.messages.length - 1} 
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* FIXED INPUT AREA */}
            <div className="w-full shrink-0 bg-gradient-to-t from-black via-black to-transparent">
              <div className="w-full max-w-4xl mx-auto px-4 pb-4">
                  <div className="flex flex-wrap gap-2 justify-center mb-3 min-h-[2rem]">
                    {!isLoading && suggestionChips.map(chip => (
                      <SuggestionChip key={chip} text={chip} onClick={sendMessage} disabled={isLoading || !!error} />
                    ))}
                  </div>

                  {error && <p className="text-red-400 text-sm mb-2 text-center">{error}</p>}
                
                  <form onSubmit={handleSend} className="relative flex items-center">
                    <input type="text" value={input} onChange={handleInputChange} placeholder="Ask Vandvik anything..." disabled={isLoading || !!error} className="w-full bg-zinc-800 border border-zinc-700 rounded-full py-3 pl-5 pr-40 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white transition duration-200 disabled:opacity-50" />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                        {speechSupported && <button type="button" onClick={handleMicClick} disabled={isLoading || !!error} className={`rounded-full p-2.5 transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-800 focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'text-zinc-300 hover:bg-zinc-700'}`} aria-label={isRecording ? 'Stop recording' : 'Start recording'}><MicrophoneIcon /></button>}
                        {synthesisSupported && <button type="button" onClick={() => { if(isSpeechEnabled) cancelSpeech(); setIsSpeechEnabled(p => !p); }} className={`rounded-full p-2.5 transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-800 focus:ring-white disabled:opacity-50 ${isSpeechEnabled ? 'text-zinc-300 hover:bg-zinc-700' : 'text-zinc-600'}`} aria-label={isSpeechEnabled ? 'Disable voice output' : 'Enable voice output'}>{isSpeechEnabled ? <VolumeUpIcon /> : <VolumeOffIcon />}</button>}
                        <button type="submit" disabled={!input.trim() || isLoading || !!error} className="rounded-full p-2.5 bg-zinc-600 text-white hover:bg-zinc-500 transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-800 focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Send message">
                            <SendIcon />
                        </button>
                    </div>
                  </form>
              </div>
            </div>
        </main>
      </div>

      <FounderStoryModal isOpen={isFounderModalOpen} onClose={() => setIsFounderModalOpen(false)} />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        voices={availableVoices}
        selectedVoiceURI={selectedVoice?.voiceURI}
        onVoiceChange={handleVoiceChange}
        speechRate={speechRate}
        onRateChange={handleRateChange}
      />
    </>
  );
};

export default App;