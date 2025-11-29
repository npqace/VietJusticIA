import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api';
import { COLORS, FONTS, SIZES } from '../../constants/styles';
import Header from '../../components/Header';

interface ServiceRequestDetail {
  id: number;
  user_id: number;
  lawyer_id: number;
  title: string;
  description: string;
  status: string;
  lawyer_response: string | null;
  rejected_reason: string | null;
  created_at: string;
  updated_at: string | null;
  user_full_name: string | null;
  user_email: string | null;
  user_phone: string | null;
  lawyer_full_name: string | null;
  lawyer_email: string | null;
  lawyer_phone: string | null;
  lawyer_specialties: string | null;
}

const ServiceRequestDetailScreen = ({ route, navigation }: { route: any; navigation: any }) => {
  const { requestId } = route.params;
  const [isLoading, setIsLoading] = useState(true);
  const [request, setRequest] = useState<ServiceRequestDetail | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  useEffect(() => {
    fetchRequestDetail();
  }, [requestId]);

  const fetchRequestDetail = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/api/v1/service-requests/${requestId}`);
      setRequest(response.data);

      // Check if a conversation exists for this request
      if (response.data.status === 'ACCEPTED' || response.data.status === 'IN_PROGRESS') {
        checkConversationExists();
      }
    } catch (error: any) {
      console.error('Failed to fetch request details:', error);
      Alert.alert('Error', 'Failed to load request details');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const checkConversationExists = async () => {
    try {
      const response = await api.get(`/api/v1/conversations/service-request/${requestId}`);
      if (response.data && response.data.conversation_id) {
        setConversationId(response.data.conversation_id);
      }
    } catch (error: any) {
      // Conversation doesn't exist yet or error occurred
      console.log('No conversation exists yet for this request');
    }
  };

  const handleStartChat = () => {
    if (!request) return;

    if (conversationId) {
      // Conversation already exists, navigate to it
      navigation.navigate('Conversation', {
        conversationId,
        serviceRequestId: requestId,
        title: request.title,
      });
    } else {
      Alert.alert(
        'Start Conversation',
        'The lawyer will need to accept your request before you can start chatting.',
        [{ text: 'OK' }]
      );
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return COLORS.warning || '#FFA500';
      case 'accepted':
      case 'in_progress':
        return COLORS.success || '#4CAF50';
      case 'completed':
        return COLORS.info || '#2196F3';
      case 'rejected':
        return COLORS.error || '#F44336';
      default:
        return COLORS.gray;
    }
  };

  const getStatusText = (status: string) => {
    return status.replace('_', ' ').toUpperCase();
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!request) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Request not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Request Details" />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) }]}>
          <Text style={styles.statusText}>{getStatusText(request.status)}</Text>
        </View>

        {/* Request Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Request Information</Text>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Title:</Text>
            <Text style={styles.value}>{request.title}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Description:</Text>
            <Text style={styles.value}>{request.description}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Submitted:</Text>
            <Text style={styles.value}>
              {new Date(request.created_at).toLocaleDateString()} at{' '}
              {new Date(request.created_at).toLocaleTimeString()}
            </Text>
          </View>

          {request.updated_at && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Last Updated:</Text>
              <Text style={styles.value}>
                {new Date(request.updated_at).toLocaleDateString()} at{' '}
                {new Date(request.updated_at).toLocaleTimeString()}
              </Text>
            </View>
          )}
        </View>

        {/* Lawyer Information */}
        {request.lawyer_full_name && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Assigned Lawyer</Text>

            <View style={styles.lawyerCard}>
              <Ionicons name="person-circle-outline" size={48} color={COLORS.primary} />
              <View style={styles.lawyerInfo}>
                <Text style={styles.lawyerName}>{request.lawyer_full_name}</Text>
                {request.lawyer_specialties && (
                  <Text style={styles.lawyerSpecialty}>{request.lawyer_specialties}</Text>
                )}
                {request.lawyer_email && (
                  <Text style={styles.lawyerContact}>{request.lawyer_email}</Text>
                )}
                {request.lawyer_phone && (
                  <Text style={styles.lawyerContact}>{request.lawyer_phone}</Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Lawyer Response */}
        {request.lawyer_response && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lawyer's Response</Text>
            <View style={styles.responseCard}>
              <Text style={styles.responseText}>{request.lawyer_response}</Text>
            </View>
          </View>
        )}

        {/* Rejection Reason */}
        {request.rejected_reason && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rejection Reason</Text>
            <View style={[styles.responseCard, styles.rejectionCard]}>
              <Text style={styles.responseText}>{request.rejected_reason}</Text>
            </View>
          </View>
        )}

        {/* Chat Button */}
        {(request.status === 'ACCEPTED' || request.status === 'IN_PROGRESS') && (
          <TouchableOpacity style={styles.chatButton} onPress={handleStartChat}>
            <Ionicons name="chatbubble-ellipses-outline" size={24} color={COLORS.white} />
            <Text style={styles.chatButtonText}>
              {conversationId ? 'Open Chat' : 'Start Conversation'}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SIZES.padding,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: SIZES.padding,
  },
  statusText: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: SIZES.body4,
  },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    marginBottom: SIZES.padding,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: SIZES.h3,
    fontFamily: FONTS.bold,
    color: COLORS.black,
    marginBottom: 12,
  },
  infoRow: {
    marginBottom: 12,
  },
  label: {
    fontSize: SIZES.body4,
    fontFamily: FONTS.semiBold,
    color: COLORS.gray,
    marginBottom: 4,
  },
  value: {
    fontSize: SIZES.body3,
    fontFamily: FONTS.regular,
    color: COLORS.black,
  },
  lawyerCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lawyerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  lawyerName: {
    fontSize: SIZES.h3,
    fontFamily: FONTS.bold,
    color: COLORS.black,
    marginBottom: 4,
  },
  lawyerSpecialty: {
    fontSize: SIZES.body4,
    fontFamily: FONTS.regular,
    color: COLORS.primary,
    marginBottom: 4,
  },
  lawyerContact: {
    fontSize: SIZES.body4,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    marginBottom: 2,
  },
  responseCard: {
    backgroundColor: COLORS.lightGray,
    borderRadius: SIZES.radius,
    padding: 12,
  },
  rejectionCard: {
    backgroundColor: '#FFEBEE',
  },
  responseText: {
    fontSize: SIZES.body3,
    fontFamily: FONTS.regular,
    color: COLORS.black,
    lineHeight: 20,
  },
  chatButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  chatButtonText: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: SIZES.h3,
    marginLeft: 8,
  },
  errorText: {
    fontSize: SIZES.h3,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
  },
});

export default ServiceRequestDetailScreen;
