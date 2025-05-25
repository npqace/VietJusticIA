import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import { COLORS, SIZES, FONTS } from '../constants/styles';
import Ionicons from '@expo/vector-icons/Ionicons';

const HelpItem = ({ title, content }: { title: string; content: string }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.itemContainer}>
      <TouchableOpacity
        style={styles.titleContainer}
        onPress={() => setExpanded(!expanded)}
      >
        <Ionicons style={styles.expandIcon} name={expanded ? 'chevron-down-outline' : 'chevron-forward-outline'} />
        <Text style={styles.titleText}>{title}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.contentContainer}>
          <Text style={styles.contentText}>{content}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  itemContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.white,
  },
  titleText: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: SIZES.body,
    color: COLORS.black,
  },
  expandIcon: {
    fontSize: SIZES.body,
    color: COLORS.gray,
    marginRight: 8,
  },
  contentContainer: {
    padding: 16,
    backgroundColor: '#f9f9f9',
  },
  contentText: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.small,
    color: COLORS.gray,
    lineHeight: 22,
  },
});

export default HelpItem;