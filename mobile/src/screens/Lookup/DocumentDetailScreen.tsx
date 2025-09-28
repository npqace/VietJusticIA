import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Dimensions, TouchableOpacity, Image } from 'react-native';
import RenderHTML, { TDefaultRenderer } from 'react-native-render-html';
import { COLORS, FONTS, SIZES, LOGO_PATH } from '../../constants/styles';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const height = Dimensions.get('window').height;

const tagsStyles = {
  p: {
    marginBottom: 10,
    lineHeight: 24,
    fontSize: SIZES.body,
    fontFamily: FONTS.regular,
    color: COLORS.black,
  },
  b: {
    fontFamily: FONTS.bold,
  },
  strong: {
    fontFamily: FONTS.bold,
  },
  i: {
    fontFamily: FONTS.italic,
  },
  em: {
    fontFamily: FONTS.italic,
  },
  h1: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.heading1,
    marginBottom: 10,
    marginTop: 10,
  },
  h2: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.heading2,
    marginBottom: 10,
    marginTop: 10,
  },
  h3: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.heading3,
    marginBottom: 10,
    marginTop: 10,
  },
  table: {
    marginBottom: 10,
  },
  tr: {
    flexDirection: 'row' as const,
  },
  td: {
    flex: 1,
    padding: 5,
  },
  a: {
    color: COLORS.black,
    textDecorationLine: 'none' as const,
  },
};

const classesStyles = {
  'font-bold': {
    fontFamily: FONTS.bold,
  },
  'text-blue': {
    color: COLORS.primary,
  },
};

const metadataFields = [
  { key: 'tieu_de', label: 'Tiêu đề' },
  { key: 'so_hieu', label: 'Số hiệu' },
  { key: 'loai_van_ban', label: 'Loại văn bản' },
  { key: 'noi_ban_hanh', label: 'Nơi ban hành' },
  { key: 'ngay_ban_hanh', label: 'Ngày ban hành' },
  { key: 'tinh_trang', label: 'Tình trạng' },
];

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
  const { document, documentsData } = route.params;
  const [activeTab, setActiveTab] = useState('content');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Còn hiệu lực':
        return '#22C55E'; // green
      case 'Hết hiệu lực':
        return '#EF4444'; // red
      case 'Không còn phù hợp':
        return '#EF4444'; // red
      case 'Không xác định':
        return '#6B7280'; // grey
      default:
        return COLORS.text;
    }
  };

  const handleLinkPress = (event: any, href: string) => {
    const docId = href.split('/').pop();
    const linkedDoc = documentsData.find((doc: any) => doc.id === docId);
    if (linkedDoc) {
      navigation.push('DocumentDetail', { document: linkedDoc, documentsData });
    }
  };

  const renderContent = () => {
    if (activeTab === 'content') {
      return (
        <RenderHTML
          contentWidth={width}
          source={{ html: document.html_content }}
          tagsStyles={tagsStyles}
          classesStyles={classesStyles}
          systemFonts={[FONTS.regular, FONTS.bold, FONTS.italic]}
          renderers={renderers}
          renderersProps={{
            a: {
              onPress: handleLinkPress,
            },
          }}
        />
      );
    } else {
      return (
        <View>
          {metadataFields.map(({ key, label }) => {
            const value = document[key];
            if (!value) return null;

            if (key === 'tinh_trang') {
              return (
                <View key={key} style={styles.metadataRow}>
                  <Text style={styles.metadataLabel}>{label}:</Text>
                  <Text style={[styles.metadataValue, { color: getStatusColor(String(value)) }]}>
                    {String(value)}
                  </Text>
                </View>
              );
            }

            return (
              <View key={key} style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>{label}:</Text>
                <Text style={styles.metadataValue}>{String(value)}</Text>
              </View>
            );
          })}
        </View>
      );
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
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
  container: {
    flexGrow: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    height: height * 0.07,
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
  contentContainer: {
    padding: 16,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabButtonText: {
    fontFamily: FONTS.semiBold,
    fontSize: SIZES.body,
    color: COLORS.gray,
  },
  activeTabButtonText: {
    color: COLORS.primary,
  },
  metadataRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  metadataLabel: {
    fontFamily: FONTS.boldItalic,
    fontSize: SIZES.body,
    color: COLORS.black,
    marginRight: 8,
  },
  metadataValue: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.body,
    color: COLORS.text,
    flex: 1,
  },
});

export default DocumentDetailScreen;