import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Keyboard,
  TouchableWithoutFeedback
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, FONTS } from '../../constants/styles';
import { Ionicons } from '@expo/vector-icons';
import ProceduresFilterModal, { ProceduresFilterState } from '../../components/Filter/ProceduresFilterModal';
import Header from '../../components/Header';

const { width } = Dimensions.get('window');

const ProcedureLookupScreen = ({ navigation }: { navigation: any }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [procedures, setProcedures] = useState<Array<{ 
    id: number;
    title: string;
    issuingAgency: string;
    implementingAgency: string;
    implementationLevel: string;
  }>>([]);
  const [filterVisible, setFilterVisible] = useState(false);

  const searchProcedures = () => {
    if (searchQuery.trim() !== '') {
      setProcedures([
        { id: 1, title: 'Cấp hộ chiếu phổ thông ở trong nước (thực hiện tại cấp tỉnh)', issuingAgency: 'Bộ Công an', implementingAgency: 'Công an Tỉnh', implementationLevel: 'Cấp Tỉnh' },
        { id: 2, title: 'Đăng ký tạm trú', issuingAgency: 'Bộ Công an', implementingAgency: 'Công an Xã', implementationLevel: 'Cấp Xã' },
        { id: 3, title: 'Xác nhận thông tin về cư trú', issuingAgency: 'Bộ Công an', implementingAgency: 'Công an Xã', implementationLevel: 'Cấp Xã' },
      ]);
    } else {
      setProcedures([]);
    }
  };

  const handleApplyFilter = (filters: ProceduresFilterState) => {
    console.log('Applied filters:', filters);
    setFilterVisible(false);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientMiddle1, COLORS.gradientMiddle2, COLORS.gradientEnd]}
        locations={[0, 0.44, 0.67, 1]}
        style={styles.container}
      >
                <Header title="Thủ tục hành chính" showAddChat={true} />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={{ flex: 1 }}>
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={COLORS.gray} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Nhập từ khóa tìm kiếm"
              placeholderTextColor={COLORS.gray}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={searchProcedures}
            />
            <TouchableOpacity 
              onPress={() => setFilterVisible(true)} 
              style={styles.filterButton}
            >  
              <Ionicons name="filter" size={20} color={COLORS.gray} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {procedures.map((proc) => (
            <TouchableOpacity 
              key={proc.id} 
              style={styles.documentItem}
            >
              <View style={styles.documentContent}>
                <Text style={styles.documentTitle}>{proc.title}</Text>
                <Text style={styles.documentInfo}>Cơ quan ban hành: {proc.issuingAgency}</Text>
                <Text style={styles.documentInfo}>Cơ quan thực hiện: {proc.implementingAgency}</Text>
                <Text style={styles.documentInfo}>Cấp thực hiện: {proc.implementationLevel}</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={COLORS.gray} />
            </TouchableOpacity>
          ))}
        </ScrollView>
        <ProceduresFilterModal
          isVisible={filterVisible}
          onApplyFilter={handleApplyFilter}
          onClose={() => setFilterVisible(false)}
        />
        </View>
      </TouchableWithoutFeedback>
    </LinearGradient>
  </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    height: 'auto',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
    zIndex: 10,
  },
  logo: {
    width: width * 0.15,
    height: width * 0.15,
  },
  headerIcons: {
    flexDirection: 'row',
  },
  iconButton: {
    padding: 8,
    marginLeft: 8,
  },
  titleContainer: {
    backgroundColor: '#E9EFF5',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.heading2,
    color: COLORS.black,
    textAlign: 'center',
  },
  searchContainer: {
    // backgroundColor: '#E9EFF5',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  documentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  documentContent: {
    flex: 1,
  },
  documentTitle: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.body,
    color: COLORS.black,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  documentInfo: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.small -1,
    color: COLORS.gray,
    marginBottom: 2,
  },
});

export default ProcedureLookupScreen;