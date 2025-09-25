import React from 'react';
import { ScrollView, View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import RenderHTML from 'react-native-render-html';
import { COLORS, FONTS, SIZES } from '../../constants/styles';

const { width } = Dimensions.get('window');

const tagsStyles = {
  p: {
    marginBottom: 10,
    lineHeight: 24,
    fontSize: SIZES.medium,
    fontFamily: FONTS.regular,
    textAlign: 'justify',
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
    flexDirection: 'row',
  },
  td: {
    flex: 1,
    padding: 5,
  },
  a: {
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },
} as const;

const classesStyles = {
  'font-bold': {
    fontFamily: FONTS.bold,
  },
  'text-blue': {
    color: COLORS.primary,
  },
} as const;

const DocumentDetailScreen = ({ route, navigation }: { route: any, navigation: any }) => {
  const { document, documentsData } = route.params;

  const handleLinkPress = (event: any, href: string) => {
    const lastSegment = (href || '').replace(/\/$/, '').split('/').pop() || '';
    const match = lastSegment.match(/^[a-fA-F0-9]{24}$/);
    const docId = match ? match[0] : undefined;
    const linkedDoc = docId ? documentsData.find((doc: any) => doc.id === docId) : undefined;
    if (linkedDoc) {
      navigation.push('DocumentDetail', { document: linkedDoc, documentsData });
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{document.tieu_de}</Text>
      </View>
      <View style={styles.contentContainer}>
        <RenderHTML
          contentWidth={width}
          source={{ html: document.html_content && document.html_content.trim().length > 0 ? document.html_content : `<p>Không có nội dung để hiển thị.</p>` }}
          tagsStyles={tagsStyles}
          classesStyles={classesStyles}
          systemFonts={[FONTS.regular, FONTS.bold, FONTS.italic]}
          renderersProps={{
            a: {
              onPress: handleLinkPress,
            },
          }}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    backgroundColor: '#E9EFF5',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.heading4,
    color: COLORS.black,
    textAlign: 'center',
  },
  contentContainer: {
    padding: 16,
  },
});

export default DocumentDetailScreen;