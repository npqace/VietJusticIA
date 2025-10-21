import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, StyleSheet, Dimensions, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import RenderHTML from 'react-native-render-html';
import { COLORS, FONTS, SIZES } from '../../constants/styles';
import Header from '../../components/Header';
import api from '../../api';

const { width } = Dimensions.get('window');

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
  { key: 'issuer', label: 'Nơi ban hành' },
  { key: 'issue_date', label: 'Ngày ban hành' },
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
        setError(err.response?.data?.detail || "Failed to load document.");
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
            return (
              <View key={key} style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>{label}:</Text>
                <Text style={[styles.metadataValue, key === 'status' && { color: getStatusColor(String(value)) }]}>
                  {String(value)}
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
        </View>
      );
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  if (error || !document) {
    return <View style={styles.center}><Text style={styles.errorText}>{error || 'Document not found.'}</Text></View>;
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
});

export default DocumentDetailScreen;
