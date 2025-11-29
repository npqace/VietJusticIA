import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, FONTS } from '../../constants/styles';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../components/Header';

const ProcedureLookupScreen = ({ navigation }: { navigation: any }) => {

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientMiddle1, COLORS.gradientMiddle2, COLORS.gradientEnd]}
        locations={[0, 0.44, 0.67, 1]}
        style={styles.container}
      >
                <Header title="Thủ tục hành chính" showAddChat={true} />

      {/* Upcoming Feature - Centered Message */}
      <View style={styles.upcomingContainer}>
        <Ionicons name="construct-outline" size={80} color={COLORS.primary} />
        <Text style={styles.upcomingTitle}>Sắp Ra Mắt</Text>
        <Text style={styles.upcomingDescription}>
          Tính năng tra cứu thủ tục hành chính{'\n'}
          đang được phát triển
        </Text>
        <View style={styles.upcomingBadge}>
          <Ionicons name="time-outline" size={16} color={COLORS.white} />
          <Text style={styles.upcomingBadgeText}>Đang phát triển</Text>
        </View>
      </View>
    </LinearGradient>
  </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  upcomingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  upcomingTitle: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.heading1,
    color: COLORS.primary,
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  upcomingDescription: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.body,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  upcomingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
  },
  upcomingBadgeText: {
    fontFamily: FONTS.semiBold,
    fontSize: SIZES.small,
    color: COLORS.white,
  },
});

export default ProcedureLookupScreen;