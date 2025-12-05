export interface Source {
    document_id?: string;
    title: string;
    document_number: string;
    source_url: string;
    page_content_preview: string;
}

export interface SessionMessage {
    text: string;
    sender: 'user' | 'bot';
    sources?: Source[];
}

export interface ChatSessionResponse {
    session_id: string;
    title: string;
    messages: SessionMessage[];
    created_at: string;
    updated_at: string;
}

export interface ChatMessageResponse {
    response: string;
    sources?: Source[];
}
