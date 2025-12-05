import React, { useState, useEffect } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES } from '../../constants/styles';

const { height: screenHeight } = Dimensions.get('window');

// Filter type definitions
export type FilterType = 'text' | 'dropdown' | 'dateRange' | 'ratingButtons' | 'toggle';

export interface FilterOption {
  id: string;
  label: string;
}

export interface FilterField {
  key: string;
  label: string;
  type: FilterType;
  placeholder?: string;
  options?: FilterOption[];
  ratingValues?: number[];
  currentValue?: any;
}

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: Record<string, any>) => void;
  onReset?: () => void;
  title: string;
  fields: FilterField[];
  initialValues?: Record<string, any>;
}

const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  onApply,
  onReset,
  title,
  fields,
  initialValues = {},
}) => {
  const [filters, setFilters] = useState<Record<string, any>>(initialValues);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [currentDropdownKey, setCurrentDropdownKey] = useState<string | null>(null);
  const translateY = new Animated.Value(0);

  // Date picker states
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [startDateObj, setStartDateObj] = useState<Date | undefined>(undefined);
  const [endDateObj, setEndDateObj] = useState<Date | undefined>(undefined);

  // Sync internal state with initialValues prop when it changes
  useEffect(() => {
    setFilters(initialValues);
  }, [initialValues]);

  // Update filter value
  const updateFilter = (key: string, value: any) => {
    setFilters({ ...filters, [key]: value });
  };

  // Handle dropdown selection
  const handleDropdownSelect = (option: FilterOption) => {
    if (currentDropdownKey) {
      updateFilter(currentDropdownKey, option.label);
      setDropdownVisible(false);
      setCurrentDropdownKey(null);
    }
  };

  // Open dropdown
  const openDropdown = (key: string) => {
    setCurrentDropdownKey(key);
    setDropdownVisible(true);
  };

  // Format date to dd/mm/yyyy
  const formatDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Handle start date change
  const onStartDateChange = (event: any, selectedDate?: Date, key?: string) => {
    if (Platform.OS === 'android') {
      setShowStartDatePicker(false);
    }

    if (selectedDate && event.type !== 'dismissed' && key) {
      setStartDateObj(selectedDate);
      updateFilter(key, formatDate(selectedDate));
    }
  };

  // Handle end date change
  const onEndDateChange = (event: any, selectedDate?: Date, key?: string) => {
    if (Platform.OS === 'android') {
      setShowEndDatePicker(false);
    }

    if (selectedDate && event.type !== 'dismissed' && key) {
      setEndDateObj(selectedDate);
      updateFilter(key, formatDate(selectedDate));
    }
  };

  // Clear date
  const clearDate = (key: string, isStart: boolean) => {
    updateFilter(key, '');
    if (isStart) {
      setStartDateObj(undefined);
      setShowStartDatePicker(false);
    } else {
      setEndDateObj(undefined);
      setShowEndDatePicker(false);
    }
  };

  // Handle apply
  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  // Handle reset
  const handleReset = () => {
    setFilters(initialValues);
    setStartDateObj(undefined);
    setEndDateObj(undefined);
    if (onReset) {
      onReset();
    }
  };

  // Gesture handlers
  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: translateY } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { translationY, velocityY } = event.nativeEvent;

      if (translationY > 50 || velocityY > 500) {
        onClose();
      }

      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    }
  };

  // Render different filter types
  const renderFilterField = (field: FilterField) => {
    const value = filters[field.key];

    switch (field.type) {
      case 'text':
        return (
          <View style={styles.filterSection} key={field.key}>
            <Text style={styles.sectionTitle}>{field.label}</Text>
            <TextInput
              style={styles.filterInput}
              placeholder={field.placeholder || ''}
              placeholderTextColor={COLORS.gray}
              value={value || ''}
              onChangeText={(text) => updateFilter(field.key, text)}
            />
          </View>
        );

      case 'dropdown':
        return (
          <View style={styles.filterSection} key={field.key}>
            <Text style={styles.sectionTitle}>{field.label}</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => openDropdown(field.key)}
            >
              <Text style={styles.dropdownText}>{value || 'Tất cả'}</Text>
              <Ionicons name="chevron-down" size={16} color={COLORS.gray} />
            </TouchableOpacity>
          </View>
        );

      case 'dateRange':
        return (
          <View style={styles.filterSection} key={field.key}>
            <Text style={styles.sectionTitle}>{field.label}</Text>
            <View style={styles.dateContainer}>
              <TouchableOpacity
                style={styles.dateInputContainer}
                onPress={() => {
                  setShowEndDatePicker(false);
                  setShowStartDatePicker(true);
                }}
              >
                <Text style={[styles.dateInput, !filters[`${field.key}Start`] && styles.placeholderText]}>
                  {filters[`${field.key}Start`] || 'dd/mm/yyyy'}
                </Text>
                <Ionicons name="calendar-outline" size={18} color={COLORS.gray} />
                {filters[`${field.key}Start`] && (
                  <TouchableOpacity onPress={() => clearDate(`${field.key}Start`, true)} style={styles.clearButton}>
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
                <Text style={[styles.dateInput, !filters[`${field.key}End`] && styles.placeholderText]}>
                  {filters[`${field.key}End`] || 'dd/mm/yyyy'}
                </Text>
                <Ionicons name="calendar-outline" size={18} color={COLORS.gray} />
                {filters[`${field.key}End`] && (
                  <TouchableOpacity onPress={() => clearDate(`${field.key}End`, false)} style={styles.clearButton}>
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
                onChange={(e, d) => onStartDateChange(e, d, `${field.key}Start`)}
                maximumDate={endDateObj || new Date()}
                themeVariant="light"
                textColor="black"
              />
            )}
            {showEndDatePicker && (
              <DateTimePicker
                value={endDateObj || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(e, d) => onEndDateChange(e, d, `${field.key}End`)}
                minimumDate={startDateObj}
                maximumDate={new Date()}
                themeVariant="light"
                textColor="black"
              />
            )}
          </View>
        );

      case 'ratingButtons':
        const ratingValues = field.ratingValues || [0, 3, 4, 4.5];
        return (
          <View style={styles.filterSection} key={field.key}>
            <Text style={styles.sectionTitle}>
              {field.label}: {value || 0} {value > 0 ? '⭐' : ''}
            </Text>
            <View style={styles.ratingButtons}>
              {ratingValues.map((rating) => (
                <TouchableOpacity
                  key={rating}
                  style={[
                    styles.ratingButton,
                    value === rating && styles.ratingButtonActive,
                  ]}
                  onPress={() => updateFilter(field.key, rating)}
                >
                  <Text
                    style={[
                      styles.ratingButtonText,
                      value === rating && styles.ratingButtonTextActive,
                    ]}
                  >
                    {rating > 0 ? `${rating}+` : 'Tất cả'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 'toggle':
        return (
          <TouchableOpacity
            key={field.key}
            style={styles.toggleRow}
            onPress={() => updateFilter(field.key, !value)}
          >
            <Text style={styles.sectionTitle}>{field.label}</Text>
            <View style={[styles.toggle, value && styles.toggleActive]}>
              {value && <View style={styles.toggleThumb} />}
            </View>
          </TouchableOpacity>
        );

      default:
        return null;
    }
  };

  // Get current dropdown options
  const getCurrentDropdownOptions = (): FilterOption[] => {
    if (!currentDropdownKey) return [];
    const field = fields.find((f) => f.key === currentDropdownKey);
    return field?.options || [];
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalBackdrop}>
          <TouchableWithoutFeedback onPress={() => { }}>
            <PanGestureHandler
              onGestureEvent={onGestureEvent}
              onHandlerStateChange={onHandlerStateChange}
            >
              <Animated.View
                style={[
                  styles.modalContainer,
                  {
                    transform: [{ translateY }],
                  },
                ]}
              >
                {/* Drag indicator */}
                <View style={styles.dragIndicator} />

                {/* Title */}
                <Text style={styles.title}>{title}</Text>

                {/* Filters */}
                <ScrollView
                  style={styles.scrollView}
                  contentContainerStyle={styles.scrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  {fields.map((field) => renderFilterField(field))}
                </ScrollView>

                {/* Action Buttons */}
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={styles.resetButton}
                    onPress={handleReset}
                  >
                    <Text style={styles.resetButtonText}>Đặt lại</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.applyButton}
                    onPress={handleApply}
                  >
                    <Text style={styles.applyButtonText}>Áp dụng</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </PanGestureHandler>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>

      {/* Dropdown Modal */}
      <Modal
        visible={dropdownVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDropdownVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setDropdownVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <FlatList
                  data={getCurrentDropdownOptions()}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.optionItem}
                      onPress={() => handleDropdownSelect(item)}
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
    maxHeight: screenHeight * 0.85,
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
    maxHeight: screenHeight * 0.7,
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
  filterInput: {
    height: 50,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.black,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
  ratingButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  ratingButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  ratingButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  ratingButtonText: {
    fontFamily: FONTS.semiBold,
    fontSize: SIZES.small,
    color: COLORS.gray,
  },
  ratingButtonTextActive: {
    color: COLORS.white,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: COLORS.primary,
    alignItems: 'flex-end',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.white,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    paddingTop: 16,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  resetButton: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonText: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.primary,
  },
  applyButton: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.white,
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

export default FilterModal;
