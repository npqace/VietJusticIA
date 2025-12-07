import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Grid,
  CircularProgress,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  AppBar,
  Toolbar,
  Container,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { ArrowBackOutlined, LogoutOutlined, PersonOutline, RefreshOutlined } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import ConversationChat from '../components/ConversationChat';
import { ROUTES } from '../constants/routes';
import { AxiosError } from 'axios';

interface Message {
  text: string;
  sender_id: number;
  created_at: string;
}

interface Conversation {
  conversation_id: string;
  service_request_id: number;
  user_id: number;
  lawyer_id: number;
  messages: Message[];
  created_at: string;
  updated_at: string;
  unread_count?: number;
  service_request_title?: string;
  user_full_name?: string;
}

const REFRESH_DELAY_MS = 500;

/**
 * LawyerConversationsPage Component
 *
 * Page for lawyers to view and manage their conversations with clients.
 *
 * Features:
 * - List of conversations with unread badges
 * - Real-time chat dialog
 * - Manual refresh capability
 * - Error handling with retry
 *
 * @component
 */
const LawyerConversationsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [chatDialogOpen, setChatDialogOpen] = useState(false);

  useEffect(() => {
    fetchConversations();
  }, []);

  /**
   * Fetches lawyer's conversations from backend
   */
  const fetchConversations = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get lawyer's conversations
      const response = await api.get<Conversation[]>('/api/v1/conversations/my/list');

      if (response.data) {
        setConversations(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
      const axiosError = err as AxiosError<{ detail: string }>;
      setError(axiosError.response?.data?.detail || 'Không thể tải danh sách hội thoại');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Opens chat dialog for selected conversation
   */
  const handleConversationClick = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setChatDialogOpen(true);
  };

  /**
   * Closes chat dialog and refreshes conversations to update unread counts
   */
  const handleCloseChat = () => {
    setChatDialogOpen(false);
    // Refresh conversations to update unread counts
    setTimeout(() => fetchConversations(), REFRESH_DELAY_MS);
  };

  /**
   * Handles lawyer logout
   */
  const handleLogout = async () => {
    try {
      await logout();
      navigate(ROUTES.LOGIN);
    } catch (error) {
      console.error('Logout failed:', error);
      navigate(ROUTES.LOGIN);
    }
  };

  /**
   * Formats date for display
   */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString();
    }
  };

  /**
   * Gets last message text for preview
   */
  const getLastMessage = (conversation: Conversation) => {
    if (!conversation.messages || conversation.messages.length === 0) {
      return 'Chưa có tin nhắn nào';
    }

    const lastMsg = conversation.messages[conversation.messages.length - 1];
    return lastMsg.text.length > 50 ? lastMsg.text.substring(0, 50) + '...' : lastMsg.text;
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate(ROUTES.LAWYER_DASHBOARD)}
            sx={{ mr: 2 }}
          >
            <ArrowBackOutlined />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Hội Thoại
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonOutline />
              <Typography>{user?.full_name || 'Luật Sư'}</Typography>
            </Box>
            <IconButton color="inherit" onClick={handleLogout}>
              <LogoutOutlined />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" gutterBottom>
            Danh Sách Hội Thoại
          </Typography>
          <IconButton
            onClick={fetchConversations}
            disabled={isLoading}
            aria-label="Refresh conversations"
          >
            <RefreshOutlined />
          </IconButton>
        </Box>

        {conversations.length === 0 ? (
          <Card>
            <CardContent>
              <Typography color="text.secondary" textAlign="center">
                Chưa có hội thoại nào. Hãy chấp nhận yêu cầu tư vấn để bắt đầu trò chuyện với khách hàng.
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={2}>
            {conversations.map((conversation) => (
              <Grid size={{ xs: 12, md: 6 }} key={conversation.conversation_id}>
                <Card>
                  <CardActionArea onClick={() => handleConversationClick(conversation)}>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                        <Typography variant="h6" component="div">
                          {conversation.service_request_title || `Yêu cầu #${conversation.service_request_id}`}
                        </Typography>
                        {conversation.unread_count !== undefined && conversation.unread_count > 0 && (
                          <Chip
                            label={conversation.unread_count}
                            color="primary"
                            size="small"
                          />
                        )}
                      </Box>

                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {conversation.user_full_name || `Người dùng #${conversation.user_id}`}
                      </Typography>

                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {getLastMessage(conversation)}
                      </Typography>

                      <Typography variant="caption" color="text.secondary">
                        {formatDate(conversation.updated_at || conversation.created_at)}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Chat Dialog */}
        <Dialog
          open={chatDialogOpen}
          onClose={handleCloseChat}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: { height: '80vh' },
          }}
        >
          <DialogTitle>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Chat</Typography>
              <IconButton edge="end" color="inherit" onClick={handleCloseChat} aria-label="close">
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent dividers sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
            {selectedConversation && (
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 2 }}>
                <ConversationChat
                  conversationId={selectedConversation.conversation_id}
                  serviceRequestTitle={
                    selectedConversation.service_request_title ||
                    `Yêu cầu #${selectedConversation.service_request_id}`
                  }
                  userRole="lawyer"
                />
              </Box>
            )}
          </DialogContent>
        </Dialog>
      </Container>
    </Box>
  );
};

export default LawyerConversationsPage;
