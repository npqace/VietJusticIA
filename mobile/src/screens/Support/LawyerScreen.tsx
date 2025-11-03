import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SIZES, FONTS,  LOGO_PATH } from '../../constants/styles';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import LegalConsultantTab from '../../components/Legal/LegalConsultantTab';
import LawyerListTab from '../../components/Legal/LawyerListTab';
import Header from '../../components/Header';

const { width } = Dimensions.get('window');

const tabs = [
  {id: 'consultant', name: 'Nhận tư vấn pháp lý'},
  {id: 'find-lawyer', name: 'Tìm luật sư'}
];

const LawyerScreen = ({ navigation }: { navigation: any }) => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('consultant');

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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    marginBottom: 16,
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
