import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Dimensions } from 'react-native';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import api from '../../api';
import { COLORS, FONTS, SIZES } from '../../constants/styles';
import Header from '../../components/Header';
import logger from '../../utils/logger';

// Define types for the request items
interface ServiceRequest {
  id: number;
  title: string;
  status: string;
  created_at: string;
}

interface ConsultationRequest {
  id: number;
  content: string;
  status: string;
  created_at: string;
}

interface HelpRequest {
  id: number;
  subject: string;
  status: string;
  created_at: string;
}

const MyRequestsScreen = ({ navigation }: { navigation: any }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState({
    service_requests: [] as ServiceRequest[],
    consultation_requests: [] as ConsultationRequest[],
    help_requests: [] as HelpRequest[],
  });

  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'service', title: 'Dịch vụ' },
    { key: 'consultation', title: 'Tư vấn' },
    { key: 'help', title: 'Trợ giúp' },
  ]);

  const fetchRequests = async () => {
    try {
      if (!refreshing) setIsLoading(true);
      const response = await api.get('/api/v1/users/me/requests');
      setRequests(response.data);
    } catch (error) {
      logger.error("Failed to fetch requests:", error);
      Alert.alert('Lỗi', 'Không thể tải danh sách yêu cầu. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'pending': 'Đang chờ',
      'accepted': 'Đã chấp nhận',
      'in_progress': 'Đang xử lý',
      'completed': 'Hoàn thành',
      'rejected': 'Đã từ chối',
      'cancelled': 'Đã hủy',
    };
    return statusMap[status.toLowerCase()] || status;
  };

  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);

  const openDetails = (item: any, type: string) => {
    if (type === 'service') {
      navigation.navigate('ServiceRequestDetail', { requestId: item.id });
    } else {
      setSelectedRequest({ ...item, type });
      setDetailsModalVisible(true);
    }
  };

  const renderRequestItem = ({ item, type }: { item: any, type: string }) => (
    <View style={styles.requestItem}>
      <Text style={styles.itemTitle}>{item.title || item.subject || item.content?.substring(0, 50)}</Text>
      <Text style={styles.itemDate}>{new Date(item.created_at).toLocaleDateString('vi-VN')}</Text>
      <Text style={styles.itemStatus}>{getStatusText(item.status)}</Text>
      <TouchableOpacity
        style={styles.detailsButton}
        onPress={() => openDetails(item, type)}
      >
        <Text style={styles.detailsButtonText}>Xem chi tiết</Text>
      </TouchableOpacity>
    </View>
  );

  const ServiceRoute = () => (
    <View style={{ flex: 1 }}>
      <FlatList
        data={requests.service_requests}
        renderItem={({ item }) => renderRequestItem({ item, type: 'service' })}
        keyExtractor={(item, index) => `service-${item.id || index}`}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20, color: COLORS.gray }}>Không có yêu cầu nào</Text>}
      />
    </View>
  );

  const ConsultationRoute = () => (
    <View style={{ flex: 1 }}>
      <FlatList
        data={requests.consultation_requests}
        renderItem={({ item }) => renderRequestItem({ item, type: 'consultation' })}
        keyExtractor={(item, index) => `consultation-${item.id || index}`}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20, color: COLORS.gray }}>Không có yêu cầu nào</Text>}
      />
    </View>
  );

  const HelpRoute = () => (
    <View style={{ flex: 1 }}>
      <FlatList
        data={requests.help_requests}
        renderItem={({ item }) => renderRequestItem({ item, type: 'help' })}
        keyExtractor={(item, index) => `help-${item.id || index}`}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20, color: COLORS.gray }}>Không có yêu cầu nào</Text>}
      />
    </View>
  );

  const renderScene = SceneMap({
    service: ServiceRoute,
    consultation: ConsultationRoute,
    help: HelpRoute,
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Yêu cầu của tôi" />
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={{ width: Dimensions.get('window').width }}
        renderTabBar={props => (
          <TabBar
            {...props}
            activeColor={COLORS.primary}
            inactiveColor={COLORS.black}
            indicatorStyle={{ backgroundColor: COLORS.primary }}
            style={{ backgroundColor: COLORS.white }}
            labelStyle={{ fontFamily: FONTS.semiBold }}
          />
        )}
      />

      {/* Details Modal */}
      {selectedRequest && (
        <View style={detailsModalVisible ? styles.modalOverlay : { display: 'none' }}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Chi tiết yêu cầu</Text>

            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Trạng thái:</Text>
              <Text style={[styles.modalValue, { color: COLORS.primary, fontFamily: FONTS.semiBold }]}>
                {getStatusText(selectedRequest.status)}
              </Text>
            </View>

            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Ngày gửi:</Text>
              <Text style={styles.modalValue}>
                {new Date(selectedRequest.created_at).toLocaleDateString('vi-VN')}
              </Text>
            </View>

            <Text style={styles.modalLabel}>Nội dung:</Text>
            <View style={styles.contentBox}>
              <Text style={styles.contentText}>
                {selectedRequest.content || selectedRequest.subject || 'Không có nội dung'}
              </Text>
            </View>

            <Text style={styles.noteText}>
              * Phản hồi từ quản trị viên sẽ được gửi qua email của bạn.
            </Text>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setDetailsModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
  },
  listContent: {
    padding: SIZES.padding,
  },
  requestItem: {
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
  itemTitle: {
    fontSize: SIZES.heading3,
    fontFamily: FONTS.bold,
    marginBottom: 4,
  },
  itemDate: {
    fontSize: SIZES.small,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    marginBottom: 8,
  },
  itemStatus: {
    fontSize: SIZES.small,
    fontFamily: FONTS.semiBold,
    color: COLORS.primary,
    textTransform: 'capitalize',
  },
  detailsButton: {
    marginTop: 12,
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: SIZES.radius,
    alignSelf: 'flex-start',
  },
  detailsButtonText: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: SIZES.heading2,
    fontFamily: FONTS.bold,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: SIZES.body,
    fontFamily: FONTS.semiBold,
    color: COLORS.gray,
    marginBottom: 4,
  },
  modalValue: {
    fontSize: SIZES.body,
    fontFamily: FONTS.regular,
    color: COLORS.black,
  },
  contentBox: {
    backgroundColor: COLORS.lightGray,
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
    marginBottom: 16,
    maxHeight: 200,
  },
  contentText: {
    fontSize: SIZES.body,
    fontFamily: FONTS.regular,
    color: COLORS.black,
    lineHeight: 22,
  },
  noteText: {
    fontSize: SIZES.small,
    fontFamily: FONTS.italic,
    color: COLORS.gray,
    marginBottom: 20,
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: SIZES.body,
  },
});

export default MyRequestsScreen;