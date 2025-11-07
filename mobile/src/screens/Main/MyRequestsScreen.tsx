import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import api from '../../api';
import { COLORS, FONTS, SIZES } from '../../constants/styles';
import Header from '../../components/Header';

// Define types for the request items
interface ServiceRequest {
  id: number;
  title: string;
  status: string;
  created_at: string;
}

interface ConsultationRequest {
  id: number;
  content: string;
  status: string;
  created_at: string;
}

interface HelpRequest {
  id: number;
  subject: string;
  status: string;
  created_at: string;
}

const MyRequestsScreen = ({ navigation }: { navigation: any }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [requests, setRequests] = useState({
    service_requests: [],
    consultation_requests: [],
    help_requests: [],
  });

  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'service', title: 'Service' },
    { key: 'consultation', title: 'Consultation' },
    { key: 'help', title: 'Help' },
  ]);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const response = await api.get('/api/v1/users/me/requests');
        setRequests(response.data);
      } catch (error) {
        console.error("Failed to fetch requests:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequests();
  }, []);

  const renderRequestItem = ({ item }: { item: ServiceRequest | ConsultationRequest | HelpRequest }) => (
    <View style={styles.requestItem}>
      <Text style={styles.itemTitle}>{'title' in item ? item.title : 'subject' in item ? item.subject : item.content}</Text>
      <Text style={styles.itemDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
      <Text style={styles.itemStatus}>{item.status}</Text>
      {'title' in item && (
        <TouchableOpacity style={styles.detailsButton} onPress={() => { /* TODO: Navigate to chat */ }}>
          <Text style={styles.detailsButtonText}>View Details</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const ServiceRoute = () => (
    <FlatList
      data={requests.service_requests}
      renderItem={renderRequestItem}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={styles.listContent}
    />
  );

  const ConsultationRoute = () => (
    <FlatList
      data={requests.consultation_requests}
      renderItem={renderRequestItem}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={styles.listContent}
    />
  );

  const HelpRoute = () => (
    <FlatList
      data={requests.help_requests}
      renderItem={renderRequestItem}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={styles.listContent}
    />
  );

  const renderScene = SceneMap({
    service: ServiceRoute,
    consultation: ConsultationRoute,
    help: HelpRoute,
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="My Requests" />
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={{ width: SIZES.width }}
        renderTabBar={props => (
          <TabBar
            {...props}
            indicatorStyle={{ backgroundColor: COLORS.primary }}
            style={{ backgroundColor: COLORS.white }}
            labelStyle={{
              color: COLORS.black,
              fontFamily: FONTS.semiBold,
              fontSize: SIZES.body3,
              textTransform: 'none'
            }}
            activeColor={COLORS.primary}
            inactiveColor={COLORS.gray}
          />
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: SIZES.padding,
  },
  requestItem: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    marginBottom: SIZES.padding,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemTitle: {
    fontSize: SIZES.h3,
    fontFamily: FONTS.bold,
    marginBottom: 4,
  },
  itemDate: {
    fontSize: SIZES.body4,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    marginBottom: 8,
  },
  itemStatus: {
    fontSize: SIZES.body4,
    fontFamily: FONTS.semiBold,
    color: COLORS.primary,
    textTransform: 'capitalize',
  },
  detailsButton: {
    marginTop: 12,
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: SIZES.radius,
    alignSelf: 'flex-start',
  },
  detailsButtonText: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
  },
});

export default MyRequestsScreen;