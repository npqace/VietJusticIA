import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Dimensions,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, FONTS } from '../../constants/styles';
import { Ionicons } from '@expo/vector-icons';
import DocumentsFilterModal from '../../components/Filter/DocumentsFilterModal';
import LoadingIndicator from '../../components/LoadingIndicator';
import Header from '../../components/Header';
import api from '../../api';
import { debounce } from 'lodash';

const { width } = Dimensions.get('window');

export interface FilterState {
  startDate: string;
  endDate: string;
  status: string;
  documentType: string;
  field: string;
  location: string;
}

// Define the structure of a document based on the new API response
interface Document {
  _id: string;
  title: string;
  issue_date: string;
  status: string;
  // Add other fields from your MongoDB document as needed
}

const DocumentLookupScreen = ({ navigation }: { navigation: any }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);

  const fetchDocuments = async (searchText = '', pageNum = 1, isNewSearch = false) => {
    if (isNewSearch) {
      setLoading(true);
      setDocuments([]); // Clear documents for a new search
    } else {
      setLoadingMore(true);
    }

    try {
      const response = await api.get('/api/v1/documents', {
        params: {
          search: searchText,
          page: pageNum,
          page_size: 20
        }
      });
      
      const { documents: newDocs, total_pages } = response.data as { documents: Document[], total_pages: number };

      setDocuments(prevDocs => isNewSearch ? newDocs : [...prevDocs, ...newDocs]);
      setTotalPages(total_pages);
      setPage(pageNum);

    } catch (error) {
      console.error("Failed to fetch documents:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Debounce the search handler to avoid excessive API calls
  const debouncedSearch = useCallback(debounce(fetchDocuments, 500), []);

  useEffect(() => {
    // Initial fetch or when search query changes
    debouncedSearch(searchQuery, 1, true);
  }, [searchQuery]);


  const handleLoadMore = () => {
    if (!loadingMore && page < totalPages) {
      fetchDocuments(searchQuery, page + 1);
    }
  };

  const handleApplyFilter = (filters: FilterState) => {
    console.log('Applied filters:', filters);
    // Here you would refetch documents with filter parameters
    // e.g., fetchDocuments(searchQuery, 1, true, filters);
    setFilterVisible(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Còn hiệu lực': return '#22C55E';
      case 'Hết hiệu lực': return '#EF4444';
      default: return COLORS.gray;
    }
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return <ActivityIndicator style={{ marginVertical: 20 }} size="large" color={COLORS.primary} />;
  };

  const renderItem = ({ item }: { item: Document }) => (
    <TouchableOpacity 
      key={item._id} 
      style={styles.documentItem}
      onPress={() => navigation.navigate('DocumentDetail', { documentId: item._id })}
    >
      <View style={styles.documentContent}>
        <Text style={styles.documentTitle}>{item.title}</Text>
        <Text style={styles.documentDate}>Ban hành: {item.issue_date}</Text>
        <Text style={[styles.documentStatus, { color: getStatusColor(item.status) }]}>
          Tình trạng: {item.status}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color={COLORS.gray} />
    </TouchableOpacity>
  );

  return (
    <LinearGradient
      colors={[COLORS.gradientStart, COLORS.gradientMiddle1, COLORS.gradientMiddle2, COLORS.gradientEnd]}
      locations={[0, 0.44, 0.67, 1]}
      style={styles.container}
    >
      <Header title="Tra cứu văn bản" showAddChat={true} />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.contentContainer}>

        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={COLORS.gray} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm tiêu đề, số hiệu"
              placeholderTextColor={COLORS.gray}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <TouchableOpacity 
              onPress={() => setFilterVisible(true)} 
              style={styles.filterButton}
            >  
              <Ionicons name="filter" size={20} color={COLORS.gray} />
            </TouchableOpacity>
          </View>
        </View>

        {loading && documents.length === 0 ? (
          <LoadingIndicator />
        ) : (
          <FlatList
            data={documents}
            renderItem={renderItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.scrollContent}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
            showsVerticalScrollIndicator={false}
          />
        )}

        <DocumentsFilterModal
          isVisible={filterVisible}
          onApplyFilter={handleApplyFilter}
          onClose={() => setFilterVisible(false)}
        />
      </View>
      </TouchableWithoutFeedback>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
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
    padding: 4
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
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
  },
});

export default DocumentLookupScreen;