import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS, FONTS, SIZES } from '../constants/styles';

const { width } = Dimensions.get('window');

interface HeaderProps {
  title: string;
  showAddChat?: boolean;
}

const Header = ({ title, showAddChat = false }: HeaderProps) => {
  const navigation = useNavigation();

  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
        <Ionicons name="arrow-back" size={24} color={COLORS.black} />
      </TouchableOpacity>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.rightIconsContainer}>
        {showAddChat && (
          <TouchableOpacity onPress={() => navigation.navigate('Chat' as never)} style={styles.iconButton}>
            <Ionicons name="add-circle-outline" size={30} color={COLORS.gray} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingTop: 60, // Add padding for status bar
    height: 126, // Adjust height to include status bar
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
    zIndex: 10,
  },
  iconButton: {
    padding: 8,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.heading3,
    color: COLORS.black,
    textAlign: 'center',
    flex: 1,
    marginHorizontal: 8,
  },
  rightIconsContainer: {
    flexDirection: 'row',
    minWidth: 40, // Ensure the container has a minimum width to balance the back button
    justifyContent: 'flex-end',
  },
});

export default Header;