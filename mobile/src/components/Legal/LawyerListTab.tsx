import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Image,
} from 'react-native';
import { COLORS, SIZES, FONTS, LOGO_PATH } from '../../constants/styles';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api';
import FilterModal, { FilterField, FilterOption } from '../Filter/FilterModal';

interface Lawyer {
  id: number;
  full_name: string;
  avatar_url: string | null;
  specialization: string;
  city: string | null;
  province: string | null;
  rating: number;
  total_reviews: number;
  consultation_fee: number | null;
  is_available: boolean;
  years_of_experience: number;
}

interface LawyerListTabProps {
  navigation: any;
}

const LawyerListTab: React.FC<LawyerListTabProps> = ({ navigation }) => {
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Filter states
  const [filters, setFilters] = useState({
    specialization: 'Tất cả',
    city: 'Tất cả',
    minRating: 0,
    availableOnly: false
  });

  // Filter options from backend
  const [filterOptions, setFilterOptions] = useState({
    specializations: [{ id: 'all', label: 'Tất cả' }] as FilterOption[],
    cities: [{ id: 'all', label: 'Tất cả' }] as FilterOption[],
  });

  useEffect(() => {
    fetchLawyers();
  }, []);

  const fetchLawyers = async (currentFilters = filters, currentSearch = searchQuery) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (currentSearch) params.append('search', currentSearch);
      if (currentFilters.specialization && currentFilters.specialization !== 'Tất cả') {
        params.append('specialization', currentFilters.specialization);
      }
      if (currentFilters.city && currentFilters.city !== 'Tất cả') {
        params.append('city', currentFilters.city);
      }
      if (currentFilters.minRating > 0) params.append('min_rating', currentFilters.minRating.toString());
      if (currentFilters.availableOnly) params.append('is_available', 'true');

      const response = await api.get(`/api/v1/lawyers?${params.toString()}`);
      setLawyers(response.data);
    } catch (error) {
      console.error('Failed to fetch lawyers:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch filter options from backend
  const fetchFilterOptions = async () => {
    try {
      const response = await api.get('/api/v1/lawyers/filters/options');
      const { specializations, cities } = response.data;

      setFilterOptions({
        specializations: [
          { id: 'all', label: 'Tất cả' },
          ...specializations.map((s: string) => ({ id: s, label: s }))
        ],
        cities: [
          { id: 'all', label: 'Tất cả' },
          ...cities.map((c: string) => ({ id: c, label: c }))
        ],
      });
    } catch (error) {
      console.error('Failed to fetch filter options:', error);
    }
  };

  // Fetch filter options when modal opens
  useEffect(() => {
    if (filterModalVisible) {
      fetchFilterOptions();
    }
  }, [filterModalVisible]);

  const handleSearch = () => {
    fetchLawyers();
  };

  const handleApplyFilters = (newFilters: Record<string, any>) => {
    const typedFilters = newFilters as typeof filters;
    setFilters(typedFilters);
    fetchLawyers(typedFilters);
  };

  const handleResetFilters = () => {
    const resetFilters = {
      specialization: 'Tất cả',
      city: 'Tất cả',
      minRating: 0,
      availableOnly: false
    };
    setFilters(resetFilters);
    fetchLawyers(resetFilters);
  };

  // Define filter fields configuration
  const filterFields: FilterField[] = [
    {
      key: 'specialization',
      label: 'Chuyên môn',
      type: 'dropdown',
      options: filterOptions.specializations,
    },
    {
      key: 'city',
      label: 'Thành phố',
      type: 'dropdown',
      options: filterOptions.cities,
    },
    {
      key: 'minRating',
      label: 'Đánh giá tối thiểu',
      type: 'ratingButtons',
      ratingValues: [0, 3, 4, 4.5],
    },
    {
      key: 'availableOnly',
      label: 'Chỉ hiển thị luật sư đang rảnh',
      type: 'toggle',
    },
  ];

  const formatFee = (fee: number | null) => {
    if (!fee) return 'Liên hệ';
    const feeNum = typeof fee === 'string' ? parseFloat(fee) : fee;
    return `${(feeNum / 1000).toFixed(0)}k VND/giờ`;
  };

  const formatRating = (rating: number) => {
    const ratingNum = typeof rating === 'string' ? parseFloat(rating) : rating;
    return isNaN(ratingNum) ? '0.0' : ratingNum.toFixed(1);
  };

  const renderLawyerCard = ({ item }: { item: Lawyer }) => (
    <TouchableOpacity
      style={styles.lawyerCard}
      onPress={() => navigation.navigate('LawyerDetail', { lawyerId: item.id })}
    >
      <View style={styles.lawyerCardHeader}>
        <Image
          source={item.avatar_url ? { uri: item.avatar_url } : LOGO_PATH}
          style={styles.avatar}
        />
        <View style={styles.lawyerInfo}>
          <Text style={styles.lawyerName}>{item.full_name}</Text>
          <Text style={styles.specialization} numberOfLines={1}>
            {item.specialization}
          </Text>
          {(item.city || item.province) && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color={COLORS.gray} />
              <Text style={styles.location}>
                {item.city || item.province}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.lawyerCardFooter}>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={16} color="#FFB800" />
          <Text style={styles.rating}>
            {formatRating(item.rating)} ({item.total_reviews})
          </Text>
        </View>

        <View style={styles.feeRow}>
          <Ionicons name="cash-outline" size={16} color={COLORS.primary} />
          <Text style={styles.fee}>{formatFee(item.consultation_fee)}</Text>
        </View>

        <View style={styles.availabilityBadge}>
          {item.is_available ? (
            <>
              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              <Text style={styles.availableText}>Sẵn sàng</Text>
            </>
          ) : (
            <>
              <Ionicons name="close-circle" size={14} color={COLORS.error} />
              <Text style={styles.unavailableText}>Bận</Text>
            </>
          )}
        </View>
      </View>

      <Text style={styles.experience}>{item.years_of_experience} năm kinh nghiệm</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={COLORS.gray} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm luật sư theo tên..."
            placeholderTextColor={COLORS.gray}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setFilterModalVisible(true)}
          >
            <Ionicons name="filter" size={20} color={COLORS.gray} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Lawyer List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải danh sách luật sư...</Text>
        </View>
      ) : lawyers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color={COLORS.gray} />
          <Text style={styles.emptyText}>Không tìm thấy luật sư phù hợp</Text>
          <TouchableOpacity onPress={handleResetFilters}>
            <Text style={styles.resetText}>Xóa bộ lọc</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={lawyers}
          renderItem={renderLawyerCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Filter Modal */}
      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
        title="Bộ lọc"
        fields={filterFields}
        initialValues={filters}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    // paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: SIZES.body,
    color: COLORS.black,
    padding: 0,
  },
  filterButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  loadingText: {
    marginTop: 12,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    marginTop: 16,
    fontFamily: FONTS.semiBold,
    fontSize: SIZES.body,
    color: COLORS.gray,
  },
  resetText: {
    marginTop: 8,
    fontFamily: FONTS.regular,
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },
  listContent: {
    flexGrow: 1,
    // paddingHorizontal: 16,
    paddingBottom: 16,
  },
  lawyerCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lawyerCardHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.lightGray,
  },
  lawyerInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  lawyerName: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.body,
    color: COLORS.black,
    marginBottom: 4,
  },
  specialization: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.small,
    color: COLORS.gray,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  location: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.small,
    color: COLORS.gray,
  },
  lawyerCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontFamily: FONTS.semiBold,
    fontSize: SIZES.small,
    color: COLORS.black,
  },
  feeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fee: {
    fontFamily: FONTS.semiBold,
    fontSize: SIZES.small,
    color: COLORS.primary,
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
  },
  availableText: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.small,
    color: '#10B981',
  },
  unavailableText: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.small,
    color: COLORS.error,
  },
  experience: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.small,
    color: COLORS.gray,
    fontStyle: 'italic',
  },
});

export default LawyerListTab;
