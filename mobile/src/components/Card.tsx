import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES } from '../constants/styles';

interface CardItem {
  title: string;
  issueDate: string;
  status: string;
}

interface CardProps {
  item: CardItem;
  onPress: () => void;
}

const getStatusColor = (status: string) => {
    switch (status) {
      case 'Còn hiệu lực':
        return '#22C55E'; // Green
      case 'Hết hiệu lực':
        return '#EF4444'; // Red
      case 'Không xác định':
        return '#F59E0B'; // Orange
      case 'Không còn phù hợp':
        return '#6B7280'; // Gray
      default:
        return COLORS.gray;
    }
};

const Card = ({ item, onPress }: CardProps) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.cardHeader}>
        <Text style={styles.title}>{item.title}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.bodyText}>Ban hành: {item.issueDate}</Text>
        <Text style={[styles.documentStatus, { color: getStatusColor(item.status) }]}>
            Tình trạng: {item.status}
        </Text>
      </View>
      <View style={styles.cardFooter}>
        <Ionicons name="chevron-forward" size={24} color={COLORS.gray} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
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
  cardHeader: {
    marginBottom: 8,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.body,
    color: COLORS.black,
  },
  cardBody: {
    marginBottom: 8,
  },
  bodyText: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.small,
    color: COLORS.gray,
    marginBottom: 2,
  },
  cardFooter: {
    alignItems: 'flex-end',
  },
  documentStatus: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.small,
    color: COLORS.gray,
  },
});

export default Card;
