import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';

export type RootStackParamList = {
    Welcome: undefined;
    Signup: undefined;
    Login: undefined;
    ResetPassword: undefined;
    UserProfile: undefined;
    Chat: { sessionId?: string } | undefined;
    Menu: undefined;
    FAQs: undefined;
    Lawyer: undefined;
    LawyerDetail: { lawyerId: number };
    DocumentLookup: undefined;
    ProcedureLookup: undefined;
    DocumentDetail: { documentId: string };
    MyRequests: undefined;
    ServiceRequestDetail: { requestId: number };
    Conversation: { conversationId?: string; serviceRequestId?: number; title?: string };
};

export type LawyerScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Lawyer'>;
export type ChatScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Chat'>;
export type ChatScreenRouteProp = RouteProp<RootStackParamList, 'Chat'>;
export type ConversationScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Conversation'>;
export type ConversationScreenRouteProp = RouteProp<RootStackParamList, 'Conversation'>;
export type ServiceRequestDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ServiceRequestDetail'>;
export type ServiceRequestDetailScreenRouteProp = RouteProp<RootStackParamList, 'ServiceRequestDetail'>;
