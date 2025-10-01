import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, FONTS, LOGO_PATH } from '../../constants/styles';
import { Ionicons } from '@expo/vector-icons';
import DocumentsFilterModal from '../../components/Filter/DocumentsFilterModal';
import LoadingIndicator from '../../components/LoadingIndicator';

const { width } = Dimensions.get('window');

export interface FilterState {
  startDate: string;
  endDate: string;
  status: string;
  documentType: string;
  field: string;
  location: string;
}

import documentsData from '../../../assets/data/documents.json';

const DocumentLookupScreen = ({ navigation }: { navigation: any }) => {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [documents, setDocuments] = useState<Array<{ 
    id: string; 
    tieu_de: string; 
    ngay_ban_hanh: string; 
    tinh_trang: string; 
    html_content: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [filterVisible, setFilterVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setDocuments(documentsData);
      setLoading(false);
    }, 300);
  }, []);

  const searchDocuments = () => {
    if (searchQuery.trim() !== '') {
      const filteredDocuments = documentsData.filter((doc) =>
        doc.tieu_de.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setDocuments(filteredDocuments);
    } else {
      setDocuments(documentsData);
    }
  };

  const handleApplyFilter = (filters: FilterState) => {
    console.log('Applied filters:', filters);
    setFilterVisible(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Còn hiệu lực': return '#22C55E';
      case 'Hết hiệu lực': return '#EF4444';
      case 'Không xác định': return '#F59E0B';
      case 'Không còn phù hợp': return '#6B7280';
      default: return COLORS.gray;
    }
  };

  const renderContent = () => {
    if (loading) {
      return <LoadingIndicator />;
    }
    return (
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {documents.map((doc) => (
          <TouchableOpacity 
            key={doc.id} 
            style={styles.documentItem}
            onPress={() => navigation.navigate('DocumentDetail', { document: doc, documentsData: documentsData })}
          >
            <View style={styles.documentContent}>
              <Text style={styles.documentTitle}>{doc.tieu_de}</Text>
              <Text style={styles.documentDate}>Ban hành: {doc.ngay_ban_hanh}</Text>
              <Text style={[styles.documentStatus, { color: getStatusColor(doc.tinh_trang) }]}>
                Tình trạng: {doc.tinh_trang}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={COLORS.gray} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  return (
    <LinearGradient
      colors={[COLORS.gradientStart, COLORS.gradientMiddle1, COLORS.gradientMiddle2, COLORS.gradientEnd]}
      locations={[0, 0.44, 0.67, 1]}
      style={styles.container}
    >
      <View style={[styles.header, { paddingTop: insets.top, paddingBottom: 8 }]}>
        <Image
          source={LOGO_PATH}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="add-circle-outline" size={30} color={COLORS.gray} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('Menu')}>
            <Ionicons name="menu" size={30} color={COLORS.gray} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.titleContainer}>
        <Text style={styles.title}>Tra cứu văn bản</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={COLORS.gray} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm tiêu đề, số hiệu"
            placeholderTextColor={COLORS.gray}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={searchDocuments}
          />
          <TouchableOpacity 
            onPress={() => setFilterVisible(true)} 
            style={styles.filterButton}
          >  
            <Ionicons name="filter" size={20} color={COLORS.gray} />
          </TouchableOpacity>
        </View>
      </View>

      {renderContent()}

      <DocumentsFilterModal
        isVisible={filterVisible}
        onApplyFilter={handleApplyFilter}
        onClose={() => setFilterVisible(false)}
      />
    </LinearGradient>
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
    backgroundColor: '#E9EFF5',
    paddingHorizontal: 16,
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
    fontFamily: FONTS.bold,
    fontSize: SIZES.body,
    color: COLORS.black,
    marginBottom: 4,
  },
  documentDate: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.small,
    color: COLORS.gray,
    marginBottom: 2,
  },
  documentStatus: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.small,
    color: COLORS.gray,
  },
});

export default DocumentLookupScreen;