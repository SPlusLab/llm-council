import { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import Library from './components/Library';
import Projects from './components/Projects';
import GlobalSettings from './components/GlobalSettings';
import { api } from './api';
import { useTheme } from './context/ThemeContext';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import './App.css';

function App() {
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [streamError, setStreamError] = useState(null);
  const streamControllerRef = useRef(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [globalSettingsOpen, setGlobalSettingsOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState('chat'); // 'chat', 'library', or 'projects'
  const [projects, setProjects] = useState([]);
  const { theme, toggleTheme, isDark } = useTheme();

  // Load conversations and projects on mount
  useEffect(() => {
    loadConversations();
    loadProjects();
  }, []);

  // Load conversation details when selected
  useEffect(() => {
    if (currentConversationId) {
      loadConversation(currentConversationId);
    }
  }, [currentConversationId]);

  const loadConversations = async () => {
    try {
      const convs = await api.listConversations();
      setConversations(convs);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const loadProjects = async () => {
    try {
      const data = await api.getProjects();
      setProjects(data.projects || []);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const loadConversation = async (id) => {
    try {
      const conv = await api.getConversation(id);
      setCurrentConversation(conv);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const handleNewConversation = async () => {
    try {
      const newConv = await api.createConversation();
      setConversations([
        { id: newConv.id, created_at: newConv.created_at, message_count: 0 },
        ...conversations,
      ]);
      setCurrentConversationId(newConv.id);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const handleSelectConversation = (id) => {
    setCurrentConversationId(id);
  };

  const handleRenameConversation = async (conversationId, title) => {
    const targetId = conversationId || currentConversationId;
    if (!targetId || !title) return;
    try {
      await api.updateConversationTitle(targetId, title);
      await loadConversations();
      if (targetId === currentConversationId) {
        await loadConversation(targetId);
      }
    } catch (error) {
      console.error('Failed to rename conversation:', error);
    }
  };

  const handleDeleteConversation = async (conversationId) => {
    const targetId = conversationId || currentConversationId;
    if (!targetId) return;
    try {
      await api.deleteConversation(targetId);
      setConversations((prev) =>
        prev.filter((c) => c.id !== targetId)
      );
      if (targetId === currentConversationId) {
        setCurrentConversationId(null);
        setCurrentConversation(null);
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const handleSendMessage = async ({ content, attachments = [], case_settings }) => {
    if (!currentConversationId || isLoading) return;

    setStreamError(null);
    setIsLoading(true);
    try {
      // Optimistically add user message to UI
      const userMessage = { role: 'user', content, attachments, case_settings };
      setCurrentConversation((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: [...prev.messages, userMessage],
        };
      });

      // Create a partial assistant message that will be updated progressively
      const assistantMessage = {
        role: 'assistant',
        stage1: null,
        stage2: null,
        stage3: null,
        metadata: null,
        loading: {
          stage1: false,
          stage2: false,
          stage3: false,
        },
      };

      // Add the partial assistant message
      setCurrentConversation((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: [...prev.messages, assistantMessage],
        };
      });

      // Send message with streaming
      const { controller, streamPromise } = await api.sendMessageStream(
        currentConversationId,
        { content, attachments, case_settings },
        (eventType, event) => {
          switch (eventType) {
            case 'stage1_start':
              setCurrentConversation((prev) => {
                if (!prev) return prev;
                const messages = [...prev.messages];
                const lastMsg = messages[messages.length - 1];
                if (!lastMsg) return prev;
                lastMsg.loading.stage1 = true;
                return { ...prev, messages };
              });
              break;

            case 'stage1_complete':
              setCurrentConversation((prev) => {
                if (!prev) return prev;
                const messages = [...prev.messages];
                const lastMsg = messages[messages.length - 1];
                if (!lastMsg) return prev;
                lastMsg.stage1 = event.data;
                lastMsg.loading.stage1 = false;
                return { ...prev, messages };
              });
              break;

            case 'stage2_start':
              setCurrentConversation((prev) => {
                if (!prev) return prev;
                const messages = [...prev.messages];
                const lastMsg = messages[messages.length - 1];
                if (!lastMsg) return prev;
                lastMsg.loading.stage2 = true;
                return { ...prev, messages };
              });
              break;

            case 'stage2_complete':
              setCurrentConversation((prev) => {
                if (!prev) return prev;
                const messages = [...prev.messages];
                const lastMsg = messages[messages.length - 1];
                if (!lastMsg) return prev;
                lastMsg.stage2 = event.data;
                lastMsg.metadata = event.metadata;
                lastMsg.loading.stage2 = false;
                return { ...prev, messages };
              });
              break;

            case 'stage3_start':
              setCurrentConversation((prev) => {
                if (!prev) return prev;
                const messages = [...prev.messages];
                const lastMsg = messages[messages.length - 1];
                if (!lastMsg) return prev;
                lastMsg.loading.stage3 = true;
                return { ...prev, messages };
              });
              break;

            case 'stage3_complete':
              setCurrentConversation((prev) => {
                if (!prev) return prev;
                const messages = [...prev.messages];
                const lastMsg = messages[messages.length - 1];
                if (!lastMsg) return prev;
                lastMsg.stage3 = event.data;
                lastMsg.loading.stage3 = false;
                return { ...prev, messages };
              });
              break;

            case 'title_complete':
              // Reload conversations to get updated title
              loadConversations();
              break;

            case 'complete':
              // Stream complete, reload conversations list
              loadConversations();
              setIsLoading(false);
              streamControllerRef.current = null;
              break;

            case 'error':
              console.error('Stream error:', event.message);
              setStreamError(event.message || 'Stream error');
              setIsLoading(false);
              streamControllerRef.current = null;
              loadConversation(currentConversationId);
              break;

            case 'aborted':
              setIsLoading(false);
              streamControllerRef.current = null;
              loadConversation(currentConversationId);
              break;

            default:
              console.log('Unknown event type:', eventType);
          }
        }
      );
      streamControllerRef.current = controller;
      streamPromise.catch((err) => {
        console.error('Streaming failed:', err);
        setStreamError('Streaming failed. Please try again.');
        setIsLoading(false);
        streamControllerRef.current = null;
        loadConversation(currentConversationId);
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      setStreamError('Failed to send message. Please try again.');
      // Reload conversation to remove optimistic messages
      if (currentConversationId) {
        loadConversation(currentConversationId);
      }
      setIsLoading(false);
      streamControllerRef.current = null;
    }
  };

  const handleCancelStream = () => {
    if (streamControllerRef.current) {
      streamControllerRef.current.abort();
    }
  };

  const handleToggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleWorkModeChange = async (mode) => {
    if (!currentConversationId) return;
    try {
      await api.updateConversation(currentConversationId, { work_mode: mode });
      await loadConversation(currentConversationId);
      await loadConversations();
    } catch (error) {
      console.error('Failed to update work mode:', error);
    }
  };

  const handleNavigateToConversation = (conversationId) => {
    setCurrentView('chat');
    setCurrentConversationId(conversationId);
  };

  const handleCreateProject = async (name, color) => {
    try {
      const project = await api.createProject(name, color);
      setProjects([...projects, project]);
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const handleUpdateProject = async (projectId, updates) => {
    try {
      const updatedProject = await api.updateProject(projectId, updates);
      setProjects(projects.map(p => p.id === projectId ? updatedProject : p));
    } catch (error) {
      console.error('Failed to update project:', error);
    }
  };

  const handleDeleteProject = async (projectId) => {
    try {
      await api.deleteProject(projectId);
      setProjects(projects.filter(p => p.id !== projectId));
      await loadConversations(); // Reload to update project assignments
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  const handleAssignToProject = async (conversationId, projectId) => {
    try {
      await api.assignConversationToProject(conversationId, projectId);
      await loadConversations();
    } catch (error) {
      console.error('Failed to assign conversation to project:', error);
    }
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    'ctrl+shift+o': (e) => {
      // Ctrl+Shift+O: New chat
      handleNewConversation();
    },
    'ctrl+k': (e) => {
      // Ctrl+K: Search/Quick switcher
      setSearchModalOpen(true);
    },
    'ctrl+b': (e) => {
      // Ctrl+B: Toggle sidebar
      setSidebarOpen(prev => !prev);
    },
  }, [handleNewConversation, setSidebarOpen]);

  return (
    <div className="app">
      {/* Main Content - No Header */}
      <div className="app-main">
        <Sidebar
          conversations={conversations}
          currentConversationId={currentConversationId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          onRenameConversation={handleRenameConversation}
          onDeleteConversation={handleDeleteConversation}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onToggleSidebar={handleToggleSidebar}
          theme={theme}
          toggleTheme={toggleTheme}
          isDark={isDark}
          searchModalOpen={searchModalOpen}
          onSearchModalClose={() => setSearchModalOpen(false)}
          currentView={currentView}
          onViewChange={setCurrentView}
          projects={projects}
          onAssignToProject={handleAssignToProject}
        />
        {currentView === 'chat' ? (
          <ChatInterface
            conversation={currentConversation}
            onSendMessage={handleSendMessage}
            onCancel={handleCancelStream}
            isLoading={isLoading}
            streamError={streamError}
            workMode={currentConversation?.work_mode}
            onWorkModeChange={handleWorkModeChange}
            onToggleSidebar={handleToggleSidebar}
            onOpenGlobalSettings={() => setGlobalSettingsOpen(true)}
          />
        ) : currentView === 'library' ? (
          <Library
            onNavigateToConversation={handleNavigateToConversation}
          />
        ) : (
          <Projects
            projects={projects}
            onCreateProject={handleCreateProject}
            onUpdateProject={handleUpdateProject}
            onDeleteProject={handleDeleteProject}
            onAssignToProject={handleAssignToProject}
          />
        )}
      </div>

      {/* Global Settings Modal */}
      <GlobalSettings
        isOpen={globalSettingsOpen}
        onClose={() => setGlobalSettingsOpen(false)}
      />
    </div>
  );
}

export default App;
