

import React from 'react';
import { Conversation, AITool } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { ChatBubbleIcon } from './icons/ChatBubbleIcon';
import { TrashIcon } from './icons/TrashIcon';
import { SettingsIcon } from './icons/SettingsIcon';
import { AI_TOOLS } from '../constants';
import { GptIcon } from './icons/GptIcon';
import { SidebarCloseIcon } from './icons/SidebarCloseIcon';
import { SidebarOpenIcon } from './icons/SidebarOpenIcon';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  conversations: Conversation[];
  activeConversationId: string | null;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onOpenFounderModal: () => void;
  onOpenSettingsModal: () => void;
}

const AIToolItem: React.FC<{ tool: AITool, isCollapsed: boolean }> = ({ tool, isCollapsed }) => (
    <button 
        className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-zinc-400 hover:bg-zinc-800 hover:text-white"
        title={isCollapsed ? `${tool.name} - ${tool.description}` : undefined}
    >
        <div className="p-1 bg-zinc-700 rounded-full flex-shrink-0">
            <GptIcon />
        </div>
        {!isCollapsed && (
            <div className="overflow-hidden">
                <p className="text-sm font-medium text-white truncate">{tool.name}</p>
                <p className="text-xs text-zinc-500 truncate">{tool.description}</p>
            </div>
        )}
    </button>
);


export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  conversations,
  activeConversationId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onOpenFounderModal,
  onOpenSettingsModal
}) => {
  return (
    <aside className={`fixed top-0 left-0 h-full bg-zinc-900 flex flex-col text-white transition-all duration-300 ease-in-out z-30 ${isOpen ? 'w-80' : 'w-20'}`}>
        <div className="h-full flex flex-col">
            {/* Header: New Chat and Toggle */}
            <div className={`flex-shrink-0 p-2 border-b border-zinc-800`}>
                <div className={`flex items-center gap-2 ${isOpen ? 'justify-between' : 'justify-center'}`}>
                    {isOpen && (
                        <button
                            onClick={onNewChat}
                            className="flex-1 flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-white bg-zinc-800 hover:bg-zinc-700 transition-colors"
                        >
                            <PlusIcon />
                            New Chat
                        </button>
                    )}
                    <button 
                        onClick={onToggle}
                        className="p-2 rounded-md text-zinc-400 hover:bg-zinc-700 hover:text-white"
                        aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                    >
                        {isOpen ? <SidebarCloseIcon /> : <SidebarOpenIcon />}
                    </button>
                </div>

                {!isOpen && (
                    <button
                        onClick={onNewChat}
                        title="New Chat"
                        className="w-full flex justify-center items-center mt-2 px-3 py-2 text-sm font-medium rounded-md text-white bg-zinc-800 hover:bg-zinc-700 transition-colors"
                    >
                        <PlusIcon />
                    </button>
                )}
            </div>
            
            {/* Scrollable Main Content: Explore and History */}
            <div className="flex-1 min-h-0 overflow-y-auto p-2">
                {/* Explore Tools Section */}
                <div>
                    <p className={`text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 ${isOpen ? 'px-3' : 'text-center'}`}>
                        {isOpen ? 'Explore' : 'Tools'}
                    </p>
                    <div className="space-y-1">
                        {AI_TOOLS.map(tool => <AIToolItem key={tool.name} tool={tool} isCollapsed={!isOpen} />)}
                    </div>
                </div>
                
                {/* Chat History Section */}
                <div className="mt-4">
                    <p className={`text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 sticky top-0 bg-zinc-900 py-1 ${isOpen ? 'px-3' : 'text-center'}`}>
                        {isOpen ? 'History' : 'Chats'}
                    </p>
                    <nav className="space-y-1 pr-1">
                    {conversations.map(convo => (
                        <div key={convo.id} className="group relative">
                            <button
                                onClick={() => onSelectChat(convo.id)}
                                title={convo.title}
                                className={`w-full text-left flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${!isOpen ? 'justify-center': ''} ${
                                activeConversationId === convo.id
                                    ? 'bg-zinc-700 text-white'
                                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                                }`}
                            >
                                <ChatBubbleIcon />
                                {isOpen && <span className="truncate flex-1">{convo.title}</span>}
                            </button>
                            {isOpen && (
                                <button
                                    onClick={(e) => {
                                    e.stopPropagation();
                                    if(window.confirm(`Are you sure you want to delete "${convo.title}"?`)) {
                                        onDeleteChat(convo.id);
                                    }
                                    }}
                                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-md text-zinc-500 opacity-0 group-hover:opacity-100 hover:bg-zinc-700 hover:text-white transition-opacity"
                                    aria-label={`Delete chat: ${convo.title}`}
                                >
                                    <TrashIcon />
                                </button>
                            )}
                        </div>
                    ))}
                    </nav>
                </div>
            </div>

            {/* Footer: Settings and Founder Info */}
            <div className="flex-shrink-0 border-t border-zinc-800 p-2 space-y-1">
                <button
                    onClick={onOpenSettingsModal}
                    title="Settings"
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors ${!isOpen ? 'justify-center' : ''}`}
                >
                    <SettingsIcon/>
                    {isOpen && 'Settings'}
                </button>
                <button
                    onClick={onOpenFounderModal}
                    title="About Vyankatesh Jaware"
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors ${!isOpen ? 'justify-center' : ''}`}
                >
                <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold bg-zinc-700 text-white">
                        VJ
                    </div>
                    {isOpen && <span className="truncate">Vyankatesh Jaware</span>}
                </button>
            </div>
        </div>
    </aside>
  );
};