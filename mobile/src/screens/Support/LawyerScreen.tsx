import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { COLORS, FONTS } from '../../constants/styles';
import { LinearGradient } from 'expo-linear-gradient';
import LegalConsultantTab from '../../components/Legal/LegalConsultantTab';
import LawyerListTab from '../../components/Legal/LawyerListTab';
import Header from '../../components/Header';
import { LawyerScreenNavigationProp } from '../../types/navigation';

const { width } = Dimensions.get('window');

/**
 * Tab definitions for lawyer contact screen.
 * - consultant: Legal consultation request form
 * - find-lawyer: Browse and search lawyers
 */
const tabs = [
  { id: 'consultant', name: 'Nhận tư vấn pháp lý' },
  { id: 'find-lawyer', name: 'Tìm luật sư' }
];

/**
 * Lawyer contact screen with two tabs:
 * 1. Legal Consultant: Submit general legal consultation requests
 * 2. Find Lawyer: Browse lawyer profiles and send service requests
 *
 * The consultant tab is wrapped in ScrollView for form scrolling,
 * while find-lawyer tab uses FlatList internally (no wrapper needed).
 *
 * @component
 */
const LawyerScreen = () => {
  const navigation = useNavigation<LawyerScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('consultant');

  /**
   * Renders the active tab's content component.
   * Consultant tab: LegalConsultantTab (form)
   * Find-lawyer tab: LawyerListTab (FlatList)
   */
  const renderTabContent = () => {
    switch (activeTab) {
      case 'consultant': return <LegalConsultantTab />;
      case 'find-lawyer': return <LawyerListTab navigation={navigation} />;
      default: return null;
    };
  };

  return (
    <LinearGradient
      colors={[COLORS.gradientStart, COLORS.gradientMiddle1, COLORS.gradientMiddle2, COLORS.gradientEnd]}
      locations={[0, 0.44, 0.67, 1]}
      style={styles.container}
    >
      <Header title="Liên hệ luật sư" showAddChat={true} />

      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tabButton,
              activeTab === tab.id && styles.activeTabButton
            ]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.id && styles.activeTabText
              ]}
            >
              {tab.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Conditionally wrap in ScrollView - only for consultant tab */}
      {activeTab === 'consultant' ? (
        <ScrollView style={styles.contentScrollView}>
          {renderTabContent()}
        </ScrollView>
      ) : (
        <View style={styles.contentContainer}>
          {renderTabContent()}
        </View>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  activeTabButton: {
    backgroundColor: '#a4caf7',
    borderRadius: 8,
  },
  tabText: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: '#5E5E5E',
  },
  activeTabText: {
    fontFamily: FONTS.semiBold,
    color: COLORS.primary,
  },
  contentScrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
});

export default LawyerScreen;
