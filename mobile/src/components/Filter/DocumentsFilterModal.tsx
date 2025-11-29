import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Modal,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ViewStyle,
  Platform,
  ScrollView,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS, FONTS } from '../../constants/styles';
import CustomButton from '../CustomButton';
import api from '../../api';

const { height: screenHeight } = Dimensions.get('window');

interface FilterOption {
  id: string;
  label: string;
}

interface FilterProps {
  onApplyFilter: (filters: FilterState) => void;
  containerStyle?: StyleProp<ViewStyle>;
  isVisible: boolean;
  onClose: () => void;
}

interface FilterState {
  startDate: string;
  endDate: string;
  status: string;
  documentType: string;
  field: string;
  location: string;
}

const DocumentsFilterModal = ({ onApplyFilter, containerStyle, isVisible, onClose }: FilterProps) => {
  const [filters, setFilters] = useState<FilterState>({
    startDate: '',
    endDate: '',
    status: 'Tất cả',
    documentType: 'Tất cả',
    field: 'Tất cả',
    location: 'Tất cả',
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [currentFilterType, setCurrentFilterType] = useState<keyof Omit<FilterState, 'startDate' | 'endDate'> | null>(null);
  const translateY = new Animated.Value(0);

  // Date picker states
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [startDateObj, setStartDateObj] = useState<Date | undefined>(undefined);
  const [endDateObj, setEndDateObj] = useState<Date | undefined>(undefined);

  // Dynamic filter options loaded from backend
  const [statusOptions, setStatusOptions] = useState<FilterOption[]>([{ id: 'all', label: 'Tất cả' }]);
  const [documentTypeOptions, setDocumentTypeOptions] = useState<FilterOption[]>([{ id: 'all', label: 'Tất cả' }]);
  const [fieldOptions, setFieldOptions] = useState<FilterOption[]>([{ id: 'all', label: 'Tất cả' }]);
  const [locationOptions, setLocationOptions] = useState<FilterOption[]>([{ id: 'all', label: 'Tất cả' }]);

  // Fetch filter options from backend
  useEffect(() => {
    if (isVisible) {
      fetchFilterOptions();
    }
  }, [isVisible]);

  const fetchFilterOptions = async () => {
    try {
      const response = await api.get('/api/v1/documents/filters/options');
      const { statuses, document_types, categories, issuers } = response.data;

      // Convert to FilterOption format and add "Tất cả" option
      setStatusOptions([
        { id: 'all', label: 'Tất cả' },
        ...statuses.map((s: string) => ({ id: s, label: s }))
      ]);

      setDocumentTypeOptions([
        { id: 'all', label: 'Tất cả' },
        ...document_types.map((d: string) => ({ id: d, label: d }))
      ]);

      setFieldOptions([
        { id: 'all', label: 'Tất cả' },
        ...categories.map((c: string) => ({ id: c, label: c }))
      ]);

      setLocationOptions([
        { id: 'all', label: 'Tất cả' },
        ...issuers.map((i: string) => ({ id: i, label: i }))
      ]);
    } catch (error) {
      console.error('Failed to fetch filter options:', error);
    }
  };

  const getOptionsForType = (type: keyof Omit<FilterState, 'startDate' | 'endDate'>) => {
    switch (type) {
      case 'status':
        return statusOptions;
      case 'documentType':
        return documentTypeOptions;
      case 'field':
        return fieldOptions;
      case 'location':
        return locationOptions;
      default:
        return [];
    }
  };

  const handleOptionSelect = (option: FilterOption) => {
    if (currentFilterType) {
      setFilters({
        ...filters,
        [currentFilterType]: option.label,
      });
      setModalVisible(false);
    }
  };

  const openDropdown = (type: keyof Omit<FilterState, 'startDate' | 'endDate'>) => {
    setCurrentFilterType(type);
    setModalVisible(true);
  };

  // Format date to dd/mm/yyyy
  const formatDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Handle start date change
  const onStartDateChange = (event: any, selectedDate?: Date) => {
    // On Android, close the picker after selection/dismissal
    if (Platform.OS === 'android') {
      setShowStartDatePicker(false);
    }

    if (selectedDate && event.type !== 'dismissed') {
      setStartDateObj(selectedDate);
      setFilters({ ...filters, startDate: formatDate(selectedDate) });
    }
  };

  // Handle end date change
  const onEndDateChange = (event: any, selectedDate?: Date) => {
    // On Android, close the picker after selection/dismissal
    if (Platform.OS === 'android') {
      setShowEndDatePicker(false);
    }

    if (selectedDate && event.type !== 'dismissed') {
      setEndDateObj(selectedDate);
      setFilters({ ...filters, endDate: formatDate(selectedDate) });
    }
  };

  // Clear start date
  const clearStartDate = () => {
    setShowStartDatePicker(false);
    setStartDateObj(undefined);
    setFilters({ ...filters, startDate: '' });
  };

  // Clear end date
  const clearEndDate = () => {
    setShowEndDatePicker(false);
    setEndDateObj(undefined);
    setFilters({ ...filters, endDate: '' });
  };

  const handleApplyFilter = () => {
    onApplyFilter(filters);
    onClose();
  };

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: translateY } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { translationY, velocityY } = event.nativeEvent;
      
      if (translationY > 50 || velocityY > 500) {
        // Close modal if swiped down enough or with enough velocity
        onClose();
      }
      
      // Reset animation
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalBackdrop}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <PanGestureHandler
              onGestureEvent={onGestureEvent}
              onHandlerStateChange={onHandlerStateChange}
            >
              <Animated.View 
                style={[
                  styles.modalContainer,
                  {
                    transform: [{ translateY }],
                  }
                ]}
              >
                {/* Drag indicator */}
                <View style={styles.dragIndicator} />

                <Text style={styles.title}>Lọc văn bản theo:</Text>

                <ScrollView
                  style={styles.scrollView}
                  contentContainerStyle={styles.scrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.filterSection}>
                    <Text style={styles.sectionTitle}>Thời gian ban hành</Text>
                    <View style={styles.dateContainer}>
                      <TouchableOpacity
                        style={styles.dateInputContainer}
                        onPress={() => {
                          setShowEndDatePicker(false);
                          setShowStartDatePicker(true);
                        }}
                      >
                        <Text style={[styles.dateInput, !filters.startDate && styles.placeholderText]}>
                          {filters.startDate || 'dd/mm/yyyy'}
                        </Text>
                        <Ionicons name="calendar-outline" size={18} color={COLORS.gray} />
                        {filters.startDate && (
                          <TouchableOpacity onPress={clearStartDate} style={styles.clearButton}>
                            <Ionicons name="close-circle" size={18} color={COLORS.gray} />
                          </TouchableOpacity>
                        )}
                      </TouchableOpacity>

                      <Text style={styles.dateToText}>đến</Text>

                      <TouchableOpacity
                        style={styles.dateInputContainer}
                        onPress={() => {
                          setShowStartDatePicker(false);
                          setShowEndDatePicker(true);
                        }}
                      >
                        <Text style={[styles.dateInput, !filters.endDate && styles.placeholderText]}>
                          {filters.endDate || 'dd/mm/yyyy'}
                        </Text>
                        <Ionicons name="calendar-outline" size={18} color={COLORS.gray} />
                        {filters.endDate && (
                          <TouchableOpacity onPress={clearEndDate} style={styles.clearButton}>
                            <Ionicons name="close-circle" size={18} color={COLORS.gray} />
                          </TouchableOpacity>
                        )}
                      </TouchableOpacity>
                    </View>

                    {/* Date Pickers */}
                    {showStartDatePicker && (
                      <DateTimePicker
                        value={startDateObj || new Date()}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={onStartDateChange}
                        maximumDate={endDateObj || new Date()}
                      />
                    )}
                    {showEndDatePicker && (
                      <DateTimePicker
                        value={endDateObj || new Date()}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={onEndDateChange}
                        minimumDate={startDateObj}
                        maximumDate={new Date()}
                      />
                    )}
                  </View>

                  <View style={styles.filterSection}>
                    <Text style={styles.sectionTitle}>Tình trạng</Text>
                    <TouchableOpacity 
                      style={styles.dropdown} 
                      onPress={() => openDropdown('status')}
                    >
                      <Text style={styles.dropdownText}>{filters.status}</Text>
                      <Ionicons name="chevron-down" size={16} color={COLORS.gray} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.filterSection}>
                    <Text style={styles.sectionTitle}>Loại văn bản</Text>
                    <TouchableOpacity 
                      style={styles.dropdown} 
                      onPress={() => openDropdown('documentType')}
                    >
                      <Text style={styles.dropdownText}>{filters.documentType}</Text>
                      <Ionicons name="chevron-down" size={16} color={COLORS.gray} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.filterSection}>
                    <Text style={styles.sectionTitle}>Lĩnh vực, ngành</Text>
                    <TouchableOpacity 
                      style={styles.dropdown} 
                      onPress={() => openDropdown('field')}
                    >
                      <Text style={styles.dropdownText}>{filters.field}</Text>
                      <Ionicons name="chevron-down" size={16} color={COLORS.gray} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.filterSection}>
                    <Text style={styles.sectionTitle}>Nơi ban hành</Text>
                    <TouchableOpacity
                      style={styles.dropdown}
                      onPress={() => openDropdown('location')}
                    >
                      <Text style={styles.dropdownText}>{filters.location}</Text>
                      <Ionicons name="chevron-down" size={16} color={COLORS.gray} />
                    </TouchableOpacity>
                  </View>
                </ScrollView>

                <View style={styles.buttonContainer}>
                  <CustomButton
                    title="Áp dụng bộ lọc"
                    onPress={handleApplyFilter}
                    buttonStyle={styles.applyButton}
                    textStyle={styles.applyButtonText}
                  />
                </View>
              </Animated.View>
            </PanGestureHandler>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>

      {/* Dropdown Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <FlatList
                  data={currentFilterType ? getOptionsForType(currentFilterType) : []}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.optionItem}
                      onPress={() => handleOptionSelect(item)}
                    >
                      <Text style={styles.optionText}>{item.label}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: screenHeight * 0.85,
    paddingBottom: 0,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  title: {
    fontFamily: FONTS.semiBold,
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 16,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 16,
  },
  filterSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    marginBottom: 10,
    color: COLORS.black,
    fontWeight: '600',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateInputContainer: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dateInput: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.black,
  },
  placeholderText: {
    color: COLORS.gray,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  dateToText: {
    marginHorizontal: 10,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.gray,
  },
  dropdown: {
    height: 50,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dropdownText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.black,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    paddingTop: 16,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  applyButton: {
    backgroundColor: COLORS.primary,
    height: 52,
    borderRadius: 12,
  },
  applyButtonText: {
    fontFamily: FONTS.semiBold,
    color: COLORS.white,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  optionItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  optionText: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.black,
  },
});

export default DocumentsFilterModal;
