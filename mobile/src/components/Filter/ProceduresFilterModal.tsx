import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  TouchableWithoutFeedback,
  Modal,
  FlatList,
  StyleProp,
  ViewStyle,
  Animated,
  Dimensions,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
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
  issuingAuthority: string;
  implementingAuthority: string;
  implementationLevel: string;
  implementationSubject: string;
}

const ProcedureFilterModal = ({ onApplyFilter, containerStyle, isVisible, onClose }: FilterProps) => {
  const [filters, setFilters] = useState<FilterState>({
    issuingAuthority: 'Tất cả',
    implementingAuthority: 'Tất cả',
    implementationLevel: 'Tất cả',
    implementationSubject: 'Tất cả',
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [currentFilterType, setCurrentFilterType] = useState<keyof FilterState | null>(null);
  const translateY = new Animated.Value(0);

  const issuingAuthorityOptions: FilterOption[] = [
    { id: 'all', label: 'Tất cả' },
    { id: 'ha_giang', label: 'UBND tỉnh Hà Giang' },
    { id: 'ha_tinh', label: 'UBND tỉnh Hà Tĩnh' },
    { id: 'bac_kan', label: 'UBND tỉnh Bắc Kạn' },
  ];

  const implementingAuthorityOptions: FilterOption[] = [
    { id: 'all', label: 'Tất cả' },
    { id: 'industry_trade', label: 'Sở công thương' },
    { id: 'justice', label: 'Sở Tư Pháp' },
    { id: 'health', label: 'Sở Y Tế' },
  ];

  const implementationLevelOptions: FilterOption[] = [
    { id: 'all', label: 'Tất cả' },
    { id: 'province', label: 'Cấp tỉnh' },
    { id: 'district', label: 'Cấp huyện' },
    { id: 'commune', label: 'Cấp xã' },
  ];

  const implementationSubjectOptions: FilterOption[] = [
    { id: 'all', label: 'Tất cả' },
    { id: 'citizen', label: 'Công dân Việt Nam' },
    { id: 'enterprise', label: 'Doanh nghiệp' },
    { id: 'cooperative', label: 'Hợp tác xã' },
  ];

  const getOptionsForType = (type: keyof FilterState) => {
    switch (type) {
      case 'issuingAuthority':
        return issuingAuthorityOptions;
      case 'implementingAuthority':
        return implementingAuthorityOptions;
      case 'implementationLevel':
        return implementationLevelOptions;
      case 'implementationSubject':
        return implementationSubjectOptions;
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

  const openDropdown = (type: keyof FilterState) => {
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
                  <Text style={styles.title}>Lọc thủ tục theo:</Text>
                  
                  <View style={styles.filterSection}>
                    <Text style={styles.sectionTitle}>Cơ quan ban hành</Text>
                    <TouchableOpacity 
                      style={styles.dropdown} 
                      onPress={() => openDropdown('issuingAuthority')}
                    >
                      <Text style={styles.dropdownText}>{filters.issuingAuthority}</Text>
                      <Ionicons name="chevron-down" size={16} color={COLORS.gray} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.filterSection}>
                    <Text style={styles.sectionTitle}>Cơ quan thực hiện</Text>
                    <TouchableOpacity 
                      style={styles.dropdown} 
                      onPress={() => openDropdown('implementingAuthority')}
                    >
                      <Text style={styles.dropdownText}>{filters.implementingAuthority}</Text>
                      <Ionicons name="chevron-down" size={16} color={COLORS.gray} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.filterSection}>
                    <Text style={styles.sectionTitle}>Cấp thực hiện</Text>
                    <TouchableOpacity 
                      style={styles.dropdown} 
                      onPress={() => openDropdown('implementationLevel')}
                    >
                      <Text style={styles.dropdownText}>{filters.implementationLevel}</Text>
                      <Ionicons name="chevron-down" size={16} color={COLORS.gray} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.filterSection}>
                    <Text style={styles.sectionTitle}>Đối tượng thực hiện</Text>
                    <TouchableOpacity 
                      style={styles.dropdown} 
                      onPress={() => openDropdown('implementationSubject')}
                    >
                      <Text style={styles.dropdownText}>{filters.implementationSubject}</Text>
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
    height: screenHeight * 0.6,
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

export default ProcedureFilterModal;
export type { FilterState as ProceduresFilterState };

