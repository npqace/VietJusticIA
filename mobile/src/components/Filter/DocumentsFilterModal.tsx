import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Modal,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ViewStyle,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { COLORS, FONTS } from '../../constants/styles';
import CustomButton from '../CustomButton';

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

  const statusOptions: FilterOption[] = [
    { id: 'all', label: 'Tất cả' },
    { id: 'active', label: 'Còn hiệu lực' },
    { id: 'inactive', label: 'Hết hiệu lực' },
  ];

  const documentTypeOptions: FilterOption[] = [
    { id: 'all', label: 'Tất cả' },
    { id: 'law', label: 'Luật' },
    { id: 'decree', label: 'Nghị định' },
    { id: 'circular', label: 'Thông tư' },
  ];

  const fieldOptions: FilterOption[] = [
    { id: 'all', label: 'Tất cả' },
    { id: 'civil', label: 'Dân sự' },
    { id: 'criminal', label: 'Hình sự' },
    { id: 'administrative', label: 'Hành chính' },
  ];

  const locationOptions: FilterOption[] = [
    { id: 'all', label: 'Tất cả' },
    { id: 'central', label: 'Trung ương' },
    { id: 'local', label: 'Địa phương' },
  ];

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
                
                <View style={[styles.container, containerStyle]}>
                  <Text style={styles.title}>Lọc văn bản theo:</Text>
                  
                  <View style={styles.filterSection}>
                    <Text style={styles.sectionTitle}>Thời gian ban hành</Text>
                    <View style={styles.dateContainer}>
                      <View style={styles.dateInputContainer}>
                        <TextInput
                          style={styles.dateInput}
                          placeholder="dd/mm/yyyy"
                          value={filters.startDate}
                          onChangeText={(text) => setFilters({ ...filters, startDate: text })}
                          keyboardType="numeric"
                        />
                      </View>
                      <Text style={styles.dateToText}>đến</Text>
                      <View style={styles.dateInputContainer}>
                        <TextInput
                          style={styles.dateInput}
                          placeholder="dd/mm/yyyy"
                          value={filters.endDate}
                          onChangeText={(text) => setFilters({ ...filters, endDate: text })}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>
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

                  <View style={styles.buttonContainer}>
                    <CustomButton
                      title="Áp dụng bộ lọc"
                      onPress={handleApplyFilter}
                      buttonStyle={styles.applyButton}
                      textStyle={styles.applyButtonText}
                    />
                  </View>
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: screenHeight * 0.7,
    paddingBottom: 10,
  },
  dragIndicator: {
    width: 100,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  title: {
    fontFamily: FONTS.semiBold,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 20,
    textAlign: 'center',
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 8,
    flex: 1,
  },
  filterSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    marginBottom: 8,
    color: COLORS.black,
    fontWeight: '500',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateInputContainer: {
    flex: 1,
    height: 45,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  dateInput: {
    fontFamily: FONTS.regular,
    fontSize: 14,
  },
  dateToText: {
    marginHorizontal: 12,
    fontFamily: FONTS.regular,
    fontSize: 14,
  },
  dropdown: {
    height: 45,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  dropdownText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.black,
  },
  buttonContainer: {
    marginTop: 'auto',
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 20,
  },
  applyButton: {
    backgroundColor: COLORS.primary,
    height: 50,
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
  },
  modalContent: {
    width: '80%',
    maxHeight: '60%',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
  },
  optionItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  optionText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.black,
  },
});

export default DocumentsFilterModal;
