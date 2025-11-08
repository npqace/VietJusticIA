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
  Button,
  Container,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ChatIcon from '@mui/icons-material/Chat';
import { ArrowBackOutlined, LogoutOutlined, PersonOutline } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import ConversationChat from '../components/ConversationChat';

interface Conversation {
  conversation_id: string;
  service_request_id: number;
  user_id: number;
  lawyer_id: number;
  messages: any[];
  created_at: string;
  updated_at: string;
  unread_count_lawyer?: number;
  service_request_title?: string;
  user_full_name?: string;
}

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

  const fetchConversations = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get lawyer's conversations
      const response = await api.get('/api/v1/conversations/my/list');

      if (response.data) {
        setConversations(response.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch conversations:', err);
      setError(err.response?.data?.detail || 'Failed to load conversations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConversationClick = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setChatDialogOpen(true);
  };

  const handleCloseChat = () => {
    setChatDialogOpen(false);
    // Refresh conversations to update unread counts
    setTimeout(() => fetchConversations(), 500);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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

  const getLastMessage = (conversation: Conversation) => {
    if (!conversation.messages || conversation.messages.length === 0) {
      return 'No messages yet';
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
            onClick={() => navigate('/lawyer')}
            sx={{ mr: 2 }}
          >
            <ArrowBackOutlined />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Conversations
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonOutline />
              <Typography>{user?.full_name}</Typography>
            </Box>
            <IconButton color="inherit" onClick={handleLogout}>
              <LogoutOutlined />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>

      {conversations.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="text.secondary" textAlign="center">
              No conversations yet. Accept a service request to start chatting with clients.
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
                        {conversation.service_request_title || `Request #${conversation.service_request_id}`}
                      </Typography>
                      {conversation.unread_count_lawyer && conversation.unread_count_lawyer > 0 && (
                        <Chip
                          label={conversation.unread_count_lawyer}
                          color="primary"
                          size="small"
                        />
                      )}
                    </Box>

                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {conversation.user_full_name || `User #${conversation.user_id}`}
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
                  `Request #${selectedConversation.service_request_id}`
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
