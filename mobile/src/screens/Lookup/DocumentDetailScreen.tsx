import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, StyleSheet, Dimensions, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import RenderHTML from 'react-native-render-html';
import { COLORS, FONTS, SIZES } from '../../constants/styles';
import Header from '../../components/Header';
import api from '../../api';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// Utility function to convert ISO date (yyyy-mm-dd) to display format (dd/mm/yyyy)
const formatDateForDisplay = (isoDate: string): string => {
  if (!isoDate) return '';
  try {
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
  } catch {
    return isoDate; // Return as-is if conversion fails
  }
};

// --- Reusable styles and configs ---
const tagsStyles = {
  p: { marginBottom: 10, lineHeight: 24, fontSize: SIZES.body, fontFamily: FONTS.regular, color: COLORS.black },
  b: { fontFamily: FONTS.bold },
  strong: { fontFamily: FONTS.bold },
  i: { fontFamily: FONTS.italic },
  em: { fontFamily: FONTS.italic },
  h1: { fontFamily: FONTS.bold, fontSize: SIZES.heading1, marginBottom: 10, marginTop: 10 },
  h2: { fontFamily: FONTS.bold, fontSize: SIZES.heading2, marginBottom: 10, marginTop: 10 },
  h3: { fontFamily: FONTS.bold, fontSize: SIZES.heading3, marginBottom: 10, marginTop: 10 },
  table: { marginBottom: 10 },
  tr: { flexDirection: 'row' as const },
  td: { flex: 1, padding: 5 },
  a: { color: COLORS.black, textDecorationLine: 'none' as const },
};

const classesStyles = {
  'font-bold': { fontFamily: FONTS.bold },
  'text-blue': { color: COLORS.primary },
};

const metadataFields = [
  { key: 'document_number', label: 'Số hiệu' },
  { key: 'document_type', label: 'Loại văn bản' },
  { key: 'category', label: 'Lĩnh vực/ngành' },
  { key: 'issuer', label: 'Nơi ban hành' },
  { key: 'signatory', label: 'Người ký' },
  { key: 'gazette_number', label: 'Số công báo' },
  { key: 'issue_date', label: 'Ngày ban hành' },
  { key: 'effective_date', label: 'Ngày hiệu lực' },
  { key: 'publish_date', label: 'Ngày đăng' },
  { key: 'status', label: 'Tình trạng' },
];

// Custom renderers for HTML content
const renderers = {
  p: (props: any) => {
    const { TDefaultRenderer, tnode } = props;
    const attribs = tnode.attributes;
    const style = attribs.style || '';
    if (attribs.align === 'center' || style.includes('text-align:center')) {
      return <TDefaultRenderer {...props} style={[props.style, { textAlign: 'center' }]} />;
    }
    return <TDefaultRenderer {...props} />;
  },
  span: (props: any) => {
    const { TDefaultRenderer, tnode } = props;
    const style = tnode.attributes.style || '';
    if (style.includes('font-size:12.0pt')) {
      return <TDefaultRenderer {...props} style={[props.style, { textAlign: 'center' }]} />;
    }
    return <TDefaultRenderer {...props} />;
  }
};

