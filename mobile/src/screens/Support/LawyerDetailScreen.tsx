import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  RefreshControl
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS, LOGO_PATH } from '../../constants/styles';
import api from '../../api';
import ServiceRequestModal from '../../components/Legal/ServiceRequestModal';
import Header from '../../components/Header';

interface LawyerDetail {
  id: number;
  full_name: string;
  avatar_url: string | null;
  email: string;
  phone: string;
  specialization: string;
  bio: string | null;
  city: string | null;
  province: string | null;
  rating: number;
  total_reviews: number;
  consultation_fee: number | null;
  is_available: boolean;
  years_of_experience: number;
  bar_license_number: string;
  languages: string;
  verification_status: string;
  created_at: string;
}

interface LawyerDetailScreenProps {
  route: any;
  navigation: any;
}

const LawyerDetailScreen: React.FC<LawyerDetailScreenProps> = ({ route, navigation }) => {
  const { lawyerId } = route.params;
  const [lawyer, setLawyer] = useState<LawyerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requestModalVisible, setRequestModalVisible] = useState(false);

  useEffect(() => {
    fetchLawyerDetail();
  }, [lawyerId]);

  const fetchLawyerDetail = async () => {
    try {
      if (!refreshing) setLoading(true);
      const response = await api.get(`/api/v1/lawyers/${lawyerId}`);
      setLawyer(response.data as LawyerDetail);
    } catch (error: any) {
      // console.error('Failed to fetch lawyer details:', error);
      Alert.alert(
        'Lỗi',
        'Không thể tải thông tin luật sư. Vui lòng thử lại.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchLawyerDetail();
  };

  const formatFee = (fee: number | null) => {
    if (!fee) return 'Liên hệ';
    const feeNum = typeof fee === 'string' ? parseFloat(fee) : fee;
    return `${(feeNum / 1000).toFixed(0)}k VND/giờ`;
  };

  const formatRating = (rating: number) => {
    const ratingNum = typeof rating === 'string' ? parseFloat(rating) : rating;
    return isNaN(ratingNum) ? '0.0' : ratingNum.toFixed(1);
  };

  const handleRequestService = () => {
    if (!lawyer?.is_available) {
      Alert.alert('Thông báo', 'Luật sư hiện không nhận yêu cầu tư vấn.');
      return;
    }
    setRequestModalVisible(true);
  };

  const handleRequestSuccess = () => {
    setRequestModalVisible(false);
    Alert.alert(
      'Thành công',
      'Yêu cầu của bạn đã được gửi đến luật sư. Chúng tôi sẽ thông báo khi có phản hồi.',
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  };

  if (loading) {
    return (
      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientMiddle1, COLORS.gradientMiddle2, COLORS.gradientEnd]}
        locations={[0, 0.44, 0.67, 1]}
        style={styles.container}
      >
        <Header title="Chi tiết luật sư" showAddChat={false} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải thông tin luật sư...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (!lawyer) {
    return (
      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientMiddle1, COLORS.gradientMiddle2, COLORS.gradientEnd]}
        locations={[0, 0.44, 0.67, 1]}
        style={styles.container}
      >
        <Header title="Chi tiết luật sư" showAddChat={false} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={COLORS.error} />
          <Text style={styles.errorText}>Không tìm thấy thông tin luật sư</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[COLORS.gradientStart, COLORS.gradientMiddle1, COLORS.gradientMiddle2, COLORS.gradientEnd]}
      locations={[0, 0.44, 0.67, 1]}
      style={styles.container}
    >
      <Header title="Chi tiết luật sư" showAddChat={false} />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <Image
              source={lawyer.avatar_url ? { uri: lawyer.avatar_url } : LOGO_PATH}
              style={styles.avatar}
            />
            <View style={styles.profileInfo}>
              <Text style={styles.name}>{lawyer.full_name}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={18} color="#FFB800" />
                <Text style={styles.rating}>
                  {formatRating(lawyer.rating)} ({lawyer.total_reviews} đánh giá)
                </Text>
              </View>
              <View style={styles.statusBadge}>
                {lawyer.is_available ? (
                  <>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text style={styles.availableText}>Sẵn sàng tư vấn</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="close-circle" size={16} color={COLORS.error} />
                    <Text style={styles.unavailableText}>Bận</Text>
                  </>
                )}
              </View>
            </View>
          </View>

          {/* Specialization */}
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Ionicons name="briefcase-outline" size={20} color={COLORS.primary} />
              <Text style={styles.infoLabel}>Chuyên môn:</Text>
            </View>
            <Text style={styles.infoValue}>{lawyer.specialization}</Text>
          </View>

          {/* Bio */}
          {lawyer.bio && (
            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
                <Text style={styles.infoLabel}>Giới thiệu:</Text>
              </View>
              <Text style={styles.bioText}>{lawyer.bio}</Text>
            </View>
          )}

          {/* Experience */}
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={20} color={COLORS.primary} />
              <Text style={styles.infoLabel}>Kinh nghiệm:</Text>
            </View>
            <Text style={styles.infoValue}>{lawyer.years_of_experience} năm</Text>
          </View>

          {/* Location */}
          {(lawyer.city || lawyer.province) && (
            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={20} color={COLORS.primary} />
                <Text style={styles.infoLabel}>Địa điểm:</Text>
              </View>
              <Text style={styles.infoValue}>
                {[lawyer.city, lawyer.province].filter(Boolean).join(', ')}
              </Text>
            </View>
          )}

          {/* Languages */}
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Ionicons name="language-outline" size={20} color={COLORS.primary} />
              <Text style={styles.infoLabel}>Ngôn ngữ:</Text>
            </View>
            <Text style={styles.infoValue}>{lawyer.languages}</Text>
          </View>

          {/* Consultation Fee */}
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Ionicons name="cash-outline" size={20} color={COLORS.primary} />
              <Text style={styles.infoLabel}>Phí tư vấn:</Text>
            </View>
            <Text style={styles.feeValue}>{formatFee(lawyer.consultation_fee)}</Text>
          </View>

          {/* Contact Information */}
          <View style={styles.contactSection}>
            <Text style={styles.sectionTitle}>Thông tin liên hệ</Text>
            <View style={styles.contactRow}>
              <Ionicons name="mail-outline" size={18} color={COLORS.gray} />
              <Text style={styles.contactText}>{lawyer.email}</Text>
            </View>
            <View style={styles.contactRow}>
              <Ionicons name="call-outline" size={18} color={COLORS.gray} />
              <Text style={styles.contactText}>{lawyer.phone}</Text>
            </View>
          </View>

          {/* Bar License */}
          <View style={styles.licenseSection}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#10B981" />
            <Text style={styles.licenseText}>
              Chứng chỉ hành nghề: {lawyer.bar_license_number}
            </Text>
          </View>
        </View>

        {/* Request Service Button */}
        <TouchableOpacity
          style={[
            styles.requestButton,
            !lawyer.is_available && styles.requestButtonDisabled
          ]}
          onPress={handleRequestService}
          disabled={!lawyer.is_available}
        >
          <Ionicons
            name="paper-plane-outline"
            size={20}
            color={COLORS.white}
            style={styles.buttonIcon}
          />
          <Text style={styles.requestButtonText}>
            {lawyer.is_available ? 'Yêu cầu tư vấn' : 'Luật sư đang bận'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Service Request Modal */}
      {lawyer && (
        <ServiceRequestModal
          visible={requestModalVisible}
          onClose={() => setRequestModalVisible(false)}
          lawyerId={lawyer.id}
          lawyerName={lawyer.full_name}
          onSuccess={handleRequestSuccess}
        />
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    marginTop: 16,
    marginBottom: 24,
    fontFamily: FONTS.semiBold,
    fontSize: SIZES.body,
    color: COLORS.gray,
    textAlign: 'center',
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  backButtonText: {
    fontFamily: FONTS.semiBold,
    color: COLORS.white,
  },
  profileCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileHeader: {
    flexDirection: 'row',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.lightGray,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  name: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.heading2,
    color: COLORS.black,
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  rating: {
    fontFamily: FONTS.semiBold,
    fontSize: SIZES.body,
    color: COLORS.black,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
  },
  availableText: {
    fontFamily: FONTS.semiBold,
    fontSize: SIZES.small,
    color: '#10B981',
  },
  unavailableText: {
    fontFamily: FONTS.semiBold,
    fontSize: SIZES.small,
    color: COLORS.error,
  },
  infoSection: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  infoLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: SIZES.body,
    color: COLORS.black,
  },
  infoValue: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.body,
    color: COLORS.gray,
    marginLeft: 28,
  },
  bioText: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.body,
    color: COLORS.gray,
    marginLeft: 28,
    lineHeight: 22,
  },
  feeValue: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.heading3,
    color: COLORS.primary,
    marginLeft: 28,
  },
  contactSection: {
    marginTop: 8,
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.body,
    color: COLORS.black,
    marginBottom: 12,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  contactText: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.body,
    color: COLORS.gray,
  },
  licenseSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  licenseText: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.small,
    color: '#10B981',
    flex: 1,
  },
  requestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  requestButtonDisabled: {
    backgroundColor: COLORS.gray,
    shadowOpacity: 0.1,
  },
  buttonIcon: {
    marginRight: 8,
  },
  requestButtonText: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.body,
    color: COLORS.white,
  },
});

export default LawyerDetailScreen;