const DocumentDetailScreen = ({ route, navigation }: { route: any, navigation: any }) => {
  const { documentId } = route.params;
  const [document, setDocument] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('content');

  useEffect(() => {
    const fetchDocumentDetails = async () => {
      if (!documentId) return;
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/api/v1/documents/${documentId}`);
        setDocument(response.data);
      } catch (err: any) {
        if (err.response && (err.response.status === 404 || err.response.status === 500)) {
          setError('Tài liệu bạn tìm kiếm hiện không có sẵn hoặc đang được cập nhật. Vui lòng quay lại sau.');
        } else {
          setError('Không thể tải tài liệu. Vui lòng kiểm tra kết nối mạng và thử lại.');
        }
        console.error("Failed to fetch document details:", err);
      }
      setLoading(false);
    };

    fetchDocumentDetails();
  }, [documentId]);

  const handleLinkPress = (event: any, href: string) => {
    const docId = href.split('/').pop();
    if (docId) {
      // Push a new detail screen onto the stack for the linked document.
      // The new screen will then fetch its own data via its useEffect hook.
      navigation.push('DocumentDetail', { documentId: docId });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Còn hiệu lực': return '#22C55E';
      case 'Hết hiệu lực': return '#EF4444';
      case 'Không còn phù hợp': return '#EF4444';
      case 'Không xác định': return '#6B7280';
      default: return COLORS.text;
    }
  };

  const renderContent = () => {
    if (activeTab === 'content') {
      return (
        <RenderHTML
          contentWidth={width}
          source={{ html: document.html_content || '' }}
          tagsStyles={tagsStyles}
          classesStyles={classesStyles}
          systemFonts={[FONTS.regular, FONTS.bold, FONTS.italic]}
          renderers={renderers}
          renderersProps={{ a: { onPress: handleLinkPress } }}
        />
      );
    } else {
      return (
        <View>
          {/* Metadata Section */}
          {metadataFields.map(({ key, label }) => {
            const value = document[key];
            if (!value) return null;

            // Format dates to dd/mm/yyyy for display
            const displayValue = (key === 'issue_date' || key === 'effective_date' || key === 'publish_date')
              ? formatDateForDisplay(String(value))
              : String(value);

            return (
              <View key={key} style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>{label}:</Text>
                <Text style={[styles.metadataValue, key === 'status' && { color: getStatusColor(String(value)) }]}>
                  {displayValue}
                </Text>
              </View>
            );
          })}

          {/* ASCII Diagram Section */}
          {document.ascii_diagram && (
            <View style={styles.diagramContainer}>
              <Text style={styles.diagramTitle}>Sơ đồ tóm tắt</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator>
                <View style={{ paddingVertical: 5 }}>
                  {document.ascii_diagram.split('\n').map((line: string, index: number) => (
                    <Text key={index} style={styles.diagramText}>{line}</Text>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Related Documents Section */}
          {document.related_documents && document.related_documents.length > 0 && (
            <View style={styles.relatedDocsContainer}>
              <Text style={styles.diagramTitle}>Văn bản liên quan</Text>
              {document.related_documents.map((doc: any, index: number) => (
                <TouchableOpacity 
                  key={doc.doc_id || index} 
                  style={styles.relatedDocItem}
                  onPress={() => navigation.push('DocumentDetail', { documentId: doc.doc_id })}
                >
                  <Ionicons name="document-text-outline" size={16} color={COLORS.primary} style={styles.relatedDocIcon} />
                  <View style={{ flex: 1, justifyContent: 'center' }}>
                    {doc.document_number && (
                      <Text style={styles.relatedDocNumber} numberOfLines={1}>
                        {doc.document_number}
                      </Text>
                    )}
                    <Text style={styles.relatedDocTitle} numberOfLines={2} ellipsizeMode="tail">
                      {doc.title}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      );
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  if (error || !document) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.white }}>
        <Header title="Thông báo" />
        <View style={styles.center}>
          <Ionicons name="information-circle-outline" size={60} color={COLORS.gray} />
          <Text style={[styles.errorText, { marginTop: 20 }]}>
            {error || 'Đã có lỗi xảy ra. Vui lòng thử lại sau.'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <Header title={document.title} showAddChat={true} />

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'content' && styles.activeTabButton]}
          onPress={() => setActiveTab('content')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'content' && styles.activeTabButtonText]}>
            Nội dung
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'schema' && styles.activeTabButton]}
          onPress={() => setActiveTab('schema')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'schema' && styles.activeTabButtonText]}>
            Lược đồ
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.contentContainer}>
          {renderContent()}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: COLORS.white },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontFamily: FONTS.regular, fontSize: SIZES.body, color: COLORS.primary, textAlign: 'center' },
  contentContainer: { padding: 16 },
  tabBar: { flexDirection: 'row', backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: '#eee' },
  tabButton: { flex: 1, paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
  activeTabButton: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabButtonText: { fontFamily: FONTS.semiBold, fontSize: SIZES.body, color: COLORS.gray },
  activeTabButtonText: { color: COLORS.primary },
  metadataRow: { flexDirection: 'row', marginBottom: 12 },
  metadataLabel: { fontFamily: FONTS.bold, fontSize: SIZES.body, color: COLORS.black, marginRight: 8, width: '35%' },
  metadataValue: { fontFamily: FONTS.regular, fontSize: SIZES.body, color: COLORS.text, flex: 1 },
  diagramContainer: { backgroundColor: '#F5F5F5', borderRadius: 8, padding: 15, marginBottom: 20 },
  diagramTitle: { fontFamily: FONTS.bold, fontSize: SIZES.heading4, color: COLORS.primary, marginBottom: 15 },
  diagramText: { fontFamily: FONTS.mono, fontSize: SIZES.small, color: COLORS.text, lineHeight: SIZES.small * 1.4 },
  relatedDocsContainer: { marginTop: 10 },
  relatedDocItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  relatedDocIcon: {
    marginRight: 10,
  },
  relatedDocNumber: {
    fontFamily: FONTS.semiBold,
    fontSize: SIZES.small,
    color: COLORS.gray,
  },
  relatedDocTitle: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.body,
    color: COLORS.black,
  },
});

export default DocumentDetailScreen;
